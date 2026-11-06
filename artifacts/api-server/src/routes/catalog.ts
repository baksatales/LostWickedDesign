import { Router, type IRouter } from "express";
import { GetCatalogResponse, FindGiftsBody, FindGiftsResponse, GetRuntimeResponse } from "@workspace/api-zod";
import { sampleCatalog, sampleDomainProducts, sampleDomainMakers, mapMaker, mapProduct } from "../lib/catalog";
import { connection, publicConfig, securityReady, checkDb } from "../lib/supabase";
import { recommend, type BudgetBand, type GiftFeel, type Occasion, type Recipient, type Product as RuleProduct, type Maker as RuleMaker } from "../lib/domain";

const router: IRouter = Router();
const publicProductFields = "id,slug,maker_id,name,price_paise,stock,made_to_order,dispatch_days,material,story,status,gst_pct,feels,occasions,recipients,product_images(url,sort)";
const publicMakerFields = "id,brand,craft,tagline,story,bio,hero_image_url,gst_registered,state,published";

async function catalogData() {
  if (!(await securityReady())) return { catalog: sampleCatalog, rules: sampleDomainProducts, makers: sampleDomainMakers };
  const db = connection();
  const [makers, products] = await Promise.all([
    db.from("makers").select(publicMakerFields).eq("published", true),
    db.from("products").select(publicProductFields).eq("status", "live"),
  ]);
  checkDb(makers.error); checkDb(products.error);
  const makerRows = makers.data ?? [];
  const ids = new Set(makerRows.map(m => m.id));
  const productRows = (products.data ?? []).filter(p => ids.has(p.maker_id));
  return {
    catalog: GetCatalogResponse.parse({ sample: false, makers: makerRows.map(mapMaker), products: productRows.map(p => mapProduct(p)) }),
    rules: productRows.map(p => ({
      id: p.id, makerId: p.maker_id, name: p.name, pricePaise: p.price_paise, gstPct: Number(p.gst_pct),
      stock: p.stock, madeToOrder: p.made_to_order, dispatchDays: p.dispatch_days, status: "live",
      feels: p.feels, occasions: p.occasions, recipients: p.recipients,
    })) as RuleProduct[],
    makers: new Map<string, RuleMaker>(makerRows.map(m => [m.id, {
      id: m.id, brand: m.brand, gstRegistered: m.gst_registered, state: m.state, published: m.published, trusted: false, approvedCount: 0,
    }])),
  };
}
router.get("/runtime", async (_req, res): Promise<void> => {
  const cfg = publicConfig();
  const configured = !!cfg.url && !!cfg.anon;
  const ready = await securityReady();
  res.json(GetRuntimeResponse.parse({
    database: ready, auth: configured, payments: false, ai: !!(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
    supabaseUrl: cfg.url, supabaseAnonKey: cfg.anon,
    message: ready ? "Catalogue and account workflows connected. Payments still require setup; AI writing requires an approved maker or admin account." :
      configured ? "Sign-in is connected. The reviewed database security migration still needs applying." :
      "Development catalogue. Connect Supabase to enable accounts and saved maker/admin workflows. Payments are not connected; AI writing requires a verified maker or admin account.",
  }));
});
router.get("/catalog", async (_req, res): Promise<void> => {
  res.json((await catalogData()).catalog);
});
router.post("/recommendations", async (req, res): Promise<void> => {
  const input = FindGiftsBody.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: "Please check your gift preferences and budget." }); return; }
  const { recipient, occasion, feeling, budgetPaise } = input.data;
  const data = await catalogData();
  // Strict budget is applied before the kit's band-based ranking. Never suggest paid placements above budget.
  const pool = data.rules.filter(p => p.pricePaise <= budgetPaise && p.stock > 0);
  const budget: BudgetBand = budgetPaise <= 150000 ? "b1" : budgetPaise <= 350000 ? "b2" : budgetPaise <= 800000 ? "b3" : "b4";
  const recipientMap: Record<string, Recipient> = { parent: "parent", partner: "partner", friend: "friend", colleague: "colleague", self: "self" };
  const occasionMap: Record<string, Occasion> = { diwali: "diwali", wedding: "wedding", birthday: "birthday", thanks: "thanks", housewarming: "housewarming", justbecause: "justbecause" };
  const feelMap: Record<string, GiftFeel> = { heart: "heart", showstopper: "showstopper", soother: "soother", thoughtful: "thoughtful", explorer: "explorer" };
  const answers = {
    recipient: recipientMap[recipient], occasion: occasionMap[occasion],
    feel: feelMap[feeling], budget,
  };
  const ranked = recommend(pool, data.makers, answers, { needBy: "any" });
  const candidates = ranked.picks.length ? ranked.picks : ranked.nearMisses;
  const matches = candidates.slice(0, 4).flatMap(match => {
    const product = data.catalog.products.find(p => p.id === match.productId);
    return product ? [{ product, reason: match.reasons.filter(r => r.kind === "match").slice(0, 2).map(r => r.text).join(". ") }] : [];
  });
  // If all optional relevance questions were skipped, offer a small honest budget edit, not fake personalisation.
  const noRelevance = !answers.occasion && !answers.feel;
  if (noRelevance) {
    matches.push(...data.catalog.products.filter(p => pool.some(x => x.id === p.id)).slice(0, 4).map(product => ({
      product, reason: "Within your budget. Choose an occasion or feeling for more specific matches.",
    })));
  }
  res.json(FindGiftsResponse.parse({
    sample: data.catalog.sample, matches,
    message: data.catalog.sample ? "Sample catalogue suggestions, using transparent matching rules. Delivery eligibility is not verified." :
      "Matched by your preferences and budget, not sponsorship. Delivery eligibility is confirmed separately; these are rules-based suggestions, not live AI.",
  }));
});
export default router;
