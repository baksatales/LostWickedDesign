import { beforeAll, afterAll, beforeEach, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Request } from "express";

// Only these route tests substitute account/database adapters. Hosted Auth,
// signature verification and real RLS are NOT established by these mocks.
const state = vi.hoisted(() => ({ authorized: false, role: "buyer", rpc: vi.fn() }));
vi.mock("../src/lib/supabase", async importOriginal => {
  const actual = await importOriginal<typeof import("../src/lib/supabase")>();
  return {
    ...actual,
    salesDevelopmentAuthorized: () => state.authorized,
    safeConnection: async () => ({ rpc: state.rpc }),
    identity: async (req: Request) => {
      if (!req.get("authorization")) throw new actual.HttpError(401, "Sign in");
      return { db: { rpc: state.rpc }, roles: [state.role], user: { id: "verified-fixture" } };
    },
  };
});
import app from "../src/app";
let server: Server, base: string;
const pid = "20000000-0000-4000-8000-000000000030";
const headers = { authorization: "Bearer signed.fixture.jwt", "content-type": "application/json" };
const quote = { addressId: "20000000-0000-4000-8000-000000000043", lines: [{ productId: pid, quantity: 2 }] };
const call = (path: string, method = "GET", body?: unknown, h = headers) => fetch(base + path, {
  method, headers: h, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
beforeAll(async () => {
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/sales`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => {
  state.authorized = false; state.role = "buyer"; state.rpc.mockReset();
  state.rpc.mockImplementation(async (name: string) => ({
    error: null, data: name === "baksa_sales_readiness"
      ? { schemaReady: true, approvedProducts: 1, shippingConfigured: true }
      : name === "baksa_order_feed" ? [] : pid,
  }));
});
it("does not even query hosted storage without exact development authorization", async () => {
  const result = await (await call("/readiness")).json();
  expect(result).toMatchObject({ checkoutEnabled: false, developmentAuthorized: false, schemaReady: false, provider: "not_connected" });
  expect(state.rpc).not.toHaveBeenCalled();
  expect((await call("/quote", "POST", quote)).status).toBe(503);
  expect(state.rpc).not.toHaveBeenCalled();
});
it("never enables checkout from ready schema or client-supplied paid assertions", async () => {
  state.authorized = true;
  expect(await (await call("/readiness")).json()).toMatchObject({ checkoutEnabled: false, schemaReady: true });
  state.rpc.mockClear();
  const result = await call("/checkouts", "POST", { ...quote, paid: true, totalPaise: 1 });
  expect(result.status).toBe(503);
  expect((await result.json()).error).toContain("No reservation, order or charge");
  expect(state.rpc).not.toHaveBeenCalled();
});
it("rejects sample and anonymous sessions before any database call", async () => {
  state.authorized = true;
  for (const path of ["/quote", "/checkouts", "/operator/orders"]) {
    const method = path === "/operator/orders" ? "GET" : "POST";
    const response = await call(path, method, method === "POST" ? quote : undefined,
      { authorization: "Bearer sample-session-not-a-jwt", "content-type": "application/json" });
    expect(response.status).toBe(401);
  }
  expect(state.rpc).not.toHaveBeenCalled();
});
it("denies buyers the operator feed and mutations regardless of requested role", async () => {
  state.authorized = true;
  expect((await call("/operator/orders")).status).toBe(403);
  expect((await call(`/operator/orders/${pid}`, "PATCH", { role: "admin", status: "packed" })).status).toBe(403);
  expect(state.rpc).not.toHaveBeenCalled();
});
it("rejects browser prices and invalid quantities rather than trusting them", async () => {
  state.authorized = true;
  for (const input of [
    { ...quote, totalPaise: 1 },
    { ...quote, lines: [{ productId: pid, quantity: 2, pricePaise: 1 }] },
    { ...quote, lines: [{ productId: pid, quantity: -1 }] },
    { ...quote, lines: [{ productId: pid, quantity: 1.5 }] },
  ]) expect((await call("/quote", "POST", input)).status).toBe(400);
  expect(state.rpc).not.toHaveBeenCalled();
});
it("uses the quote transaction's response, not bag totals", async () => {
  state.authorized = true;
  const priced = { itemsPaise: 20000, shippingPaise: 12000, totalPaise: 32000,
    lines: [{ productId: pid, makerId: pid, name: "Fixture", quantity: 2, unitPricePaise: 10000, amountPaise: 20000 }] };
  state.rpc.mockResolvedValue({ data: priced, error: null });
  const response = await call("/quote", "POST", quote);
  expect(response.status).toBe(200); expect(await response.json()).toEqual(priced);
  expect(state.rpc).toHaveBeenCalledWith("baksa_sales_quote", { _lines: quote.lines, _address: quote.addressId });
});
it("protects operator transitions with tracking and note requirements", async () => {
  state.authorized = true; state.role = "admin";
  for (const status of ["dispatched", "delayed", "problem", "refunded", "paid"]) {
    const result = await call(`/operator/orders/${pid}`, "PATCH", { status, carrier: "", trackingNumber: "", note: "" });
    expect(result.status).toBe(400);
  }
  expect(state.rpc).not.toHaveBeenCalled();
});
it("records operator fulfilment only after both readiness and transaction checks", async () => {
  state.authorized = true; state.role = "admin";
  expect((await call("/operator/orders")).status).toBe(200);
  const result = await call(`/operator/orders/${pid}`, "PATCH", { status: "dispatched", carrier: "Manual courier", trackingNumber: "TRACK-1", note: "" });
  expect(result.status).toBe(200); expect((await result.json()).message).toContain("No courier booking");
  expect(state.rpc).toHaveBeenCalledWith("baksa_fulfil_order", {
    _order: pid, _status: "dispatched", _carrier: "Manual courier", _tracking: "TRACK-1", _note: "",
  });
});
