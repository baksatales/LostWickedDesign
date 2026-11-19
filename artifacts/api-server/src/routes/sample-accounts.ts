import { Router, type IRouter, type Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import {
  CreateSampleCheckoutBody,
  CreateSampleCheckoutResponse,
  CreateSampleCouponBody,
  CreateSampleCouponResponse,
  CreateSampleBlogPostBody,
  CreateSampleBlogPostResponse,
  AddSampleAddressBody,
  CreateSampleSessionBody,
  CreateSampleSessionResponse,
  DeleteSampleAddressParams,
  GetSampleSessionResponse,
  GetSampleShopperAccountResponse,
  GetSampleMakerStocksResponse,
  GetSampleMakerOrdersResponse,
  GetSampleAdminOrdersResponse,
  GetSampleMakerEarningsResponse,
  GetSampleAdminPayoutsResponse,
  GetSampleMakerDraftsResponse,
  CreateSampleMakerDraftBody,
  CreateSampleMakerDraftResponse,
  GetSampleMakerDraftParams,
  GetSampleMakerDraftResponse,
  SaveSampleMakerDraftParams,
  SaveSampleMakerDraftBody,
  SaveSampleMakerDraftResponse,
  SubmitSampleMakerDraftParams,
  SubmitSampleMakerDraftBody,
  SubmitSampleMakerDraftResponse,
  GetSampleAdminProductReviewsResponse,
  ReviewSampleAdminProductParams,
  ReviewSampleAdminProductBody,
  ReviewSampleAdminProductResponse,
  GetSampleMakerProfitsResponse,
  SaveSampleMakerProductCostParams,
  SaveSampleMakerProductCostBody,
  SaveSampleMakerProductCostResponse,
  GetSampleMakerSettingsResponse,
  SaveSampleMakerSettingsBody,
  SaveSampleMakerSettingsResponse,
  GetSampleMakerOpportunitiesResponse,
  RespondSampleMakerOpportunityParams,
  RespondSampleMakerOpportunityBody,
  RespondSampleMakerOpportunityResponse,
  CreateSampleMakerMasterclassProposalBody,
  CreateSampleMakerMasterclassProposalResponse,
  GetSampleAdminMasterclassProposalsResponse,
  ReviewSampleAdminMasterclassProposalParams,
  ReviewSampleAdminMasterclassProposalBody,
  ReviewSampleAdminMasterclassProposalResponse,
  GetSampleAdminVendorApplicationsResponse,
  DecideSampleAdminVendorApplicationParams,
  DecideSampleAdminVendorApplicationBody,
  DecideSampleAdminVendorApplicationResponse,
  CreateSampleCorporateEnquiryBody,
  CreateSampleCorporateEnquiryResponse,
  GetSampleAdminCorporateEnquiriesResponse,
  UpdateSampleAdminCorporateStageParams,
  UpdateSampleAdminCorporateStageBody,
  UpdateSampleAdminCorporateStageResponse,
  MatchSampleAdminCorporateMakersParams,
  MatchSampleAdminCorporateMakersBody,
  MatchSampleAdminCorporateMakersResponse,
  SaveSampleAdminCorporateQuoteParams,
  SaveSampleAdminCorporateQuoteBody,
  SaveSampleAdminCorporateQuoteResponse,
  GetSampleAdminOverviewResponse,
  GetSampleAdminAcademySalesResponse,
  ImportSampleAdminAcademyCsvBody,
  ImportSampleAdminAcademyCsvResponse,
  GetSampleCouponsResponse,
  GetSampleBlogResponse,
  GetSampleAdminBlogResponse,
  ResetSampleDataResponse,
  SetSampleDefaultAddressParams,
  UpdateSampleWishlistBody,
  UpdateSampleWishlistParams,
  UpdateSampleCouponBody,
  UpdateSampleCouponParams,
  UpdateSampleCouponResponse,
  UpdateSampleBlogPostBody,
  UpdateSampleBlogPostParams,
  UpdateSampleBlogPostResponse,
  UpdateSampleMakerStockBody,
  UpdateSampleMakerStockParams,
  UpdateSampleMakerStockResponse,
  UpdateSampleOrderFulfilmentBody,
  UpdateSampleOrderFulfilmentParams,
  UpdateSampleOrderFulfilmentResponse,
  UpdateSampleAdminOrderStatusBody,
  UpdateSampleAdminOrderStatusParams,
  UpdateSampleAdminOrderStatusResponse,
  RecordSamplePayoutPaidParams,
  RecordSamplePayoutPaidResponse,
} from "@workspace/api-zod";
import { HttpError } from "../lib/supabase";
import { DEFAULT_SETTINGS, splitSale } from "../lib/domain";
import { sampleCatalog } from "../lib/catalog";
import { importSampleAdminAcademyCsv, listSampleAdminAcademySales, resetSampleAcademyData } from "../lib/sample-academy";
import {
  addSampleAddress,
  createSampleCoupon,
  createSampleSession,
  createSampleCheckout,
  deleteSampleAddress,
  listSampleCoupons,
  readSampleSession,
  resetSampleAccountData,
  requireSampleRole,
  revokeSampleSession,
  listSampleMakerStocks,
  sampleShopperAccount,
  setSampleDefaultAddress,
  setSampleWishlist,
  updateSampleMakerStock,
  updateSampleCoupon,
  type SampleIdentityKey,
} from "../lib/sample-accounts";
import {
  listSampleAdminOrders,
  listSampleMakerOrders,
  resetSampleOperationsData,
  getSampleMakerEarnings,
  getSampleAdminPayouts,
  recordSamplePayoutPaid,
  updateSampleAdminOrderStatus,
  updateSampleOrderFulfilment,
} from "../lib/sample-operations";
import {
  createSampleMakerDraft,
  getSampleMakerDraft,
  listSampleMakerDrafts,
  resetSampleMakerData,
  saveSampleMakerDraft,
  submitSampleMakerDraft,
  listSampleAdminProductReviews,
  reviewSampleAdminProduct,
  listSampleMakerProfits,
  saveSampleMakerProductCost,
  getSampleMakerSettings,
  saveSampleMakerSettings,
  listSampleMakerOpportunities,
  respondSampleMakerOpportunity,
  createSampleMakerMasterclassProposal,
  listSampleAdminMasterclassProposals,
  reviewSampleAdminMasterclassProposal,
  listSampleAdminVendorApplications,
  decideSampleAdminVendorApplication,
  createSampleCorporateEnquiry,
  listSampleAdminCorporateEnquiries,
  updateSampleAdminCorporateStage,
  matchSampleAdminCorporateMakers,
  saveSampleAdminCorporateQuote,
  sampleMakerGstRegistered,
} from "../lib/sample-maker";
import {
  createSampleBlogPost,
  listAdminSampleBlog,
  listPublicSampleBlog,
  resetSampleContentData,
  updateSampleBlogPost,
} from "../lib/sample-content";

const router: IRouter = Router();
const signInLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sample sign-ins. Please try again later." },
});
const sampleWriteLimit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  keyGenerator: req => bearerToken(req) ?? ipKeyGenerator(req.ip ?? "unknown"),
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Please wait before making more sample changes." },
});
router.use("/sample", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

function bearerToken(req: Request) {
  return req.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];
}
function sampleIdentity(req: Request) {
  return readSampleSession(bearerToken(req));
}
function sampleId(value: unknown) {
  if (typeof value !== "string" || !/^[a-z0-9-]{1,100}$/i.test(value)) {
    throw new HttpError(400, "Invalid sample record reference.");
  }
  return value;
}

