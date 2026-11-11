import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useLocation, useSearch } from 'wouter';
import { type Ctx } from './dom';
import { type TemplateName, prepareTemplate, rawTemplate } from './templates';
import { hydrateChrome } from './chrome';
import { bagLines, bagTotals, formatINR, getState, imgUrl, isBagOpen, resetDemo, setBagOpen, setBagQty, subscribe, subscribeBag, update } from './store';
import { hydrateAcademy, hydrateCorporate, hydrateFinder, hydrateMain, hydrateMakerStory, hydrateProduct, hydrateResults, hydrateShop } from './pages/storefront';
import { hydrateCheckout } from './pages/checkout';
import { hydrateMakerAddProduct, hydrateMakerEarnings, hydrateMakerGrowth, hydrateMakerHome, hydrateMakerOpportunities, hydrateMakerOrders, hydrateMakerProducts } from './pages/maker';
import { hydrateAdminAcademy, hydrateAdminEnquiries, hydrateAdminOrders, hydrateAdminOverview, hydrateAdminReviews } from './pages/admin';
import InformationDialog, { openDemoInformation } from './InformationDialog';

type Kind = 'store' | 'maker' | 'admin' | 'none';
interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

function resolve(path: string): RouteDef | null {
  const p = path.replace(/\/+$/, '') || '/';
  const fixed: Record<string, RouteDef> = {
    '/': { tpl: 'Main', kind: 'none', hydrate: hydrateMain },
    '/shop': { tpl: 'Shop', kind: 'store', hydrate: hydrateShop },
    '/product': { tpl: 'Product', kind: 'store', hydrate: hydrateProduct, params: { slug: 'blue-lotus-pond' } },
    '/finder': { tpl: 'Finder', kind: 'store', hydrate: hydrateFinder },
    '/results': { tpl: 'Results', kind: 'store', hydrate: hydrateResults },
    '/checkout': { tpl: 'Checkout', kind: 'none', hydrate: hydrateCheckout },
    '/makers/tathaastu': { tpl: 'Maker', kind: 'store', hydrate: hydrateMakerStory },
    '/corporate': { tpl: 'Corporate', kind: 'store', hydrate: hydrateCorporate },
    '/academy': { tpl: 'Academy', kind: 'store', hydrate: hydrateAcademy },
    '/maker': { tpl: 'MakerHome', kind: 'maker', hydrate: hydrateMakerHome },
    '/maker/orders': { tpl: 'MakerOrders', kind: 'maker', hydrate: hydrateMakerOrders },
    '/maker/products': { tpl: 'MakerProducts', kind: 'maker', hydrate: hydrateMakerProducts },
    '/maker/products/new': { tpl: 'MakerAddProduct', kind: 'maker', hydrate: hydrateMakerAddProduct },
    '/maker/earnings': { tpl: 'MakerEarnings', kind: 'maker', hydrate: hydrateMakerEarnings },
    '/maker/growth': { tpl: 'MakerGrowth', kind: 'maker', hydrate: hydrateMakerGrowth },
    '/maker/opportunities': { tpl: 'MakerOpportunities', kind: 'maker', hydrate: hydrateMakerOpportunities },
    '/maker/courses': { tpl: 'MakerOpportunities', kind: 'maker', hydrate: hydrateMakerOpportunities },
    '/admin': { tpl: 'AdminOverview', kind: 'admin', hydrate: hydrateAdminOverview },
    '/admin/reviews': { tpl: 'AdminReviews', kind: 'admin', hydrate: hydrateAdminReviews },
    '/admin/orders': { tpl: 'AdminOrders', kind: 'admin', hydrate: hydrateAdminOrders },
    '/admin/enquiries': { tpl: 'AdminEnquiries', kind: 'admin', hydrate: hydrateAdminEnquiries },
    '/admin/academy': { tpl: 'AdminAcademy', kind: 'admin', hydrate: hydrateAdminAcademy },
    '/design': { tpl: 'index', kind: 'none' },
    '/design/header': { tpl: 'Header', kind: 'store' },
    '/design/footer': { tpl: 'Footer', kind: 'store' },
    '/design/maker-nav': { tpl: 'MakerNav', kind: 'maker' },
    '/design/admin-nav': { tpl: 'AdminNav', kind: 'admin' },
  };
  if (fixed[p]) return fixed[p];
  const m = p.match(/^\/product\/([^/]+)$/);
  if (m) return { tpl: 'Product', kind: 'store', hydrate: hydrateProduct, params: { slug: decodeURIComponent(m[1]) } };
  return null;
}

