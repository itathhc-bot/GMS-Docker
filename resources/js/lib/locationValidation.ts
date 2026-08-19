/**
 * Shared validation for shelf/location codes used in inventory & parts requests.
 *
 * Rules:
 *  - Trim whitespace.
 *  - Allow letters, digits, dash, dot, slash, hash and a single space between tokens.
 *  - Length 1..32 once trimmed.
 *  - Reject control characters and SQL-ish meta tokens.
 *
 * Returns `{ ok: true, value }` with the canonicalized value, or `{ ok: false, reason }`.
 */
export type LocationValidation =
  | { ok: true; value: string | null }
  | { ok: false; reason: string };

const ALLOWED = /^[A-Za-z0-9][A-Za-z0-9 \-./#_]{0,31}$/;
const FORBIDDEN = /[\u0000-\u001F<>"';\\`]/;

export function validateLocation(raw: unknown): LocationValidation {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, reason: "Location must be a string." };
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (trimmed.length > 32) return { ok: false, reason: "Location must be 32 characters or fewer." };
  if (FORBIDDEN.test(trimmed)) return { ok: false, reason: "Location contains forbidden characters." };
  if (!ALLOWED.test(trimmed)) return { ok: false, reason: "Use letters, digits, and -./#_ only." };
  // Collapse internal repeated spaces.
  const canonical = trimmed.replace(/\s+/g, " ");
  return { ok: true, value: canonical };
}

export function isValidLocation(raw: unknown): boolean {
  return validateLocation(raw).ok;
}
