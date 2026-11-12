import { HttpError } from "./supabase";
import { requireSampleRole, type SampleIdentity } from "./sample-accounts";
import { DEFAULT_SETTINGS, payoutSchedule, splitSale, sumSplits } from "./domain";
import { sampleMakerGstRegistered } from "./sample-maker";

export type SampleOperationalStatus = "new" | "packed" | "dispatched" | "delivered" | "problem" | "delayed" | "refunded";
export interface SampleOperationalOrder {
  id: string;
  productId: string;
  productName: string;
  makerId: string;
  makerBrand: string;
  qty: number;
  amountPaise: number;
  customer: string;
  city: string;
  date: string;
  status: SampleOperationalStatus;
  courier: string;
  tracking: string;
  deliveredOn: string | null;
  settled: boolean;
  issue: string;
}
export interface SampleFulfilmentInput {
  status: "packed" | "dispatched" | "delivered" | "problem";
  courier: string;
  tracking: string;
  note: string;
}

const seed: SampleOperationalOrder[] = [
  { id: "BT-1047", productId: "t-lotuspond", productName: "Lotus Pond Candle Set", makerId: "tathaastu", makerBrand: "Tathaastu", qty: 1, amountPaise: 240000, customer: "Ananya Kulkarni", city: "Pune", date: "2026-11-03", status: "new", courier: "", tracking: "", deliveredOn: null, settled: false, issue: "" },
  { id: "BT-1044", productId: "t-message", productName: "Bouquet with a Message", makerId: "tathaastu", makerBrand: "Tathaastu", qty: 1, amountPaise: 220000, customer: "Rohan Mehta", city: "Gurugram", date: "2026-11-01", status: "packed", courier: "", tracking: "", deliveredOn: null, settled: false, issue: "" },
  { id: "BT-1039", productId: "t-teapot", productName: "Large Teapot Bouquet", makerId: "tathaastu", makerBrand: "Tathaastu", qty: 1, amountPaise: 320000, customer: "Shalini Rao", city: "Bengaluru", date: "2026-10-29", status: "dispatched", courier: "Delhivery", tracking: "DL4471209", deliveredOn: null, settled: false, issue: "" },
  { id: "BT-1031", productId: "t-marigold", productName: "Marigold Urli", makerId: "tathaastu", makerBrand: "Tathaastu", qty: 6, amountPaise: 720000, customer: "Vikram Sethi", city: "Delhi", date: "2026-10-24", status: "delivered", courier: "", tracking: "", deliveredOn: "2026-10-28", settled: false, issue: "" },
  { id: "BT-1028", productId: "t-crimson", productName: "Crimson Lotus Urli", makerId: "tathaastu", makerBrand: "Tathaastu", qty: 1, amountPaise: 180000, customer: "Farah Khan", city: "Mumbai", date: "2026-10-21", status: "delivered", courier: "", tracking: "", deliveredOn: "2026-10-25", settled: false, issue: "" },
  { id: "BT-1012", productId: "t-sunflower", productName: "Sunflower Trio", makerId: "tathaastu", makerBrand: "Tathaastu", qty: 1, amountPaise: 150000, customer: "Neha Bansal", city: "Noida", date: "2026-10-08", status: "delivered", courier: "", tracking: "", deliveredOn: "2026-10-12", settled: true, issue: "" },
  { id: "BT-1046", productId: "mu-box", productName: "The Mushhk Essential Box", makerId: "mushhk", makerBrand: "Mushhk", qty: 2, amountPaise: 640000, customer: "Kabir Singh", city: "Jaipur", date: "2026-11-02", status: "new", courier: "", tracking: "", deliveredOn: null, settled: false, issue: "" },
  { id: "BT-1042", productId: "an-range", productName: "The Anirveda Ritual Set", makerId: "anirveda", makerBrand: "Anirveda", qty: 1, amountPaise: 350000, customer: "Meenakshi Iyer", city: "Chennai", date: "2026-10-31", status: "delivered", courier: "", tracking: "", deliveredOn: "2026-11-04", settled: false, issue: "" },
  { id: "BT-1040", productId: "sv-divya", productName: "Svara Divya", makerId: "svara", makerBrand: "Svara", qty: 1, amountPaise: 180000, customer: "Aditi Ghosh", city: "Kolkata", date: "2026-10-30", status: "dispatched", courier: "Blue Dart", tracking: "BD88120455", deliveredOn: null, settled: false, issue: "" },
  { id: "BT-1036", productId: "mu-dream", productName: "Dream Haven Room Mist", makerId: "mushhk", makerBrand: "Mushhk", qty: 2, amountPaise: 190000, customer: "Sana Mirza", city: "Hyderabad", date: "2026-10-27", status: "delivered", courier: "", tracking: "", deliveredOn: "2026-10-31", settled: false, issue: "" },
  { id: "BT-1033", productId: "an-kumkum", productName: "Anirveda Kumkumadi Face Pack", makerId: "anirveda", makerBrand: "Anirveda", qty: 2, amountPaise: 150000, customer: "Ira Malhotra", city: "Delhi", date: "2026-10-25", status: "delivered", courier: "", tracking: "", deliveredOn: "2026-10-29", settled: false, issue: "" },
  { id: "BT-1030", productId: "mu-toes", productName: "Tranquil Toes Foot Soak", makerId: "mushhk", makerBrand: "Mushhk", qty: 4, amountPaise: 260000, customer: "Joseph Mathew", city: "Kochi", date: "2026-10-22", status: "problem", courier: "", tracking: "", deliveredOn: null, settled: false, issue: "A pouch arrived torn" },
];

