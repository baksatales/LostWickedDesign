import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useLocation } from "wouter";
import type { SampleAddress, SampleShopperAccount } from "@workspace/api-client-react";
import { SAMPLE_SESSION_KEY } from "./sample-api";

type SampleIdentity = "shopper" | "shopper-other";
type Session = { token: string; identity: string; role: string; displayName: string; sample: true };
export { SAMPLE_SESSION_KEY } from "./sample-api";
const API = "/api";
const productNames: Record<string, string> = {
  "t-bluelotus": "Blue Lotus Pond",
  "mu-box": "The Mushhk Essential Box",
  "t-succulents": "Succulent Bowl",
  "t-lotuspond": "Lotus Pond Candle Set",
  "t-marigold": "Marigold Urli",
  "t-sunflower": "Sunflower Trio",
};
const money = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
const orderSteps = ["placed", "packed", "on_the_way", "delivered"] as const;
const orderLabels = ["Placed", "Packed", "On the way", "Delivered"];

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    cache: "no-store",
    headers: { authorization: `Bearer ${token}`, ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers },
  });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "The sample account service could not complete this action.");
  return payload as T;
}

export default function SampleAccount({ path }: { path: string }) {
  const [, navigate] = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<SampleShopperAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [identity, setIdentity] = useState<SampleIdentity>("shopper");
  const [busy, setBusy] = useState(false);
  const [address, setAddress] = useState({
    name: "", phone: "", line1: "", line2: "", city: "", state: "", pin: "", isDefault: false,
  });

  useEffect(() => {
    let alive = true;
    const token = (() => { try { return localStorage.getItem(SAMPLE_SESSION_KEY); } catch { return null; } })();
    if (!token) { setReady(true); return; }
    request<Session>("/sample/session", token)
      .then(async result => {
        if (!alive) return;
        if (result.role !== "shopper") throw new Error("This is not a shopper sample identity.");
        setSession({ ...result, token });
        const data = await request<SampleShopperAccount>("/sample/shopper", token);
        if (alive) setAccount(data);
      })
      .catch(() => { try { localStorage.removeItem(SAMPLE_SESSION_KEY); } catch { /* storage may be unavailable */ } })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  const refresh = async (token = session?.token) => {
    if (!token) return;
    const data = await request<SampleShopperAccount>("/sample/shopper", token);
    setAccount(data);
  };
  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!/^[6-9]\d{9}$/.test(phone)) { setError("Enter a 10-digit Indian mobile number."); return; }
    if (code !== "246810") { setError("For this simulation only, use the sample code 246810."); return; }
    setBusy(true);
    try {
      const response = await fetch(`${API}/sample/session`, {
        method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
        body: JSON.stringify({ identity, mobileNumber: phone, simulationCode: code }),
      });
      const result = await response.json() as Session;
      if (!response.ok) throw new Error((result as unknown as { error?: string }).error || "Sample sign-in was not completed.");
      localStorage.setItem(SAMPLE_SESSION_KEY, result.token);
      window.dispatchEvent(new Event("bt:sample-session-changed"));
      setSession(result);
      setAccount(await request<SampleShopperAccount>("/sample/shopper", result.token));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sample sign-in was not completed.");
    } finally { setBusy(false); setReady(true); }
  };
  const signOut = async () => {
    if (session) await request("/sample/session", session.token, { method: "DELETE" }).catch(() => undefined);
    try { localStorage.removeItem(SAMPLE_SESSION_KEY); } catch { /* storage may be unavailable */ }
    window.dispatchEvent(new Event("bt:sample-session-changed"));
    setSession(null); setAccount(null); setError(""); navigate("/account");
  };
  const mutate = async (action: () => Promise<unknown>) => {
    if (!session) return;
    setError(""); setBusy(true);
    try { await action(); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The sample account action was not saved."); }
    finally { setBusy(false); }
  };

  if (!ready) return <main className="bt-account"><p role="status">Checking the sample account session…</p></main>;
  if (!session || !account) return (
    <main className="bt-account">
      <header className="bt-account-intro"><span className="bt-account-eyebrow">Sample account · shopper</span><h1>Your place at <em>Baksa Tales.</em></h1><p>Try the account pages with isolated sample records. This does not create a real account or send an SMS.</p></header>
      <form className="bt-account-card bt-account-form" onSubmit={signIn}>
        <h2>Sign in to the sample account</h2>
        <label>Mobile number
          <input data-testid="account-input-phone" inputMode="numeric" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" required />
        </label>
        <label>Sample code
          <input data-testid="account-input-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Use 246810" required />
        </label>
        <label>Sample shopper
          <select value={identity} onChange={event => setIdentity(event.target.value as SampleIdentity)}>
            <option value="shopper">Aarav · sample account with records</option>
            <option value="shopper-other">Mira · separate empty sample account</option>
          </select>
        </label>
        <p className="bt-account-disclosure">The fixed code is a simulation. Live mobile sign-in needs verified phone authentication and an SMS provider. Sample records are held by this development server and are not live orders.</p>
        {error && <p className="bt-account-error" data-testid="account-error" role="alert">{error}</p>}
        <button data-testid="account-button-submit" className="bt-account-primary" disabled={busy}>{busy ? "Opening sample account…" : "Continue with sample code"}</button>
        <button type="button" className="bt-account-secondary" onClick={() => navigate("/")}>Return to the shop</button>
      </form>
    </main>
  );

  const active = path === "/account/classes" ? "classes" : path === "/account/addresses" ? "addresses" : path === "/account/wishlist" ? "wishlist" : "orders";
  const tabs = [
    ["My orders", "/account/orders", "orders"],
    ["My classes", "/account/classes", "classes"],
    ["Addresses", "/account/addresses", "addresses"],
    ["Wishlist", "/account/wishlist", "wishlist"],
  ] as const;
  const createAddress = (event: FormEvent) => {
    event.preventDefault();
    void mutate(() => request("/sample/shopper/addresses", session.token, { method: "POST", body: JSON.stringify(address) }));
    setAddress({ name: "", phone: "", line1: "", line2: "", city: "", state: "", pin: "", isDefault: false });
  };
  const currentStep = (status: string) => status === "delayed" ? 2 : Math.max(0, orderSteps.indexOf(status as typeof orderSteps[number]));

  return (
    <main className="bt-account">
      <header className="bt-account-intro">
        <span className="bt-account-eyebrow">Your account · Sample data</span>
        <h1>Hello, <em>{account.displayName.split(" ")[0]}.</em></h1>
        <p>Server-backed sample account. Changes are isolated from live Supabase accounts and reset when the sample service is reset.</p>
      </header>
      <div className="bt-account-layout">
        <aside className="bt-account-nav">
          <span className="bt-account-eyebrow">Your account</span>
          <nav aria-label="Shopper account">
            {tabs.map(([label, href, key]) => <a key={key} href={href} aria-current={active === key ? "page" : undefined} onClick={event => { event.preventDefault(); navigate(href); }}>{label}</a>)}
          </nav>
          <button type="button" className="bt-account-secondary" onClick={() => void signOut()}>Sign out of sample account</button>
        </aside>
        <section className="bt-account-content">
          <div className="bt-account-heading"><span className="bt-account-eyebrow">{active === "orders" ? "A little history" : active === "classes" ? "What you’re learning" : active === "addresses" ? "Where to send a story" : "For another lovely day"}</span><h2>{tabs.find(([, , key]) => key === active)?.[0]}</h2></div>
          {error && <p className="bt-account-error" role="alert">{error}</p>}
          {active === "orders" && (account.orders.length ? account.orders.map(order => {
            const step = currentStep(order.status);
            return <article className="bt-account-card bt-order" key={order.id}>
              <div className="bt-order-head"><div><span className="bt-account-eyebrow">{order.reference}</span><p>Placed {new Date(`${order.placedOn}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p></div><strong>{money(order.totalPaise)}</strong></div>
              <p className="bt-order-items">{order.items.join(", ")}</p>
              <ol className="bt-order-steps" aria-label={`Order ${order.reference} progress`}>
                {orderSteps.map((status, index) => <li key={status} className={index <= step ? "complete" : ""} aria-current={index === step ? "step" : undefined}><span>{index + 1}</span>{orderLabels[index]}</li>)}
              </ol>
              {order.status === "on_the_way" && <p className="bt-order-note">Tracking: {order.carrier} · {order.trackingNumber}</p>}
              {order.status === "delayed" && <p className="bt-order-delay"><strong>Delay update</strong><br />{order.delayNote}</p>}
            </article>;
          }) : <div className="bt-account-card bt-account-empty"><strong>No sample orders yet.</strong><p>Orders for this sample shopper will appear here.</p></div>)}
          {active === "classes" && (account.classes.length ? account.classes.map(item => <article className="bt-account-card bt-class" key={item.id}><span className="bt-account-eyebrow">{item.access === "live" ? "Live workshop" : "Recorded class"}</span><h3>{item.title}</h3><p>With {item.teacher}</p><p className="bt-order-note">{item.schedule}</p></article>) : <div className="bt-account-card bt-account-empty"><strong>No sample class bookings.</strong><p>Class access and video playback are not enabled in this simulation.</p></div>)}
          {active === "addresses" && <>
            {account.addresses.map(item => <AddressCard key={item.id} address={item} busy={busy} onDefault={() => void mutate(() => request(`/sample/shopper/addresses/${encodeURIComponent(item.id)}/default`, session.token, { method: "PATCH" }))} onRemove={() => void mutate(() => request(`/sample/shopper/addresses/${encodeURIComponent(item.id)}`, session.token, { method: "DELETE" }))} />)}
            <form className="bt-account-card bt-account-form" onSubmit={createAddress}>
              <h3>Add an address</h3>
              <label>Name<input data-testid="account-address-name" required maxLength={120} value={address.name} onChange={e => setAddress(x => ({ ...x, name: e.target.value }))}/></label>
              <label>Mobile number<input data-testid="account-address-phone" required inputMode="numeric" maxLength={10} value={address.phone} onChange={e => setAddress(x => ({ ...x, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}/></label>
              <label>Address line one<input data-testid="account-address-line1" required maxLength={200} value={address.line1} onChange={e => setAddress(x => ({ ...x, line1: e.target.value }))}/></label>
              <label>Address line two<input maxLength={200} value={address.line2} onChange={e => setAddress(x => ({ ...x, line2: e.target.value }))}/></label>
              <div className="bt-address-grid"><label>City<input data-testid="account-address-city" required maxLength={100} value={address.city} onChange={e => setAddress(x => ({ ...x, city: e.target.value }))}/></label><label>State<input data-testid="account-address-state" required maxLength={100} value={address.state} onChange={e => setAddress(x => ({ ...x, state: e.target.value }))}/></label><label>PIN code<input data-testid="account-address-pin" required inputMode="numeric" maxLength={6} value={address.pin} onChange={e => setAddress(x => ({ ...x, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}/></label></div>
              <label className="bt-account-check"><input type="checkbox" checked={address.isDefault} onChange={e => setAddress(x => ({ ...x, isDefault: e.target.checked }))}/> Make this my default address</label>
              <button data-testid="account-address-save" className="bt-account-primary" disabled={busy}>Save sample address</button>
            </form>
          </>}
          {active === "wishlist" && (account.wishlist.length ? account.wishlist.map(id => <article className="bt-account-card bt-wishlist-row" key={id}><div><span className="bt-account-eyebrow">Saved piece</span><h3>{productNames[id] || id}</h3></div><button type="button" className="bt-account-secondary" disabled={busy} onClick={() => void mutate(() => request(`/sample/shopper/wishlist/${encodeURIComponent(id)}`, session.token, { method: "PUT", body: JSON.stringify({ saved: false }) }))}>Remove</button></article>) : <div className="bt-account-card bt-account-empty"><strong>Your wishlist is empty.</strong><p>Save a piece from the shop to keep it here.</p><button type="button" className="bt-account-secondary" onClick={() => navigate("/shop")}>Browse the edit</button></div>)}
        </section>
      </div>
      <p className="bt-account-footnote">Sample account changes are stored in the running development server only. They are not real purchases, bookings, deliveries, or SMS messages.</p>
    </main>
  );
}

export function SampleDashboardGate({ role, children }: { role: "maker" | "admin"; children: ReactNode }) {
  const [, navigate] = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState<"maker" | "admin">(role === "admin" ? "admin" : "maker");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const token = (() => { try { return localStorage.getItem(SAMPLE_SESSION_KEY); } catch { return null; } })();
    if (!token) { setReady(true); return; }
    request<Session>("/sample/session", token)
      .then(result => {
        const allowedIdentity = role === "admin" ? "admin" : "maker";
        if (alive && result.role === role && result.identity === allowedIdentity) setSession({ ...result, token });
        else if (alive) {
          localStorage.removeItem(SAMPLE_SESSION_KEY);
          setError(role === "maker" ? "This sample dashboard belongs to Tathaastu Studio. The other maker cannot access it." : "Choose the Baksa team sample identity for this admin preview.");
        }
      })
      .catch(() => { try { localStorage.removeItem(SAMPLE_SESSION_KEY); } catch { /* storage may be unavailable */ } })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [role]);

  const signIn = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (!/^[6-9]\d{9}$/.test(phone)) { setError("Enter a 10-digit Indian mobile number."); return; }
    if (code !== "246810") { setError("For this simulation only, use the sample code 246810."); return; }
    setBusy(true);
    try {
      const response = await fetch(`${API}/sample/session`, {
        method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
        body: JSON.stringify({ identity, mobileNumber: phone, simulationCode: code }),
      });
      const result = await response.json() as Session & { error?: string };
      if (!response.ok) throw new Error(result.error || "Sample sign-in was not completed.");
      const allowedIdentity = role === "admin" ? "admin" : "maker";
      if (result.role !== role || result.identity !== allowedIdentity) {
        await request("/sample/session", result.token, { method: "DELETE" }).catch(() => undefined);
        throw new Error(role === "maker" ? "This sample dashboard belongs to Tathaastu Studio. The other maker cannot access it." : "Choose the Baksa team sample identity for this admin preview.");
      }
      localStorage.setItem(SAMPLE_SESSION_KEY, result.token);
      setSession(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sample sign-in was not completed."); }
    finally { setBusy(false); setReady(true); }
  };
  if (session?.role === role) return <>{children}</>;
  if (!ready) return <main className="bt-account"><p role="status">Checking the sample workspace session…</p></main>;
  const title = role === "maker" ? "Maker workspace" : "Baksa team workspace";
  const allowed = role === "maker" ? ["maker"] : ["admin"];
  return <main className="bt-account">
    <header className="bt-account-intro"><span className="bt-account-eyebrow">Sample workspace · {role}</span><h1>{title} <em>sign in.</em></h1><p>Only this isolated sample identity can open this preview route. No real shop, buyer, or admin records are available here.</p></header>
    <form className="bt-account-card bt-account-form" onSubmit={signIn}>
      <label>Mobile number<input inputMode="numeric" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" required /></label>
      <label>Fixed sample code<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Use 246810" required /></label>
      <label>Sample identity<select value={identity} onChange={event => setIdentity(event.target.value as typeof identity)}>{allowed.map(key => <option key={key} value={key}>{key === "maker" ? "Tathaastu Studio" : "Baksa team"} · sample</option>)}</select></label>
      <p className="bt-account-disclosure">Simulation only: no SMS is sent. These approved screens currently use browser demonstration data; they do not update a live shop or Supabase. Live access requires verified sign-in and configured account data.</p>
      {error && <p className="bt-account-error" role="alert">{error}</p>}
      <button className="bt-account-primary" disabled={busy}>{busy ? "Opening sample workspace…" : "Continue to sample workspace"}</button>
      <button type="button" className="bt-account-secondary" onClick={() => navigate("/")}>Return to the shop</button>
    </form>
  </main>;
}

function AddressCard({ address, busy, onDefault, onRemove }: { address: SampleAddress; busy: boolean; onDefault: () => void; onRemove: () => void }) {
  return <article className="bt-account-card bt-address-card">
    <div><h3>{address.name} {address.isDefault && <span className="bt-default-badge">Default</span>}</h3><p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}, {address.state} {address.pin}<br />+91 {address.phone}</p></div>
    <div className="bt-account-actions">{!address.isDefault && <button type="button" className="bt-account-secondary" disabled={busy} onClick={onDefault}>Make default</button>}<button type="button" className="bt-account-secondary" disabled={busy} onClick={onRemove}>Remove</button></div>
  </article>;
}
