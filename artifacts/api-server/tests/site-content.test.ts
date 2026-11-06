import { describe, expect, it } from "vitest";
import { defaultSite, validateSiteDocument, contrast, isSafeImage, isSafeLink } from "../src/lib/site-content";

describe("editable editorial safety", () => {
  it("accepts the supplied default document and readable palette", () => {
    expect(validateSiteDocument(structuredClone(defaultSite)).brand.name).toBe("Baksa Tales");
    expect(contrast(defaultSite.theme.ink, defaultSite.theme.background)).toBeGreaterThan(4.5);
  });
  it("allows ordinary editorial edits without changing commerce rules", () => {
    const draft = structuredClone(defaultSite);
    draft.brand.announcement = "A new season at Baksa";
    draft.sections.reverse();
    draft.sections[0]!.visible = false;
    draft.trunkCards[0]!.title = "A new little discovery";
    expect(validateSiteDocument(draft)).toEqual(draft);
  });
  it("rejects active schemes and embedded or tracking-host image credentials", () => {
    for (const value of ["javascript:alert(1)", "//evil.example", "data:image/svg+xml;base64,AAAA", "/\\evil.example"]) {
      expect(isSafeLink(value)).toBe(false);
      expect(isSafeImage(value)).toBe(false);
    }
    expect(isSafeImage("https://user:password@example.com/photo.jpg")).toBe(false);
    expect(isSafeLink("/gift-finder")).toBe(true);
    expect(isSafeImage("/images/baksa/t-bluelotus.webp")).toBe(true);
  });
  it("rejects unreadable colours, invalid font tokens and arbitrary CSS", () => {
    const bad = structuredClone(defaultSite);
    bad.theme.ink = bad.theme.background;
    expect(() => validateSiteDocument(bad)).toThrow(/contrast/);
    expect(() => validateSiteDocument({ ...defaultSite, theme: { ...defaultSite.theme, headingFont: "url(evil)" } })).toThrow();
    expect(() => validateSiteDocument({ ...defaultSite, theme: { ...defaultSite.theme, radius: -1 } })).toThrow();
  });
  it("rejects duplicate content IDs and broken story references", () => {
    const duplicate = structuredClone(defaultSite);
    duplicate.sections.push(duplicate.sections[0]!);
    expect(() => validateSiteDocument(duplicate)).toThrow(/unique/);
    const missing = structuredClone(defaultSite);
    missing.stories = [];
    expect(() => validateSiteDocument(missing)).toThrow(/visible story/);
  });
  it("does not accept huge embedded content or unsafe navigation", () => {
    const bad = structuredClone(defaultSite);
    bad.navigation[0]!.href = "javascript:alert(1)";
    expect(() => validateSiteDocument(bad)).toThrow(/Links/);
    bad.navigation[0]!.href = "/shop";
    bad.brand.logo = "data:image/png;base64,AAAA";
    expect(() => validateSiteDocument(bad)).toThrow(/image/);
  });
});
