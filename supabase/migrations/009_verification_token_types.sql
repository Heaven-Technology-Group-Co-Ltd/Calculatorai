-- =============================================================================
-- Premium Math Calculator — Verification Token Types (009)
-- =============================================================================
-- Distinguish email-verification tokens from password-reset tokens.
-- Previously both flows shared rows, so a verification token could be
-- redeemed as a password reset and vice versa.
-- Run AFTER 008 in the Supabase SQL Editor.
-- =============================================================================

ALTER TABLE verification_tokens
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'email_verify';

CREATE INDEX IF NOT EXISTS verification_tokens_identifier_type_idx
  ON verification_tokens (identifier, type);
