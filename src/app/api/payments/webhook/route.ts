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
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";
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
): Promise<"fulfilled" | "unlinked" | "skipped"> {
  const session = event.data.object as {
    id: string;
    payment_intent: string | null;
    amount_total: number | null;
    currency: string | null;
    customer_email: string | null;
    customer_details?: { email?: string | null } | null;
    client_reference_id?: string | null;
    metadata?: Record<string, string> | null;
  };

  const supabase = getSupabaseAdmin();

  let rawUserId = session.metadata?.user_id || session.client_reference_id || null;
  if (!rawUserId || rawUserId === "guest") {
    const rawEmail = session.customer_details?.email ?? session.customer_email ?? null;
    const normalizedEmail = rawEmail?.trim().toLowerCase() ?? null;
    if (normalizedEmail) {
      const { data: matchedUser, error: userLookupErr } = await supabase
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (userLookupErr) {
        throw new Error(`Fallback user email lookup failed: ${userLookupErr.message}`);
      }
      if (matchedUser?.id) {
        rawUserId = matchedUser.id;
      }
    }

    if (!rawUserId || rawUserId === "guest") {
      console.error("[Webhook] unlinked_checkout_payment", {
        eventId: event.id,
        sessionId: session.id,
        email: normalizedEmail,
      });
      return "unlinked";
    }
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
      return "skipped";
    }
  }

  // 1. Grant entitlement FIRST (users.plan + active subscriptions row)
  const { error: userUpdateErr } = await supabase
    .from("users")
    .update({ plan: plan.dbPlan })
    .eq("id", rawUserId);

  if (userUpdateErr) {
    throw new Error(`Failed to update user plan: ${userUpdateErr.message}`);
  }

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

  // 2. Record payment ledger row (non-fatal if table is missing: 42P01)
  const { data: existingPayment, error: paymentLookupErr } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (paymentLookupErr) {
    if (paymentLookupErr.code === "42P01") {
      console.error("[Webhook] payments table missing (42P01) on lookup; entitlement preserved", {
        sessionId: session.id,
        userId: rawUserId,
        error: paymentLookupErr.message,
      });
      return "fulfilled";
    }
    throw new Error(`Payment lookup failed: ${paymentLookupErr.message}`);
  }

  if (!existingPayment) {
    const paymentPayload: TablesInsert<"payments"> = {
      user_id: rawUserId,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      amount_cents: session.amount_total ?? plan.amountCents,
      currency: session.currency ?? "usd",
      status: "succeeded",
      customer_email: session.customer_email ?? session.customer_details?.email ?? null,
      product_name: plan.product,
      metadata: {
        ...(session.metadata ?? {}),
        plan: plan.id,
      },
    };

    const { error: paymentInsertErr } = await supabase
      .from("payments")
      .insert(paymentPayload);

    if (paymentInsertErr) {
      if (paymentInsertErr.code === "42P01") {
        console.error("[Webhook] payments table missing (42P01) on insert; entitlement preserved", {
          sessionId: session.id,
          userId: rawUserId,
          error: paymentInsertErr.message,
        });
        return "fulfilled";
      }
      throw new Error(`Failed to record payment: ${paymentInsertErr.message}`);
    }
  }

  return "fulfilled";
}

async function handlePaymentIntentSucceeded(
  event: StripeWebhookEvent
): Promise<void> {
  const paymentIntent = event.data.object as {
    id: string;
  };

  const updatePayload: TablesUpdate<"payments"> = { status: "succeeded" };
  const { error } = await getSupabaseAdmin()
    .from("payments")
    .update(updatePayload)
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

  const updatePayload: TablesUpdate<"payments"> = { status: "failed" };
  const { error } = await getSupabaseAdmin()
    .from("payments")
    .update(updatePayload)
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
    amount?: number;
    amount_refunded?: number;
  };

  if (!charge.payment_intent) return;

  const isFullRefund =
    charge.refunded === true ||
    (typeof charge.amount === "number" &&
      charge.amount > 0 &&
      typeof charge.amount_refunded === "number" &&
      charge.amount_refunded >= charge.amount);

  const supabase = getSupabaseAdmin();
  const { data: payment, error: lookupErr } = await supabase
    .from("payments")
    .select("id, user_id, created_at")
    .eq("stripe_payment_intent_id", charge.payment_intent)
    .maybeSingle();

  if (lookupErr) {
    throw new Error(`Refund payment lookup failed: ${lookupErr.message}`);
  }

  if (!payment) return;

  if (!isFullRefund) {
    const partialUpdate: TablesUpdate<"payments"> = { status: "partially_refunded" };
    const { error: partialErr } = await supabase
      .from("payments")
      .update(partialUpdate)
      .eq("id", payment.id);

    if (partialErr) {
      throw new Error(`Failed to mark payment partially refunded: ${partialErr.message}`);
    }
    return;
  }

  const fullUpdate: TablesUpdate<"payments"> = { status: "refunded" };
  const { error: updateErr } = await supabase
    .from("payments")
    .update(fullUpdate)
    .eq("id", payment.id);

  if (updateErr) {
    throw new Error(`Failed to mark payment refunded: ${updateErr.message}`);
  }

  if (payment.user_id) {
    const { data: otherPayments, error: otherPayErr } = await supabase
      .from("payments")
      .select("id")
      .eq("user_id", payment.user_id)
      .in("status", ["succeeded", "completed", "paid"])
      .neq("id", payment.id)
      .limit(1);

    if (otherPayErr) {
      throw new Error(`Other payments lookup failed: ${otherPayErr.message}`);
    }

    if (otherPayments && otherPayments.length > 0) {
      return;
    }

    const { data: newerSubs, error: subCheckErr } = await supabase
      .from("subscriptions")
      .select("id, started_at, created_at")
      .eq("user_id", payment.user_id)
      .eq("status", "active");

    if (subCheckErr) {
      throw new Error(`Active subscription check failed: ${subCheckErr.message}`);
    }

    const refundedAtMs = payment.created_at ? new Date(payment.created_at).getTime() : 0;
    const hasNewerActiveSub = (newerSubs ?? []).some((sub) => {
      const subTs = new Date(sub.started_at ?? sub.created_at).getTime();
      return Number.isFinite(subTs) && subTs > refundedAtMs;
    });

    if (hasNewerActiveSub) {
      return;
    }

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
  let unlinked = false;
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const outcome = await handleCheckoutSessionCompleted(event);
        unlinked = outcome === "unlinked";
        break;
      }

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
  if (unlinked) {
    return NextResponse.json({ success: true, received: true, unlinked: true });
  }
  return NextResponse.json({ success: true, received: true });
}
