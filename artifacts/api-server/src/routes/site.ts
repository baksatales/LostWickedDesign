import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { GetSiteResponse, GetSiteDraftResponse, SaveSiteDraftBody, PublishSiteBody, RestoreSiteBody } from "@workspace/api-zod";
import { defaultSite, validateSiteDocument } from "../lib/site-content";
import { connection, securityReady, identity, HttpError, checkDb } from "../lib/supabase";

const router: IRouter = Router();
const limits = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false,
  message: { error: "Please wait a moment before saving more changes." } });
const emptyDraft = () => ({ document: defaultSite, revision: 0, publishedRevision: 0, updatedAt: "", history: [] });

router.get("/site", async (_req, res) => {
  res.set("Cache-Control", "no-cache");
  if (!(await securityReady())) {
    res.json(GetSiteResponse.parse({ document: defaultSite, revision: 0, configured: false, updatedAt: "" }));
    return;
  }
  const { data, error } = await connection().rpc("baksa_published_site");
  if (error && ["PGRST202", "42883"].includes(error.code)) {
    res.json(GetSiteResponse.parse({ document: defaultSite, revision: 0, configured: false, updatedAt: "" }));
    return;
  }
  checkDb(error);
  res.json(GetSiteResponse.parse({
    document: data?.document ? validateSiteDocument(data.document) : defaultSite,
    revision: data?.revision ?? 0, updatedAt: data?.updatedAt ?? "", configured: true,
  }));
});
router.use("/admin/site", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

async function admin(req: Parameters<typeof identity>[0]) {
  const actor = await identity(req);
  if (!actor.roles.includes("admin")) throw new HttpError(403, "Only the Baksa team can edit or publish the website.");
  return actor;
}
router.get("/admin/site", async (req, res) => {
  const { db } = await admin(req);
  const { data, error } = await db.rpc("baksa_site_draft");
  if (error?.code === "PGRST202") throw new HttpError(503, "Apply the reviewed Site Studio migration before saving editorial content.");
  checkDb(error);
  res.json(GetSiteDraftResponse.parse(data ?? emptyDraft()));
});
router.put("/admin/site", limits, async (req, res) => {
  const { db } = await admin(req);
  const parsed = SaveSiteDraftBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Check the draft and its revision number.");
  const document = validateSiteDocument(parsed.data.document);
  const { data, error } = await db.rpc("baksa_edit_site", { _action: "save", _expected: parsed.data.expectedRevision, _document: document });
  if (error?.code === "40001") throw new HttpError(409, "Someone else changed this draft. Your edits have not overwritten theirs. Reload the current version before saving again.");
  if (error?.code === "PGRST202") throw new HttpError(503, "Site Studio storage is not configured. Your draft was not saved.");
  checkDb(error);
  res.json(GetSiteDraftResponse.parse(data));
});
router.post("/admin/site/publish", limits, async (req, res) => {
  const { db } = await admin(req);
  const parsed = PublishSiteBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "A valid draft revision is required.");
  const draft = await db.rpc("baksa_site_draft");
  checkDb(draft.error);
  if (!draft.data || draft.data.revision !== parsed.data.expectedRevision) throw new HttpError(409, "The draft has changed. Review the latest saved draft before publishing.");
  validateSiteDocument(draft.data.document);
  const { data, error } = await db.rpc("baksa_edit_site", { _action: "publish", _expected: parsed.data.expectedRevision });
  if (error?.code === "40001") throw new HttpError(409, "The draft changed during publication. Nothing was published; reload and review.");
  checkDb(error);
  res.json(GetSiteDraftResponse.parse(data));
});
router.post("/admin/site/restore", limits, async (req, res) => {
  const { db } = await admin(req);
  const parsed = RestoreSiteBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Choose a version and the current draft revision.");
  const { data, error } = await db.rpc("baksa_edit_site", { _action: "restore", _expected: parsed.data.expectedRevision, _version: parsed.data.versionId });
  if (error?.code === "40001") throw new HttpError(409, "The draft changed. Reload before restoring a version.");
  if (error?.code === "P0002") throw new HttpError(404, "That published version was not found.");
  checkDb(error);
  res.json(GetSiteDraftResponse.parse(data));
});
export default router;