const HASH_MAP: Record<string, string> = {
  shop: '/shop', product: '/product/blue-lotus-pond', story: '/makers/tathaastu', maker: '/makers/tathaastu', account: '/checkout',
  wishlist: '/shop?wishlist=1', studio: '/maker', sell: '/maker', corporate: '/corporate', boxes: '/corporate', weddings: '/corporate',
  academy: '/academy', class: '/academy', brief: '/corporate#brief', finder: '/finder', results: '/results', checkout: '/checkout',
};

function TemplatePage({ path, search }: { path: string; search: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const navRef = useRef(navigate); navRef.current = navigate;
  const route = resolve(path);

  useEffect(() => {
    const root = ref.current; if (!root || !route) return;
    root.innerHTML = prepareTemplate(route.tpl);
    const nav = (to: string) => { navRef.current(to); };
    const ctx: Ctx = { root, navigate: nav, params: route.params ?? {}, path: path.replace(/\/+$/, '') || '/', search: new URLSearchParams(search), cleanups: [] };
    // Main's header is embedded in its full-page wrapper. Keep that approved
    // wrapper intact, but wire the same mobile menu, counts and footer actions.
    hydrateChrome(ctx, route.tpl === 'Main' ? 'store' : route.kind);
    try { route.hydrate?.(ctx); } catch (e) { console.error('hydrate failed', route.tpl, e); }
    const sourceTitle = rawTemplate(route.tpl).match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    document.title = sourceTitle ? new DOMParser().parseFromString(sourceTitle, 'text/html').body.textContent || 'Baksa Tales' : 'Baksa Tales';
    const description = `${root.querySelector('h1')?.textContent?.trim() || document.title} — Baksa Tales. Sample frontend demonstration.`;
    for (const [attribute, key, content] of [
      ['name', 'description', description],
      ['property', 'og:title', document.title],
      ['property', 'og:description', description],
      ['property', 'og:type', 'website'],
    ]) {
      let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute(attribute, key); document.head.appendChild(meta); }
      meta.content = content;
    }

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const a = (e.target as Element).closest('a') as HTMLAnchorElement | null; if (!a || !root.contains(a)) return;
      const r = a.getAttribute('data-route');
      if (r) { e.preventDefault(); nav(r); window.scrollTo({ top: 0 }); return; }
      const href = a.getAttribute('href') ?? '';
      if (!href.startsWith('#')) return;
      e.preventDefault();
      const id = href.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target && root.contains(target)) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (id === 'bag') { setBagOpen(true); return; }
      const to = HASH_MAP[id];
      if (to) { nav(to); window.scrollTo({ top: 0 }); }
      else if (['orders', 'returns', 'faq', 'contact', 'email', 'whatsapp', 'instagram'].includes(id)) {
        openDemoInformation(id, a.textContent?.trim() || a.getAttribute('aria-label') || 'Information');
      }
    };
    root.addEventListener('click', onClick);
    const hash = window.location.hash.slice(1);
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: 'start' }));
    return () => { root.removeEventListener('click', onClick); ctx.cleanups.forEach(f => { try { f(); } catch { /* ignore */ } }); };
  }, [path, search]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!route) return <NotFound />;
  return <div ref={ref} data-testid={`page-${route.tpl}`} data-bt-page={route.kind} />;
}

function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div data-testid="page-not-found" style={{ minHeight: '100dvh', background: '#F6F3DF', color: '#2B1712', fontFamily: "'EB Garamond', Georgia, serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
      <h1 style={{ margin: 0, fontSize: 48, fontWeight: 500 }}>This page isn’t <em style={{ color: '#C23A36' }}>here.</em></h1>
      <button type="button" data-testid="button-home" onClick={() => navigate('/')} style={{ height: 50, padding: '0 22px', borderRadius: 999, border: 0, background: '#611811', color: '#FFF8EC', fontFamily: 'Arvo, Georgia, serif', fontSize: 13, cursor: 'pointer' }}>Back to Baksa Tales</button>
    </div>
  );
}

