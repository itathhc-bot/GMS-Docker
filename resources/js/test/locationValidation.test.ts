import { describe, it, expect } from "vitest";
import { validateLocation, isValidLocation } from "@/lib/locationValidation";

/**
 * These cases are intentionally exercised against both create- and update-style
 * inputs so we can guarantee identical behavior across flows.
 */
const malformed = [
  "<script>",
  "A1; DROP TABLE",
  'A1"',
  "A1'",
  "A1`",
  "A1\\B",
  "AB\u0000CD",          // null byte
  "AB\u0007CD",          // bell control char
  "  ",                  // only whitespace -> trimmed to empty (allowed null) NOT malformed
  "X".repeat(33),        // too long
  "-A1",                 // does not start with alnum
  ".A1",
  "/A1",
  "#A1",
  "A1@B",                // '@' not allowed
  "A1+B",
  "A1*B",
  "A1(B)",
];

describe("validateLocation", () => {
  it("accepts null/undefined as null", () => {
    expect(validateLocation(null)).toEqual({ ok: true, value: null });
    expect(validateLocation(undefined)).toEqual({ ok: true, value: null });
  });

  it("treats empty / whitespace-only strings as null", () => {
    expect(validateLocation("")).toEqual({ ok: true, value: null });
    expect(validateLocation("   ")).toEqual({ ok: true, value: null });
  });

  it("rejects non-strings", () => {
    expect(validateLocation(123 as unknown).ok).toBe(false);
    expect(validateLocation({} as unknown).ok).toBe(false);
    expect(validateLocation([] as unknown).ok).toBe(false);
    expect(validateLocation(true as unknown).ok).toBe(false);
  });

  it.each([
    ["A1", "A1"],
    ["Shelf-12", "Shelf-12"],
    ["B.2/3", "B.2/3"],
    ["Room#7", "Room#7"],
    ["Aisle_4", "Aisle_4"],
    ["A1   B2", "A1 B2"],            // collapses internal whitespace
    ["  A1  ", "A1"],                // trims edges
    ["X".repeat(32), "X".repeat(32)],// max length
  ])("accepts and canonicalises %j", (input, expected) => {
    const result = validateLocation(input);
    expect(result).toEqual({ ok: true, value: expected });
  });

  it.each(malformed.filter((m) => m.trim().length > 0))(
    "rejects malformed value %j",
    (input) => {
      const result = validateLocation(input);
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(typeof result.reason).toBe("string");
        expect(result.reason.length).toBeGreaterThan(0);
      }
    },
  );

  it("rejects values longer than 32 chars with a length-specific reason", () => {
    const result = validateLocation("X".repeat(33));
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.reason).toMatch(/32/);
  });

  it("isValidLocation mirrors validateLocation.ok across create & update flows", () => {
    // Simulate a create flow + an update flow re-validating the same value.
    const cases = ["A1", "  A1  ", "<bad>", "X".repeat(33), null, "", "Shelf-12"];
    for (const c of cases) {
      const v = validateLocation(c);
      expect(isValidLocation(c)).toBe(v.ok);
      // Re-running validation on the canonical value (update flow) must still pass.
      if (v.ok && v.value !== null) {
        const second = validateLocation(v.value);
        expect(second.ok).toBe(true);
        if (second.ok) expect(second.value).toBe(v.value);
      }
    }
  });

  it("is consistent: same input always yields same outcome", () => {
    for (const input of ["A1", "<bad>", "  ", "Shelf 1"]) {
      const a = validateLocation(input);
      const b = validateLocation(input);
      expect(a).toEqual(b);
    }
  });
});
