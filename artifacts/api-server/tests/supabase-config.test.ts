import { afterEach, expect, it, vi } from "vitest";
import { connectionConfigurationStatus, publicConfig } from "../src/lib/supabase";

afterEach(() => vi.unstubAllEnvs());

it("normalizes whitespace and a trailing project URL slash", () => {
  vi.stubEnv("SUPABASE_URL", " https://development.example.invalid/ ");
  vi.stubEnv("SUPABASE_ANON_KEY", " sb_publishable_TEST_NOT_A_REAL_KEY ");
  expect(connectionConfigurationStatus()).toEqual({ keyValid: true, urlValid: true });
  expect(publicConfig()).toEqual({
    url: "https://development.example.invalid", anon: "sb_publishable_TEST_NOT_A_REAL_KEY",
  });
});

it("does not expose or accept server-only secret keys", () => {
  vi.stubEnv("SUPABASE_URL", "https://development.example.invalid");
  vi.stubEnv("SUPABASE_ANON_KEY", "sb_secret_TEST_NOT_A_REAL_KEY");
  expect(connectionConfigurationStatus()).toEqual({ keyValid: false, urlValid: true });
  expect(publicConfig()).toEqual({ url: "", anon: "" });
});

it("rejects a database connection string or API path as the project URL", () => {
  vi.stubEnv("SUPABASE_ANON_KEY", "sb_publishable_TEST_NOT_A_REAL_KEY");
  for (const url of ["postgresql://example.invalid/test", "https://development.example.invalid/rest/v1"]) {
    vi.stubEnv("SUPABASE_URL", url);
    expect(connectionConfigurationStatus()).toEqual({ keyValid: true, urlValid: false });
    expect(publicConfig()).toEqual({ url: "", anon: "" });
  }
});
