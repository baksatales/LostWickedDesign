import { Router, type IRouter, type Request } from "express";
import { rateLimit } from "express-rate-limit";
import {
  GetSalesReadinessResponse, GetSalesOrdersResponse, QuoteSalesOrderBody,
  QuoteSalesOrderResponse, UpdateSalesOrderBody, UpdateSalesOrderParams,
} from "@workspace/api-zod";
import { identity, safeConnection, salesDevelopmentAuthorized, HttpError } from "../lib/supabase";

const router: IRouter = Router();
router.use("/sales", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const writes = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false,
  message: { error: "Please wait a moment before trying again." } });

function rpcError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "42501") throw new HttpError(403, "This record is not available to your account.");
  if (error.code === "40001") throw new HttpError(409, "Stock, approval or order status changed. Refresh before trying again.");
  if (["PGRST202", "42883", "42P01"].includes(error.code ?? "")) {
    throw new HttpError(503, "The reviewed sales migration has not been verified on the authorized development project. Nothing was saved.");
  }
  if (["55000", "P0001", "22P02"].includes(error.code ?? "")) throw new HttpError(400, "Check the saved address, approved products, quantities and required order details.");
  throw new HttpError(502, "The database could not confirm this action. No success has been recorded.");
}
async function salesIdentity(req: Request, adminOnly = false) {
  // Isolated sample tokens are not JWTs. Reject before any hosted Auth request.
  if (!/^Bearer [^.]+\.[^.]+\.[^.]+$/i.test(req.get("authorization") ?? "")) {
    throw new HttpError(401, "A verified real account is required. Sample sessions cannot use sales operations.");
  }
  if (!salesDevelopmentAuthorized()) throw new HttpError(503, "Sales access is disabled until the exact development Supabase project is authorized. No changes were saved.");
  const account = await identity(req);
  if (adminOnly && !account.roles.includes("admin")) throw new HttpError(403, "Only the verified Baksa operator can access sales operations.");
  return account;
}
router.get("/sales/readiness", async (_req, res): Promise<void> => {
  const developmentAuthorized = salesDevelopmentAuthorized();
  let schemaReady = false, approvedProducts = 0;
  const blockers: string[] = [];
  if (!developmentAuthorized) blockers.push("Confirm and authorize the exact development Supabase project. Connection settings alone are not authorization.");
  else {
    try {
      const db = await safeConnection();
      const result = await db.rpc("baksa_sales_readiness");
      if (result.error || !result.data?.schemaReady) blockers.push("Apply and verify the reviewed sales migration on the authorized development project.");
      else {
        schemaReady = true;
        approvedProducts = Number(result.data.approvedProducts) || 0;
        if (!result.data.shippingConfigured) blockers.push("Confirm shipping prices and the free-delivery threshold.");
        if (!approvedProducts) blockers.push("Approve real launch product facts, prices and inventory. Sample listings are not approved stock.");
      }
    } catch {
      blockers.push("The development database connection or security revision could not be verified.");
    }
  }
  blockers.push("Select and connect the payment provider; verify its test checkout, signed notifications, failures and refunds.");
  blockers.push("Verify the first operator account and the real buyer-to-fulfilment journey before launch.");
  res.json(GetSalesReadinessResponse.parse({
    checkoutEnabled: false, developmentAuthorized, schemaReady, approvedProducts, provider: "not_connected", blockers,
  }));
});
router.post("/sales/quote", writes, async (req, res): Promise<void> => {
  const { db } = await salesIdentity(req);
  const parsed = QuoteSalesOrderBody.safeParse(req.body);
  // Explicitly reject browser totals/payment assertions instead of silently stripping them.
  if (!parsed.success || Object.keys(req.body).some(key => !["lines", "addressId"].includes(key)) ||
    req.body.lines.some((line: Record<string, unknown>) => Object.keys(line).some(key => !["productId", "quantity"].includes(key)))) {
    throw new HttpError(400, "Send only product references, whole quantities and your saved address reference.");
  }
  const { data, error } = await db.rpc("baksa_sales_quote", { _lines: parsed.data.lines, _address: parsed.data.addressId });
  rpcError(error);
  res.json(QuoteSalesOrderResponse.parse(data));
});
router.post("/sales/checkouts", writes, async (req, res): Promise<void> => {
  await salesIdentity(req);
  // Deliberately no reservation or insert: there is no selected payment adapter.
  throw new HttpError(503, "Payment is not connected. No reservation, order or charge was created. A sample checkout is not a purchase.");
});
router.get("/sales/operator/orders", async (req, res): Promise<void> => {
  const { db } = await salesIdentity(req, true);
  // Verify the feed with immutable shipping snapshots exists before exposing ops.
  const readiness = await db.rpc("baksa_sales_readiness"); rpcError(readiness.error);
  if (!readiness.data?.schemaReady) throw new HttpError(503, "The reviewed sales migration has not been verified.");
  const result = await db.rpc("baksa_order_feed"); rpcError(result.error);
  res.json(GetSalesOrdersResponse.parse({ environment: "development", orders: result.data ?? [] }));
});
router.patch("/sales/operator/orders/:id", writes, async (req, res): Promise<void> => {
  const { db } = await salesIdentity(req, true);
  const params = UpdateSalesOrderParams.safeParse(req.params);
  const parsed = UpdateSalesOrderBody.safeParse(req.body);
  if (!params.success || !parsed.success) throw new HttpError(400, "Check the order reference, status and tracking details.");
  const p = parsed.data;
  if (p.status === "dispatched" && (!p.carrier.trim() || !p.trackingNumber.trim())) throw new HttpError(400, "Add the courier and tracking number before dispatch.");
  if (["delayed", "problem"].includes(p.status) && !p.note.trim()) throw new HttpError(400, "Explain the delay or problem.");
  const readiness = await db.rpc("baksa_sales_readiness"); rpcError(readiness.error);
  if (!readiness.data?.schemaReady) throw new HttpError(503, "The reviewed sales migration has not been verified.");
  const result = await db.rpc("baksa_fulfil_order", {
    _order: params.data.id, _status: p.status, _tracking: p.trackingNumber.trim(), _carrier: p.carrier.trim(), _note: p.note.trim(),
  });
  rpcError(result.error);
  res.json({ id: params.data.id, message: "Order fulfilment and its audit event were saved. No courier booking, payment, refund or payout was initiated." });
});
export default router;