function useDemo() { return useSyncExternalStore(subscribe, getState); }

function BagDrawer() {
  const open = useSyncExternalStore(subscribeBag, isBagOpen);
  const s = useDemo();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setBagOpen(false); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open]);
  if (!open) return null;
  const lines = bagLines(s); const t = bagTotals(s);
  return (
    <div className="bt-drawer-scrim" onClick={() => setBagOpen(false)} data-testid="bag-drawer-scrim">
      <aside className="bt-drawer" role="dialog" aria-label="Your bag" data-testid="bag-drawer" onClick={e => e.stopPropagation()}>
        <div className="bt-drawer-head">
          <h2>Your <em>bag</em></h2>
          <button type="button" className="bt-icon-btn" aria-label="Close bag" data-testid="button-close-bag" onClick={() => setBagOpen(false)}>×</button>
        </div>
        {lines.length === 0 ? (
          <div className="bt-drawer-empty" data-testid="empty-bag">
            <p>Your bag is empty.</p>
            <button type="button" className="bt-btn-outline" data-testid="button-browse" onClick={() => { setBagOpen(false); navigate('/shop'); }}>Browse the Edit</button>
          </div>
        ) : (
          <>
            <ul className="bt-drawer-list">
              {lines.map(l => (
                <li key={l.kind + l.id} data-testid={`row-bag-${l.id}`}>
                  <img src={imgUrl(l.img)} alt="" />
                  <div>
                    <p className="bt-name">{l.name}</p>
                    <p className="bt-maker">{l.maker}</p>
                    {l.kind === 'product' ? (
                      <div className="bt-qty">
                        <button type="button" aria-label={`Fewer ${l.name}`} data-testid={`button-bag-minus-${l.id}`} onClick={() => update(x => setBagQty(x, l.id, l.qty - 1))}>−</button>
                        <span data-testid={`text-bag-qty-${l.id}`}>{l.qty}</span>
                        <button type="button" aria-label={`More ${l.name}`} data-testid={`button-bag-plus-${l.id}`} onClick={() => update(x => setBagQty(x, l.id, l.qty + 1))}>+</button>
                      </div>
                    ) : null}
                  </div>
                  <div className="bt-line-end">
                    <span data-testid={`text-bag-line-${l.id}`}>{formatINR(l.linePaise)}</span>
                    <button type="button" className="bt-link" data-testid={`button-bag-remove-${l.id}`} onClick={() => update(x => setBagQty(x, l.id, 0))}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="bt-drawer-foot">
              <div><span>Items</span><span data-testid="text-drawer-items">{formatINR(t.itemsPaise)}</span></div>
              <div><span>Delivery</span><span data-testid="text-drawer-delivery">{t.shippingPaise ? formatINR(t.shippingPaise) : 'Free'}</span></div>
              <div className="bt-total"><span>To pay</span><span data-testid="text-drawer-total">{formatINR(t.totalPaise)}</span></div>
              <button type="button" className="bt-btn" data-testid="button-checkout" onClick={() => { setBagOpen(false); navigate('/checkout'); window.scrollTo({ top: 0 }); }}>Check out</button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function SampleNote() {
  return (
    <div className="bt-sample" data-testid="sample-note">
      <span>Sample data. Nothing is sent or charged.</span>
      <button type="button" data-testid="button-reset-demo" onClick={() => { if (window.confirm('Reset the sample data to how it started?')) { resetDemo(); try { sessionStorage.clear(); } catch { /* ignore */ } window.location.reload(); } }}>Reset demo data</button>
    </div>
  );
}

export default function ApprovedApp() {
  const [location] = useLocation();
  const search = useSearch();
  return (
    <>
      <TemplatePage key={location} path={location} search={search} />
      <BagDrawer />
      <InformationDialog />
      <SampleNote />
    </>
  );
}
