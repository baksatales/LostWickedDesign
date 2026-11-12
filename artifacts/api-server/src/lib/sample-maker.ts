import { randomUUID } from "node:crypto";
import { contributionMargin, listingDecision } from "./domain";
import { HttpError } from "./supabase";
import { sampleCatalog, sampleDomainProducts } from "./catalog";
import { registerSampleMakerProduct, requireSampleRole, type SampleIdentity } from "./sample-accounts";

export interface SampleMakerDraftInput {
  name: string;
  kind: string;
  material: string;
  technique: string;
  size: string;
  pricePaise: number;
  gstPct: number;
  stock: number;
  dispatchDays: number;
  madeToOrder: boolean;
  costPaise: number;
  story: string;
  photo: string;
  step: number;
}
export interface SampleMakerDraft extends SampleMakerDraftInput {
  id: string;
  updatedAt: string;
  status: "draft" | "submitted" | "live" | "changes";
}
export interface SampleAdminProductReview {
  id: string; makerId: string; makerBrand: string; name: string; kind: string; material: string;
  technique: string; size: string; pricePaise: number; stock: number; dispatchDays: number;
  story: string; photo: string; submittedAt: string; status: "review" | "live" | "changes";
  checks: boolean[]; note: string; reason: string | null;
}
export interface SampleMakerOpportunity {
  id: string;
  type: "corporate" | "event";
  title: string;
  detail: string;
  status: "open" | "yes" | "no";
}
export interface SampleMakerMasterclassProposal {
  id: string;
  makerId: string;
  makerBrand: string;
  title: string;
  type: "Live workshop" | "Recorded class";
  duration: string;
  pricePaise: number;
  about: string;
  status: "submitted" | "approved" | "changes";
  note: string;
  submittedAt: string;
}
export interface SampleVendorApplication {
  id: string;
  brand: string;
  name: string;
  place: string;
  craft: string;
  gst: string;
  status: "pending" | "call" | "approved" | "declined";
}
export interface SampleCorporateEnquiry {
  ref: string;
  company: string;
  contactName: string;
  contact: string;
  purpose: string;
  qty: number;
  budgetPaise: number;
  neededBy: string;
  message: string;
  stage: "new" | "contacted" | "quote" | "won" | "lost";
  matchedMakerIds: string[];
  sentToMakerIds: string[];
  responses: Record<string, "yes" | "no">;
  quotePaise: number | null;
  createdAt: string;
}
const clone = <T>(value: T): T => structuredClone(value);
const formatRupees = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
const draftsByMaker = new Map<string, Map<string, SampleMakerDraft>>();
const submissions = new Map<string, { draft: SampleMakerDraft; review: SampleAdminProductReview; publicProductId?: string }>();
const liveCatalogProducts = new Map<string, typeof sampleCatalog.products[number]>();
const liveRuleProductIds = new Set<string>();
const makerCosts = new Map<string, Map<string, number>>([
  ["sample-maker-1", new Map([["t-lotuspond", 60_000], ["t-marigold", 45_000], ["t-message", 90_000]])],
  ["sample-maker-2", new Map()],
]);
const makerSettings = new Map<string, { gstRegistered: boolean; state: string }>([
  ["sample-maker-1", { gstRegistered: true, state: "Delhi" }],
  ["sample-maker-2", { gstRegistered: true, state: "Uttar Pradesh" }],
]);
const opportunityRows = new Map<string, { makerUserId: string; opportunity: SampleMakerOpportunity }>([
  ["op1", { makerUserId: "sample-maker-1", opportunity: { id: "op1", type: "corporate", title: "120 client gifts, home décor", detail: "About ₹2,500 per gift, needed before 10 December. Logo on packaging and personal notes.", status: "open" } }],
  ["op2", { makerUserId: "sample-maker-1", opportunity: { id: "op2", type: "event", title: "A stall at Kala Samāgam", detail: "Our curated craft carnival in Delhi NCR. Dates to be announced; stall terms shared when you say yes.", status: "open" } }],
]);
const sampleLotusProposal: SampleMakerMasterclassProposal = {
  id: "proposal-sample-lotus", makerId: "tathaastu", makerBrand: "Tathaastu",
  title: "Shape a soy wax lotus", type: "Live workshop", duration: "2 hours",
  pricePaise: 180000, about: "A beginner-friendly introduction to shaping a soy wax lotus candle.",
  status: "submitted", note: "", submittedAt: "2026-11-01T00:00:00.000Z",
};
const proposalRows = new Map<string, SampleMakerMasterclassProposal>([[sampleLotusProposal.id, clone(sampleLotusProposal)]]);
const vendorApplications = new Map<string, SampleVendorApplication>([
  ["a1", { id: "a1", brand: "Pattachitra Ghar", name: "Bhagaban Mohapatra", place: "Raghurajpur, Odisha", craft: "Pattachitra scroll painting", gst: "not given", status: "pending" }],
  ["a2", { id: "a2", brand: "Moradabad Brass Collective", name: "Imran Qureshi", place: "Moradabad, Uttar Pradesh", craft: "Hand-engraved brassware", gst: "registered", status: "call" }],
]);
const corporateEnquiries = new Map<string, SampleCorporateEnquiry>([
  ["BT-CG-0012", {
    ref: "BT-CG-0012", company: "Northwind Consulting", contactName: "Priya Nair", contact: "+91 98765 43210",
    purpose: "Client appreciation", qty: 120, budgetPaise: 250000, neededBy: "2026-12-10",
    message: "Diwali and year-end gifts for our top clients. Prefer home décor. Logo on packaging and personal notes.",
    stage: "contacted", matchedMakerIds: ["m1"], sentToMakerIds: ["m1"], responses: {},
    quotePaise: null, createdAt: "2026-10-30T00:00:00.000Z",
  }],
]);
const makerAccountByPublicId: Record<string, string> = { m1: "sample-maker-1", m2: "sample-maker-2" };