router.post("/sample/session", signInLimit, (req, res): void => {
  const parsed = CreateSampleSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a sample identity." });
    return;
  }
  const result = createSampleSession(parsed.data.identity as SampleIdentityKey);
  res.status(201).json(CreateSampleSessionResponse.parse(result));
});

router.get("/sample/session", (req, res): void => {
  const identity = sampleIdentity(req);
  res.json(GetSampleSessionResponse.parse(identity));
});

router.delete("/sample/session", (req, res): void => {
  const token = bearerToken(req);
  sampleIdentity(req);
  revokeSampleSession(token);
  res.json({ id: "sample-session", message: "Sample session ended. No live account was changed." });
});

router.post("/sample/reset", (req, res): void => {
  const identity = sampleIdentity(req);
  requireSampleRole(identity, ["admin"]);
  resetSampleAccountData();
  resetSampleContentData();
  resetSampleOperationsData();
  resetSampleMakerData();
  resetSampleAcademyData();
  res.json(ResetSampleDataResponse.parse({ id: "sample-data", message: "Isolated sample records reset. No live database was changed." }));
});

router.get("/sample/shopper", (req, res): void => {
  const account = sampleShopperAccount(sampleIdentity(req));
  res.json(GetSampleShopperAccountResponse.parse(account));
});

