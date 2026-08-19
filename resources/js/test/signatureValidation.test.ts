import { describe, it, expect } from "vitest";
import {
  isValidSignatureDataUrl,
  validateSignatureDataUrl,
} from "@/lib/signatureValidation";

describe("signatureValidation", () => {
  it("rejects null / empty", () => {
    expect(isValidSignatureDataUrl(null)).toBe(false);
    expect(isValidSignatureDataUrl("")).toBe(false);
    expect(validateSignatureDataUrl(undefined).reason).toBe("missing");
  });

  it("rejects non-PNG data URLs", () => {
    expect(isValidSignatureDataUrl("data:image/jpeg;base64,AAA")).toBe(false);
    expect(validateSignatureDataUrl("just a string").reason).toBe("wrong_format");
  });

  it("rejects blank / near-blank PNGs", () => {
    const shortPayload = "data:image/png;base64," + "A".repeat(100);
    expect(isValidSignatureDataUrl(shortPayload)).toBe(false);
    expect(validateSignatureDataUrl(shortPayload).reason).toBe("blank");
  });

  it("accepts a PNG with sufficient payload", () => {
    const good = "data:image/png;base64," + "A".repeat(4000);
    expect(isValidSignatureDataUrl(good)).toBe(true);
    expect(validateSignatureDataUrl(good).ok).toBe(true);
  });
});
