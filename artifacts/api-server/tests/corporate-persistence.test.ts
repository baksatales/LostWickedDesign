import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

const storage = vi.hoisted(() => ({ insert: vi.fn(), from: vi.fn() }));
vi.mock("../src/lib/supabase", async importOriginal => ({
  ...await importOriginal<typeof import("../src/lib/supabase")>(),
  safeConnection: vi.fn(async () => ({ from: storage.from })),
}));
import app from "../src/app";

let server: Server;
let url: string;
beforeAll(async () => {
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/corporate`;
});
beforeEach(() => {
  storage.from.mockReset().mockReturnValue({ insert: storage.insert });
  storage.insert.mockReset().mockResolvedValue({ error: null });
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

const input = {
  purpose: "Client appreciation", quantity: 500, budgetPaise: 250000,
  neededBy: "2030-12-12", contactName: "Test", company: "Test company",
  reach: "+91 98765 43210", customization: "A branded note",
  deliveryCities: "Delhi, Mumbai", referenceUrl: "https://example.invalid/brief", message: "Paper packaging",
};
const post = (body: unknown) => fetch(url, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

it("persists per-gift budget and every optional brief field to the existing private table", async () => {
  const response = await post(input);
  expect(response.status).toBe(201);
  expect(storage.from).toHaveBeenCalledWith("corporate_enquiries");
  expect(storage.insert).toHaveBeenCalledWith(expect.objectContaining({
    quantity: 500, budget_per_gift_paise: 250000, reach: "+91 98765 43210",
    customisation: ["A branded note"], delivery_cities: "Delhi, Mumbai",
    reference_link: "https://example.invalid/brief", message: "Paper packaging",
  }));
  expect((await response.json()).id).toMatch(/^BT-CG-[0-9A-F]{8}$/);
});

it("does not return a saved reference after a database failure", async () => {
  storage.insert.mockResolvedValue({ error: { message: "test storage failure" } });
  const response = await post(input);
  expect(response.status).toBe(502);
  const result = await response.json();
  expect(result.id).toBeUndefined();
  expect(result.error).toContain("Nothing has been confirmed");
});

it("rejects an unsafe reference without attempting to store the brief", async () => {
  const response = await post({ ...input, referenceUrl: "javascript:alert(1)" });
  expect(response.status).toBe(400);
  expect(storage.insert).not.toHaveBeenCalled();
});
