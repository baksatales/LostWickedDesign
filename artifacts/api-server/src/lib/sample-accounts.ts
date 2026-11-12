import { randomUUID } from "node:crypto";
import { HttpError } from "./supabase";
import { sampleCatalog } from "./catalog";
import { DEFAULT_SETTINGS, shippingFor } from "./domain";

export type SampleRole = "shopper" | "maker" | "admin";
export type SampleIdentityKey = "shopper" | "shopper-other" | "maker" | "maker-other" | "admin";
export interface SampleIdentity {
  sample: true;
  identity: SampleIdentityKey;
  role: SampleRole;
  userId: string;
  displayName: string;
}
export interface SampleAddress {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pin: string;
  isDefault: boolean;
}
export interface SampleOrder {
  id: string;
  reference: string;
  status: "placed" | "packed" | "on_the_way" | "delivered" | "delayed";
  placedOn: string;
  totalPaise: number;
  discountPaise: number;
  couponCode: string | null;
  items: string[];
  trackingNumber: string;
  carrier: string;
  delayNote: string;
}
export interface SampleClass {
  id: string;
  title: string;
  teacher: string;
  access: "recorded" | "live";
  schedule: string;
}
export interface SampleShopperAccount {
  sample: true;
  displayName: string;
  orders: SampleOrder[];
  classes: SampleClass[];
  addresses: SampleAddress[];
  wishlist: string[];
}
export interface SampleCheckoutLine { productId: string; quantity: number }
export interface SampleDeliveryAddress {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  state: string;
  pin: string;
}
export interface SampleCheckoutResult {
  sample: true;
  orderId: string;
  reference: string;
  itemsPaise: number;
  discountPaise: number;
  couponCode: string | null;
  shippingPaise: number;
  totalPaise: number;
  message: string;
}
export type SampleCouponInput = {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minimumPaise: number;
  maximumDiscountPaise: number | null;
  startsAt: string;
  endsAt: string;
  usageLimit: number | null;
  perShopperLimit: number;
  active: boolean;
};
export type SampleCoupon = SampleCouponInput & { id: string; usedCount: number };

interface SessionRecord {
  identity: SampleIdentity;
  expiresAt: number;
}
interface ShopperRecord {
  orders: SampleOrder[];
  classes: SampleClass[];
  addresses: SampleAddress[];
  wishlist: string[];
}

const SAMPLE_IDENTITIES: Record<SampleIdentityKey, Omit<SampleIdentity, "sample">> = {
  shopper: { identity: "shopper", role: "shopper", userId: "sample-shopper-1", displayName: "Aarav Mehta" },
  "shopper-other": { identity: "shopper-other", role: "shopper", userId: "sample-shopper-2", displayName: "Mira Shah" },
  maker: { identity: "maker", role: "maker", userId: "sample-maker-1", displayName: "Tathaastu Studio" },
  "maker-other": { identity: "maker-other", role: "maker", userId: "sample-maker-2", displayName: "Mushhk Studio" },
  admin: { identity: "admin", role: "admin", userId: "sample-admin-1", displayName: "Baksa team" },
};

const productIds = new Set([
  "t-lotuspond", "t-crimson", "t-message", "t-teapot", "t-marigold", "t-sunflower",
  "t-shell", "t-starfish", "t-lady", "t-gajra", "t-bluelotus", "t-succulents",
  "mu-box", "mu-dawn", "mu-moon", "mu-amber", "mu-dream", "mu-toes", "mu-espresso",
  "sv-sandhya", "sv-ratri", "sv-divya", "an-range", "an-snanika", "an-kumkum",
]);

const clone = <T>(value: T): T => structuredClone(value);
const shoppers = new Map<string, ShopperRecord>();
const sessions = new Map<string, SessionRecord>();
const sampleProducts = new Map(sampleCatalog.products.map(product => [product.id, product]));
const sampleProductOwners = new Map<string, string>([...productIds].map(id => [
  id, sampleProducts.get(id)?.makerId ?? (id.startsWith("mu-") ? "mushhk" : id.startsWith("sv-") ? "svara" : id.startsWith("an-") ? "anirveda" : "tathaastu"),
]));
const dynamicProductIds = new Set<string>();
const initialInventory = new Map([...productIds].map(productId => [
  productId, sampleProducts.get(productId)?.stock ?? 6,
]));
const inventory = new Map(initialInventory);
const checkoutKeys = new Map<string, { digest: string; result: SampleCheckoutResult }>();
const privateSampleDeliveries = new Map<string, SampleDeliveryAddress>();
const coupons = new Map<string, SampleCoupon>();
const couponUses = new Map<string, Map<string, number>>();

