import { describe, expect, it } from "vitest";
import { corporateContact } from "../src/lib/corporate-brief";

describe("corporate contact and reference validation", () => {
  it("keeps the legacy email contract working", () => {
    expect(corporateContact({ email: "team@example.invalid" })).toEqual({
      reach: "team@example.invalid", referenceUrl: "",
    });
  });
  it.each(["9876543210", "+91 98765 43210", "91-98765-43210", "team@example.invalid"])(
    "accepts a work email or Indian WhatsApp contact: %s", reach => {
      expect(corporateContact({ reach }).reach).toBe(reach);
    },
  );
  it.each(["", "   ", "not an email", "12345", "+1 555 123 4567", "abc9876543210"])(
    "rejects missing or unusable contact: %s", reach => {
      expect(() => corporateContact({ reach })).toThrow("valid work email");
    },
  );
  it.each(["javascript:alert(1)", "http://example.invalid", "https://user:password@example.invalid", "/local/file"])(
    "rejects unsafe reference links: %s", referenceUrl => {
      expect(() => corporateContact({ reach: "team@example.invalid", referenceUrl })).toThrow("https reference link");
    },
  );
  it("trims supplied details without creating fake contact confirmations", () => {
    expect(corporateContact({
      reach: " team@example.invalid ", referenceUrl: " https://example.invalid/brief ",
    })).toEqual({ reach: "team@example.invalid", referenceUrl: "https://example.invalid/brief" });
  });
});