function makerProfile(identity: SampleIdentity) {
  requireSampleRole(identity, ["maker"]);
  const makerId = identity.identity === "maker" ? "tathaastu" : "mushhk";
  const brand = identity.identity === "maker" ? "Tathaastu" : "Mushhk";
  const trusted = identity.identity === "maker";
  const approvedCount = identity.identity === "maker" ? 3 : 1;
  return { makerId, brand, trusted, approvedCount };
}

export function getSampleMakerSettings(identity: SampleIdentity) {
  const profile = makerProfile(identity);
  const settings = makerSettings.get(identity.userId);
  if (!settings) throw new HttpError(404, "Maker settings are unavailable in this sample account.");
  return {
    sample: true as const, ...profile, ...clone(settings), payoutOnboarding: "not_configured" as const,
    message: "Bank details are not collected in the sample. A payout provider must be selected before secure provider-hosted onboarding can be enabled.",
  };
}

export function saveSampleMakerSettings(identity: SampleIdentity, input: { gstRegistered: boolean; state: string }) {
  makerProfile(identity);
  const state = input.state.trim();
  if (state.length < 2 || state.length > 80) throw new HttpError(400, "Enter a valid state or union territory.");
  makerSettings.set(identity.userId, { gstRegistered: input.gstRegistered, state });
  return getSampleMakerSettings(identity);
}

export function sampleMakerGstRegistered(makerId: string) {
  const userId = makerId === "tathaastu" ? "sample-maker-1" : "sample-maker-2";
  return makerSettings.get(userId)?.gstRegistered ?? true;
}

export function listSampleMakerOpportunities(identity: SampleIdentity) {
  requireSampleRole(identity, ["maker"]);
  const profile = makerProfile(identity);
  const publicMakerId = profile.makerId === "tathaastu" ? "m1" : "m2";
  const assignedBriefs = [...corporateEnquiries.values()]
    .filter(enquiry => enquiry.ref !== "BT-CG-0012" && enquiry.matchedMakerIds.includes(publicMakerId))
    .map(enquiry => ({
      id: `brief-${enquiry.ref}-${publicMakerId}`,
      type: "corporate" as const,
      title: `${enquiry.qty} gifts · ${enquiry.purpose}`,
      detail: `About ${formatRupees(enquiry.budgetPaise)} each, needed by ${enquiry.neededBy}. ${enquiry.message}`,
      status: enquiry.responses[publicMakerId] ?? "open" as "open" | "yes" | "no",
    }));
  return {
    sample: true as const,
    opportunities: [
      ...[...opportunityRows.values()].filter(row => row.makerUserId === identity.userId).map(row => clone(row.opportunity)),
      ...assignedBriefs,
    ],
  };
}

