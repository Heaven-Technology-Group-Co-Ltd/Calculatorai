---
tags: [session, bugfix]
date: 2026-07-24
---

# Session: WebhookManager Uncaught TypeError Fix

**Duration / scope:** Fixed runtime `TypeError: Cannot read properties of undefined (reading 'map')` at `WebhookManager` when navigating to Settings -> Webhooks tab.

## Summary of Fixes

### 1. Root Cause
- The database table `discord_webhooks` uses a scalar `event_type: string` column (e.g. `"analytics"`, `"admin"`) rather than an `events: string[]` array property.
- When `WebhookManager.tsx` attempted to map over `wh.events`, it received `undefined`, throwing an uncaught TypeError in browser context.
- Additionally, raw API responses or error states could return non-array structures into `webhooks` state.

### 2. Implementation Details
- **File updated:** `src/components/dashboard/settings/WebhookManager.tsx`
- Expanded `Webhook` interface definition to include optional `event_type`, `name`, and `status` fields.
- Normalized event rendering via `eventsList`:
  - Uses `wh.events` if it is an array.
  - Falls back to `[wh.event_type]` if `event_type` is present.
  - Falls back to `[]` otherwise.
- Added `Array.isArray(d)` check in `useEffect` fetcher callback + `.catch()` handler to guarantee `webhooks` state is safely maintained as an array.

## Verification
- Code inspected and verified against database types (`src/lib/database.types.ts`).
- Updated `Log.txt` with timestamp entry.