router.get("/sample/maker/products", (req, res): void => {
  const stocks = listSampleMakerStocks(sampleIdentity(req));
  res.json(GetSampleMakerStocksResponse.parse(stocks));
});

router.get("/sample/maker/orders", (req, res): void => {
  res.json(GetSampleMakerOrdersResponse.parse(listSampleMakerOrders(sampleIdentity(req))));
});

router.get("/sample/admin/orders", (req, res): void => {
  res.json(GetSampleAdminOrdersResponse.parse(listSampleAdminOrders(sampleIdentity(req))));
});

router.get("/sample/maker/earnings", (req, res): void => {
  res.json(GetSampleMakerEarningsResponse.parse(getSampleMakerEarnings(sampleIdentity(req))));
});

router.get("/sample/maker/profits", (req, res): void => {
  res.json(GetSampleMakerProfitsResponse.parse(listSampleMakerProfits(sampleIdentity(req))));
});

router.get("/sample/maker/settings", (req, res): void => {
  res.json(GetSampleMakerSettingsResponse.parse(getSampleMakerSettings(sampleIdentity(req))));
});

router.put("/sample/maker/settings", sampleWriteLimit, (req, res): void => {
  const body = SaveSampleMakerSettingsBody.safeParse(req.body);
  if (!body.success || Object.keys(req.body ?? {}).some(key => !["gstRegistered", "state"].includes(key))) {
    throw new HttpError(400, "Only GST status and state can be edited here; trust is managed by the Baksa team.");
  }
  res.json(SaveSampleMakerSettingsResponse.parse(saveSampleMakerSettings(sampleIdentity(req), body.data)));
});

router.get("/sample/maker/opportunities", (req, res): void => {
  res.json(GetSampleMakerOpportunitiesResponse.parse(listSampleMakerOpportunities(sampleIdentity(req))));
});

router.patch("/sample/maker/opportunities/:id/response", sampleWriteLimit, (req, res): void => {
  const params = RespondSampleMakerOpportunityParams.parse(req.params);
  const body = RespondSampleMakerOpportunityBody.safeParse(req.body);
  if (!body.success) throw new HttpError(400, "Choose yes or no for this opportunity.");
  res.json(RespondSampleMakerOpportunityResponse.parse(respondSampleMakerOpportunity(sampleIdentity(req), params.id, body.data.decision)));
});

router.post("/sample/maker/masterclass-proposals", sampleWriteLimit, (req, res): void => {
  const body = CreateSampleMakerMasterclassProposalBody.safeParse(req.body);
  if (!body.success) throw new HttpError(400, "Complete the class title, type, duration, price and description.");
  res.status(201).json(CreateSampleMakerMasterclassProposalResponse.parse(createSampleMakerMasterclassProposal(sampleIdentity(req), body.data)));
});

router.get("/sample/admin/masterclass-proposals", (req, res): void => {
  res.json(GetSampleAdminMasterclassProposalsResponse.parse(listSampleAdminMasterclassProposals(sampleIdentity(req))));
});

router.patch("/sample/admin/masterclass-proposals/:id", sampleWriteLimit, (req, res): void => {
  const params = ReviewSampleAdminMasterclassProposalParams.parse(req.params);
  const body = ReviewSampleAdminMasterclassProposalBody.safeParse(req.body);
  if (!body.success) throw new HttpError(400, "Choose a valid proposal decision and add any requested changes.");
  res.json(ReviewSampleAdminMasterclassProposalResponse.parse(reviewSampleAdminMasterclassProposal(sampleIdentity(req), params.id, body.data.decision, body.data.note)));
});

router.get("/sample/admin/vendor-applications", (req, res): void => {
  res.json(GetSampleAdminVendorApplicationsResponse.parse(listSampleAdminVendorApplications(sampleIdentity(req))));
});