export function respondSampleMakerOpportunity(identity: SampleIdentity, id: string, decision: "yes" | "no") {
  requireSampleRole(identity, ["maker"]);
  const profile = makerProfile(identity);
  const publicMakerId = profile.makerId === "tathaastu" ? "m1" : "m2";
  if (id.startsWith("brief-")) {
    const enquiry = [...corporateEnquiries.values()].find(item => id === `brief-${item.ref}-${publicMakerId}`);
    if (!enquiry || !enquiry.matchedMakerIds.includes(publicMakerId)) throw new HttpError(404, "This opportunity is not available to this maker.");
    enquiry.responses[publicMakerId] = decision;
    return {
      id, type: "corporate" as const, title: `${enquiry.qty} gifts · ${enquiry.purpose}`,
      detail: `About ${formatRupees(enquiry.budgetPaise)} each, needed by ${enquiry.neededBy}. ${enquiry.message}`,
      status: decision,
    };
  }
  const row = opportunityRows.get(id);
  if (!row || row.makerUserId !== identity.userId) throw new HttpError(404, "This opportunity is not available to this maker.");
  row.opportunity.status = decision;
  if (id === "op1") {
    const seededBrief = corporateEnquiries.get("BT-CG-0012");
    if (seededBrief) seededBrief.responses.m1 = decision;
  }
  return clone(row.opportunity);
}

export function createSampleMakerMasterclassProposal(identity: SampleIdentity, input: Omit<SampleMakerMasterclassProposal, "id" | "makerId" | "makerBrand" | "status" | "note" | "submittedAt">) {
  const profile = makerProfile(identity);
  if (input.title.trim().length < 5 || input.about.trim().length < 20 || input.duration.trim().length < 2 ||
      !Number.isSafeInteger(input.pricePaise) || input.pricePaise < 0 || input.pricePaise > 100_000_000) {
    throw new HttpError(400, "Add a clear class title, duration, description and valid price.");
  }
  const proposal: SampleMakerMasterclassProposal = {
    ...clone(input), id: `proposal-${randomUUID()}`, makerId: profile.makerId, makerBrand: profile.brand,
    status: "submitted", note: "", submittedAt: new Date().toISOString(),
  };
  proposalRows.set(proposal.id, proposal);
  return clone(proposal);
}

export function listSampleAdminMasterclassProposals(identity: SampleIdentity) {
  requireSampleRole(identity, ["admin"]);
  return { sample: true as const, proposals: [...proposalRows.values()].map(clone) };
}

export function reviewSampleAdminMasterclassProposal(identity: SampleIdentity, id: string, decision: "approve" | "changes", note: string) {
  requireSampleRole(identity, ["admin"]);
  const proposal = proposalRows.get(id);
  if (!proposal) throw new HttpError(404, "Class proposal not found.");
  const cleanNote = note.trim();
  if (decision === "changes" && cleanNote.length < 5) throw new HttpError(400, "Add a note explaining the requested changes.");
  proposal.status = decision === "approve" ? "approved" : "changes";
  proposal.note = cleanNote;
  return clone(proposal);
}

export function listSampleAdminVendorApplications(identity: SampleIdentity) {
  requireSampleRole(identity, ["admin"]);
  return { sample: true as const, applications: [...vendorApplications.values()].map(clone) };
}

export function decideSampleAdminVendorApplication(identity: SampleIdentity, id: string, decision: "approve" | "book_call" | "decline") {
  requireSampleRole(identity, ["admin"]);
  const application = vendorApplications.get(id);
  if (!application) throw new HttpError(404, "Vendor application not found.");
  if (application.status !== "pending" && application.status !== "call") {
    throw new HttpError(409, "This vendor application already has a final decision.");
  }
  if (decision === "book_call" && application.status !== "pending") {
    throw new HttpError(409, "A call is already booked for this application.");
  }
  application.status = decision === "approve" ? "approved" : decision === "decline" ? "declined" : "call";
  return clone(application);
}

