/**
 * Zod Schemas for Admin Control API
 *
 * Every payload that arrives from the Discord Bot passes through these
 * schemas BEFORE any business logic runs. This guarantees:
 *  - Only whitelisted `action` values are accepted.
 *  - Required fields for each action are present and correctly typed.
 *  - Unexpected fields are stripped (strict mode) to prevent injection.
 */

import { z } from "zod/v4";
import { ADMIN_CONTROL_ACTIONS } from "@/contracts/admin-control";
import { USER_STATUS_FILTERS, FIELD_LIMITS } from "@/lib/validation/vocabulary";
import { ADMIN_ASSIGNABLE_PLANS } from "@/lib/plans";

// ---------------------------------------------------------------------------
// Base schema — common to ALL admin commands
// ---------------------------------------------------------------------------

/**
 * Discriminated union on `action` so each command has its own params.
 * `strict()` rejects unknown keys — critical for security.
 */
export const AdminActionSchema = z.discriminatedUnion("action", [
  // ---- get_stats ----------------------------------------------------------
  z
    .object({
      action: z.literal(ADMIN_CONTROL_ACTIONS[0]),
      // Optional: scope which stats to retrieve (default: all)
      scope: z
        .enum(["users", "system", "all"])
        .optional()
        .default("all"),
    })
    .strict(),

  // ---- toggle_maintenance -------------------------------------------------
  z
    .object({
      action: z.literal(ADMIN_CONTROL_ACTIONS[1]),
      /** Desired state: true = maintenance mode ON */
      enabled: z.boolean(),
      /** Optional message to show users while in maintenance */
      message: z
        .string()
        .max(500, "Maintenance message must be ≤ 500 characters")
        .optional(),
    })
    .strict(),

  // ---- broadcast ----------------------------------------------------------
  z
    .object({
      action: z.literal(ADMIN_CONTROL_ACTIONS[2]),
      /** Message content to push to connected clients */
      content: z
        .string()
        .min(1, "Broadcast content cannot be empty")
        .max(2000, "Discord/UI limit: 2000 characters max"),
      // Channel / target filter (future-proofing)
      target: z
        .enum(["all", "web", "discord"])
        .optional()
        .default("all"),
    })
    .strict(),
]);

// Type helper — use this for handler function parameters
export type AdminAction = z.infer<typeof AdminActionSchema>;

// ---------------------------------------------------------------------------
// Individual action types (extracted for handler type-safety)
// ---------------------------------------------------------------------------

export type GetStatsAction = Extract<AdminAction, { action: "get_stats" }>;
export type ToggleMaintenanceAction = Extract<AdminAction, { action: "toggle_maintenance" }>;
export type BroadcastAction = Extract<AdminAction, { action: "broadcast" }>;

// ---------------------------------------------------------------------------
// Finance Schemas
// ---------------------------------------------------------------------------

export const CreateSubscriptionSchema = z
  .object({
    user_id: z.string().uuid("Invalid user ID"),
    plan: z.enum(["basic", "pro", "enterprise"]),
    amount_monthly: z.number().int().positive("Amount must be positive (in cents)"),
  })
  .strict();

export const UpdateSubscriptionSchema = z
  .object({
    plan: z.enum(["basic", "pro", "enterprise"]).optional(),
    status: z.enum(["active", "cancelled", "past_due"]).optional(),
  })
  .strict();

export const CreateInvoiceSchema = z
  .object({
    user_id: z.string().uuid("Invalid user ID").optional(),
    amount_cents: z.number().int().positive("Amount must be positive"),
    status: z.enum(["paid", "pending", "failed"]).optional(),
    stripe_invoice_id: z.string().max(255).optional(),
  })
  .strict();

