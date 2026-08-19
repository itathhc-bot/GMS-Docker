export interface OcrErrorDetail {
  code: string;
  message: string;
}

export interface OcrSuccessPayload {
  ok: true;
  plate: string;
  confidence: number;
  source: string | null;
  rawText?: string | null;
  thumbnail?: string | null;
}

export interface OcrFailurePayload {
  ok: false;
  error: string | OcrErrorDetail;
}

export type OcrPayload = OcrSuccessPayload | OcrFailurePayload;

export function isOcrPayload(value: unknown): value is OcrPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.ok !== "boolean") return false;
  if (v.ok) {
    return typeof v.plate === "string" && typeof v.confidence === "number";
  }
  return v.error !== undefined;
}

export function getOcrErrorMessage(p: OcrFailurePayload, fallback = "OCR failed"): string {
  if (typeof p.error === "string") return p.error;
  if (p.error && typeof p.error === "object" && typeof p.error.message === "string") {
    return p.error.message;
  }
  return fallback;
}

export function getOcrErrorCode(p: OcrFailurePayload): string | null {
  if (p.error && typeof p.error === "object" && typeof p.error.code === "string") {
    return p.error.code;
  }
  return null;
}

// Municipal plate format: accept either a Plate-Recognizer-style "Emirate-Code-Number"
// triplet, or a bare "Code-Number" pair, or 4-6 digits. This matches what the
// edge function emits and what supervisors expect to confirm.
const PLATE_FORMAT_RE =
  /^(?:[A-Za-z][A-Za-z\s]*-)?[A-Z0-9]{1,2}-\d{1,5}$|^\d{4,6}$/;

export function isValidMunicipalPlate(plate: string | null | undefined): boolean {
  if (!plate) return false;
  return PLATE_FORMAT_RE.test(plate.trim());
}

// Cooldown applied between OCR attempts on the same frame to avoid spamming
// the engine. Keep in sync with retry-button countdown UI.
export const OCR_RETRY_COOLDOWN_MS = 5000;