const clone = <T>(value: T): T => structuredClone(value);
const orders = new Map(seed.map(order => [order.id, order]));
const payoutMakers = [
  { id: "tathaastu", brand: "Tathaastu", gstRegistered: true },
  { id: "mushhk", brand: "Mushhk", gstRegistered: true },
  { id: "svara", brand: "Svara", gstRegistered: true },
  { id: "anirveda", brand: "Anirveda", gstRegistered: true },
] as const;
type SamplePayoutRun = {
  makerId: string; makerBrand: string; date: string; orderIds: string[];
  split: ReturnType<typeof splitSale>;
};
type SamplePaidPayout = {
  makerId: string; makerBrand: string; date: string; orderIds: string[];
  grossPaise: number; payoutPaise: number; paidOn: string;
};
const paidRuns = new Map<string, SamplePaidPayout>();

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function earningsFor(maker: typeof payoutMakers[number], today = todayIso()) {
  const mine = [...orders.values()].filter(order => order.makerId === maker.id);
  const gstRegistered = sampleMakerGstRegistered(maker.id);
  const payable = mine.map(order => ({
    id: order.id, makerId: maker.id, amountPaise: order.amountPaise, gstPct: 18,
    status: order.status, deliveredOn: order.deliveredOn, settled: order.settled,
  }));
  const schedule = payoutSchedule(payable, gstRegistered, today, DEFAULT_SETTINGS);
  const delivered = mine.filter(order => order.status === "delivered" && !order.settled);
  const split = sumSplits(delivered.map(order => splitSale(order.amountPaise, 18, gstRegistered, DEFAULT_SETTINGS)));
  const pending = mine.filter(order => ["new", "packed", "dispatched"].includes(order.status));
  const runs: SamplePayoutRun[] = schedule.runs.map(run => ({
    makerId: maker.id, makerBrand: maker.brand, date: run.date, orderIds: run.orderIds, split: run.split,
  }));
  return {
    sample: true as const, makerId: maker.id, makerBrand: maker.brand, deliveredCount: delivered.length, split, runs,
    nextRunDate: schedule.nextRunDate, nextPayoutPaise: runs[0]?.split.payoutPaise ?? 0,
    nextPayoutDate: runs[0]?.date ?? schedule.nextRunDate,
    pendingCount: pending.length, pendingPaise: pending.reduce((sum, order) => sum + order.amountPaise, 0),
  };
}

function makerIdFor(identity: SampleIdentity) {
  requireSampleRole(identity, ["maker"]);
  if (identity.identity === "maker") return "tathaastu";
  if (identity.identity === "maker-other") return "mushhk";
  throw new HttpError(403, "This sample maker does not have a linked shop.");
}

export function listSampleMakerOrders(identity: SampleIdentity) {
  const makerId = makerIdFor(identity);
  return { sample: true as const, orders: clone([...orders.values()].filter(order => order.makerId === makerId)) };
}

export function listSampleAdminOrders(identity: SampleIdentity) {
  requireSampleRole(identity, ["admin"]);
  return { sample: true as const, orders: clone([...orders.values()]) };
}

