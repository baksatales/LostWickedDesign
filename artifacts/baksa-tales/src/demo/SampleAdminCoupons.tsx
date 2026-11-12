import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import type { SampleCoupon, SampleCouponInput, SampleCouponsResponse } from "@workspace/api-client-react";
import { SAMPLE_SESSION_KEY } from "./SampleAccount";

type CouponDraft = {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: string;
  minimumRupees: string;
  maximumRupees: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perShopperLimit: string;
  active: boolean;
};
const api = "/api/sample/admin/coupons";
const localDateTime = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};
const emptyDraft = (): CouponDraft => {
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    code: "", discountType: "percent", discountValue: "10", minimumRupees: "0", maximumRupees: "1000",
    startsAt: localDateTime(start), endsAt: localDateTime(end), usageLimit: "100", perShopperLimit: "1", active: true,
  };
};
const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const errorText = (value: unknown) => value instanceof Error ? value.message : "The coupon request failed.";

export default function SampleAdminCoupons() {
  const [token, setToken] = useState("");
  const [coupons, setCoupons] = useState<SampleCoupon[]>([]);
  const [draft, setDraft] = useState<CouponDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try { setToken(localStorage.getItem(SAMPLE_SESSION_KEY) || ""); }
    catch { setError("Sample session storage is unavailable."); setLoading(false); }
  }, []);

  const load = async (sessionToken: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(api, { cache: "no-store", headers: { authorization: `Bearer ${sessionToken}` } });
      const result = await response.json() as SampleCouponsResponse & { error?: string };
      if (!response.ok || !result.sample) throw new Error(result.error || "Sample coupons could not be loaded.");
      setCoupons(result.coupons);
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (token) void load(token); }, [token]);

  const fromCoupon = (coupon: SampleCoupon): CouponDraft => ({
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue),
    minimumRupees: String(coupon.minimumPaise / 100),
    maximumRupees: coupon.maximumDiscountPaise === null ? "" : String(coupon.maximumDiscountPaise / 100),
    startsAt: localDateTime(new Date(coupon.startsAt)),
    endsAt: localDateTime(new Date(coupon.endsAt)),
    usageLimit: coupon.usageLimit === null ? "" : String(coupon.usageLimit),
    perShopperLimit: String(coupon.perShopperLimit),
    active: coupon.active,
  });

  const toPayload = (): SampleCouponInput => ({
    code: draft.code.trim().toUpperCase(),
    discountType: draft.discountType,
    discountValue: Number(draft.discountValue),
    minimumPaise: Math.round(Number(draft.minimumRupees) * 100),
    maximumDiscountPaise: draft.discountType === "percent" && draft.maximumRupees.trim() !== ""
      ? Math.round(Number(draft.maximumRupees) * 100) : null,
    startsAt: new Date(draft.startsAt).toISOString(),
    endsAt: new Date(draft.endsAt).toISOString(),
    usageLimit: draft.usageLimit.trim() === "" ? null : Number(draft.usageLimit),
    perShopperLimit: Number(draft.perShopperLimit),
    active: draft.active,
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) { setError("Your sample admin session expired. Sign in again at /admin."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(editingId ? `${api}/${encodeURIComponent(editingId)}` : api, {
        method: editingId ? "PUT" : "POST",
        cache: "no-store",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(toPayload()),
      });
      const result = await response.json() as SampleCoupon & { error?: string };
      if (!response.ok) throw new Error(result.error || "The sample coupon was not saved.");
      setNotice(`${result.code} saved in isolated sample data. No live store was changed.`);
      setDraft(emptyDraft()); setEditingId(null);
      await load(token);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const startEdit = (coupon: SampleCoupon) => { setDraft(fromCoupon(coupon)); setEditingId(coupon.id); setError(""); setNotice(""); };
  const cancelEdit = () => { setDraft(emptyDraft()); setEditingId(null); setError(""); };

  return (
    <main className="bt-admin-coupons" data-testid="admin-coupons-page">
      <aside className="bt-admin-coupons-nav">
        <span className="bt-account-eyebrow">Baksa Tales · sample admin</span>
        <h2>Team admin</h2>
        <nav aria-label="Admin modules">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/reviews">Listing reviews</Link>
          <Link href="/admin/orders">Orders and payouts</Link>
          <Link href="/admin/enquiries">Corporate enquiries</Link>
          <Link href="/admin/academy">Academy</Link>
          <Link href="/admin/coupons" aria-current="page">Coupons</Link>
          <Link href="/admin/blog">Blog</Link>
        </nav>
        <p>Sample module · changes reset with the sample service.</p>
      </aside>
      <section className="bt-admin-coupons-body">
        <p className="bt-account-eyebrow">Promotions</p>
        <h1>Coupons.</h1>
        <p className="bt-admin-coupons-intro">Create and manage sample discount codes. Coupon rules are checked by the server at sample checkout; they do not affect live orders.</p>
        {notice && <p className="bt-admin-coupons-notice" role="status">{notice}</p>}
        {error && <p className="bt-admin-coupons-error" role="alert">{error}</p>}
        <form className="bt-admin-coupon-form" onSubmit={submit} data-testid="coupon-form">
          <h2>{editingId ? "Edit coupon" : "Create a coupon"}</h2>
          <div className="bt-admin-coupon-fields">
            <label>Code<input required minLength={3} maxLength={40} pattern="[A-Za-z0-9_-]+" value={draft.code} onChange={e => setDraft(x => ({ ...x, code: e.target.value.toUpperCase() }))} placeholder="WELCOME10" data-testid="coupon-code"/></label>
            <label>Discount type<select value={draft.discountType} onChange={e => setDraft(x => ({ ...x, discountType: e.target.value as CouponDraft["discountType"], maximumRupees: e.target.value === "fixed" ? "" : x.maximumRupees }))} data-testid="coupon-type"><option value="percent">Percent off</option><option value="fixed">Fixed amount off</option></select></label>
            <label>{draft.discountType === "percent" ? "Discount percent" : "Discount amount in rupees"}<input required type="number" min="1" max={draft.discountType === "percent" ? "100" : undefined} step="1" value={draft.discountValue} onChange={e => setDraft(x => ({ ...x, discountValue: e.target.value }))} data-testid="coupon-value"/></label>
            <label>Minimum spend in rupees<input required type="number" min="0" step=".01" value={draft.minimumRupees} onChange={e => setDraft(x => ({ ...x, minimumRupees: e.target.value }))}/></label>
            {draft.discountType === "percent" && <label>Maximum discount in rupees<input type="number" min="0" step=".01" value={draft.maximumRupees} onChange={e => setDraft(x => ({ ...x, maximumRupees: e.target.value }))}/></label>}
            <label>Starts at<input required type="datetime-local" value={draft.startsAt} onChange={e => setDraft(x => ({ ...x, startsAt: e.target.value }))}/></label>
            <label>Ends at<input required type="datetime-local" value={draft.endsAt} onChange={e => setDraft(x => ({ ...x, endsAt: e.target.value }))}/></label>
            <label>Total uses<input type="number" min="1" value={draft.usageLimit} onChange={e => setDraft(x => ({ ...x, usageLimit: e.target.value }))} placeholder="Unlimited"/></label>
            <label>Uses per shopper<input required type="number" min="1" max="100" value={draft.perShopperLimit} onChange={e => setDraft(x => ({ ...x, perShopperLimit: e.target.value }))}/></label>
          </div>
          <label className="bt-admin-coupon-active"><input type="checkbox" checked={draft.active} onChange={e => setDraft(x => ({ ...x, active: e.target.checked }))}/> Active</label>
          <div className="bt-admin-coupon-actions">
            <button className="bt-account-primary" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Create coupon"}</button>
            {editingId && <button className="bt-account-secondary" type="button" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
        <section className="bt-admin-coupon-list" aria-labelledby="coupon-list-title">
          <div className="bt-admin-coupon-list-head"><h2 id="coupon-list-title">Sample coupon codes</h2><button className="bt-account-secondary" type="button" onClick={() => token && void load(token)} disabled={loading}>{loading ? "Refreshing…" : "Refresh list"}</button></div>
          {loading ? <p role="status">Loading sample coupons…</p> : coupons.length === 0 ? <p>No coupons yet. Create the first one above.</p> : coupons.map(coupon => (
            <article className="bt-admin-coupon-row" key={coupon.id} data-testid={`coupon-row-${coupon.code}`}>
              <div><strong>{coupon.code}</strong><span className={coupon.active ? "active" : "paused"}>{coupon.active ? "Active" : "Paused"}</span></div>
              <p>{coupon.discountType === "percent" ? `${coupon.discountValue}% off` : `${rupees(coupon.discountValue)} off`} · minimum {rupees(coupon.minimumPaise)}</p>
              <p>Uses: {coupon.usedCount}{coupon.usageLimit === null ? " / unlimited" : ` / ${coupon.usageLimit}`} · {coupon.perShopperLimit} per shopper</p>
              <p>Valid {new Date(coupon.startsAt).toLocaleDateString()} – {new Date(coupon.endsAt).toLocaleDateString()}</p>
              <button className="bt-account-secondary" type="button" onClick={() => startEdit(coupon)}>Edit</button>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