router.patch("/sample/admin/vendor-applications/:id", sampleWriteLimit, (req, res): void => {
  const params = DecideSampleAdminVendorApplicationParams.parse(req.params);
  const body = DecideSampleAdminVendorApplicationBody.safeParse(req.body);
  if (!body.success) throw new HttpError(400, "Choose approve, book a call, or decline.");
  res.json(DecideSampleAdminVendorApplicationResponse.parse(decideSampleAdminVendorApplication(sampleIdentity(req), params.id, body.data.decision)));
});

router.post("/sample/corporate/enquiries", sampleWriteLimit, (req, res): void => {
  const body = CreateSampleCorporateEnquiryBody.safeParse(req.body);
  if (!body.success) throw new HttpError(400, "Enter valid company and gifting details.");
  res.status(201).json(CreateSampleCorporateEnquiryResponse.parse(createSampleCorporateEnquiry({ ...body.data, neededBy: body.data.neededBy.toISOString().slice(0, 10) })));
});

router.get("/sample/admin/enquiries", (req, res): void => {
  res.json(GetSampleAdminCorporateEnquiriesResponse.parse(listSampleAdminCorporateEnquiries(sampleIdentity(req))));
});

router.get("/sample/admin/overview", (req, res): void => {
  const identity = sampleIdentity(req);
  const orders = listSampleAdminOrders(identity).orders;
  const reviews = listSampleAdminProductReviews(identity).reviews;
  const applications = listSampleAdminVendorApplications(identity).applications;
  const enquiries = listSampleAdminCorporateEnquiries(identity).enquiries;
  const sellableOrders = orders.filter(order => order.status !== "refunded");
  const liveProducts = sampleCatalog.products.filter(product => product.status === "live");
  const pipeline = enquiries.filter(enquiry => ["new", "contacted", "quote"].includes(enquiry.stage));
  const attention = [
    ...orders.filter(order => order.status === "problem" || order.status === "delayed").map(order => ({
      id: order.id, label: `${order.status === "problem" ? "Problem" : "Delayed"} on ${order.id}: ${order.issue || order.productName}`,
      href: "/admin/orders", kind: "order" as const,
    })),
    ...reviews.filter(review => review.status === "review").map(review => ({
      id: review.id, label: `Review “${review.name}” from ${review.makerBrand}`, href: "/admin/reviews", kind: "review" as const,
    })),
    ...applications.filter(application => application.status === "pending").map(application => ({
      id: application.id, label: `New vendor application: ${application.brand}`, href: "/admin/reviews", kind: "application" as const,
    })),
    ...pipeline.filter(enquiry => enquiry.stage === "new" || Object.values(enquiry.responses).includes("yes")).map(enquiry => ({
      id: enquiry.ref,
      label: Object.entries(enquiry.responses).find(([, answer]) => answer === "yes")
        ? `${Object.keys(enquiry.responses).find(key => enquiry.responses[key] === "yes") === "m2" ? "Mushhk" : "Tathaastu"} said yes to brief ${enquiry.ref}`
        : `New corporate brief: ${enquiry.ref}, ${enquiry.qty} gifts`,
      href: "/admin/enquiries", kind: "corporate" as const,
    })),
  ].slice(0, 12);
  const response = {
    sample: true as const,
    metrics: {
      salesPaise: sellableOrders.reduce((sum, order) => sum + order.amountPaise, 0),
      commissionPaise: sellableOrders.reduce((sum, order) => sum + splitSale(order.amountPaise, 18, sampleMakerGstRegistered(order.makerId), DEFAULT_SETTINGS).commissionPaise, 0),
      orderCount: sellableOrders.length,
      liveMakerCount: new Set(liveProducts.map(product => product.makerId)).size,
      liveProductCount: liveProducts.length,
      corporatePipelinePaise: pipeline.reduce((sum, enquiry) => sum + enquiry.budgetPaise * enquiry.qty, 0),
      openCorporateCount: pipeline.length,
      pendingReviewCount: reviews.filter(review => review.status === "review").length,
      openIssueCount: orders.filter(order => order.status === "problem" || order.status === "delayed").length,
      pendingApplicationCount: applications.filter(application => application.status === "pending" || application.status === "call").length,
    },
    attention,
  };
  res.json(GetSampleAdminOverviewResponse.parse(response));
});

