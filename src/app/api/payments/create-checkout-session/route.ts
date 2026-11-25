/**
 * POST /api/payments/create-checkout-session
 *
 * Creates a Stripe Checkout Session for one-time payments.
 *
 * SECURITY:
 *  - Input validated via Zod (strict mode — strips unknown keys)
 *  - Amount calculated server-side ONLY (never trusts client prices)
 *  - No raw card data handled (Stripe Elements handles it)
 *  - Rate limited per IP
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { checkRateLimit } from "@/lib/rate-limiter";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  badGatewayResponse,
  serverErrorResponse,
} from "@/lib/api-response";

const CheckoutSchema = z.object({
  planId: z.enum(["monthly", "yearly", "lifetime"], {
    message: "Unknown plan",
  }),
  successUrl: z.string().url("Invalid success URL"),
  cancelUrl: z.string().url("Invalid cancel URL"),
});

// Single source of truth for pricing — the client never sets prices.
const PLAN_CATALOG: Record<
  "monthly" | "yearly" | "lifetime",
  { product: string; amountCents: number }
> = {
  monthly: { product: "Monthly Pro", amountCents: 999 },
  yearly: { product: "Yearly Premium", amountCents: 7999 },
  lifetime: { product: "Lifetime Access", amountCents: 19900 },
};

// The expected redirect origin is configuration, never a request header: a
// Host header is attacker-controlled, so matching against it accepts
// successUrl=https://attacker.example. No configured origin => reject.
function appOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return null;
  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
}

function onConfiguredOrigin(candidate: string, origin: string): boolean {
  try {
    return new URL(candidate).origin === origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    // ── Rate limiting ──────────────────────────────────────────────────
    const ip = getClientIpFromHeaders(request.headers);
    const rateResult = await checkRateLimit(`checkout:${ip}`, 20, 60_000);
    if (!rateResult.allowed) {
      return badRequestResponse("Too many requests. Please try again later.");
    }

    // ── Parse & validate body ──────────────────────────────────────────
    const body = await request.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("; ");
      return badRequestResponse(`Validation failed: ${issues}`);
    }

    const { planId, successUrl, cancelUrl } = parsed.data;

    // ── Same-origin redirect guard ──────────────────────────────────────
    const origin = appOrigin();
    if (
      !origin ||
      !onConfiguredOrigin(successUrl, origin) ||
      !onConfiguredOrigin(cancelUrl, origin)
    ) {
      return badRequestResponse("Redirect URLs must stay on this site");
    }

    // ── Get user session (optional — for guest checkout) ────────────────
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    // ── Create Stripe Checkout Session ─────────────────────────────────
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: PLAN_CATALOG[planId].product },
            unit_amount: PLAN_CATALOG[planId].amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        product_name: PLAN_CATALOG[planId].product,
        user_id: userId ?? "guest",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!checkoutSession.url) {
      return badGatewayResponse("Failed to create checkout session");
    }

    return successResponse({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Stripe")) {
      console.error("[Payments] Stripe error:", message);
      return badGatewayResponse("Payment service temporarily unavailable");
    }
    console.error("[Payments] Unexpected error:", message);
    return serverErrorResponse("Internal server error");
  }
}
