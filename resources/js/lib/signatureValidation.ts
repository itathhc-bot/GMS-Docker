/**
 * Signature validation helpers.
 *
 * A signature captured by SignaturePad is stored as a PNG data URL. A "valid"
 * signature must be a non-empty PNG data URL with a reasonable payload size —
 * a blank white canvas serialises to a very small PNG, so we reject anything
 * below a small threshold.
 */

const PNG_PREFIX = "data:image/png;base64,";
// Empirically a 640x160 blank canvas produces ~1.2KB of base64. A real
// signature (even a short one) produces >4KB. 2KB is a safe floor that
// rejects blanks without frustrating legitimate short signatures.
const MIN_BASE64_LENGTH = 2000;

export interface SignatureValidationResult {
  ok: boolean;
  reason?: "missing" | "wrong_format" | "blank";
}

export function isValidSignatureDataUrl(
  value: string | null | undefined,
): boolean {
  return validateSignatureDataUrl(value).ok;
}

export function validateSignatureDataUrl(
  value: string | null | undefined,
): SignatureValidationResult {
  if (!value || typeof value !== "string" || value.trim() === "") {
    return { ok: false, reason: "missing" };
  }
  if (!value.startsWith(PNG_PREFIX)) {
    return { ok: false, reason: "wrong_format" };
  }
  const payload = value.slice(PNG_PREFIX.length);
  if (payload.length < MIN_BASE64_LENGTH) {
    return { ok: false, reason: "blank" };
  }
  return { ok: true };
}