router.get("/sample/admin/academy", (req, res): void => {
  res.json(GetSampleAdminAcademySalesResponse.parse(listSampleAdminAcademySales(sampleIdentity(req))));
});

router.post("/sample/admin/academy/import", sampleWriteLimit, (req, res): void => {
  const body = ImportSampleAdminAcademyCsvBody.safeParse(req.body);
  if (!body.success) throw new HttpError(400, "Upload a valid CSV file under 1 MB.");
  res.json(ImportSampleAdminAcademyCsvResponse.parse(importSampleAdminAcademyCsv(sampleIdentity(req), body.data.csv)));
});

router.patch("/sample/admin/enquiries/:ref/stage", sampleWriteLimit, (req, res): void => {
  const params = UpdateSampleAdminCorporateStageParams.parse(req.params);
  const body = UpdateSampleAdminCorporateStageBody.safeParse(req.body);
  if (!body.success) throw new HttpError(400, "Choose a valid enquiry stage.");
  res.json(UpdateSampleAdminCorporateStageResponse.parse(updateSampleAdminCorporateStage(sampleIdentity(req), params.ref, body.data.stage)));
});

router.put("/sample/admin/enquiries/:ref/matches", sampleWriteLimit, (req, res): void => {
  const params = MatchSampleAdminCorporateMakersParams.parse(req.params);
  const body = MatchSampleAdminCorporateMakersBody.safeParse(req.body);
  if (!body.success) throw new HttpError(400, "Choose available makers for this brief.");
  res.json(MatchSampleAdminCorporateMakersResponse.parse(matchSampleAdminCorporateMakers(sampleIdentity(req), params.ref, body.data.makerIds)));
});

router.put("/sample/admin/enquiries/:ref/quote", sampleWriteLimit, (req, res): void => {
  const params = SaveSampleAdminCorporateQuoteParams.parse(req.params);
  const body = SaveSampleAdminCorporateQuoteBody.safeParse(req.body);
  if (!body.success) throw new HttpError(400, "Enter a valid quote amount.");
  res.json(SaveSampleAdminCorporateQuoteResponse.parse(saveSampleAdminCorporateQuote(sampleIdentity(req), params.ref, body.data.quotePaise)));
});

router.put("/sample/maker/products/:productId/cost", sampleWriteLimit, (req, res): void => {
  const params = SaveSampleMakerProductCostParams.safeParse(req.params);
  const body = SaveSampleMakerProductCostBody.safeParse(req.body);
  if (!params.success || !body.success) throw new HttpError(400, "Enter a valid private product cost.");
  res.json(SaveSampleMakerProductCostResponse.parse(saveSampleMakerProductCost(sampleIdentity(req), params.data.productId, body.data.costPaise)));
});

router.get("/sample/maker/drafts", (req, res): void => {
  res.json(GetSampleMakerDraftsResponse.parse(listSampleMakerDrafts(sampleIdentity(req))));
});

router.post("/sample/maker/drafts", sampleWriteLimit, (req, res): void => {
  const body = CreateSampleMakerDraftBody.safeParse(req.body);
  if (!body.success) throw new HttpError(400, "Check the product draft details and try again.");
  res.status(201).json(CreateSampleMakerDraftResponse.parse(createSampleMakerDraft(sampleIdentity(req), body.data)));
});

router.get("/sample/maker/drafts/:id", (req, res): void => {
  const params = GetSampleMakerDraftParams.safeParse(req.params);
  if (!params.success) throw new HttpError(400, "Choose a valid sample draft.");
  res.json(GetSampleMakerDraftResponse.parse(getSampleMakerDraft(sampleIdentity(req), params.data.id)));
});

router.put("/sample/maker/drafts/:id", sampleWriteLimit, (req, res): void => {
  const params = SaveSampleMakerDraftParams.safeParse(req.params);
  const body = SaveSampleMakerDraftBody.safeParse(req.body);
  if (!params.success || !body.success) throw new HttpError(400, "Check the product draft details and try again.");
  res.json(SaveSampleMakerDraftResponse.parse(saveSampleMakerDraft(sampleIdentity(req), params.data.id, body.data)));
});