function initialCoupons() {
  coupons.clear();
  couponUses.clear();
  const welcome: SampleCoupon = {
    id: "sample-coupon-welcome10", code: "WELCOME10", discountType: "percent", discountValue: 10,
    minimumPaise: 0, maximumDiscountPaise: 100000, startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2035-01-01T00:00:00.000Z", usageLimit: 100, perShopperLimit: 1, usedCount: 0, active: true,
  };
  coupons.set(welcome.id, welcome);
}

function initialShoppers() {
  shoppers.clear();
  shoppers.set("sample-shopper-1", {
    orders: [
      {
        id: "sample-order-1", reference: "BT-SAMPLE-1047", status: "on_the_way",
        placedOn: "2026-11-03", totalPaise: 240000, discountPaise: 0, couponCode: null, items: ["Lotus Pond Candle Set"],
        trackingNumber: "SAMPLE-TRACK-1047", carrier: "Sample courier", delayNote: "",
      },
      {
        id: "sample-order-2", reference: "BT-SAMPLE-1031", status: "delayed",
        placedOn: "2026-10-24", totalPaise: 720000, discountPaise: 0, couponCode: null, items: ["Marigold Urli × 6"],
        trackingNumber: "", carrier: "", delayNote: "Sample delay note. This is not a courier update.",
      },
      {
        id: "sample-order-3", reference: "BT-SAMPLE-1012", status: "delivered",
        placedOn: "2026-10-08", totalPaise: 150000, discountPaise: 0, couponCode: null, items: ["Sunflower Trio"],
        trackingNumber: "SAMPLE-TRACK-1012", carrier: "Sample courier", delayNote: "",
      },
    ],
    classes: [
      { id: "sample-class-1", title: "Price your handmade work with confidence", teacher: "Baksa Tales team", access: "recorded", schedule: "Sample enrolment · no private video access" },
      { id: "sample-class-2", title: "Tell your brand’s story in 60 seconds", teacher: "Baksa Tales team", access: "live", schedule: "Sample booking · date not confirmed" },
    ],
    addresses: [{
      id: "sample-address-1", name: "Aarav Mehta", phone: "9876543210",
      line1: "12 Sample Lane", line2: "Flat 4B", city: "Pune", state: "Maharashtra", pin: "411001", isDefault: true,
    }],
    wishlist: ["t-bluelotus", "mu-box"],
  });
  shoppers.set("sample-shopper-2", {
    orders: [], classes: [], addresses: [], wishlist: [],
  });
}

initialShoppers();
initialCoupons();

/** Sample sessions exist only in this process and are never accepted by Supabase identity(). */
export function createSampleSession(key: SampleIdentityKey) {
  const identity = { sample: true as const, ...SAMPLE_IDENTITIES[key] };
  const token = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  sessions.set(token, { identity, expiresAt });
  return { ...identity, token, expiresAt: new Date(expiresAt).toISOString() };
}

export function readSampleSession(token: string | undefined): SampleIdentity {
  const record = token ? sessions.get(token) : undefined;
  if (!record || record.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    throw new HttpError(401, "This sample session is missing or expired. Choose a sample identity to continue.");
  }
  return record.identity;
}

export function requireSampleRole(identity: SampleIdentity, roles: SampleRole[]) {
  if (!roles.includes(identity.role)) throw new HttpError(403, "This sample page is not available to the selected sample identity.");
}

