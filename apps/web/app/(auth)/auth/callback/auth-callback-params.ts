import type { EmailOtpType } from "@supabase/supabase-js";

/** Allowed `type` query values for Supabase email links (PKCE / server exchange). */
const EMAIL_OTP_TYPES = new Set<string>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

/**
 * Next path after auth callback. Only same-origin relative paths are allowed.
 */
export function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

/**
 * Parses and validates `type` from the auth callback query for `verifyOtp`.
 */
export function parseEmailOtpType(raw: string | null): EmailOtpType | null {
  if (!raw) return null;
  return EMAIL_OTP_TYPES.has(raw) ? (raw as EmailOtpType) : null;
}