router.post("/sample/maker/drafts/:id/submit", sampleWriteLimit, (req, res): void => {
  const params = SubmitSampleMakerDraftParams.safeParse(req.params);
  const body = SubmitSampleMakerDraftBody.safeParse(req.body);
  if (!params.success || !body.success) throw new HttpError(400, "Confirm the product facts before submitting.");
  res.json(SubmitSampleMakerDraftResponse.parse(submitSampleMakerDraft(sampleIdentity(req), params.data.id, body.data.confirmedFacts)));
});

router.get("/sample/admin/payouts", (req, res): void => {
  res.json(GetSampleAdminPayoutsResponse.parse(getSampleAdminPayouts(sampleIdentity(req))));
});

router.get("/sample/admin/product-reviews", (req, res): void => {
  res.json(GetSampleAdminProductReviewsResponse.parse(listSampleAdminProductReviews(sampleIdentity(req))));
});

router.patch("/sample/admin/product-reviews/:id", sampleWriteLimit, (req, res): void => {
  const params = ReviewSampleAdminProductParams.safeParse(req.params);
  const body = ReviewSampleAdminProductBody.safeParse(req.body);
  if (!params.success || !body.success) throw new HttpError(400, "Check the review details and all five BT Verified checks.");
  res.json(ReviewSampleAdminProductResponse.parse(reviewSampleAdminProduct(sampleIdentity(req), params.data.id, body.data)));
});

router.post("/sample/admin/payouts/:makerId/:date/paid", sampleWriteLimit, (req, res): void => {
  const identity = sampleIdentity(req);
  const params = RecordSamplePayoutPaidParams.safeParse(req.params);
  if (!params.success) throw new HttpError(400, "Choose a valid maker and weekly payout date.");
  const paid = recordSamplePayoutPaid(identity, params.data.makerId, params.data.date);
  res.json(RecordSamplePayoutPaidResponse.parse(paid));
});

router.patch("/sample/orders/:id/fulfilment", sampleWriteLimit, (req, res): void => {
  const identity = sampleIdentity(req);
  const params = UpdateSampleOrderFulfilmentParams.safeParse(req.params);
  const body = UpdateSampleOrderFulfilmentBody.safeParse(req.body);
  if (!params.success || !body.success) throw new HttpError(400, "Check the order status, courier, tracking, and problem note.");
  const order = updateSampleOrderFulfilment(identity, sampleId(params.data.id), body.data);
  res.json(UpdateSampleOrderFulfilmentResponse.parse(order));
});

router.patch("/sample/admin/orders/:id/status", sampleWriteLimit, (req, res): void => {
  const identity = sampleIdentity(req);
  const params = UpdateSampleAdminOrderStatusParams.safeParse(req.params);
  const body = UpdateSampleAdminOrderStatusBody.safeParse(req.body);
  if (!params.success || !body.success) throw new HttpError(400, "Choose delayed or refunded and add an explanation.");
  const order = updateSampleAdminOrderStatus(identity, sampleId(params.data.id), body.data.status, body.data.note);
  res.json(UpdateSampleAdminOrderStatusResponse.parse(order));
});

router.put("/sample/maker/products/:productId/stock", sampleWriteLimit, (req, res): void => {
  const identity = sampleIdentity(req);
  const params = UpdateSampleMakerStockParams.safeParse(req.params);
  const body = UpdateSampleMakerStockBody.safeParse(req.body);
  if (!params.success || !body.success) throw new HttpError(400, "Stock must be a whole number from 0 to 10,000.");
  const stock = updateSampleMakerStock(identity, sampleId(params.data.productId), body.data.stock);
  res.json(UpdateSampleMakerStockResponse.parse(stock));
});

router.get("/sample/admin/coupons", (req, res): void => {
  const coupons = listSampleCoupons(sampleIdentity(req));
  res.json(GetSampleCouponsResponse.parse(coupons));
});

router.post("/sample/admin/coupons", sampleWriteLimit, (req, res): void => {
  const identity = sampleIdentity(req);
  const parsed = CreateSampleCouponBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Check the sample coupon code, discount, limits, and validity dates.");
  const coupon = createSampleCoupon(identity, { ...parsed.data, startsAt: parsed.data.startsAt.toISOString(), endsAt: parsed.data.endsAt.toISOString() });
  res.status(201).json(CreateSampleCouponResponse.parse(coupon));
});