function validateCouponInput(input: SampleCouponInput) {
  if (input.discountType === "percent" && input.discountValue > 100) throw new HttpError(400, "Percentage coupons must be from 1% to 100%.");
  if (input.discountType === "fixed" && input.maximumDiscountPaise !== null) throw new HttpError(400, "A maximum discount cap is only valid for percentage coupons.");
  const start = Date.parse(input.startsAt);
  const end = Date.parse(input.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new HttpError(400, "Choose a valid coupon start and end time.");
  if (!Number.isSafeInteger(input.minimumPaise) || input.minimumPaise < 0) throw new HttpError(400, "Minimum spend must be a non-negative amount in paise.");
  if (input.usageLimit !== null && (!Number.isInteger(input.usageLimit) || input.usageLimit < 1)) throw new HttpError(400, "Usage limit must be a positive number or unlimited.");
  if (!Number.isInteger(input.perShopperLimit) || input.perShopperLimit < 1 || input.perShopperLimit > 100) throw new HttpError(400, "Per-shopper limit must be from 1 to 100.");
}

export function listSampleCoupons(identity: SampleIdentity) {
  requireSampleRole(identity, ["admin"]);
  return { sample: true as const, coupons: clone([...coupons.values()].sort((a, b) => a.code.localeCompare(b.code))) };
}

export function createSampleCoupon(identity: SampleIdentity, raw: SampleCouponInput) {
  requireSampleRole(identity, ["admin"]);
  const input = { ...raw, code: raw.code.trim().toUpperCase() };
  validateCouponInput(input);
  if ([...coupons.values()].some(coupon => coupon.code === input.code)) throw new HttpError(409, "A coupon with this code already exists.");
  const coupon: SampleCoupon = { ...input, id: `sample-coupon-${randomUUID()}`, usedCount: 0 };
  coupons.set(coupon.id, coupon);
  return clone(coupon);
}

export function updateSampleCoupon(identity: SampleIdentity, id: string, raw: SampleCouponInput) {
  requireSampleRole(identity, ["admin"]);
  const current = coupons.get(id);
  if (!current) throw new HttpError(404, "Sample coupon not found.");
  const input = { ...raw, code: raw.code.trim().toUpperCase() };
  validateCouponInput(input);
  if ([...coupons.values()].some(coupon => coupon.id !== id && coupon.code === input.code)) throw new HttpError(409, "A coupon with this code already exists.");
  const coupon: SampleCoupon = { ...input, id, usedCount: current.usedCount };
  coupons.set(id, coupon);
  return clone(coupon);
}

export function revokeSampleSession(token: string | undefined) {
  if (token) sessions.delete(token);
}

export function sampleShopperAccount(identity: SampleIdentity): SampleShopperAccount {
  requireSampleRole(identity, ["shopper"]);
  const data = shoppers.get(identity.userId);
  if (!data) throw new HttpError(404, "Sample shopper records were not found.");
  return clone({ sample: true as const, displayName: identity.displayName, ...data });
}

function sampleMakerId(identity: SampleIdentity) {
  requireSampleRole(identity, ["maker"]);
  if (identity.identity === "maker") return "tathaastu";
  if (identity.identity === "maker-other") return "mushhk";
  throw new HttpError(403, "This sample maker does not have a linked shop.");
}

export function listSampleMakerStocks(identity: SampleIdentity) {
  const makerId = sampleMakerId(identity);
  return {
    sample: true as const,
    products: [...productIds].filter(productId => sampleProductOwners.get(productId) === makerId)
      .sort().map(id => ({ id, stock: inventory.get(id) ?? 0 })),
  };
}

export function updateSampleMakerStock(identity: SampleIdentity, productId: string, stock: number) {
  const makerId = sampleMakerId(identity);
  if (!productIds.has(productId)) throw new HttpError(404, "This sample product was not found.");
  if (sampleProductOwners.get(productId) !== makerId) throw new HttpError(403, "This sample product belongs to another maker.");
  if (!Number.isSafeInteger(stock) || stock < 0 || stock > 10_000) {
    throw new HttpError(400, "Stock must be a whole number from 0 to 10,000.");
  }
  inventory.set(productId, stock);
  return { id: productId, stock };
}

export function setSampleWishlist(identity: SampleIdentity, productId: string, saved: boolean) {
  requireSampleRole(identity, ["shopper"]);
  if (!productIds.has(productId)) throw new HttpError(404, "This sample product is not available.");
  const data = shoppers.get(identity.userId)!;
  data.wishlist = saved
    ? [...new Set([...data.wishlist, productId])]
    : data.wishlist.filter(id => id !== productId);
}

export function addSampleAddress(identity: SampleIdentity, address: Omit<SampleAddress, "id">) {
  requireSampleRole(identity, ["shopper"]);
  const data = shoppers.get(identity.userId)!;
  const saved = { ...address, id: `sample-address-${randomUUID()}` };
  if (saved.isDefault || data.addresses.length === 0) {
    data.addresses = data.addresses.map(item => ({ ...item, isDefault: false }));
    saved.isDefault = true;
  }
  data.addresses.push(saved);
  return saved.id;
}

export function setSampleDefaultAddress(identity: SampleIdentity, id: string) {
  requireSampleRole(identity, ["shopper"]);
  const data = shoppers.get(identity.userId)!;
  if (!data.addresses.some(address => address.id === id)) throw new HttpError(404, "This sample address is not available to your account.");
  data.addresses = data.addresses.map(address => ({ ...address, isDefault: address.id === id }));
}

export function deleteSampleAddress(identity: SampleIdentity, id: string) {
  requireSampleRole(identity, ["shopper"]);
  const data = shoppers.get(identity.userId)!;
  const index = data.addresses.findIndex(address => address.id === id);
  if (index < 0) throw new HttpError(404, "This sample address is not available to your account.");
  const [removed] = data.addresses.splice(index, 1);
  if (removed?.isDefault && data.addresses[0]) data.addresses[0].isDefault = true;
}

/** Reset only the isolated sample data; active sessions stay sample-only. */
export function resetSampleAccountData() {
  initialShoppers();
  initialCoupons();
  for (const productId of dynamicProductIds) {
    productIds.delete(productId);
    sampleProducts.delete(productId);
    sampleProductOwners.delete(productId);
    initialInventory.delete(productId);
  }
  dynamicProductIds.clear();
  inventory.clear();
  for (const [productId, stock] of initialInventory) inventory.set(productId, stock);
  checkoutKeys.clear();
  privateSampleDeliveries.clear();
}

export function registerSampleMakerProduct(product: typeof sampleCatalog.products[number], ownerId: string) {
  if (productIds.has(product.id)) throw new HttpError(409, "A sample product with this identifier already exists.");
  productIds.add(product.id);
  sampleProducts.set(product.id, clone(product));
  sampleProductOwners.set(product.id, ownerId);
  dynamicProductIds.add(product.id);
  initialInventory.set(product.id, product.stock);
  inventory.set(product.id, product.stock);
}

export function sampleKnownProduct(productId: string) {
  return productIds.has(productId);
}

export function sampleProductStock(productId: string) {
  return inventory.get(productId) ?? 0;
}

export function createSampleCheckout(
  identity: SampleIdentity,
  input: { lines: SampleCheckoutLine[]; addressId?: string; deliveryAddress?: SampleDeliveryAddress; couponCode?: string; idempotencyKey: string },
) {
  requireSampleRole(identity, ["shopper"]);
  const shopper = shoppers.get(identity.userId);
  if (!shopper) throw new HttpError(404, "Sample shopper records were not found.");
  if (Boolean(input.addressId) === Boolean(input.deliveryAddress)) throw new HttpError(400, "Provide exactly one saved address or delivery address.");
  const savedAddress = input.addressId
    ? shopper.addresses.find(address => address.id === input.addressId)
    : undefined;
  if (input.addressId && !savedAddress) throw new HttpError(404, "Choose an address saved in your own sample account.");
  const delivery: SampleDeliveryAddress = savedAddress
    ? { name: savedAddress.name, phone: savedAddress.phone, line1: `${savedAddress.line1}${savedAddress.line2 ? `, ${savedAddress.line2}` : ""}`, state: savedAddress.state, pin: savedAddress.pin }
    : clone(input.deliveryAddress!);
  const aggregated = new Map<string, number>();
  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) throw new HttpError(400, "Each sample quantity must be from 1 to 20.");
    aggregated.set(line.productId, (aggregated.get(line.productId) ?? 0) + line.quantity);
  }
  const lines = [...aggregated.entries()].sort(([a], [b]) => a.localeCompare(b));
  const couponCode = input.couponCode?.trim().toUpperCase() || null;
  const digest = JSON.stringify({ lines, delivery, couponCode });
  const key = `${identity.userId}:${input.idempotencyKey}`;
  const saved = checkoutKeys.get(key);
  if (saved) {
    if (saved.digest !== digest) throw new HttpError(409, "This sample checkout key was already used for different items.");
    return { ...clone(saved.result), replayed: true };
  }

  const entries = lines.map(([productId, quantity]) => {
    const product = sampleProducts.get(productId);
    if (!product || product.status !== "live") throw new HttpError(404, "A selected sample product is no longer available.");
    const available = inventory.get(productId) ?? 0;
    if (quantity > available) throw new HttpError(409, `Only ${available} sample unit${available === 1 ? "" : "s"} of ${product.name} remain.`);
    return { productId, quantity, product, available, linePaise: product.pricePaise * quantity };
  });
  const subtotalPaise = entries.reduce((total, entry) => total + entry.linePaise, 0);
  if (!Number.isSafeInteger(subtotalPaise)) throw new HttpError(400, "The sample checkout total is outside the supported range.");
  let coupon: SampleCoupon | undefined;
  let discountPaise = 0;
  if (couponCode) {
    coupon = [...coupons.values()].find(item => item.code === couponCode);
    if (!coupon || !coupon.active) throw new HttpError(422, "That sample coupon is not active.");
    const now = Date.now();
    if (now < Date.parse(coupon.startsAt) || now >= Date.parse(coupon.endsAt)) throw new HttpError(422, "That sample coupon is outside its valid dates.");
    if (subtotalPaise < coupon.minimumPaise) throw new HttpError(422, "The sample order does not meet this coupon’s minimum spend.");
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new HttpError(422, "That sample coupon has reached its usage limit.");
    const shopperUseCount = couponUses.get(coupon.id)?.get(identity.userId) ?? 0;
    if (shopperUseCount >= coupon.perShopperLimit) throw new HttpError(422, "This sample shopper has already used that coupon the maximum number of times.");
    discountPaise = coupon.discountType === "percent"
      ? Math.floor(subtotalPaise * coupon.discountValue / 100)
      : Math.min(subtotalPaise, coupon.discountValue);
    if (coupon.maximumDiscountPaise !== null) discountPaise = Math.min(discountPaise, coupon.maximumDiscountPaise);
  }
  const discountedPaise = subtotalPaise - discountPaise;
  const shippingPaise = shippingFor(discountedPaise, true, DEFAULT_SETTINGS);
  const totalPaise = discountedPaise + shippingPaise;
  const id = `sample-order-${randomUUID()}`;
  const reference = `BT-SAMPLE-${randomUUID().slice(0, 8).toUpperCase()}`;
  const order: SampleOrder = {
    id, reference, status: "placed", placedOn: new Date().toISOString().slice(0, 10), totalPaise, discountPaise, couponCode,
    items: entries.map(entry => `${entry.product.name}${entry.quantity > 1 ? ` × ${entry.quantity}` : ""}`),
    trackingNumber: "", carrier: "", delayNote: "",
  };
  // Validate every requested unit before changing any stock; this synchronous block is atomic per Node event loop.
  for (const entry of entries) inventory.set(entry.productId, entry.available - entry.quantity);
  if (coupon) {
    coupon.usedCount += 1;
    const uses = couponUses.get(coupon.id) ?? new Map<string, number>();
    uses.set(identity.userId, (uses.get(identity.userId) ?? 0) + 1);
    couponUses.set(coupon.id, uses);
  }
  shopper.orders.unshift(order);
  privateSampleDeliveries.set(id, delivery);
  const result: SampleCheckoutResult = {
    sample: true, orderId: id, reference, itemsPaise: subtotalPaise, discountPaise, couponCode, shippingPaise, totalPaise,
    message: "Sample order saved without charging a payment method. No real purchase or shipment was created.",
  };
  checkoutKeys.set(key, { digest, result: clone(result) });
  return { ...result, replayed: false };
}

export function sampleIdentityForTest(key: SampleIdentityKey): SampleIdentity {
  return { sample: true, ...SAMPLE_IDENTITIES[key] };
}
