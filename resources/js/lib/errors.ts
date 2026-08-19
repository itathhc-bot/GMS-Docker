/**
 * Maps backend / auth errors to safe, user-friendly messages.
 * Never expose raw error.message to end users — it can leak schema,
 * RLS policy names, constraint names, or internal Postgres details.
 */

type MaybeError = {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
} | null | undefined;

/**
 * Map a Supabase / Postgres error to a generic user-facing message.
 * Optionally pass an `action` ("save", "delete", "load", ...) for nicer text.
 */
export function getFriendlyErrorMessage(error: MaybeError, action: string = "complete the action"): string {
  if (!error) return `Unable to ${action}. Please try again.`;

  const code = (error as any)?.code as string | undefined;

  switch (code) {
    case "23505":
      return "This record already exists.";
    case "23503":
      return "This action conflicts with related records.";
    case "23502":
      return "A required field is missing.";
    case "23514":
      return "The submitted value is not allowed.";
    case "42501": // insufficient_privilege
    case "PGRST301":
      return "You do not have permission to perform this action.";
    case "PGRST116":
      return "The requested record was not found.";
    default:
      break;
  }

  // Generic RLS denial pattern (Postgrest)
  const msg = ((error as any)?.message ?? "").toString().toLowerCase();
  if (msg.includes("row-level security") || msg.includes("permission denied")) {
    return "You do not have permission to perform this action.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Network error. Please check your connection and try again.";
  }

  return `Unable to ${action}. Please try again.`;
}

/**
 * Generic auth error message — never reveals whether the email exists,
 * whether the password was wrong, etc.
 */
export function getFriendlyAuthErrorMessage(error: MaybeError, kind: "login" | "reset" | "update" = "login"): string {
  if (!error) {
    if (kind === "reset") return "Unable to send reset link. Please try again.";
    if (kind === "update") return "Unable to update password. Please try again.";
    return "Login failed. Please check your credentials.";
  }

  const status = (error as any)?.status as number | undefined;
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";

  if (kind === "reset") return "Unable to send reset link. Please verify your email and try again.";
  if (kind === "update") return "Unable to update password. The link may have expired.";
  return "Login failed. Please check your credentials.";
}