export const CreateRefundSchema = z
  .object({
    invoice_id: z.number().int().positive("Invoice ID required"),
    amount_cents: z.number().int().positive("Amount must be positive"),
    reason: z.string().max(FIELD_LIMITS.banReason).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// User Management Schemas
// ---------------------------------------------------------------------------

export const UserListQuerySchema = z.object({
  search: z.string().max(100).optional().default(""),
  filter: z.enum(USER_STATUS_FILTERS).optional().default("all"),
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const BanUserSchema = z
  .object({
    reason: z.string().max(FIELD_LIMITS.banReason).optional(),
  })
  .strict();

export const AdminMessageSchema = z
  .object({
    content: z.string().min(1, "Message cannot be empty").max(FIELD_LIMITS.adminMessage),
  })
  .strict();

export const ChangePlanSchema = z
  .object({
    plan: z.enum(ADMIN_ASSIGNABLE_PLANS),
  })
  .strict();

// ---------------------------------------------------------------------------
// Settings Schemas
// ---------------------------------------------------------------------------

export const UpdateSettingSchema = z
  .object({
    /** Setting key — lowercase snake_case only, so a caller cannot invent
     *  arbitrary rows in site_settings. */
    key: z
      .string()
      .min(1, "Setting key is required")
      .max(64, "Setting key must be ≤ 64 characters")
      .regex(/^[a-z0-9_]+$/, "Setting key must be lowercase letters, digits, or underscore"),
    value: z.string().max(10000),
    /** Maintenance banner text — same 500-char ceiling as toggle_maintenance. */
    message: z.string().max(500, "Maintenance message must be ≤ 500 characters").optional(),
  })
  .strict();

/**
 * Escape a user-supplied term for safe interpolation into a PostgREST
 * `.or()` filter. Double-quoting the value makes commas/parens literal
 * instead of clause separators — without this, `%,is_admin.eq.true` inside
 * the term adds attacker-chosen filters (filter-injection defense).
 */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/"/g, '""');
}

/** Webhooks ping Discord only — any other fetch target is SSRF surface. */
export function isAllowedWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    if (u.hostname !== "discord.com" && u.hostname !== "discordapp.com") return false;
    return u.pathname.startsWith("/api/webhooks/");
  } catch {
    return false;
  }
}

const WEBHOOK_URL_MESSAGE = "URL must be a Discord webhook (https://discord.com/api/webhooks/…)";

export const CreateWebhookSchema = z
  .object({
    name: z.string().min(1).max(255),
    url: z
      .string()
      .url("Must be a valid URL")
      .max(2048)
      .refine(isAllowedWebhookUrl, WEBHOOK_URL_MESSAGE),
    event_type: z.enum(["backup", "analytics", "error_alert", "custom"]),
  })
  .strict();

export const UpdateWebhookSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    url: z
      .string()
      .url()
      .max(2048)
      .refine(isAllowedWebhookUrl, WEBHOOK_URL_MESSAGE)
      .optional(),
    status: z.enum(["active", "paused"]).optional(),
    event_type: z.enum(["backup", "analytics", "error_alert", "custom"]).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Analytics Report Schema
// ---------------------------------------------------------------------------

export const TriggerReportSchema = z
  .object({
    webhook_id: z.number().int().positive().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Stripe Payment Schemas
// ---------------------------------------------------------------------------

export const CreateCheckoutSessionSchema = z
  .object({
    product_name: z
      .string()
      .min(1, "Product name is required")
      .max(255, "Product name too long"),
    amount_cents: z
      .number()
      .int()
      .positive("Amount must be positive (in cents)")
      .min(50, "Minimum charge is $0.50 USD"),
    currency: z
      .string()
      .length(3, "Currency must be a 3-letter ISO code")
      .default("usd"),
    success_url: z.string().url("Must be a valid URL").max(2048),
    cancel_url: z.string().url("Must be a valid URL").max(2048),
    customer_email: z.string().email("Invalid email").max(255).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
  })
  .strict();

export type CreateCheckoutSession = z.infer<typeof CreateCheckoutSessionSchema>;

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type CreateSubscription = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscription = z.infer<typeof UpdateSubscriptionSchema>;
export type CreateInvoice = z.infer<typeof CreateInvoiceSchema>;
export type CreateRefund = z.infer<typeof CreateRefundSchema>;
export type UserListQuery = z.infer<typeof UserListQuerySchema>;
export type BanUser = z.infer<typeof BanUserSchema>;
export type AdminMessage = z.infer<typeof AdminMessageSchema>;
export type ChangePlan = z.infer<typeof ChangePlanSchema>;
export type UpdateSetting = z.infer<typeof UpdateSettingSchema>;
export type CreateWebhook = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhook = z.infer<typeof UpdateWebhookSchema>;
export type TriggerReport = z.infer<typeof TriggerReportSchema>;
