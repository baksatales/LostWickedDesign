import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import app from "../src/app";

let server: Server;
let url: string;
beforeAll(async () => {
  // Force isolated setup-required mode: these tests must never write to a remote DB.
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_ANON_KEY", "");
  vi.stubEnv("AI_INTEGRATIONS_OPENAI_BASE_URL", "");
  vi.stubEnv("AI_INTEGRATIONS_OPENAI_API_KEY", "");
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  vi.unstubAllEnvs();
});
const post = (path: string, data: unknown, headers: Record<string, string> = {}) => fetch(url + path, {
  method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(data),
});

describe("public storefront API", () => {
  it("returns a labelled sample catalogue with all four makers and integer prices", async () => {
    const response = await fetch(url + "/catalog");
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sample).toBe(true);
    expect(data.makers).toHaveLength(4);
    expect(data.products.length).toBeGreaterThan(8);
    expect(data.products.every((p: { pricePaise: number }) => Number.isSafeInteger(p.pricePaise))).toBe(true);
    expect(JSON.stringify(data)).not.toMatch(/owner_user_id|product_costs|service_role|phone|admin_note/);
  });
  it("reports unavailable integrations without pretending to connect them", async () => {
    const data = await (await fetch(url + "/runtime")).json();
    expect(data).toMatchObject({ database: false, auth: false, payments: false, ai: false, supabaseUrl: "", supabaseAnonKey: "" });
  });
  it("never exposes a mistakenly configured secret instead of an anon key", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "sb_secret_not-a-real-secret");
    const data = await (await fetch(url + "/runtime")).json();
    expect(data.supabaseAnonKey).toBe("");
    expect(data.auth).toBe(false);
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
  });
  it("returns relevance reasons with every match and enforces the buyer's exact budget", async () => {
    const response = await post("/recommendations", { recipient: "parent", occasion: "diwali", feeling: "heart", budgetPaise: 180000 });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.matches.length).toBeGreaterThan(0);
    expect(data.matches.every((m: { product: { pricePaise: number }; reason: string }) => m.product.pricePaise <= 180000 && m.reason.length > 0)).toBe(true);
  });
  it("returns a useful empty set, not an over-budget recommendation", async () => {
    const data = await (await post("/recommendations", { recipient: "parent", occasion: "diwali", feeling: "heart", budgetPaise: 100 })).json();
    expect(data.matches).toEqual([]);
  });
  it("supports skipped questions without claiming personalised or AI results", async () => {
    const data = await (await post("/recommendations", { recipient: "", occasion: "", feeling: "", budgetPaise: 350000 })).json();
    expect(data.matches).toHaveLength(4);
    expect(data.matches[0].reason).toContain("Choose an occasion");
  });
  it("rejects negative and non-integer budgets", async () => {
    for (const budgetPaise of [-1, 200.5, "240000"]) {
      expect((await post("/recommendations", { recipient: "parent", occasion: "diwali", feeling: "heart", budgetPaise })).status).toBe(400);
    }
  });
  it("does not permit an unknown checkout or payment confirmation route", async () => {
    expect((await post("/checkout", { price: 1, paid: true })).status).toBe(404);
    expect((await post("/payment-webhook", { status: "captured" })).status).toBe(404);
  });
});

describe("mutation boundaries without external setup", () => {
  it("serves an explicit default editorial document without exposing a draft", async () => {
    const response = await fetch(url + "/site");
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.configured).toBe(false);
    expect(result.revision).toBe(0);
    expect(result.document.sections.some((s: { type: string }) => s.type === "story")).toBe(true);
    expect(result).not.toHaveProperty("draft");
    expect(JSON.stringify(result)).not.toContain("Start with the feeling");
  });
  it("protects all editorial, AI and operational endpoints from anonymous writes", async () => {
    for (const [path, method] of [
      ["/admin/site", "GET"], ["/admin/site", "PUT"], ["/admin/site/publish", "POST"],
      ["/admin/site/restore", "POST"], ["/operations", "GET"],
      ["/admin/applications/10000000-0000-4000-8000-000000000001", "PATCH"],
      ["/admin/briefs/10000000-0000-4000-8000-000000000001", "PATCH"],
      ["/orders/10000000-0000-4000-8000-000000000001/fulfilment", "PATCH"],
      ["/maker/brand", "PUT"], ["/maker/products/10000000-0000-4000-8000-000000000001/images", "PUT"],
      ["/editorial/assist", "POST"],
    ]) {
      const response = await fetch(url + path, { method, headers: { "content-type": "application/json", "x-role": "admin" }, ...(method !== "GET" ? { body: "{}" } : {}) });
      expect(response.status, `${method} ${path}`).toBe(401);
    }
  });
  it("refuses an anonymous workspace, including a forged role header", async () => {
    expect((await fetch(url + "/workspace", { headers: { "x-role": "admin" } })).status).toBe(401);
  });
  it("never accepts client-supplied role or identity to save a product", async () => {
    const response = await post("/maker/products", { role: "maker", userId: "invented", name: "Product", status: "live" });
    expect(response.status).toBe(401);
  });
  it("does not approve products based on an anonymous request", async () => {
    expect((await post("/admin/review", { decision: "approved", role: "admin" })).status).toBe(401);
  });
  it("does not pretend to save a corporate brief when Supabase is absent", async () => {
    const response = await post("/corporate", {
      purpose: "Team appreciation", quantity: 20, budgetPaise: 150000,
      neededBy: "2030-12-12", contactName: "Test", company: "Test company",
      email: "example@example.com", message: "",
    });
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("No changes were saved");
  });
  it("requires a real account for maker applications", async () => {
    const response = await post("/applications", {
      brand: "Test craft", contactName: "Test", phone: "9876543210", craft: "Candles",
      city: "Test city", state: "Test state", gstRegistered: false,
    });
    expect(response.status).toBe(401);
  });
  it("rejects malformed applications and dates before any attempt to persist", async () => {
    expect((await post("/applications", { brand: "X" })).status).toBe(400);
    expect((await post("/corporate", {
      purpose: "Gift", quantity: 1, budgetPaise: 100, neededBy: "2030-02-30",
      contactName: "X", company: "Y", email: "example@example.com", message: "",
    })).status).toBe(400);
  });
  it("returns a safe error for malformed JSON", async () => {
    const response = await fetch(url + "/recommendations", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
    expect(response.status).toBe(400);
    expect((await response.json()).error).not.toContain("SyntaxError");
  });
});
