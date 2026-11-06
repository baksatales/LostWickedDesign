import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import {
  GetOperationsResponse, ReviewApplicationBody, UpdateBriefBody, UpdateFulfilmentBody,
  SaveMakerBrandBody, SaveProductImagesBody,
} from "@workspace/api-zod";
import { identity, HttpError, checkDb } from "../lib/supabase";
import { isSafeImage } from "../lib/site-content";

const router: IRouter = Router();
const limits = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false,
  message: { error: "Please wait a moment before making more changes." } });
const id = (value: unknown) => {
  if (typeof value !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) {
    throw new HttpError(400, "Invalid record reference.");
  }
  return value;
};
const rpcError = (error: { code?: string; message: string } | null) => {
  if (error?.code === "42501") throw new HttpError(403, "This record is not available to your account.");
  if (error?.code === "P0002") throw new HttpError(404, "This record was not found.");
  if (error?.code === "40001") throw new HttpError(409, "This record changed or cannot move to that state. Refresh and review it before trying again.");
  if (error?.code === "P0001") throw new HttpError(400, "The record does not meet the requirements for this action. Check its status and required fields.");
  if (error?.code === "PGRST202") throw new HttpError(503, "The reviewed operations migration needs applying. Nothing has been saved.");
  checkDb(error);
};
router.use(["/operations", "/admin/applications", "/admin/briefs", "/orders", "/maker/brand", "/maker/products"], (_req, res, next) => {
  res.set("Cache-Control", "no-store"); next();
});
router.get("/operations", async (req, res) => {
  const { db, roles } = await identity(req);
  const orders = await db.rpc("baksa_order_feed"); rpcError(orders.error);
  let applications: unknown[] = [], briefs: unknown[] = [];
  if (roles.includes("admin")) {
    const [apps, enquiries] = await Promise.all([
      db.from("vendor_applications").select("id,brand,contact_name,craft,city,status").order("created_at", { ascending: false }).limit(100),
      db.from("corporate_enquiries").select("id,ref,purpose,company,quantity,budget_per_gift_paise,needed_by,stage,contact_name,reach,message").order("created_at", { ascending: false }).limit(100),
    ]);
    checkDb(apps.error); checkDb(enquiries.error);
    applications = (apps.data ?? []).map(a => ({ id: a.id, brand: a.brand, contactName: a.contact_name, craft: a.craft, city: a.city, status: a.status }));
    briefs = (enquiries.data ?? []).map(b => ({ id: b.id, ref: b.ref, purpose: b.purpose, company: b.company, quantity: b.quantity, budgetPaise: b.budget_per_gift_paise, neededBy: b.needed_by, stage: b.stage, contactName: b.contact_name, reach: b.reach, message: b.message ?? "" }));
  }
  res.json(GetOperationsResponse.parse({ orders: orders.data ?? [], applications, briefs }));
});
router.patch("/admin/applications/:id", limits, async (req, res) => {
  const { db, roles } = await identity(req);
  if (!roles.includes("admin")) throw new HttpError(403, "Only the Baksa team can review applications.");
  const appId = id(req.params.id), parsed = ReviewApplicationBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Choose a decision and keep the note within 1,000 characters.");
  const result = await db.rpc("baksa_review_application", { _app: appId, _decision: parsed.data.decision, _note: parsed.data.note.trim() });
  rpcError(result.error);
  res.json({ id: appId, message: parsed.data.decision === "approved" ? "Application approved and a private maker workspace linked to the verified applicant. Products still need review before publication." : "Application review saved." });
});
router.patch("/admin/briefs/:id", limits, async (req, res) => {
  const { db, roles } = await identity(req);
  if (!roles.includes("admin")) throw new HttpError(403, "Only the Baksa team can manage corporate enquiries.");
  const briefId = id(req.params.id), parsed = UpdateBriefBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Choose a valid enquiry stage.");
  const { data, error } = await db.from("corporate_enquiries").update({ stage: parsed.data.stage }).eq("id", briefId).select("id").maybeSingle();
  checkDb(error);
  if (!data) throw new HttpError(404, "This brief was not found.");
  res.json({ id: briefId, message: "Enquiry stage saved. No email, quote or payment has been sent." });
});
router.patch("/orders/:id/fulfilment", limits, async (req, res) => {
  const { db, roles } = await identity(req);
  if (!roles.some(r => r === "admin" || r === "maker")) throw new HttpError(403, "Only the maker or Baksa team can update fulfilment.");
  const orderId = id(req.params.id), parsed = UpdateFulfilmentBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Check the fulfilment status and tracking details.");
  const p = parsed.data;
  if (p.status === "dispatched" && (!p.trackingNumber.trim() || !p.carrier.trim())) throw new HttpError(400, "Add both the carrier and tracking number before dispatching.");
  if (["problem", "delayed"].includes(p.status) && !p.note.trim()) throw new HttpError(400, "Add a short explanation for the buyer and Baksa team.");
  const { error } = await db.rpc("baksa_fulfil_order", { _order: orderId, _status: p.status, _tracking: p.trackingNumber.trim(), _carrier: p.carrier.trim(), _note: p.note.trim() });
  rpcError(error);
  res.json({ id: orderId, message: "Fulfilment status and its audit event are saved. Payment and payout status are unchanged." });
});
router.put("/maker/brand", limits, async (req, res) => {
  const { db, user, roles } = await identity(req);
  if (!roles.includes("maker")) throw new HttpError(403, "An approved maker account is required.");
  const parsed = SaveMakerBrandBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.tagline.trim() || !parsed.data.story.trim()) throw new HttpError(400, "Add a tagline and your maker story.");
  if (!isSafeImage(parsed.data.heroImage)) throw new HttpError(400, "Use an existing asset path or a full https image address.");
  const { data, error } = await db.from("makers").update({
    tagline: parsed.data.tagline.trim(), story: parsed.data.story.trim(), hero_image_url: parsed.data.heroImage || null,
  }).eq("owner_user_id", user.id).select("id").maybeSingle();
  checkDb(error);
  if (!data) throw new HttpError(403, "No maker shop is linked to this account.");
  res.json({ id: data.id, message: "Your maker profile is saved. Ownership, tax details and publication permissions were not changed." });
});
router.put("/maker/products/:id/images", limits, async (req, res) => {
  const { db, roles } = await identity(req);
  if (!roles.includes("maker")) throw new HttpError(403, "An approved maker account is required.");
  const productId = id(req.params.id), parsed = SaveProductImagesBody.safeParse(req.body);
  if (!parsed.success || parsed.data.images.some(image => !image || !isSafeImage(image))) throw new HttpError(400, "Add one to eight existing asset paths or full https image addresses.");
  const { error } = await db.rpc("baksa_replace_product_images", { _product: productId, _images: [...new Set(parsed.data.images)] });
  rpcError(error);
  res.json({ id: productId, message: "Product images are saved in order. The listing is still private until reviewed." });
});
export default router;
