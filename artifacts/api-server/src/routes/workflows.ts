import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import {
  ApplyToSellBody, ApplyToSellResponse, CreateBriefBody, CreateBriefResponse,
  GetWorkspaceResponse, SaveProductBody, SaveProductResponse, SubmitProductParams,
  SubmitProductResponse, ReviewProductBody, ReviewProductResponse,
} from "@workspace/api-zod";
import { identity, safeConnection, HttpError, checkDb } from "../lib/supabase";
import { mapMaker, mapProduct } from "../lib/catalog";
import { corporateContact } from "../lib/corporate-brief";

const router: IRouter = Router();
router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const submissions = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: "draft-7", legacyHeaders: false,
  message: { error: "Too many submissions. Please wait a few minutes before trying again." } });
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const clean = (v: string) => v.trim();
router.post("/applications", submissions, async (req, res): Promise<void> => {
  const parsed = ApplyToSellBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Check the required application fields and 10-digit mobile number." }); return; }
  const p = parsed.data;
  if (![p.brand, p.contactName, p.craft, p.city, p.state].every(s => s.trim().length)) throw new HttpError(400, "Required fields cannot be blank.");
  if (p.gstRegistered && !/^[0-9A-Z]{15}$/.test(p.gstin ?? "")) throw new HttpError(400, "Please enter your 15-character GST registration number.");
  if (p.link && !/^https:\/\/[^\s]+$/i.test(p.link)) throw new HttpError(400, "Please use a full https website or social-profile link.");
  const { db, user } = await identity(req);
  const { data, error } = await db.from("vendor_applications").insert({
    brand: clean(p.brand), contact_name: clean(p.contactName), phone: p.phone, craft: clean(p.craft), city: clean(p.city),
    state: clean(p.state), gst_registered: p.gstRegistered, gstin: p.gstRegistered ? p.gstin : null,
    link: p.link || null, status: "pending", applicant_user_id: user.id,
  }).select("id").single();
  checkDb(error);
  if (!data) throw new HttpError(502, "The database did not confirm your application. Please try again.");
  res.status(201).json(ApplyToSellResponse.parse({ id: data.id, message: "Your application is saved for the Baksa team to review. This is not an approval or a delivered email." }));
});
router.post("/corporate", submissions, async (req, res): Promise<void> => {
  const parsed = CreateBriefBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Check your brief, quantity, budget, date and email address." }); return; }
  const p = parsed.data;
  if (![p.purpose, p.contactName, p.company].every(s => s.trim().length)) throw new HttpError(400, "Required fields cannot be blank.");
  const contact = corporateContact(p);
  const date = new Date(`${p.neededBy}T00:00:00Z`);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== p.neededBy || p.neededBy < today) throw new HttpError(400, "Choose a valid date that is not in the past.");
  const db = await safeConnection();
  // Private contact data never appears in the public catalogue; RLS allows insert but not select.
  const ref = `BT-CG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const id = crypto.randomUUID();
  const { error } = await db.from("corporate_enquiries").insert({
    id, ref, purpose: clean(p.purpose), quantity: p.quantity, budget_per_gift_paise: p.budgetPaise,
    needed_by: p.neededBy, contact_name: clean(p.contactName), company: clean(p.company), reach: contact.reach,
    customisation: p.customization?.trim() ? [p.customization.trim()] : [],
    delivery_cities: p.deliveryCities?.trim() || null, reference_link: contact.referenceUrl || null,
    message: p.message, stage: "new",
  });
  checkDb(error);
  res.status(201).json(CreateBriefResponse.parse({ id: ref, message: "Your brief is saved for the Baksa team. This is not yet a quote or an email confirmation." }));
});
router.get("/workspace", async (req, res): Promise<void> => {
  const { db, user, roles } = await identity(req);
  const admin = roles.includes("admin"), maker = roles.includes("maker");
  let shop = undefined;
  let products: ReturnType<typeof mapProduct>[] = [];
  if (maker) {
    const result = await db.from("makers").select("id,brand,craft,tagline,story,bio,hero_image_url").eq("owner_user_id", user.id).maybeSingle();
    checkDb(result.error);
    if (result.data) {
      shop = mapMaker(result.data);
      const resultProducts = await db.from("products").select("id,slug,maker_id,name,price_paise,stock,dispatch_days,material,story,status,review_note,product_images(url,sort)").eq("maker_id", shop.id).order("created_at", { ascending: false });
      checkDb(resultProducts.error); products = (resultProducts.data ?? []).map(p => mapProduct(p));
    }
  }
  if (admin) {
    const result = await db.from("products").select("id,slug,maker_id,name,price_paise,stock,dispatch_days,material,story,status,review_note,product_images(url,sort)").in("status", ["review", "changes"]).order("submitted_at");
    checkDb(result.error); products = (result.data ?? []).map(p => mapProduct(p));
  }
  let orderQuery = db.from("orders").select("id", { count: "exact", head: true });
  if (!admin) orderQuery = maker && shop ? orderQuery.eq("maker_id", shop.id) : orderQuery.eq("buyer_id", user.id);
  const orders = await orderQuery; checkDb(orders.error);
  const applications = admin ? await db.from("vendor_applications").select("id", { count: "exact", head: true }).eq("status", "pending") : null;
  const briefs = admin ? await db.from("corporate_enquiries").select("id", { count: "exact", head: true }).eq("stage", "new") : null;
  if (applications) checkDb(applications.error); if (briefs) checkDb(briefs.error);
  res.json(GetWorkspaceResponse.parse({
    userId: user.id, email: user.email ?? "", roles, maker: shop, products,
    ordersCount: orders.count ?? 0, applicationsCount: applications?.count ?? 0, briefsCount: briefs?.count ?? 0,
  }));
});
router.post("/maker/products", submissions, async (req, res): Promise<void> => {
  const { db, user, roles } = await identity(req);
  if (!roles.includes("maker")) throw new HttpError(403, "This account is not an approved maker.");
  const parsed = SaveProductBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Check the product details, price, stock and dispatch days.");
  const p = parsed.data;
  if (![p.name, p.material, p.description].every(s => s.trim().length)) throw new HttpError(400, "Product name, material and description cannot be blank.");
  const maker = await db.from("makers").select("id").eq("owner_user_id", user.id).single();
  checkDb(maker.error);
  if (!maker.data) throw new HttpError(403, "No maker shop is linked to your account.");
  const row = {
    maker_id: maker.data.id, name: clean(p.name), price_paise: p.pricePaise, stock: p.stock,
    material: clean(p.material), story: clean(p.description), dispatch_days: p.dispatchDays, maker_verified: p.factualConfirmation,
  };
  if (p.id) {
    if (!uuid(p.id)) throw new HttpError(400, "Invalid product reference.");
    const saved = await db.from("products").update(row).eq("id", p.id).eq("maker_id", maker.data.id).in("status", ["draft", "changes"]).select("id").maybeSingle();
    checkDb(saved.error);
    if (!saved.data) throw new HttpError(409, "Only your draft or change-requested listings can be edited here.");
    res.json(SaveProductResponse.parse({ id: saved.data.id, message: "Your private product draft is saved." }));
  } else {
    const saved = await db.from("products").insert({ ...row, status: "draft" }).select("id").single();
    checkDb(saved.error);
    if (!saved.data) throw new HttpError(502, "The database did not confirm your product draft. Please retry.");
    res.json(SaveProductResponse.parse({ id: saved.data.id, message: "Your private product draft is saved. It is not published." }));
  }
});
router.post("/maker/products/:id/submit", submissions, async (req, res): Promise<void> => {
  const { db, roles } = await identity(req);
  if (!roles.includes("maker")) throw new HttpError(403, "Approved makers only.");
  const parsed = SubmitProductParams.safeParse(req.params);
  if (!parsed.success || !uuid(parsed.data.id)) throw new HttpError(400, "Invalid product reference.");
  const product = await db.from("products").select("id,maker_verified,name,material,story,product_images(id)").eq("id", parsed.data.id).single();
  if (product.error || !product.data) throw new HttpError(404, "Product not found.");
  if (!product.data.maker_verified) throw new HttpError(400, "Confirm your product facts before submitting.");
  if (!product.data.product_images.length) throw new HttpError(400, "Add a product photograph before submitting. Image storage needs configuring.");
  const result = await db.rpc("submit_product", { _product: parsed.data.id }); checkDb(result.error);
  res.json(SubmitProductResponse.parse({ id: parsed.data.id, message: result.data === "live" ? "Your listing is now published." : "Your product is saved in the review queue." }));
});
router.post("/admin/review", submissions, async (req, res): Promise<void> => {
  const { db, roles } = await identity(req);
  if (!roles.includes("admin")) throw new HttpError(403, "Baksa administrators only.");
  const parsed = ReviewProductBody.safeParse(req.body);
  if (!parsed.success || !uuid(parsed.data.productId)) throw new HttpError(400, "Check the listing review.");
  const p = parsed.data;
  if (p.decision === "approved" && ![p.handmade, p.material, p.photos, p.price, p.story].every(Boolean)) throw new HttpError(400, "All five checks must pass before approval.");
  if (p.decision === "changes" && !p.note.trim()) throw new HttpError(400, "Tell the maker what needs changing.");
  const result = await db.rpc("review_product", {
    _product: p.productId, _decision: p.decision, _note: p.note,
    _gates: { gate1_handmade: p.handmade, gate1_material: p.material, gate2_photos: p.photos, gate2_price: p.price, gate2_story: p.story },
  }); checkDb(result.error);
  res.json(ReviewProductResponse.parse({ id: p.productId, message: p.decision === "approved" ? "The product is published." : "Your change request is recorded for the maker." }));
});
export default router;
