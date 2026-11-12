import { afterEach, expect, it, vi } from "vitest";
import { salesDevelopmentAuthorized } from "../src/lib/supabase";
afterEach(() => vi.unstubAllEnvs());
it("requires a development opt-in bound to the exact project, not merely existing credentials", () => {
  vi.stubEnv("SUPABASE_URL", "https://fixture.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "sb_publishable_fixture");
  vi.stubEnv("BAKSA_SALES_ENVIRONMENT", "");
  vi.stubEnv("BAKSA_AUTHORIZED_DEV_PROJECT_REF", "");
  expect(salesDevelopmentAuthorized()).toBe(false);
  vi.stubEnv("BAKSA_SALES_ENVIRONMENT", "development");
  vi.stubEnv("BAKSA_AUTHORIZED_DEV_PROJECT_REF", "fixture");
  expect(salesDevelopmentAuthorized()).toBe(true);
  vi.stubEnv("SUPABASE_URL", "https://different.supabase.co");
  expect(salesDevelopmentAuthorized()).toBe(false);
  vi.stubEnv("SUPABASE_URL", "https://fixture.supabase.co");
  vi.stubEnv("BAKSA_SALES_ENVIRONMENT", "production");
  expect(salesDevelopmentAuthorized()).toBe(false);
});