export function createSampleCorporateEnquiry(input: {
  purpose: string; qty: number; budgetPaise: number; neededBy: string; name: string; company: string; contact: string;
}) {
  const purpose = input.purpose.trim();
  const name = input.name.trim();
  const company = input.company.trim();
  const contact = input.contact.trim();
  const validContact = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || /^[+() 0-9-]{8,24}$/.test(contact);
  if (purpose.length < 3 || purpose.length > 120 || name.length < 2 || name.length > 120 ||
      company.length < 2 || company.length > 160 || !validContact ||
      !Number.isSafeInteger(input.qty) || input.qty < 1 || input.qty > 20_000 ||
      !Number.isSafeInteger(input.budgetPaise) || input.budgetPaise < 100 || input.budgetPaise > 100_000_000 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.neededBy) || Number.isNaN(Date.parse(`${input.neededBy}T00:00:00Z`))) {
    throw new HttpError(400, "Enter valid contact details, gift quantity, budget, purpose and required date.");
  }
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const ref = `BT-CG-${suffix}`;
  const created: SampleCorporateEnquiry = {
    ref, company, contactName: name, contact, purpose, qty: input.qty, budgetPaise: input.budgetPaise,
    neededBy: input.neededBy, message: "", stage: "new", matchedMakerIds: [], sentToMakerIds: [],
    responses: {}, quotePaise: null, createdAt: new Date().toISOString(),
  };
  corporateEnquiries.set(ref, created);
  return { sample: true as const, ref, stage: created.stage };
}

export function listSampleAdminCorporateEnquiries(identity: SampleIdentity) {
  requireSampleRole(identity, ["admin"]);
  return { sample: true as const, enquiries: [...corporateEnquiries.values()].map(clone) };
}

export function updateSampleAdminCorporateStage(identity: SampleIdentity, ref: string, stage: SampleCorporateEnquiry["stage"]) {
  requireSampleRole(identity, ["admin"]);
  const enquiry = corporateEnquiries.get(ref);
  if (!enquiry) throw new HttpError(404, "Corporate enquiry not found.");
  enquiry.stage = stage;
  return clone(enquiry);
}

export function matchSampleAdminCorporateMakers(identity: SampleIdentity, ref: string, makerIds: string[]) {
  requireSampleRole(identity, ["admin"]);
  const enquiry = corporateEnquiries.get(ref);
  if (!enquiry) throw new HttpError(404, "Corporate enquiry not found.");
  const unique = [...new Set(makerIds)];
  if (unique.length !== makerIds.length || unique.some(id => !makerAccountByPublicId[id])) {
    throw new HttpError(400, "Only available sample makers can be matched to this brief.");
  }
  enquiry.matchedMakerIds = unique;
  enquiry.sentToMakerIds = [...new Set([...enquiry.sentToMakerIds, ...unique])];
  unique.forEach(makerId => { delete enquiry.responses[makerId]; });
  if (unique.length && enquiry.stage === "new") enquiry.stage = "contacted";
  return clone(enquiry);
}

export function saveSampleAdminCorporateQuote(identity: SampleIdentity, ref: string, quotePaise: number) {
  requireSampleRole(identity, ["admin"]);
  const enquiry = corporateEnquiries.get(ref);
  if (!enquiry) throw new HttpError(404, "Corporate enquiry not found.");
  if (!Number.isSafeInteger(quotePaise) || quotePaise < 100 || quotePaise > 1_000_000_000) {
    throw new HttpError(400, "Enter a valid quote amount in rupees.");
  }
  enquiry.quotePaise = quotePaise;
  enquiry.stage = "quote";
  return clone(enquiry);
}

