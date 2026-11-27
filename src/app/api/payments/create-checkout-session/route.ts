import { enforceRateLimit, RATE_LIMIT_POLICIES } from "@/lib/rate-limit-policies";
import { readMaintenanceState } from "@/lib/admin/state";
import { NextResponse as MaintenanceResponse } from "next/server";
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

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { CHECKOUT_PLAN_IDS, getCheckoutPlan,  } from "@/lib/plans";
import { successResponse, badRequestResponse, badGatewayResponse, serverErrorResponse,  } from "@/lib/api-response";

const CheckoutSchema = z.object({
  planId: z.enum(CHECKOUT_PLAN_IDS, {
    message: "Unknown plan",
  }),
  successUrl: z.string().url("Invalid success URL"),
  cancelUrl: z.string().url("Invalid cancel URL"),
});

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
  if ((await readMaintenanceState()).maintenanceMode) {
    return MaintenanceResponse.json({ success: false, error: "System is currently under maintenance" }, { status: 503 });
  }
  try {
    const stripe = getStripe();
    // ── Rate limiting ──────────────────────────────────────────────────
    const ip = getClientIpFromHeaders(request.headers);
    const quota = await enforceRateLimit(RATE_LIMIT_POLICIES.CHECKOUT_USER, ip, { throttleStatus: 400 });
    if (!quota.ok) return quota.response;

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

    const plan = getCheckoutPlan(planId);

    // ── Create Stripe Checkout Session ─────────────────────────────────
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      ...(userId ? { client_reference_id: userId } : {}),
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: plan.product },
            unit_amount: plan.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        plan: plan.id,
        product_name: plan.product,
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
