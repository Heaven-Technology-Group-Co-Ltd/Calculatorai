/**
 * POST /api/payments/webhook
 *
 * Handles Stripe webhook events for payment processing and entitlement fulfillment.
 *
 * SECURITY:
 *  1. Signature verification — ALWAYS verify via Stripe SDK (HMAC).
 *  2. Raw body preservation — use request.text() NOT request.json() before verification.
 *  3. Recoverable claim-first idempotency — insert into `stripe_events` first;
 *     on unique violation (23505) return 200 duplicate; on downstream failure
 *     delete the claim row and return 500 so Stripe retries cleanly.
 *  4. Server validation — re-fetch payment status from Stripe API.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripe, type StripeWebhookEvent } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { computeSubscriptionPeriod, resolveCheckoutPlan } from "@/lib/plans";

// ---------------------------------------------------------------------------
// Idempotency helpers (claim-first with failure rollback)
// ---------------------------------------------------------------------------

async function claimEvent(
  eventId: string,
  eventType: string
): Promise<"claimed" | "duplicate"> {
  const { error } = await getSupabaseAdmin().from("stripe_events").insert({
    event_id: eventId,
    event_type: eventType,
    processed_at: new Date().toISOString(),
  });

  if (!error) return "claimed";

  if (error.code === "23505") {
    return "duplicate";
  }

  console.error("[Webhook] Failed to claim event:", error.message);
  throw new Error(`Failed to claim stripe event: ${error.message}`);
}

async function releaseEventClaim(eventId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("stripe_events")
    .delete()
    .eq("event_id", eventId);

  if (error) {
    console.error("[Webhook] Failed to release event claim:", error.message);
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutSessionCompleted(
  event: StripeWebhookEvent
): Promise<void> {
  const session = event.data.object as {
    id: string;
    payment_intent: string | null;
    amount_total: number | null;
    currency: string | null;
    customer_email: string | null;
    client_reference_id?: string | null;
    metadata?: Record<string, string> | null;
  };

  const rawUserId = session.metadata?.user_id || session.client_reference_id || null;
  if (!rawUserId || rawUserId === "guest") {
    throw new Error(`Checkout session ${session.id} is missing authenticated user_id`);
  }

  const plan = resolveCheckoutPlan(session.metadata, session.amount_total);
  if (!plan) {
    throw new Error(`Checkout session ${session.id} has unrecognized plan`);
  }

  // Server-side validation: re-fetch PaymentIntent from Stripe when present
  if (session.payment_intent) {
    const paymentIntent = await getStripe().paymentIntents.retrieve(
      session.payment_intent
    );
    if (paymentIntent.status !== "succeeded") {
      console.warn(
        `[Webhook] PaymentIntent ${session.payment_intent} status is ${paymentIntent.status}, not succeeded. Skipping.`
      );
      return;
    }
  }

  const supabase = getSupabaseAdmin();

  // Guard payments against duplicate stripe_session_id on retries
  const { data: existingPayment, error: paymentLookupErr } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (paymentLookupErr) {
    throw new Error(`Payment lookup failed: ${paymentLookupErr.message}`);
  }

  if (!existingPayment) {
    const { error: paymentInsertErr } = await supabase.from("payments").insert({
      user_id: rawUserId,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      amount_cents: session.amount_total ?? plan.amountCents,
      currency: session.currency ?? "usd",
      status: "succeeded",
      customer_email: session.customer_email,
      product_name: plan.product,
      metadata: {
        ...(session.metadata ?? {}),
        plan: plan.id,
      },
    });

    if (paymentInsertErr) {
      throw new Error(`Failed to record payment: ${paymentInsertErr.message}`);
    }
  }

  // Grant entitlement on users.plan
  const { error: userUpdateErr } = await supabase
    .from("users")
    .update({ plan: plan.dbPlan })
    .eq("id", rawUserId);

  if (userUpdateErr) {
    throw new Error(`Failed to update user plan: ${userUpdateErr.message}`);
  }

  // Upsert active subscription row
  const period = computeSubscriptionPeriod(plan.id);
  const { data: existingSub, error: subLookupErr } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", rawUserId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (subLookupErr) {
    throw new Error(`Subscription lookup failed: ${subLookupErr.message}`);
  }

  if (existingSub) {
    const { error: subUpdateErr } = await supabase
      .from("subscriptions")
      .update({
        plan: plan.dbPlan,
        amount_monthly: plan.amountMonthlyCents,
        status: "active",
        started_at: period.startedAt,
        cancelled_at: null,
        updated_at: period.startedAt,
      })
      .eq("id", existingSub.id);

    if (subUpdateErr) {
      throw new Error(`Failed to update subscription: ${subUpdateErr.message}`);
    }
  } else {
    const { error: subInsertErr } = await supabase
      .from("subscriptions")
      .insert({
        user_id: rawUserId,
        plan: plan.dbPlan,
        amount_monthly: plan.amountMonthlyCents,
        status: "active",
        started_at: period.startedAt,
      });

    if (subInsertErr) {
      throw new Error(`Failed to insert subscription: ${subInsertErr.message}`);
    }
  }

  console.info(
    `[Webhook] Entitlement granted: user=${rawUserId} plan=${plan.dbPlan} session=${session.id}`
  );
}

async function handlePaymentIntentSucceeded(
  event: StripeWebhookEvent
): Promise<void> {
  const paymentIntent = event.data.object as {
    id: string;
  };

  const { error } = await getSupabaseAdmin()
    .from("payments")
    .update({ status: "succeeded" })
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Failed to update payment status: ${error.message}`);
  }
}

async function handlePaymentIntentFailed(
  event: StripeWebhookEvent
): Promise<void> {
  const paymentIntent = event.data.object as {
    id: string;
    last_payment_error: { message: string } | null;
  };

  const { error } = await getSupabaseAdmin()
    .from("payments")
    .update({
      status: "failed",
    })
    .eq("stripe_payment_intent_id", paymentIntent.id);

  if (error) {
    throw new Error(`Failed to record payment failure: ${error.message}`);
  }

  console.warn(
    `[Webhook] Payment failed: ${paymentIntent.id} — ${paymentIntent.last_payment_error?.message ?? "Unknown"}`
  );
}

async function revokeUserEntitlement(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { error: userErr } = await supabase
    .from("users")
    .update({ plan: "free" })
    .eq("id", userId);

  if (userErr) {
    throw new Error(`Failed to reset user plan: ${userErr.message}`);
  }

  const { error: subErr } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: nowIso, updated_at: nowIso })
    .eq("user_id", userId)
    .eq("status", "active");

  if (subErr) {
    throw new Error(`Failed to cancel subscription: ${subErr.message}`);
  }
}

async function handleChargeRefunded(event: StripeWebhookEvent): Promise<void> {
  const charge = event.data.object as {
    payment_intent?: string | null;
    refunded?: boolean;
  };

  if (!charge.payment_intent) return;

  const supabase = getSupabaseAdmin();
  const { data: payment, error: lookupErr } = await supabase
    .from("payments")
    .select("id, user_id")
    .eq("stripe_payment_intent_id", charge.payment_intent)
    .maybeSingle();

  if (lookupErr) {
    throw new Error(`Refund payment lookup failed: ${lookupErr.message}`);
  }

  if (!payment) return;

  const { error: updateErr } = await supabase
    .from("payments")
    .update({ status: "refunded" })
    .eq("id", payment.id);

  if (updateErr) {
    throw new Error(`Failed to mark payment refunded: ${updateErr.message}`);
  }

  if (payment.user_id) {
    await revokeUserEntitlement(payment.user_id);
  }
}

async function handleSubscriptionDeleted(
  event: StripeWebhookEvent
): Promise<void> {
  const subscription = event.data.object as {
    metadata?: Record<string, string> | null;
  };

  const userId = subscription.metadata?.user_id;
  if (!userId || userId === "guest") return;

  await revokeUserEntitlement(userId);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // ── 1. Read raw body (CRITICAL: must NOT parse as JSON first) ───────
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[Webhook] Missing stripe-signature header");
    return NextResponse.json(
      { success: false, error: "Missing signature" },
      { status: 400 }
    );
  }

  // ── 2. Verify webhook signature ─────────────────────────────────────
  let event: StripeWebhookEvent;

  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    ) as StripeWebhookEvent;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Webhook] Signature verification failed:", message);
    return NextResponse.json(
      { success: false, error: "Invalid signature" },
      { status: 400 }
    );
  }

  // ── 3. Claim-first idempotency ──────────────────────────────────────
  let claimStatus: "claimed" | "duplicate";
  try {
    claimStatus = await claimEvent(event.id, event.type);
  } catch {
    return NextResponse.json(
      { success: false, error: "Webhook idempotency check failed" },
      { status: 500 }
    );
  }

  if (claimStatus === "duplicate") {
    console.info(`[Webhook] Duplicate event ${event.id}, skipping`);
    return NextResponse.json({ success: true, received: true, duplicate: true });
  }

  // ── 4. Route to handler (release claim on failure so Stripe retries) ─
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;

      default:
        console.info(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Webhook] Handler error for ${event.type}:`, message);
    await releaseEventClaim(event.id);
    return NextResponse.json(
      { success: false, error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  // ── 5. Return 200 quickly ───────────────────────────────────────────
  return NextResponse.json({ success: true, received: true });
}
