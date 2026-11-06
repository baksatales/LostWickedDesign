import { HttpError } from "./supabase";

export interface CorporateContact {
  reach?: string;
  email?: string;
  referenceUrl?: string;
}

/** The browser collects contact details; the server verifies what it will store. */
export function corporateContact(input: CorporateContact) {
  const reach = (input.reach?.trim() || input.email?.trim() || "");
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reach);
  const phone = /^[+\d\s()-]+$/.test(reach)
    && /^(?:\+91|91)?[6-9]\d{9}$/.test(reach.replace(/[\s()-]/g, ""));
  if (!email && !phone) {
    throw new HttpError(400, "Enter a valid work email or 10-digit Indian WhatsApp number.");
  }
  const referenceUrl = input.referenceUrl?.trim() || "";
  if (referenceUrl) {
    let url: URL;
    try { url = new URL(referenceUrl); }
    catch { throw new HttpError(400, "Use a full https reference link."); }
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new HttpError(400, "Use a full https reference link without account credentials.");
    }
  }
  return { reach, referenceUrl };
}