function makerProductData(identity: SampleIdentity, productId: string, costPaise: number) {
  requireSampleRole(identity, ["maker"]);
  const makerId = identity.identity === "maker" ? "tathaastu" : "mushhk";
  const product = sampleDomainProducts.find(item => item.id === productId && item.makerId === makerId);
  if (!product) throw new HttpError(404, "This product is not part of your sample shop.");
  const result = contributionMargin({
    pricePaise: product.pricePaise, gstPct: product.gstPct, gstRegistered: makerSettings.get(identity.userId)?.gstRegistered ?? true,
    materialsPaise: costPaise, packagingPaise: 0, shippingPaise: 0,
  });
  if (!result.ok) throw new HttpError(400, result.error);
  return {
    productId, name: product.name, pricePaise: product.pricePaise, costPaise,
    split: result.value.split, costsPaise: result.value.costsPaise,
    leftPerSalePaise: result.value.leftPerSalePaise, marginPct: result.value.marginPct,
    health: result.value.health,
  };
}

function makerDrafts(identity: SampleIdentity) {
  requireSampleRole(identity, ["maker"]);
  let drafts = draftsByMaker.get(identity.userId);
  if (!drafts) {
    drafts = new Map();
    draftsByMaker.set(identity.userId, drafts);
  }
  return drafts;
}

function validatePhoto(photo: string) {
  if (!photo) return;
  const localImage = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(photo);
  const workspaceImage = /^\/images\/baksa\/(?!.*\.\.)[a-z0-9._/-]+$/i.test(photo);
  let remoteImage = false;
  try { remoteImage = new URL(photo).protocol === "https:"; } catch { /* not a URL */ }
  if (!localImage && !workspaceImage && !remoteImage) throw new HttpError(400, "Use a sample image, approved workspace image, or secure image link.");
}

function validateDraft(input: SampleMakerDraftInput, final = false) {
  validatePhoto(input.photo);
  if (input.photo.length > 300_000) throw new HttpError(400, "Sample images must be 220 KB or smaller.");
  if (input.name.length > 200 || input.kind.length > 200 || input.material.length > 500 ||
      input.technique.length > 500 || input.size.length > 200 || input.story.length > 5_000) {
    throw new HttpError(400, "One or more product details are too long.");
  }
  if (final && (!input.name.trim() || !input.kind.trim() || !input.material.trim() ||
      !input.technique.trim() || !input.size.trim() || !input.story.trim() || !input.photo)) {
    throw new HttpError(400, "Complete all seven product steps, add a photo and story, then confirm the product facts.");
  }
  if (final && input.pricePaise <= 0) throw new HttpError(400, "Set a selling price above zero before submission.");
}

