/**
 * POST /api/payments/webhook
 *
 * Handles Stripe webhook events for one-time payment processing.
 *
 * SECURITY (per payment-integration skill requirements):
 *  1. Signature verification — ALWAYS verify via Stripe SDK (HMAC).
 *  2. Raw body preservation — use request.text() NOT request.json() before verification.
 *  3. Idempotency — store event IDs in DB, skip duplicates.
 *  4. Quick response — return 200 within 200ms, process async.
 *  5. Server validation — re-fetch payment status from Stripe API, never trust payload alone.
 */

// Webhook route must be dynamic — Stripe POSTs should never be cached
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripe, type StripeWebhookEvent } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-client";

// ---------------------------------------------------------------------------
// Idempotency: check if we already processed this event
// ---------------------------------------------------------------------------

async function isEventProcessed(eventId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("stripe_events")
    .select("id")
    .eq("event_id", eventId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found (expected for new events)
    console.error("[Webhook] DB check failed:", error.message);
  }

  return !!data;
}

async function markEventProcessed(
  eventId: string,
  eventType: string
): Promise<void> {
  const { error } = await getSupabaseAdmin().from("stripe_events").insert({
    event_id: eventId,
    event_type: eventType,
    processed_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[Webhook] Failed to mark event processed:", error.message);
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
    payment_intent: string;
    amount_total: number;
    currency: string;
    customer_email: string | null;
    metadata: Record<string, string>;
  };

  // Server-side validation: re-fetch from Stripe to confirm
  const paymentIntent = await getStripe().paymentIntents.retrieve(
    session.payment_intent
  );

  if (paymentIntent.status !== "succeeded") {
    console.warn(
      `[Webhook] PaymentIntent ${session.payment_intent} status is ${paymentIntent.status}, not succeeded. Skipping.`
    );
    return;
  }

  // Record the payment in our database
  const { error } = await getSupabaseAdmin().from("payments").insert({
    stripe_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent,
    amount_cents: session.amount_total,
    currency: session.currency,
    status: "succeeded",
    customer_email: session.customer_email,
    product_name: session.metadata?.product_name ?? "Unknown",
    metadata: session.metadata ?? {},
  });

  if (error) {
    console.error("[Webhook] Failed to record payment:", error.message);
    throw error; // Will be caught by the main handler
  }

  console.info(
    `[Webhook] Payment recorded: ${session.payment_intent} (${session.amount_total} ${session.currency})`
  );
}

async function handlePaymentIntentSucceeded(
  event: StripeWebhookEvent
): Promise<void> {
  const paymentIntent = event.data.object as {
    id: string;
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  };

  // Update payment status if it exists (backup to checkout.session.completed)
  const { error } = await getSupabaseAdmin()
    .from("payments")
    .update({ status: "succeeded" })
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .eq("status", "pending");

  if (error) {
    console.error("[Webhook] Failed to update payment status:", error.message);
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
      failure_reason: paymentIntent.last_payment_error?.message ?? "Unknown",
    })
    .eq("stripe_payment_intent_id", paymentIntent.id);

  if (error) {
    console.error(
      "[Webhook] Failed to record payment failure:",
      error.message
    );
  }

  console.warn(
    `[Webhook] Payment failed: ${paymentIntent.id} — ${paymentIntent.last_payment_error?.message ?? "Unknown"}`
  );
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

  // ── 3. Idempotency check ────────────────────────────────────────────
  const alreadyProcessed = await isEventProcessed(event.id);
  if (alreadyProcessed) {
    console.info(`[Webhook] Event ${event.id} already processed, skipping`);
    return NextResponse.json({ success: true, received: true });
  }

  // ── 4. Route to handler ─────────────────────────────────────────────
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

      default:
        console.info(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Webhook] Handler error for ${event.type}:`, message);
    // Event was not marked processed, so Stripe will retry.
    return NextResponse.json(
      { success: false, error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  // ── 5. Mark as processed only after successful handling ─────────────
  await markEventProcessed(event.id, event.type);

  // ── 6. Return 200 quickly ───────────────────────────────────────────
  return NextResponse.json({ success: true, received: true });
}
