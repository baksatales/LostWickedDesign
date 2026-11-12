import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Request } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function configuredValues() {
  const url = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const anon = (process.env.SUPABASE_ANON_KEY ?? "").trim();
  // Never send a mistakenly configured service-role/secret key to the browser.
  let safe = anon.startsWith("sb_publishable_");
  if (!safe && anon.split(".").length === 3) {
    try {
      const claims = JSON.parse(Buffer.from(anon.split(".")[1]!, "base64url").toString("utf8")) as { role?: string };
      safe = claims.role === "anon";
    } catch { safe = false; }
  }
  return { url, anon, keyValid: safe, urlValid: /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(url) };
}
/** Safe diagnostics: never returns a credential, host, token payload or key fragment. */
export function connectionConfigurationStatus() {
  const { keyValid, urlValid } = configuredValues();
  return { keyValid, urlValid };
}
/** A connection key is not migration authorization. Bind opt-in to the exact
 * development project so changing SUPABASE_URL cannot silently authorize another. */
export function salesDevelopmentAuthorized() {
  const { url, keyValid, urlValid } = configuredValues();
  const ref = process.env.BAKSA_AUTHORIZED_DEV_PROJECT_REF?.trim();
  if (process.env.BAKSA_SALES_ENVIRONMENT !== "development" || !ref || !keyValid || !urlValid) return false;
  try { return new URL(url).hostname === `${ref}.supabase.co`; } catch { return false; }
}
export function publicConfig() {
  const { url, anon, keyValid, urlValid } = configuredValues();
  if (!keyValid || !urlValid) return { url: "", anon: "" };
  return { url, anon };
}
export function connection(token?: string): SupabaseClient {
  const { url, anon } = publicConfig();
  if (!url || !anon) throw new HttpError(503, "Supabase is not connected. This action has not been saved.");
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  });
}
export async function securityReady() {
  const { url, anon } = publicConfig();
  if (!url || !anon) return false;
  const { data, error } = await connection().rpc("baksa_security_revision");
  if (error && !["PGRST202", "42883"].includes(error.code)) {
    throw new HttpError(503, "The Supabase connection could not be checked. Please try again; no substitute live catalogue has been loaded.");
  }
  return !error && data === 1;
}
export async function safeConnection(token?: string) {
  if (!(await securityReady())) throw new HttpError(503, "The Supabase connection and reviewed security migration need configuring. No changes were saved.");
  return connection(token);
}
export async function identity(req: Request) {
  const token = req.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new HttpError(401, "Sign in to continue.");
  const db = await safeConnection(token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Your session has expired. Please sign in again.");
  if (!data.user.email_confirmed_at && !data.user.phone_confirmed_at) throw new HttpError(403, "Verify your email address before using account workflows.");
  const rolesResult = await db.from("user_roles").select("role").eq("user_id", data.user.id);
  if (rolesResult.error) throw new HttpError(503, "Your account permissions could not be checked. Please try again.");
  const roles = rolesResult.data.map(r => String(r.role));
  return { db, user: data.user, roles };
}
export function checkDb(error: { message: string } | null) {
  if (error) throw new HttpError(502, "The database could not complete this action. Nothing has been confirmed; please retry.");
}