router.put("/sample/admin/coupons/:id", sampleWriteLimit, (req, res): void => {
  const identity = sampleIdentity(req);
  const params = UpdateSampleCouponParams.safeParse(req.params);
  const parsed = UpdateSampleCouponBody.safeParse(req.body);
  if (!params.success || !parsed.success) throw new HttpError(400, "Check the sample coupon code, discount, limits, and validity dates.");
  const coupon = updateSampleCoupon(identity, sampleId(params.data.id), {
    ...parsed.data, startsAt: parsed.data.startsAt.toISOString(), endsAt: parsed.data.endsAt.toISOString(),
  });
  res.json(UpdateSampleCouponResponse.parse(coupon));
});

router.get("/sample/blog", (_req, res): void => {
  res.set("Cache-Control", "no-store");
  res.json(GetSampleBlogResponse.parse(listPublicSampleBlog()));
});

router.get("/sample/admin/blog", (req, res): void => {
  res.json(GetSampleAdminBlogResponse.parse(listAdminSampleBlog(sampleIdentity(req))));
});

router.post("/sample/admin/blog", sampleWriteLimit, (req, res): void => {
  const parsed = CreateSampleBlogPostBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Check the sample post title, slug, excerpt, body, author, and status.");
  const post = createSampleBlogPost(sampleIdentity(req), parsed.data);
  res.status(201).json(CreateSampleBlogPostResponse.parse(post));
});

router.put("/sample/admin/blog/:id", sampleWriteLimit, (req, res): void => {
  const params = UpdateSampleBlogPostParams.safeParse(req.params);
  const parsed = UpdateSampleBlogPostBody.safeParse(req.body);
  if (!params.success || !parsed.success) throw new HttpError(400, "Check the sample post title, slug, excerpt, body, author, and status.");
  const post = updateSampleBlogPost(sampleIdentity(req), sampleId(params.data.id), parsed.data);
  res.json(UpdateSampleBlogPostResponse.parse(post));
});

router.post("/sample/shopper/checkout", sampleWriteLimit, (req, res): void => {
  const identity = sampleIdentity(req);
  const parsed = CreateSampleCheckoutBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Add at least one valid product, saved address, and unique checkout key.");
  const result = createSampleCheckout(identity, parsed.data);
  const { replayed, ...body } = result;
  res.status(replayed ? 200 : 201).json(CreateSampleCheckoutResponse.parse(body));
});

router.put("/sample/shopper/wishlist/:productId", (req, res): void => {
  const identity = sampleIdentity(req);
  const params = UpdateSampleWishlistParams.safeParse(req.params);
  const body = UpdateSampleWishlistBody.safeParse(req.body);
  if (!params.success || !body.success) throw new HttpError(400, "Check the saved-piece action.");
  setSampleWishlist(identity, sampleId(params.data.productId), body.data.saved);
  res.json({ id: params.data.productId, message: "Sample wishlist saved on the server. No live account was changed." });
});

router.post("/sample/shopper/addresses", (req, res): void => {
  const identity = sampleIdentity(req);
  const parsed = AddSampleAddressBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Check the address, including its six-digit PIN code.");
  const id = addSampleAddress(identity, parsed.data);
  res.status(201).json({ id, message: "Sample address saved on the server. No live account was changed." });
});

router.patch("/sample/shopper/addresses/:id/default", (req, res): void => {
  const identity = sampleIdentity(req);
  const parsed = SetSampleDefaultAddressParams.safeParse(req.params);
  if (!parsed.success) throw new HttpError(400, "Invalid sample address reference.");
  setSampleDefaultAddress(identity, sampleId(parsed.data.id));
  res.json({ id: parsed.data.id, message: "Sample default address updated on the server." });
});

router.delete("/sample/shopper/addresses/:id", (req, res): void => {
  const identity = sampleIdentity(req);
  const parsed = DeleteSampleAddressParams.safeParse(req.params);
  if (!parsed.success) throw new HttpError(400, "Invalid sample address reference.");
  deleteSampleAddress(identity, sampleId(parsed.data.id));
  res.json({ id: parsed.data.id, message: "Sample address removed on the server." });
});

export default router;
