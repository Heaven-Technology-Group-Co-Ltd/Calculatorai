/**
 * Stripe Client Initialization
 *
 * Provides a singleton Stripe instance for server-side use.
 * The secret key is NEVER exposed to the client.
 *
 * SECURITY: This module must only be imported in server-side code
 * (API routes, server actions). Never import in client components.
 */

import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Singleton pattern — reuse the same Stripe instance across hot reloads
// ---------------------------------------------------------------------------

declare global {
  var __stripe__: Stripe | undefined;
}

export function getStripe(): Stripe {
  if (globalThis.__stripe__) return globalThis.__stripe__;
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    typescript: true,
    maxNetworkRetries: 2,
    timeout: 10_000,
  });
  globalThis.__stripe__ = stripe;
  return stripe;
}

// ---------------------------------------------------------------------------
// Public types exported for use across the application
// ---------------------------------------------------------------------------

export type StripeCheckoutSession = Stripe.Checkout.Session;
export type StripeWebhookEvent = Stripe.Event;
export type StripePaymentIntent = Stripe.PaymentIntent;

// ---------------------------------------------------------------------------
// Helper: validate that the Stripe secret key looks correctly formatted
// ---------------------------------------------------------------------------

export function validateStripeKey(): void {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Set it in .env.local."
    );
  }
  // Accept both test (sk_test_) and live (sk_live_) keys
  if (!key.startsWith("sk_test_") && !key.startsWith("sk_live_")) {
    throw new Error(
      "STRIPE_SECRET_KEY has an invalid format. Expected sk_test_ or sk_live_ prefix."
    );
  }
}

// ---------------------------------------------------------------------------
// Price helper — convert dollars to cents safely
// ---------------------------------------------------------------------------

export function toCents(amountDollars: number): number {
  return Math.round(amountDollars * 100);
}

export function fromCents(amountCents: number): number {
  return amountCents / 100;
}
