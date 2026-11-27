import { enforceRateLimit, RATE_LIMIT_POLICIES } from "@/lib/rate-limit-policies";
/**
 * GET /api/payments/status?session_id=cs_test_xxx
 *
 * Checks the status of a Stripe Checkout Session.
 * Used by the frontend after Stripe redirect.
 *
 * SECURITY:
 *  - Validates session_id format
 *  - Only returns non-sensitive status info
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  successResponse,
  badRequestResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-response";

/** Stripe session ID format: cs_xxx or cs_test_xxx */
const SESSION_ID_RE = /^cs_(test_)?[a-zA-Z0-9]+$/;

export async function GET(request: NextRequest) {
  try {
    const stripe = getStripe();
    const sessionId = request.nextUrl.searchParams.get("session_id");

    if (!sessionId) {
      return badRequestResponse("session_id is required");
    }

    if (!SESSION_ID_RE.test(sessionId)) {
      return badRequestResponse("Invalid session_id format");
    }

    // Session IDs are bearer secrets; cap how fast they can be probed.
    const ip = getClientIpFromHeaders(request.headers);
    const quota = await enforceRateLimit(RATE_LIMIT_POLICIES.PAYMENT_STATUS_USER, ip);
    if (!quota.ok) return quota.response;

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (!checkoutSession) {
      return notFoundResponse("Session not found");
    }

    // Guest checkouts stay readable by id; a signed-in caller only sees their own.
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    const ownerId = checkoutSession.metadata?.user_id;
    if (ownerId && ownerId !== "guest" && ownerId !== userId) {
      return forbiddenResponse("This session belongs to another account");
    }

    // Only expose non-sensitive info
    return successResponse({
      status: checkoutSession.status,
      paymentStatus: checkoutSession.payment_status,
      amountTotal: checkoutSession.amount_total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("No such checkout session")) {
      return notFoundResponse("Session not found");
    }
    console.error("[Payments] Status check failed:", message);
    return serverErrorResponse("Failed to check payment status");
  }
}