export function getSampleMakerEarnings(identity: SampleIdentity) {
  const makerId = makerIdFor(identity);
  const maker = payoutMakers.find(item => item.id === makerId);
  if (!maker) throw new HttpError(404, "Sample maker earnings were not found.");
  return earningsFor(maker);
}

export function getSampleAdminPayouts(identity: SampleIdentity) {
  requireSampleRole(identity, ["admin"]);
  const runs = payoutMakers.flatMap(maker => earningsFor(maker).runs);
  return { sample: true as const, runs, paidRuns: clone([...paidRuns.values()]) };
}

export function recordSamplePayoutPaid(identity: SampleIdentity, makerId: string, date: string) {
  requireSampleRole(identity, ["admin"]);
  const maker = payoutMakers.find(item => item.id === makerId);
  if (!maker) throw new HttpError(404, "Sample payout maker was not found.");
  const key = `${makerId}:${date}`;
  if (paidRuns.has(key)) throw new HttpError(409, "This weekly sample payout was already recorded as paid.");
  const run = earningsFor(maker).runs.find(item => item.date === date);
  if (!run || run.orderIds.length === 0) throw new HttpError(409, "This sample payout is not currently eligible. Refresh and review the run.");
  for (const orderId of run.orderIds) {
    const order = orders.get(orderId);
    if (!order || order.settled || order.status !== "delivered") {
      throw new HttpError(409, "The payout changed before it was recorded. Refresh and review the eligible orders.");
    }
  }
  const paid: SamplePaidPayout = {
    makerId, makerBrand: maker.brand, date, orderIds: [...run.orderIds],
    grossPaise: run.split.grossPaise, payoutPaise: run.split.payoutPaise, paidOn: todayIso(),
  };
  for (const orderId of run.orderIds) orders.get(orderId)!.settled = true;
  paidRuns.set(key, paid);
  return {
    ...clone(paid), id: key,
    message: "Recorded as paid in isolated sample data. No bank transfer was sent.",
  };
}

export function updateSampleOrderFulfilment(identity: SampleIdentity, id: string, input: SampleFulfilmentInput) {
  const makerId = makerIdFor(identity);
  const order = orders.get(id);
  if (!order) throw new HttpError(404, "Sample order not found.");
  if (order.makerId !== makerId) throw new HttpError(403, "This sample order belongs to another maker.");
  const note = input.note.trim();

  if (input.status === "problem") {
    if (order.status === "delivered" || order.status === "refunded" || order.status === "problem") {
      throw new HttpError(409, "This order cannot be reported as a new problem in its current status.");
    }
    if (note.length < 3) throw new HttpError(400, "Add a short note describing the problem.");
    order.status = "problem";
    order.issue = note;
  } else if (input.status === "packed" && order.status === "new") {
    order.status = "packed";
    order.issue = "";
  } else if (input.status === "dispatched" && order.status === "packed") {
    const courier = input.courier.trim();
    const tracking = input.tracking.trim();
    if (!courier || !tracking) throw new HttpError(400, "Add both the courier and tracking number before dispatch.");
    order.status = "dispatched";
    order.courier = courier;
    order.tracking = tracking;
  } else if (input.status === "delivered" && order.status === "dispatched") {
    order.status = "delivered";
    order.deliveredOn = new Date().toISOString().slice(0, 10);
  } else {
    throw new HttpError(409, "This order cannot make that fulfilment transition. Refresh and check its current status.");
  }
  return clone(order);
}

export function updateSampleAdminOrderStatus(identity: SampleIdentity, id: string, status: "delayed" | "refunded", rawNote: string) {
  requireSampleRole(identity, ["admin"]);
  const order = orders.get(id);
  if (!order) throw new HttpError(404, "Sample order not found.");
  const note = rawNote.trim();
  if (note.length < 3) throw new HttpError(400, "Add a note before recording a delay or refund status.");
  if (order.status === "refunded") throw new HttpError(409, "This sample order already has a refund status recorded.");
  if (status === "delayed" && ["delivered", "problem"].includes(order.status)) {
    throw new HttpError(409, "A delivered or problem order cannot be marked delayed.");
  }
  order.status = status;
  order.issue = note;
  return clone(order);
}

export function resetSampleOperationsData() {
  orders.clear();
  for (const order of seed) orders.set(order.id, clone(order));
  paidRuns.clear();
}