export function listSampleMakerDrafts(identity: SampleIdentity) {
  return { sample: true as const, drafts: clone([...makerDrafts(identity).values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) };
}

export function listSampleMakerProfits(identity: SampleIdentity) {
  requireSampleRole(identity, ["maker"]);
  const costs = makerCosts.get(identity.userId) ?? new Map<string, number>();
  const makerId = identity.identity === "maker" ? "tathaastu" : "mushhk";
  return {
    sample: true as const,
    products: sampleDomainProducts.filter(product => product.makerId === makerId && product.status === "live").map(product => {
      const costPaise = costs.get(product.id);
      return { ...makerProductData(identity, product.id, costPaise ?? 0), costPaise: costPaise ?? null, name: product.name, pricePaise: product.pricePaise };
    }),
  };
}

export function saveSampleMakerProductCost(identity: SampleIdentity, productId: string, costPaise: number | null) {
  requireSampleRole(identity, ["maker"]);
  if (costPaise !== null && (!Number.isSafeInteger(costPaise) || costPaise < 0 || costPaise > 100_000_000)) {
    throw new HttpError(400, "Enter a whole-number private cost from 0 to 1,000,000 rupees.");
  }
  const result = makerProductData(identity, productId, costPaise ?? 0);
  const costs = makerCosts.get(identity.userId) ?? new Map<string, number>();
  if (costPaise === null) costs.delete(productId);
  else costs.set(productId, costPaise);
  makerCosts.set(identity.userId, costs);
  return { ...result, costPaise };
}

export function createSampleMakerDraft(identity: SampleIdentity, input: SampleMakerDraftInput) {
  validateDraft(input);
  const draft: SampleMakerDraft = {
    ...input, id: `sample-draft-${randomUUID()}`, status: "draft", updatedAt: new Date().toISOString(),
  };
  makerDrafts(identity).set(draft.id, draft);
  return clone(draft);
}

export function getSampleMakerDraft(identity: SampleIdentity, id: string) {
  const draft = makerDrafts(identity).get(id);
  if (!draft) throw new HttpError(404, "This sample draft was not found for your shop.");
  return clone(draft);
}

export function saveSampleMakerDraft(identity: SampleIdentity, id: string, input: SampleMakerDraftInput) {
  validateDraft(input);
  const drafts = makerDrafts(identity);
  const current = drafts.get(id);
  if (!current) throw new HttpError(404, "This sample draft was not found for your shop.");
  if (current.status !== "draft") throw new HttpError(409, "This draft was already submitted and cannot be changed.");
  const saved: SampleMakerDraft = { ...input, id, status: "draft", updatedAt: new Date().toISOString() };
  drafts.set(id, saved);
  return clone(saved);
}

export function submitSampleMakerDraft(identity: SampleIdentity, id: string, confirmedFacts: boolean) {
  if (confirmedFacts !== true) throw new HttpError(400, "Confirm that the product facts are accurate before submission.");
  const drafts = makerDrafts(identity);
  const draft = drafts.get(id);
  if (!draft) throw new HttpError(404, "This sample draft was not found for your shop.");
  if (draft.status !== "draft") throw new HttpError(409, "This sample draft was already submitted.");
  validateDraft(draft, true);
  if (draft.step !== 7) throw new HttpError(400, "Visit all seven steps before submitting this product.");
  const decision = listingDecision({ trusted: false, approvedCount: 0 }, draft.pricePaise, 0, false);
  draft.status = "submitted";
  draft.updatedAt = new Date().toISOString();
  const makerId = identity.identity === "maker" ? "tathaastu" : "mushhk";
  const makerBrand = identity.identity === "maker" ? "Tathaastu" : "Mushhk";
  submissions.set(id, {
    draft,
    review: {
      id, makerId, makerBrand, name: draft.name, kind: draft.kind, material: draft.material,
      technique: draft.technique, size: draft.size, pricePaise: draft.pricePaise, stock: draft.stock,
      dispatchDays: draft.dispatchDays, story: draft.story, photo: draft.photo,
      submittedAt: draft.updatedAt, status: decision.status, checks: [false, false, false, false, false],
      note: "", reason: decision.reason,
    },
  });
  return {
    id, status: decision.status, reason: decision.reason, spotCheck: decision.spotCheck,
    message: "Sample submission saved for review. No public listing or live catalogue was changed.",
  };
}

export function listSampleAdminProductReviews(identity: SampleIdentity) {
  requireSampleRole(identity, ["admin"]);
  return { sample: true as const, reviews: clone([...submissions.values()].map(entry => entry.review).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))) };
}

