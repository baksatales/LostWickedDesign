import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import app from "../src/app";

let server: Server;
let api: string;
beforeAll(async () => {
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_ANON_KEY", "");
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  api = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  vi.unstubAllEnvs();
});

async function login(identity: string) {
  const response = await fetch(`${api}/sample/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity, mobileNumber: "9876543210", simulationCode: "246810" }),
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<{ token: string; role: string; sample: true; userId: string }>;
}
const auth = (token: string) => ({ authorization: `Bearer ${token}` });
async function resetSampleDataForTest() {
  const admin = await login("admin");
  const response = await fetch(`${api}/sample/reset`, { method: "POST", headers: auth(admin.token) });
  expect(response.status).toBe(200);
}

describe("isolated server-backed sample accounts", () => {
  it("creates unmistakable sample sessions and never accepts them as Supabase credentials", async () => {
    const session = await login("shopper");
    expect(session).toMatchObject({ role: "shopper", sample: true, userId: "sample-shopper-1" });
    expect(session.token).toMatch(/^[a-f0-9]{64}$/);
    expect((await fetch(`${api}/sample/session`, { headers: auth(session.token) })).status).toBe(200);
    expect((await fetch(`${api}/workspace`, { headers: auth(session.token) })).status).not.toBe(200);
  });

  it("keeps shopper orders, classes, addresses, and wishlist on the server across reload requests", async () => {
    const session = await login("shopper");
    const headers = auth(session.token);
    const first = await (await fetch(`${api}/sample/shopper`, { headers })).json();
    expect(first.sample).toBe(true);
    expect(first.orders.length).toBeGreaterThan(0);
    expect(first.classes.length).toBeGreaterThan(0);
    expect(first.addresses[0].isDefault).toBe(true);

    expect((await fetch(`${api}/sample/shopper/wishlist/t-succulents`, {
      method: "PUT", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ saved: true }),
    })).status).toBe(200);
    const afterReload = await (await fetch(`${api}/sample/shopper`, { headers })).json();
    expect(afterReload.wishlist).toContain("t-succulents");
  });

  it("allows each sample maker to edit only their own server stock", async () => {
    await resetSampleDataForTest();
    const tathaastu = await login("maker");
    const mushhk = await login("maker-other");
    const shopper = await login("shopper");
    const tathaastuHeaders = auth(tathaastu.token);
    const mushhkHeaders = auth(mushhk.token);

    const ownProducts = await fetch(`${api}/sample/maker/products`, { headers: tathaastuHeaders });
    expect(ownProducts.status).toBe(200);
    const list = await ownProducts.json();
    expect(list.products.find((product: { id: string }) => product.id === "t-lotuspond")).toMatchObject({ stock: 6 });
    expect(list.products.some((product: { id: string }) => product.id === "mu-box")).toBe(false);

    const saved = await fetch(`${api}/sample/maker/products/t-lotuspond/stock`, {
      method: "PUT", headers: { ...tathaastuHeaders, "content-type": "application/json" }, body: JSON.stringify({ stock: 9 }),
    });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ id: "t-lotuspond", stock: 9 });
    const afterReload = await (await fetch(`${api}/sample/maker/products`, { headers: tathaastuHeaders })).json();
    expect(afterReload.products.find((product: { id: string }) => product.id === "t-lotuspond").stock).toBe(9);

    const crossShop = await fetch(`${api}/sample/maker/products/t-lotuspond/stock`, {
      method: "PUT", headers: { ...mushhkHeaders, "content-type": "application/json" }, body: JSON.stringify({ stock: 1 }),
    });
    expect(crossShop.status).toBe(403);
    const ownMushhkProduct = await fetch(`${api}/sample/maker/products/mu-box/stock`, {
      method: "PUT", headers: { ...mushhkHeaders, "content-type": "application/json" }, body: JSON.stringify({ stock: 4 }),
    });
    expect(ownMushhkProduct.status).toBe(200);
    expect((await (await fetch(`${api}/sample/maker/products`, { headers: mushhkHeaders })).json()).products)
      .toContainEqual({ id: "mu-box", stock: 4 });

    const invalid = await fetch(`${api}/sample/maker/products/t-lotuspond/stock`, {
      method: "PUT", headers: { ...tathaastuHeaders, "content-type": "application/json" }, body: JSON.stringify({ stock: 1.5 }),
    });
    expect(invalid.status).toBe(400);
    expect((await fetch(`${api}/sample/maker/products`, { headers: auth(shopper.token) })).status).toBe(403);
  });

  it("enforces maker order ownership and safe sample fulfilment transitions", async () => {
    await resetSampleDataForTest();
    const maker = await login("maker");
    const otherMaker = await login("maker-other");
    const admin = await login("admin");
    const shopper = await login("shopper");
    const makerHeaders = { ...auth(maker.token), "content-type": "application/json" };
    const adminHeaders = { ...auth(admin.token), "content-type": "application/json" };

    const mine = await fetch(`${api}/sample/maker/orders`, { headers: auth(maker.token) });
    expect(mine.status).toBe(200);
    const mineBody = await mine.json();
    expect(mineBody.orders.some((order: { id: string }) => order.id === "BT-1047")).toBe(true);
    expect(mineBody.orders.some((order: { id: string }) => order.id === "BT-1046")).toBe(false);
    expect((await fetch(`${api}/sample/admin/orders`, { headers: auth(maker.token) })).status).toBe(403);
    expect((await fetch(`${api}/sample/admin/orders`, { headers: auth(shopper.token) })).status).toBe(403);
    expect((await fetch(`${api}/sample/admin/orders`, { headers: auth(admin.token) })).status).toBe(200);

    const crossShop = await fetch(`${api}/sample/orders/BT-1047/fulfilment`, {
      method: "PATCH", headers: { ...auth(otherMaker.token), "content-type": "application/json" },
      body: JSON.stringify({ status: "packed", courier: "", tracking: "", note: "" }),
    });
    expect(crossShop.status).toBe(403);

    const packed = await fetch(`${api}/sample/orders/BT-1047/fulfilment`, {
      method: "PATCH", headers: makerHeaders,
      body: JSON.stringify({ status: "packed", courier: "", tracking: "", note: "" }),
    });
    expect(packed.status).toBe(200);
    const missingTracking = await fetch(`${api}/sample/orders/BT-1047/fulfilment`, {
      method: "PATCH", headers: makerHeaders,
      body: JSON.stringify({ status: "dispatched", courier: "Delhivery", tracking: "", note: "" }),
    });
    expect(missingTracking.status).toBe(400);
    const dispatched = await fetch(`${api}/sample/orders/BT-1047/fulfilment`, {
      method: "PATCH", headers: makerHeaders,
      body: JSON.stringify({ status: "dispatched", courier: "Delhivery", tracking: "SAMPLE123", note: "" }),
    });
    expect(await dispatched.json()).toMatchObject({ id: "BT-1047", status: "dispatched", courier: "Delhivery", tracking: "SAMPLE123" });
    const delivered = await fetch(`${api}/sample/orders/BT-1047/fulfilment`, {
      method: "PATCH", headers: makerHeaders,
      body: JSON.stringify({ status: "delivered", courier: "", tracking: "", note: "" }),
    });
    expect((await delivered.json()).status).toBe("delivered");

    const adminDelay = await fetch(`${api}/sample/admin/orders/BT-1044/status`, {
      method: "PATCH", headers: adminHeaders, body: JSON.stringify({ status: "delayed", note: "Waiting for sample dispatch." }),
    });
    expect(await adminDelay.json()).toMatchObject({ id: "BT-1044", status: "delayed", issue: "Waiting for sample dispatch." });
    const noNoteRefund = await fetch(`${api}/sample/admin/orders/BT-1044/status`, {
      method: "PATCH", headers: adminHeaders, body: JSON.stringify({ status: "refunded", note: "" }),
    });
    expect(noNoteRefund.status).toBe(400);
    const refundRecord = await fetch(`${api}/sample/admin/orders/BT-1044/status`, {
      method: "PATCH", headers: adminHeaders, body: JSON.stringify({ status: "refunded", note: "Sample refund recorded only." }),
    });
    expect((await refundRecord.json()).status).toBe("refunded");
    expect((await fetch(`${api}/sample/admin/orders/BT-1044/status`, {
      method: "PATCH", headers: adminHeaders, body: JSON.stringify({ status: "refunded", note: "Duplicate record." }),
    })).status).toBe(409);
  });

  it("calculates payout deductions server-side and records eligible weekly runs once", async () => {
    await resetSampleDataForTest();
    const maker = await login("maker");
    const otherMaker = await login("maker-other");
    const admin = await login("admin");
    const shopper = await login("shopper");
    const earningsResponse = await fetch(`${api}/sample/maker/earnings`, { headers: auth(maker.token) });
    expect(earningsResponse.status).toBe(200);
    const earnings = await earningsResponse.json();
    expect(earnings).toMatchObject({ sample: true, makerId: "tathaastu", deliveredCount: 2 });
    const run = earnings.runs[0];
    expect(new Date(run.date).getUTCDay()).toBe(3);
    expect(run.split.grossPaise).toBeGreaterThan(0);
    expect(run.split.deductionsPaise).toBe(
      run.split.commissionPaise + run.split.commissionGstPaise + run.split.tcsPaise + run.split.paymentFeePaise,
    );
    expect(run.split.payoutPaise).toBe(run.split.grossPaise - run.split.deductionsPaise);
    expect((await (await fetch(`${api}/sample/maker/earnings`, { headers: auth(otherMaker.token) })).json()).makerId).toBe("mushhk");
    expect((await fetch(`${api}/sample/admin/payouts`, { headers: auth(maker.token) })).status).toBe(403);
    expect((await fetch(`${api}/sample/admin/payouts`, { headers: auth(shopper.token) })).status).toBe(403);

    const adminBefore = await (await fetch(`${api}/sample/admin/payouts`, { headers: auth(admin.token) })).json();
    expect(adminBefore.runs.some((candidate: { makerId: string; date: string }) => candidate.makerId === "tathaastu" && candidate.date === run.date)).toBe(true);
    const payoutDate = String(run.date).slice(0, 10);
    const settlePath = `${api}/sample/admin/payouts/${run.makerId}/${payoutDate}/paid`;
    const settled = await fetch(settlePath, { method: "POST", headers: auth(admin.token) });
    const receipt = await settled.json();
    expect(settled.status).toBe(200);
    expect(receipt).toMatchObject({ makerId: "tathaastu", date: run.date, orderIds: run.orderIds, payoutPaise: run.split.payoutPaise });
    expect(receipt.message).toContain("No bank transfer was sent");

    const adminAfter = await (await fetch(`${api}/sample/admin/payouts`, { headers: auth(admin.token) })).json();
    expect(adminAfter.runs.some((candidate: { makerId: string }) => candidate.makerId === "tathaastu")).toBe(false);
    expect(adminAfter.paidRuns).toContainEqual(expect.objectContaining({ makerId: "tathaastu", date: run.date }));
    await expect((await fetch(`${api}/sample/maker/earnings`, { headers: auth(maker.token) })).json()).resolves.toMatchObject({ deliveredCount: 0, nextPayoutPaise: 0 });
    expect((await fetch(settlePath, { method: "POST", headers: auth(admin.token) })).status).toBe(409);
  });

  it("keeps maker product drafts private and requires seven completed steps plus fact confirmation", async () => {
    await resetSampleDataForTest();
    const maker = await login("maker");
    const otherMaker = await login("maker-other");
    const admin = await login("admin");
    const headers = { ...auth(maker.token), "content-type": "application/json" };
    const draftInput = {
      name: "A small brass diya", kind: "Diya", material: "Brass", technique: "Hand cast",
      size: "9 cm", pricePaise: 240000, gstPct: 18, stock: 4, dispatchDays: 5,
      madeToOrder: false, costPaise: 60000, story: "Made by hand in a family workshop.",
      photo: "", step: 2,
    };
    const createdResponse = await fetch(`${api}/sample/maker/drafts`, { method: "POST", headers, body: JSON.stringify(draftInput) });
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json();
    const list = await (await fetch(`${api}/sample/maker/drafts`, { headers })).json();
    expect(list.drafts).toContainEqual(expect.objectContaining({ id: created.id, costPaise: 60000 }));
    expect((await fetch(`${api}/sample/maker/drafts/${created.id}`, { headers: auth(otherMaker.token) })).status).toBe(404);
    expect((await fetch(`${api}/sample/maker/drafts`, { headers: auth(admin.token) })).status).toBe(403);

    const completed = { ...draftInput, photo: "/images/baksa/sample-diya.jpg", step: 7 };
    expect((await fetch(`${api}/sample/maker/drafts/${created.id}`, {
      method: "PUT", headers, body: JSON.stringify(completed),
    })).status).toBe(200);
    expect((await fetch(`${api}/sample/maker/drafts/${created.id}/submit`, {
      method: "POST", headers, body: JSON.stringify({ confirmedFacts: false }),
    })).status).toBe(400);
    const submittedResponse = await fetch(`${api}/sample/maker/drafts/${created.id}/submit`, {
      method: "POST", headers, body: JSON.stringify({ confirmedFacts: true }),
    });
    expect(submittedResponse.status).toBe(200);
    expect(await submittedResponse.json()).toMatchObject({ id: created.id, status: "review" });
    await expect((await fetch(`${api}/sample/maker/drafts/${created.id}`, { headers })).json()).resolves.toMatchObject({ status: "submitted" });
    expect((await fetch(`${api}/sample/maker/drafts/${created.id}`, {
      method: "PUT", headers, body: JSON.stringify(completed),
    })).status).toBe(409);

    const adminHeaders = auth(admin.token);
    const queueResponse = await fetch(`${api}/sample/admin/product-reviews`, { headers: adminHeaders });
    const queue = await queueResponse.json();
    expect(queueResponse.status).toBe(200);
    expect(queue.reviews[0]).not.toHaveProperty("costPaise");
    const reviewPath = `${api}/sample/admin/product-reviews/${created.id}`;
    expect((await fetch(reviewPath, {
      method: "PATCH", headers: { ...adminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ action: "changes", checks: [false, false, false, false, false], note: " " }),
    })).status).toBe(400);
    expect((await fetch(reviewPath, {
      method: "PATCH", headers: { ...auth(maker.token), "content-type": "application/json" },
      body: JSON.stringify({ action: "approve", checks: [true, true, true, true, true], note: "" }),
    })).status).toBe(403);
    expect((await fetch(reviewPath, {
      method: "PATCH", headers: { ...adminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ action: "approve", checks: [true, true, true, true, false], note: "" }),
    })).status).toBe(400);
    const approved = await fetch(reviewPath, {
      method: "PATCH", headers: { ...adminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ action: "approve", checks: [true, true, true, true, true], note: "" }),
    });
    expect(approved.status).toBe(200);
    expect(await approved.json()).toMatchObject({ id: created.id, status: "live", checks: [true, true, true, true, true] });
    await expect((await fetch(`${api}/sample/maker/drafts/${created.id}`, { headers })).json()).resolves.toMatchObject({ status: "live", costPaise: 60000 });
    const catalog = await (await fetch(`${api}/catalog`)).json();
    expect(catalog.products).toContainEqual(expect.objectContaining({ name: draftInput.name, status: "live", stock: 4 }));
    const duplicate = await fetch(reviewPath, {
      method: "PATCH", headers: { ...adminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ action: "approve", checks: [true, true, true, true, true], note: "" }),
    });
    expect(duplicate.status).toBe(409);
  });

  it("calculates product contribution from private maker costs on the server", async () => {
    await resetSampleDataForTest();
    const maker = await login("maker");
    const otherMaker = await login("maker-other");
    const shopper = await login("shopper");
    const headers = auth(maker.token);
    const first = await (await fetch(`${api}/sample/maker/profits`, { headers })).json();
    expect(first.products.find((product: { productId: string }) => product.productId === "t-lotuspond")).toMatchObject({
      costPaise: 60000, pricePaise: 240000,
    });
    expect((await fetch(`${api}/sample/maker/profits`, { headers: auth(shopper.token) })).status).toBe(403);
    expect((await fetch(`${api}/sample/maker/products/t-lotuspond/cost`, {
      method: "PUT", headers: { ...auth(otherMaker.token), "content-type": "application/json" },
      body: JSON.stringify({ costPaise: 50000 }),
    })).status).toBe(404);
    const saved = await fetch(`${api}/sample/maker/products/t-lotuspond/cost`, {
      method: "PUT", headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ costPaise: 125000 }),
    });
    expect(saved.status).toBe(200);
    const projection = await saved.json();
    expect(projection).toMatchObject({ productId: "t-lotuspond", costPaise: 125000 });
    expect(projection.leftPerSalePaise).toBe(projection.split.netAfterGstPaise - 125000);
    const persisted = await (await fetch(`${api}/sample/maker/profits`, { headers })).json();
    expect(persisted.products.find((product: { productId: string }) => product.productId === "t-lotuspond").costPaise).toBe(125000);
    const publicCatalog = await (await fetch(`${api}/catalog`)).json();
    expect(publicCatalog.products.find((product: { id: string }) => product.id === "t-lotuspond")).not.toHaveProperty("costPaise");
  });

  it("keeps maker trust server-controlled while persisting GST and state per shop", async () => {
    await resetSampleDataForTest();
    const maker = await login("maker");
    const otherMaker = await login("maker-other");
    const shopper = await login("shopper");
    const settingsPath = `${api}/sample/maker/settings`;
    const makerHeaders = auth(maker.token);
    const initial = await (await fetch(settingsPath, { headers: makerHeaders })).json();
    expect(initial).toMatchObject({ trusted: true, approvedCount: 3, gstRegistered: true, state: "Delhi", payoutOnboarding: "not_configured" });
    expect(initial.message).toContain("Bank details are not collected");
    const saved = await fetch(settingsPath, {
      method: "PUT", headers: { ...makerHeaders, "content-type": "application/json" },
      body: JSON.stringify({ gstRegistered: false, state: "Rajasthan", trusted: false }),
    });
    expect(saved.status).toBe(400);
    const updated = await fetch(settingsPath, {
      method: "PUT", headers: { ...makerHeaders, "content-type": "application/json" },
      body: JSON.stringify({ gstRegistered: false, state: "Rajasthan" }),
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ trusted: true, gstRegistered: false, state: "Rajasthan" });
    expect((await (await fetch(settingsPath, { headers: auth(otherMaker.token) })).json()).state).toBe("Uttar Pradesh");
    expect((await fetch(settingsPath, { headers: auth(shopper.token) })).status).toBe(403);
  });

  it("keeps opportunity briefs private and persists maker replies and class proposals", async () => {
    await resetSampleDataForTest();
    const maker = await login("maker");
    const otherMaker = await login("maker-other");
    const shopper = await login("shopper");
    const admin = await login("admin");
    const makerHeaders = auth(maker.token);
    const opportunitiesPath = `${api}/sample/maker/opportunities`;
    const opportunityResult = await fetch(opportunitiesPath, { headers: makerHeaders });
    const opportunityData = await opportunityResult.json();
    expect(opportunityData.opportunities).toHaveLength(2);
    expect(JSON.stringify(opportunityData)).not.toMatch(/companyName|contactName|contactEmail|company@example/i);
    expect((await (await fetch(opportunitiesPath, { headers: auth(otherMaker.token) })).json()).opportunities).toHaveLength(0);
    expect((await fetch(opportunitiesPath, { headers: auth(shopper.token) })).status).toBe(403);
    expect((await fetch(opportunitiesPath, { headers: auth(admin.token) })).status).toBe(403);
    const response = await fetch(`${opportunitiesPath}/op1/response`, {
      method: "PATCH", headers: { ...makerHeaders, "content-type": "application/json" }, body: JSON.stringify({ decision: "yes" }),
    });
    expect(response.status).toBe(200);
    expect((await (await fetch(opportunitiesPath, { headers: makerHeaders })).json()).opportunities[0].status).toBe("yes");
    const crossMaker = await fetch(`${opportunitiesPath}/op1/response`, {
      method: "PATCH", headers: { ...auth(otherMaker.token), "content-type": "application/json" }, body: JSON.stringify({ decision: "no" }),
    });
    expect(crossMaker.status).toBe(404);
    const proposalResponse = await fetch(`${api}/sample/maker/masterclass-proposals`, {
      method: "POST", headers: { ...makerHeaders, "content-type": "application/json" },
      body: JSON.stringify({ title: "Shape a soy wax lotus", type: "Live workshop", duration: "2 hours", pricePaise: 180000, about: "Learn safe wax preparation and a beginner-friendly lotus candle process." }),
    });
    expect(proposalResponse.status).toBe(201);
    const proposal = await proposalResponse.json();
    const adminProposalsPath = `${api}/sample/admin/masterclass-proposals`;
    expect((await fetch(adminProposalsPath, { headers: makerHeaders })).status).toBe(403);
    expect((await (await fetch(adminProposalsPath, { headers: auth(admin.token) })).json()).proposals).toHaveLength(2);
    const missingNote = await fetch(`${adminProposalsPath}/${proposal.id}`, {
      method: "PATCH", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ decision: "changes", note: "" }),
    });
    expect(missingNote.status).toBe(400);
    const reviewed = await fetch(`${adminProposalsPath}/${proposal.id}`, {
      method: "PATCH", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ decision: "changes", note: "Add clearer learner outcomes." }),
    });
    expect(reviewed.status).toBe(200);
    expect((await reviewed.json()).status).toBe("changes");
    const reviewedList = await (await fetch(adminProposalsPath, { headers: auth(admin.token) })).json();
    expect(reviewedList.proposals.find((item: { id: string }) => item.id === proposal.id).note).toBe("Add clearer learner outcomes.");
  });

  it("allows admins to decide vendor applications once and rejects other roles", async () => {
    await resetSampleDataForTest();
    const admin = await login("admin");
    const maker = await login("maker");
    const shopper = await login("shopper");
    const path = `${api}/sample/admin/vendor-applications`;
    expect((await fetch(path, { headers: auth(maker.token) })).status).toBe(403);
    expect((await fetch(path, { headers: auth(shopper.token) })).status).toBe(403);
    const listed = await (await fetch(path, { headers: auth(admin.token) })).json();
    expect(listed.applications.find((application: { id: string }) => application.id === "a1").status).toBe("pending");
    const book = await fetch(`${path}/a1`, {
      method: "PATCH", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ decision: "book_call" }),
    });
    expect((await book.json()).status).toBe("call");
    const repeatBook = await fetch(`${path}/a1`, {
      method: "PATCH", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ decision: "book_call" }),
    });
    expect(repeatBook.status).toBe(409);
    const approve = await fetch(`${path}/a1`, {
      method: "PATCH", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ decision: "approve" }),
    });
    expect((await approve.json()).status).toBe("approved");
    const duplicate = await fetch(`${path}/a1`, {
      method: "PATCH", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ decision: "decline" }),
    });
    expect(duplicate.status).toBe(409);
    expect((await (await fetch(path, { headers: auth(admin.token) })).json()).applications.find((application: { id: string }) => application.id === "a1").status).toBe("approved");
  });

  it("saves corporate leads, private maker matches, stages, replies, and quotes", async () => {
    await resetSampleDataForTest();
    const admin = await login("admin");
    const maker = await login("maker");
    const otherMaker = await login("maker-other");
    const shopper = await login("shopper");
    const create = await fetch(`${api}/sample/corporate/enquiries`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ purpose: "Team appreciation", qty: 45, budgetPaise: 350000, neededBy: "2026-12-20", name: "A Buyer", company: "Sample Co", contact: "buyer@example.com" }),
    });
    expect(create.status).toBe(201);
    const { ref } = await create.json();
    const adminPath = `${api}/sample/admin/enquiries`;
    expect((await fetch(adminPath, { headers: auth(maker.token) })).status).toBe(403);
    expect((await fetch(adminPath, { headers: auth(shopper.token) })).status).toBe(403);
    let all = await (await fetch(adminPath, { headers: auth(admin.token) })).json();
    expect(all.enquiries.find((e: { ref: string }) => e.ref === ref)).toMatchObject({ company: "Sample Co", contact: "buyer@example.com", stage: "new" });
    const match = await fetch(`${adminPath}/${ref}/matches`, {
      method: "PUT", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ makerIds: ["m2"] }),
    });
    expect(match.status).toBe(200);
    const briefs = await (await fetch(`${api}/sample/maker/opportunities`, { headers: auth(otherMaker.token) })).json();
    const brief = briefs.opportunities.find((o: { id: string }) => o.id === `brief-${ref}-m2`);
    expect(brief).toBeTruthy();
    expect(JSON.stringify(brief)).not.toMatch(/Sample Co|buyer@example.com|A Buyer/);
    const response = await fetch(`${api}/sample/maker/opportunities/brief-${ref}-m2/response`, {
      method: "PATCH", headers: { ...auth(otherMaker.token), "content-type": "application/json" }, body: JSON.stringify({ decision: "yes" }),
    });
    expect(response.status).toBe(200);
    const quote = await fetch(`${adminPath}/${ref}/quote`, {
      method: "PUT", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ quotePaise: 500000 }),
    });
    expect((await quote.json()).stage).toBe("quote");
    const stage = await fetch(`${adminPath}/${ref}/stage`, {
      method: "PATCH", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ stage: "won" }),
    });
    expect((await stage.json()).stage).toBe("won");
    all = await (await fetch(adminPath, { headers: auth(admin.token) })).json();
    expect(all.enquiries.find((e: { ref: string }) => e.ref === ref)).toMatchObject({ quotePaise: 500000, stage: "won", responses: { m2: "yes" } });
  });

  it("builds admin overview metrics and attention items from saved server records", async () => {
    await resetSampleDataForTest();
    const admin = await login("admin");
    const shopper = await login("shopper");
    const path = `${api}/sample/admin/overview`;
    expect((await fetch(path, { headers: auth(shopper.token) })).status).toBe(403);
    const result = await (await fetch(path, { headers: auth(admin.token) })).json();
    expect(result.sample).toBe(true);
    expect(result.metrics).toMatchObject({ orderCount: expect.any(Number), salesPaise: expect.any(Number), pendingReviewCount: expect.any(Number), pendingApplicationCount: expect.any(Number) });
    expect(result.attention.some((item: { kind: string; id: string }) => item.kind === "order" && item.id === "BT-1030")).toBe(true);
    expect(result.attention.some((item: { kind: string; id: string }) => item.kind === "application" && item.id === "a1")).toBe(true);
    const statusUpdate = await fetch(`${api}/sample/admin/orders/BT-1047/status`, {
      method: "PATCH", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ status: "delayed", note: "Courier handoff is late." }),
    });
    expect(statusUpdate.status).toBe(200);
    const refreshed = await (await fetch(path, { headers: auth(admin.token) })).json();
    expect(refreshed.metrics.openIssueCount).toBeGreaterThan(0);
    expect(refreshed.attention.some((item: { id: string; label: string }) => item.id === "BT-1047" && item.label.includes("Delayed"))).toBe(true);
  });

  it("validates and persists live workshop CSV imports in the admin Academy", async () => {
    await resetSampleDataForTest();
    const admin = await login("admin");
    const maker = await login("maker");
    const path = `${api}/sample/admin/academy`;
    expect((await fetch(path, { headers: auth(maker.token) })).status).toBe(403);
    const initial = await (await fetch(path, { headers: auth(admin.token) })).json();
    expect(initial.sales).toHaveLength(3);
    const csv = [
      "id,date,course,learner,amount,status",
      'tag-001,2026-11-10,"Paint, pattern and finish",Sample learner 004,1250.50,paid',
    ].join("\n");
    const imported = await fetch(`${path}/import`, {
      method: "POST", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ csv }),
    });
    expect(imported.status).toBe(200);
    expect(await imported.json()).toMatchObject({ imported: 1, summary: { importedCount: 1, seatsSold: 4 } });
    const invalid = await fetch(`${path}/import`, {
      method: "POST", headers: { ...auth(admin.token), "content-type": "application/json" },
      body: JSON.stringify({ csv: "id,date,course,learner,amount,status\ntag-002,2026-02-30,Course,Learner,100,paid" }),
    });
    expect(invalid.status).toBe(400);
    const duplicate = await fetch(`${path}/import`, {
      method: "POST", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ csv }),
    });
    expect(duplicate.status).toBe(400);
    const persisted = await (await fetch(path, { headers: auth(admin.token) })).json();
    expect(persisted.sales.find((sale: { id: string }) => sale.id === "tag-001")).toMatchObject({ course: "Paint, pattern and finish", amountPaise: 125050, source: "tagmango_import" });
  });

  it("supports shopper address creation, default selection, removal, and one default", async () => {
    const session = await login("shopper");
    const headers = { ...auth(session.token), "content-type": "application/json" };
    const created = await fetch(`${api}/sample/shopper/addresses`, {
      method: "POST", headers,
      body: JSON.stringify({
        name: "Aarav Mehta", phone: "9876543210", line1: "8 New Sample Road", line2: "",
        city: "Pune", state: "Maharashtra", pin: "411002", isDefault: false,
      }),
    });
    expect(created.status).toBe(201);
    const addressId = (await created.json()).id as string;
    const selected = await fetch(`${api}/sample/shopper/addresses/${addressId}/default`, {
      method: "PATCH", headers,
    });
    expect(selected.status).toBe(200);
    const account = await (await fetch(`${api}/sample/shopper`, { headers })).json();
    expect(account.addresses.filter((address: { isDefault: boolean }) => address.isDefault)).toHaveLength(1);
    expect(account.addresses.find((address: { id: string }) => address.id === addressId).isDefault).toBe(true);
    expect((await fetch(`${api}/sample/shopper/addresses/${addressId}`, { method: "DELETE", headers })).status).toBe(200);
    const afterRemoval = await (await fetch(`${api}/sample/shopper`, { headers })).json();
    expect(afterRemoval.addresses.some((address: { id: string }) => address.id === addressId)).toBe(false);
    expect(afterRemoval.addresses.filter((address: { isDefault: boolean }) => address.isDefault)).toHaveLength(1);
  });

  it("calculates sample checkout totals, decrements server stock, and safely replays requests", async () => {
    await resetSampleDataForTest();
    const session = await login("shopper");
    const before = await (await fetch(`${api}/catalog`)).json();
    expect(before.products.find((product: { id: string }) => product.id === "t-bluelotus").stock).toBe(6);
    const checkout = {
      lines: [{ productId: "t-bluelotus", quantity: 2 }],
      deliveryAddress: {
        name: "Aarav Sample", phone: "9876543210", line1: "12 Sample Lane", line2: "Flat 4B",
        state: "Maharashtra", pin: "411001",
      },
      idempotencyKey: "10000000-0000-4000-8000-000000000001",
    };
    const first = await fetch(`${api}/sample/shopper/checkout`, {
      method: "POST", headers: { ...auth(session.token), "content-type": "application/json" }, body: JSON.stringify(checkout),
    });
    expect(first.status).toBe(201);
    const receipt = await first.json();
    expect(receipt).toMatchObject({ sample: true, totalPaise: 480000 });
    expect(receipt.message).toContain("without charging");
    const replay = await fetch(`${api}/sample/shopper/checkout`, {
      method: "POST", headers: { ...auth(session.token), "content-type": "application/json" }, body: JSON.stringify(checkout),
    });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ orderId: receipt.orderId, reference: receipt.reference });
    const after = await (await fetch(`${api}/catalog`)).json();
    expect(after.products.find((product: { id: string }) => product.id === "t-bluelotus").stock).toBe(4);
    const account = await (await fetch(`${api}/sample/shopper`, { headers: auth(session.token) })).json();
    expect(account.orders[0]).toMatchObject({ id: receipt.orderId, reference: receipt.reference, status: "placed" });
    expect(account.orders[0]).not.toHaveProperty("deliveryAddress");
    const changedReplay = await fetch(`${api}/sample/shopper/checkout`, {
      method: "POST", headers: { ...auth(session.token), "content-type": "application/json" },
      body: JSON.stringify({ ...checkout, lines: [{ productId: "t-bluelotus", quantity: 3 }] }),
    });
    expect(changedReplay.status).toBe(409);
  });

  it("applies coupon discounts on the server and enforces single-use limits", async () => {
    await resetSampleDataForTest();
    const admin = await login("admin");
    const shopper = await login("shopper");
    const otherShopper = await login("shopper-other");
    const adminHeaders = auth(admin.token);
    const coupons = await fetch(`${api}/sample/admin/coupons`, { headers: adminHeaders });
    expect(coupons.status).toBe(200);
    expect((await coupons.json()).coupons[0]).toMatchObject({ code: "WELCOME10", discountType: "percent", discountValue: 10, active: true });
    expect((await fetch(`${api}/sample/admin/coupons`, { headers: auth(shopper.token) })).status).toBe(403);
    expect((await fetch(`${api}/sample/admin/coupons`, { headers: auth((await login("maker")).token) })).status).toBe(403);

    const order = {
      lines: [{ productId: "t-bluelotus", quantity: 2 }],
      deliveryAddress: { name: "Sample Buyer", phone: "9876543210", line1: "4 Sample Lane", state: "Maharashtra", pin: "411001" },
      couponCode: " welcome10 ", idempotencyKey: "30000000-0000-4000-8000-000000000001",
    };
    const first = await fetch(`${api}/sample/shopper/checkout`, {
      method: "POST", headers: { ...auth(shopper.token), "content-type": "application/json" }, body: JSON.stringify(order),
    });
    expect(first.status).toBe(201);
    const receipt = await first.json();
    expect(receipt).toMatchObject({ itemsPaise: 480000, discountPaise: 48000, couponCode: "WELCOME10", totalPaise: 432000 });

    const replay = await fetch(`${api}/sample/shopper/checkout`, {
      method: "POST", headers: { ...auth(shopper.token), "content-type": "application/json" }, body: JSON.stringify(order),
    });
    expect(replay.status).toBe(200);
    const duplicateUse = await fetch(`${api}/sample/shopper/checkout`, {
      method: "POST", headers: { ...auth(shopper.token), "content-type": "application/json" },
      body: JSON.stringify({ ...order, idempotencyKey: "30000000-0000-4000-8000-000000000002" }),
    });
    expect(duplicateUse.status).toBe(422);

    const otherUse = await fetch(`${api}/sample/shopper/checkout`, {
      method: "POST", headers: { ...auth(otherShopper.token), "content-type": "application/json" },
      body: JSON.stringify({ ...order, idempotencyKey: "30000000-0000-4000-8000-000000000003" }),
    });
    expect(otherUse.status).toBe(201);
    const after = await fetch(`${api}/sample/admin/coupons`, { headers: adminHeaders });
    expect((await after.json()).coupons[0].usedCount).toBe(2);
  });

  it("allows only the sample admin to create and edit valid coupons", async () => {
    await resetSampleDataForTest();
    const admin = await login("admin");
    const shopper = await login("shopper");
    const input = {
      code: "SPRING25", discountType: "percent", discountValue: 25, minimumPaise: 100000,
      maximumDiscountPaise: 50000, startsAt: "2026-01-01T00:00:00.000Z", endsAt: "2030-01-01T00:00:00.000Z",
      usageLimit: 10, perShopperLimit: 2, active: true,
    };
    const denied = await fetch(`${api}/sample/admin/coupons`, {
      method: "POST", headers: { ...auth(shopper.token), "content-type": "application/json" }, body: JSON.stringify(input),
    });
    expect(denied.status).toBe(403);
    const created = await fetch(`${api}/sample/admin/coupons`, {
      method: "POST", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify(input),
    });
    expect(created.status).toBe(201);
    const coupon = await created.json();
    expect(coupon).toMatchObject({ code: "SPRING25", usedCount: 0, active: true });
    const duplicate = await fetch(`${api}/sample/admin/coupons`, {
      method: "POST", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify(input),
    });
    expect(duplicate.status).toBe(409);
    const updated = await fetch(`${api}/sample/admin/coupons/${coupon.id}`, {
      method: "PUT", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ ...input, active: false }),
    });
    expect(updated.status).toBe(200);
    expect((await updated.json()).active).toBe(false);
    const invalid = await fetch(`${api}/sample/admin/coupons/${coupon.id}`, {
      method: "PUT", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ ...input, endsAt: input.startsAt }),
    });
    expect(invalid.status).toBe(400);
  });

  it("keeps draft blog posts private and publishes only admin-approved sample entries", async () => {
    await resetSampleDataForTest();
    const admin = await login("admin");
    const shopper = await login("shopper");
    const input = {
      slug: "notes-from-the-workshop", title: "Notes from the workshop",
      excerpt: "A sample journal entry about making and thoughtful gifts.",
      body: "This is sample editorial text for preview and testing only.\n\nIt is not a claim about a real maker or product.",
      author: "Baksa Tales", status: "draft",
    };
    expect((await fetch(`${api}/sample/blog`)).status).toBe(200);
    expect((await (await fetch(`${api}/sample/blog`)).json()).posts).toHaveLength(0);
    expect((await fetch(`${api}/sample/admin/blog`, { headers: auth(shopper.token) })).status).toBe(403);
    const created = await fetch(`${api}/sample/admin/blog`, {
      method: "POST", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify(input),
    });
    expect(created.status).toBe(201);
    const post = await created.json();
    expect(post).toMatchObject({ slug: input.slug, status: "draft", publishedAt: null });
    expect((await (await fetch(`${api}/sample/blog`)).json()).posts).toHaveLength(0);
    const duplicate = await fetch(`${api}/sample/admin/blog`, {
      method: "POST", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify(input),
    });
    expect(duplicate.status).toBe(409);
    const published = await fetch(`${api}/sample/admin/blog/${post.id}`, {
      method: "PUT", headers: { ...auth(admin.token), "content-type": "application/json" }, body: JSON.stringify({ ...input, status: "published" }),
    });
    expect(published.status).toBe(200);
    expect((await published.json()).publishedAt).toBeTruthy();
    const publicPosts = await fetch(`${api}/sample/blog`);
    expect((await publicPosts.json()).posts).toMatchObject([{ slug: input.slug, status: "published" }]);
    await fetch(`${api}/sample/reset`, { method: "POST", headers: auth(admin.token) });
    expect((await (await fetch(`${api}/sample/blog`)).json()).posts).toHaveLength(0);
  });

  it("confirms stock atomically when sample buyers check out concurrently", async () => {
    await resetSampleDataForTest();
    const session = await login("shopper");
    const results = await Promise.all(Array.from({ length: 7 }, (_, i) => fetch(`${api}/sample/shopper/checkout`, {
      method: "POST",
      headers: { ...auth(session.token), "content-type": "application/json" },
      body: JSON.stringify({
        lines: [{ productId: "t-bluelotus", quantity: 1 }],
        addressId: "sample-address-1",
        idempotencyKey: `20000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      }),
    })));
    expect(results.filter(result => result.status === 201)).toHaveLength(6);
    expect(results.filter(result => result.status === 409)).toHaveLength(1);
    const catalog = await (await fetch(`${api}/catalog`)).json();
    expect(catalog.products.find((product: { id: string }) => product.id === "t-bluelotus").stock).toBe(0);
  });

  it("denies missing roles and cross-shopper address access", async () => {
    const shopper = await login("shopper");
    const other = await login("shopper-other");
    const otherAccount = await (await fetch(`${api}/sample/shopper`, { headers: auth(other.token) })).json();
    expect(otherAccount.orders).toEqual([]);
    expect(otherAccount.addresses).toEqual([]);
    expect((await fetch(`${api}/sample/shopper`, { headers: auth(await login("maker").then(x => x.token)) })).status).toBe(403);
    expect((await fetch(`${api}/sample/shopper`)).status).toBe(401);
    expect((await fetch(`${api}/sample/shopper/addresses/sample-address-1/default`, {
      method: "PATCH", headers: auth(other.token),
    })).status).toBe(404);
    expect((await fetch(`${api}/sample/shopper/addresses/sample-address-1`, {
      method: "DELETE", headers: auth(other.token),
    })).status).toBe(404);
    expect(shopper.userId).not.toBe(other.userId);
  });

  it("requires the explicit sample admin identity to reset sample data", async () => {
    const shopper = await login("shopper");
    const admin = await login("admin");
    const path = `${api}/sample/shopper/wishlist/t-succulents`;
    await fetch(path, { method: "PUT", headers: { ...auth(shopper.token), "content-type": "application/json" }, body: '{"saved":true}' });
    expect((await fetch(`${api}/sample/reset`, { method: "POST", headers: auth(shopper.token) })).status).toBe(403);
    expect((await fetch(`${api}/sample/reset`, { method: "POST", headers: auth(admin.token) })).status).toBe(200);
    const account = await (await fetch(`${api}/sample/shopper`, { headers: auth(shopper.token) })).json();
    expect(account.wishlist).toEqual(["t-bluelotus", "mu-box"]);
  });

  it("rejects malformed sample identities and invalid wishlist products", async () => {
    expect((await fetch(`${api}/sample/session`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: '{"identity":"owner","mobileNumber":"9876543210","simulationCode":"246810"}',
    })).status).toBe(400);
    expect((await fetch(`${api}/sample/session`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: '{"identity":"shopper","mobileNumber":"9876543210","simulationCode":"123456"}',
    })).status).toBe(400);
    const shopper = await login("shopper");
    expect((await fetch(`${api}/sample/shopper/wishlist/not-a-product`, {
      method: "PUT", headers: { ...auth(shopper.token), "content-type": "application/json" }, body: '{"saved":true}',
    })).status).toBe(404);
    expect((await fetch(`${api}/sample/shopper/addresses`, {
      method: "POST", headers: { ...auth(shopper.token), "content-type": "application/json" },
      body: JSON.stringify({
        name: "Aarav", phone: "9876543210", line1: "1 Test Street", line2: "",
        city: "Pune", state: "Maharashtra", pin: "000000", isDefault: false,
      }),
    })).status).toBe(400);
  });
});