export function reviewSampleAdminProduct(
  identity: SampleIdentity,
  id: string,
  input: { action: "approve" | "changes" | "spot_check"; checks: boolean[]; note: string },
) {
  requireSampleRole(identity, ["admin"]);
  const entry = submissions.get(id);
  if (!entry) throw new HttpError(404, "This sample product is not in the review queue.");
  if (input.action !== "spot_check" && entry.review.status !== "review") {
    throw new HttpError(409, "This sample product has already received a review decision.");
  }
  if (input.checks.length !== 5) throw new HttpError(400, "Complete all five BT Verified checks.");
  if (input.action === "approve" && !input.checks.every(Boolean)) {
    throw new HttpError(400, "All five BT Verified checks must pass before approval.");
  }
  if (input.action === "changes" && !input.note.trim()) {
    throw new HttpError(400, "Add a clear note before requesting changes.");
  }
  if (input.action === "spot_check" && (!input.checks.every(Boolean) || entry.review.status !== "live")) {
    throw new HttpError(400, "A spot check needs all five checks and an already-live sample listing.");
  }
  if (input.action !== "spot_check") {
    entry.review.status = input.action === "approve" ? "live" : "changes";
    entry.review.reason = input.action === "changes" ? input.note.trim() : null;
    entry.draft.status = input.action === "approve" ? "live" : "changes";
    if (input.action === "approve" && !entry.publicProductId) {
      const productId = `sample-${entry.review.makerId}-${randomUUID().slice(0, 8)}`;
      const makerDescription = entry.draft.story.trim();
      const image = entry.draft.photo || "/images/baksa/t-bluelotus.webp";
      const catalogProduct = {
        id: productId, slug: productId, name: entry.draft.name, makerId: entry.review.makerId,
        pricePaise: entry.draft.pricePaise, category: entry.draft.kind, material: entry.draft.material,
        dispatchDays: entry.draft.dispatchDays, image, stock: entry.draft.madeToOrder ? 0 : entry.draft.stock,
        sample: true as const, status: "live" as const, description: makerDescription,
      };
      registerSampleMakerProduct(catalogProduct, entry.review.makerId);
      liveCatalogProducts.set(productId, catalogProduct);
      sampleDomainProducts.push({
        id: productId, makerId: entry.review.makerId, name: entry.draft.name,
        pricePaise: entry.draft.pricePaise, dispatchDays: entry.draft.dispatchDays,
        stock: entry.draft.madeToOrder ? 0 : entry.draft.stock, gstPct: entry.draft.gstPct,
        madeToOrder: entry.draft.madeToOrder, status: "live", feels: [], occasions: [], recipients: [],
      });
      liveRuleProductIds.add(productId);
      entry.publicProductId = productId;
      const ownerUserId = entry.review.makerId === "tathaastu" ? "sample-maker-1" : "sample-maker-2";
      const costs = makerCosts.get(ownerUserId) ?? new Map<string, number>();
      costs.set(productId, entry.draft.costPaise);
      makerCosts.set(ownerUserId, costs);
    }
  }
  entry.review.checks = [...input.checks];
  entry.review.note = input.note.trim();
  entry.draft.updatedAt = new Date().toISOString();
  return clone(entry.review);
}

export function sampleSubmittedCatalogProducts() {
  return clone([...liveCatalogProducts.values()]);
}

export function resetSampleMakerData() {
  draftsByMaker.clear();
  submissions.clear();
  makerCosts.set("sample-maker-1", new Map([["t-lotuspond", 60_000], ["t-marigold", 45_000], ["t-message", 90_000]]));
  makerCosts.set("sample-maker-2", new Map());
  makerSettings.set("sample-maker-1", { gstRegistered: true, state: "Delhi" });
  makerSettings.set("sample-maker-2", { gstRegistered: true, state: "Uttar Pradesh" });
  opportunityRows.get("op1")!.opportunity.status = "open";
  opportunityRows.get("op2")!.opportunity.status = "open";
  proposalRows.clear();
  proposalRows.set(sampleLotusProposal.id, clone(sampleLotusProposal));
  vendorApplications.set("a1", { id: "a1", brand: "Pattachitra Ghar", name: "Bhagaban Mohapatra", place: "Raghurajpur, Odisha", craft: "Pattachitra scroll painting", gst: "not given", status: "pending" });
  vendorApplications.set("a2", { id: "a2", brand: "Moradabad Brass Collective", name: "Imran Qureshi", place: "Moradabad, Uttar Pradesh", craft: "Hand-engraved brassware", gst: "registered", status: "call" });
  corporateEnquiries.clear();
  corporateEnquiries.set("BT-CG-0012", {
    ref: "BT-CG-0012", company: "Northwind Consulting", contactName: "Priya Nair", contact: "+91 98765 43210",
    purpose: "Client appreciation", qty: 120, budgetPaise: 250000, neededBy: "2026-12-10",
    message: "Diwali and year-end gifts for our top clients. Prefer home décor. Logo on packaging and personal notes.",
    stage: "contacted", matchedMakerIds: ["m1"], sentToMakerIds: ["m1"], responses: {},
    quotePaise: null, createdAt: "2026-10-30T00:00:00.000Z",
  });
  for (const id of liveRuleProductIds) {
    const index = sampleDomainProducts.findIndex(product => product.id === id);
    if (index >= 0) sampleDomainProducts.splice(index, 1);
    liveCatalogProducts.delete(id);
  }
  liveRuleProductIds.clear();
}
