import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { useLocation, useSearch } from 'wouter';
import { createPortal } from 'react-dom';
import { useGetSite, type SiteDocument } from '@workspace/api-client-react';
import { $$, type Ctx } from './dom';
import { type TemplateName, prepareTemplate, rawTemplate } from './templates';
import { hydrateChrome } from './chrome';
import { bagCount, bagLines, bagTotals, formatINR, getState, imgUrl, isBagOpen, normalisePhone, setBagOpen, setBagQty, subscribe, subscribeBag, update } from './store';
import { hydrateAcademy, hydrateCorporate, hydrateFinder, hydrateMain, hydrateMakerStory, hydrateProduct, hydrateResults, hydrateShop } from './pages/storefront';
import { hydrateCheckout } from './pages/checkout';
import { hydrateMakerAddProduct, hydrateMakerEarnings, hydrateMakerGrowth, hydrateMakerHome, hydrateMakerOpportunities, hydrateMakerOrders, hydrateMakerProducts, hydrateMakerSettings } from './pages/maker';
import { hydrateAdminAcademy, hydrateAdminEnquiries, hydrateAdminOrders, hydrateAdminOverview, hydrateAdminReviews } from './pages/admin';
import InformationDialog, { openDemoInformation } from './InformationDialog';
import HomeV5 from '../home-v5/HomeV5';
import StudioRoute from '../home-studio/StudioRoute';
import SampleNote from './SampleNote';
import SampleAccount, { SampleDashboardGate } from './SampleAccount';
import SampleAdminCoupons from './SampleAdminCoupons';
import { SampleAdminBlog, SampleBlog } from './SampleBlog';
import { BeaWidget } from './BeaPopover';
import BaksaApp from '../pages/BaksaApp';
import { CorporatePackagingGallery, ShopperAccountEntry, StorefrontFooter } from './components';
import { starterDocument } from '../pages/starter-document';

type Kind = 'store' | 'maker' | 'admin' | 'none';
interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

interface RouteDef { tpl: TemplateName; kind: Kind; hydrate?: (c: Ctx) => void; params?: Record<string, string> }

function resolve(path: string): RouteDef | null {
  const p = path.replace(/\/+$/, '') || '/';
  const fixed: Record<string, RouteDef> = {
    '/': { tpl: 'Main', kind: 'none', hydrate: hydrateMain },
    '/shop': { tpl: 'Shop', kind: 'store', hydrate: hydrateShop },
    '/product': { tpl: 'Product', kind: 'store', hydrate: hydrateProduct, params: { slug: 'blue-lotus-pond' } },
    '/bea': { tpl: 'Finder', kind: 'store', hydrate: hydrateFinder },
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
    '/maker/settings': { tpl: 'MakerSettings', kind: 'maker', hydrate: hydrateMakerSettings },
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
  shop: '/shop', product: '/product/blue-lotus-pond', story: '/makers/tathaastu', maker: '/makers/tathaastu', account: '/account',
  wishlist: '/shop?wishlist=1', studio: '/maker', sell: '/maker', corporate: '/corporate', boxes: '/corporate', weddings: '/corporate',
  academy: '/academy', class: '/academy', brief: '/corporate#brief', finder: '/bea', results: '/results', checkout: '/checkout',
};

const STARTER_SITE_DOCUMENT = starterDocument();
const APP_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

function siteImageUrl(path: string) {
  return /^https:\/\//i.test(path) ? path : `${APP_BASE}/${path.replace(/^\/+/, '')}`;
}

function readLocalSitePreview(): SiteDocument | null {
  try {
    const raw = localStorage.getItem('baksa-site-preview-draft');
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SiteDocument>;
    if (!value.brand || !value.theme || !Array.isArray(value.pages) || !Array.isArray(value.sections)) return null;
    const theme = value.theme;
    const colorKeys = ['background', 'surface', 'primary', 'secondary', 'accent', 'ink', 'muted'] as const;
    if (colorKeys.some(key => !/^#[0-9a-f]{6}$/i.test(String(theme[key] || '')))) return null;
    if (!['garamond', 'cormorant', 'georgia'].includes(theme.headingFont) ||
        !['garamond', 'inter', 'system', 'georgia'].includes(theme.bodyFont) ||
        !['compact', 'comfortable', 'generous'].includes(theme.spacing) ||
        !Number.isFinite(theme.radius) || theme.radius < 0 || theme.radius > 28) return null;
    const safeImage = (path: string) => !path || (/^\/images\/baksa\/(?!.*\.\.)[^\s]*$/i.test(path) || /^https:\/\//i.test(path));
    if (!safeImage(value.brand.logo) || !safeImage(value.brand.mark)) return null;
    if (!Array.isArray(value.footerLinks) || value.footerLinks.some(link =>
      !link || typeof link.label !== 'string' || !/^(\/|https:\/\/)/i.test(link.href) || link.href.startsWith('//'))) return null;
    return value as SiteDocument;
  } catch {
    return null;
  }
}

function siteFont(value: string, kind: 'heading' | 'body') {
  if (value === 'cormorant') return "'Cormorant Garamond', Georgia, serif";
  if (value === 'georgia') return 'Georgia, serif';
  if (value === 'inter') return 'Inter, Arial, sans-serif';
  if (value === 'system') return 'system-ui, sans-serif';
  return kind === 'heading' ? "'EB Garamond', Georgia, serif" : "'EB Garamond', Georgia, serif";
}

function siteThemeStyle(document: SiteDocument, enabled: boolean): CSSProperties {
  if (!enabled) return {};
  const theme = document.theme;
  return {
    '--site-background': theme.background,
    '--site-surface': theme.surface,
    '--site-primary': theme.primary,
    '--site-secondary': theme.secondary,
    '--site-accent': theme.accent,
    '--site-ink': theme.ink,
    '--site-muted': theme.muted,
    '--site-heading-font': siteFont(theme.headingFont, 'heading'),
    '--site-body-font': siteFont(theme.bodyFont, 'body'),
    '--site-radius': `${theme.radius}px`,
    '--site-section-space': theme.spacing === 'compact' ? '48px' : theme.spacing === 'generous' ? '94px' : '72px',
  } as CSSProperties;
}

function siteThemeAttributes(document: SiteDocument, enabled: boolean) {
  return {
    'data-site-motion': enabled ? (document.theme.motion ? 'on' : 'off') : undefined,
    'data-site-ornament': enabled ? (document.theme.ornament ? 'on' : 'off') : undefined,
    'data-site-spacing': enabled ? document.theme.spacing : undefined,
  };
}

function styleTemplateWithDocument(html: string, document: SiteDocument) {
  const theme = document.theme;
  const colors = new Map<string, string>([
    ['#F6F3DF', theme.background], ['#FCF7EE', theme.background], ['#FBF4EA', theme.background],
    ['#FFFDF4', theme.surface], ['#FFFBF0', theme.surface], ['#FFF8EC', theme.surface], ['#FFFFFF', theme.surface],
    ['#611811', theme.primary], ['#3E0F0B', theme.primary],
    ['#34514B', theme.secondary], ['#68142F', theme.secondary], ['#2C4640', theme.secondary], ['#2C3A36', theme.secondary], ['#4E5B3A', theme.secondary],
    ['#EBA937', theme.accent], ['#C23A36', theme.accent], ['#A9781F', theme.accent], ['#7A5517', theme.accent], ['#E14B49', theme.accent],
    ['#2B1712', theme.ink], ['#34251F', theme.ink], ['#3A2A24', theme.ink],
    ['#5C463C', theme.muted], ['#746B5B', theme.muted],
    ['#DCCAB0', `color-mix(in srgb, ${theme.muted} 25%, ${theme.surface})`],
    ['#F6EBD3', theme.background],
    ['#ECE6CC', `color-mix(in srgb, ${theme.background} 60%, ${theme.surface})`],
    ['#F1F7F4', `color-mix(in srgb, ${theme.secondary} 10%, ${theme.surface})`],
    ['#F3F1E2', `color-mix(in srgb, ${theme.background} 50%, ${theme.surface})`],
    ['#F7D9CF', `color-mix(in srgb, ${theme.accent} 18%, ${theme.surface})`],
    ['#FBE3B2', `color-mix(in srgb, ${theme.accent} 20%, ${theme.surface})`],
    ['#D5E6DE', `color-mix(in srgb, ${theme.secondary} 18%, ${theme.surface})`],
    ['#E9DFF0', `color-mix(in srgb, ${theme.primary} 12%, ${theme.surface})`],
  ]);
  return html
    .replace(/#[0-9a-f]{6}/gi, color => colors.get(color.toUpperCase()) ?? color)
    .replace(/'EB Garamond', Georgia, serif/g, 'var(--site-body-font)')
    .replace(/Arvo, Georgia, serif/g, 'var(--site-body-font)');
}

function sitePageId(path: string) {
  if (path === '/corporate') return 'corporate';
  if (path === '/academy') return 'academy';
  if (path === '/shop') return 'shop';
  if (path === '/makers/tathaastu') return 'makers';
  if (path === '/bea' || path === '/finder' || path === '/results') return 'gift-finder';
  if (path === '/checkout') return 'checkout';
  return '';
}

function applySiteCopy(root: HTMLElement, path: string, document: SiteDocument, enabled: boolean) {
  if (!enabled) return { title: '', description: '' };
  const id = sitePageId(path);
  const page = document.pages.find(item => item.id === id);
  const original = STARTER_SITE_DOCUMENT.pages.find(item => item.id === id);
  if (!page || !original) return { title: '', description: '' };

  const heading = root.querySelector('h1');
  if (heading && page.heading !== original.heading) heading.textContent = page.heading;
  if (heading && page.intro !== original.intro) {
    let next = heading.nextElementSibling ?? heading.parentElement?.nextElementSibling ?? null;
    while (next && next.tagName !== 'P') next = next.nextElementSibling;
    if (next) next.textContent = page.intro;
  }
  if (heading && path !== '/shop' && page.eyebrow !== original.eyebrow) {
    const previous = heading.previousElementSibling;
    if (previous?.tagName === 'P') previous.textContent = page.eyebrow;
  }
  const brandName = document.brand.name;
  const brand = root.querySelector('header a img')?.parentElement?.querySelector('span');
  if (brand && brandName !== STARTER_SITE_DOCUMENT.brand.name) brand.textContent = brandName;
  const mark = root.querySelector<HTMLImageElement>('header a img');
  if (mark && document.brand.mark && document.brand.mark !== STARTER_SITE_DOCUMENT.brand.mark) mark.src = siteImageUrl(document.brand.mark);
  const announcement = root.querySelector('header')?.previousElementSibling;
  if (announcement && document.brand.announcement !== STARTER_SITE_DOCUMENT.brand.announcement) {
    const firstText = announcement.querySelector('span');
    if (firstText) firstText.textContent = document.brand.announcement;
  }
  return {
    title: page.title !== original.title ? page.title : '',
    description: page.description !== original.description ? page.description : '',
  };
}

function footerGroupsFromDocument(document: SiteDocument) {
  const groups = [
    { title: 'Shop', match: (href: string) => ['/shop', '/gift-finder', '/makers', '/wishlist'].some(path => href.startsWith(path)) },
    { title: 'Gifting', match: (href: string) => href.startsWith('/corporate') },
    { title: 'For makers', match: (href: string) => ['/sell', '/maker', '/academy'].some(path => href.startsWith(path)) },
    { title: 'Your account', match: (href: string) => ['/account', '/sign-in'].some(path => href.startsWith(path)) },
  ];
  const used = new Set<number>();
  const result = groups.map(group => ({
    title: group.title,
    links: document.footerLinks.filter((link, index) => {
      if (used.has(index) || !group.match(link.href)) return false;
      used.add(index);
      return true;
    }),
  }));
  const more = document.footerLinks.filter((_, index) => !used.has(index));
  if (!document.footerLinks.some(link => link.label === 'Shipping and returns' || link.href === '/#returns')) {
    more.push({ label: 'Shipping and returns', href: '/#returns' });
  }
  if (more.length) result.push({ title: 'More', links: more });
  return result;
}

function TemplatePage({ path, search, siteDocument, siteSettingsActive }: { path: string; search: string; siteDocument: SiteDocument; siteSettingsActive: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [portalTargets, setPortalTargets] = useState<{ account: HTMLElement | null; packaging: HTMLElement | null }>({ account: null, packaging: null });
  const [, navigate] = useLocation();
  const navRef = useRef(navigate); navRef.current = navigate;
  const route = resolve(path);
  const siteDocumentKey = JSON.stringify(siteDocument);

  useEffect(() => {
    const root = ref.current; if (!root || !route) return;
    root.innerHTML = prepareTemplate(route.tpl);
    if (!path.startsWith('/design') && (route.kind === 'store' || path === '/checkout')) {
      root.querySelectorAll('footer').forEach(footer => footer.remove());
    }
    const nav = (to: string) => { navRef.current(to); };
    const ctx: Ctx = { root, navigate: nav, params: route.params ?? {}, path: path.replace(/\/+$/, '') || '/', search: new URLSearchParams(search), cleanups: [] };
    // Main's header is embedded in its full-page wrapper. Keep that approved
    // wrapper intact, but wire the same mobile menu, counts and footer actions.
    hydrateChrome(ctx, route.tpl === 'Main' ? 'store' : route.kind);
    const signIn = root.querySelector('[data-testid="link-sign-in"]');
    let accountMount: HTMLElement | null = null;
    if (signIn) {
      const mount = document.createElement('div');
      mount.className = 'bt-template-account-mount';
      signIn.replaceWith(mount);
      accountMount = mount;
    }
    const packagingMount = root.querySelector<HTMLElement>('[data-bt-packaging-gallery]');
    setPortalTargets({ account: accountMount, packaging: packagingMount });
    try { route.hydrate?.(ctx); } catch (e) { console.error('hydrate failed', route.tpl, e); }
    const sourceTitle = rawTemplate(route.tpl).match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    const parsedTitle = sourceTitle ? new DOMParser().parseFromString(sourceTitle, 'text/html').body.textContent || 'Baksa Tales' : 'Baksa Tales';
    document.title = route.tpl === 'Finder' ? 'Bea · Gifting Concierge' : route.tpl === 'Results' ? 'Bea’s Gift Picks' : parsedTitle;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const a = (e.target as Element).closest('a') as HTMLAnchorElement | null; if (!a || !root.contains(a)) return;
      const r = a.getAttribute('data-route');
      if (a.hasAttribute('data-bea-open') || r === '/bea') {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('bt:open-bea'));
        return;
      }
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
      if (to === '/bea') { window.dispatchEvent(new CustomEvent('bt:open-bea')); }
      else if (to) { nav(to); window.scrollTo({ top: 0 }); }
      else if (['orders', 'returns', 'faq', 'contact', 'email', 'whatsapp', 'instagram'].includes(id)) {
        openDemoInformation(id, a.textContent?.trim() || a.getAttribute('aria-label') || 'Information');
      }
    };
    root.addEventListener('click', onClick);
    const hash = window.location.hash.slice(1);
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: 'start' }));
    return () => { root.removeEventListener('click', onClick); ctx.cleanups.forEach(f => { try { f(); } catch { /* ignore */ } }); };
  }, [path, search]);

  useEffect(() => {
    const root = ref.current;
    if (!root || !route) return;
    const documentForPage = siteSettingsActive ? siteDocument : STARTER_SITE_DOCUMENT;
    // Unedited approved screens must keep their own palette. The starter site's
    // theme is not an override: applying it here recolours ivory dashboard
    // cards and semantic accents even when no editor has changed anything.
    const applyStyle = (source: string) => siteSettingsActive
      ? styleTemplateWithDocument(source, documentForPage)
      : source;
    root.querySelectorAll<HTMLElement>('[style]').forEach(element => {
      const original = element.getAttribute('data-bt-site-original-style') ?? element.getAttribute('style') ?? '';
      if (!element.hasAttribute('data-bt-site-original-style')) element.setAttribute('data-bt-site-original-style', original);
      element.setAttribute('style', applyStyle(original));
    });
    root.querySelectorAll<HTMLStyleElement>('style').forEach(style => {
      const original = style.getAttribute('data-bt-site-original-css') ?? style.textContent ?? '';
      if (!style.hasAttribute('data-bt-site-original-css')) style.setAttribute('data-bt-site-original-css', original);
      style.textContent = applyStyle(original);
    });
    const pageCopy = applySiteCopy(root, path, siteDocument, siteSettingsActive);
    if (siteSettingsActive) {
      const routeLabels: Record<string, string> = {
        '/shop': '/shop',
        '/makers/tathaastu': '/makers',
        '/corporate': '/corporate',
        '/academy': '/academy',
      };
      $$<HTMLAnchorElement>(root, 'header nav[aria-label="Main"] a[data-route]').forEach(link => {
        const docHref = routeLabels[link.getAttribute('data-route') || ''];
        if (!docHref) return;
        const current = siteDocument.navigation.find(item => item.href === docHref);
        const initial = STARTER_SITE_DOCUMENT.navigation.find(item => item.href === docHref);
        if (current && initial && current.label !== initial.label) link.textContent = current.label;
      });
    }
    const sourceTitle = rawTemplate(route.tpl).match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    const parsedTitle = sourceTitle ? new DOMParser().parseFromString(sourceTitle, 'text/html').body.textContent || 'Baksa Tales' : 'Baksa Tales';
    document.title = pageCopy.title || (route.tpl === 'Finder' ? 'Bea · Gifting Concierge' : route.tpl === 'Results' ? 'Bea’s Gift Picks' : parsedTitle);
    const description = pageCopy.description || `${root.querySelector('h1')?.textContent?.trim() || document.title} — Baksa Tales. Sample frontend demonstration.`;
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
  }, [path, siteDocumentKey, siteSettingsActive]);

  if (!route) return <NotFound />;
  const publicThemeActive = siteSettingsActive && (route.kind === 'store' || path === '/checkout');
  return (
    <div className={publicThemeActive ? 'bt-site-theme' : undefined} style={siteThemeStyle(siteDocument, publicThemeActive)} {...siteThemeAttributes(siteDocument, publicThemeActive)}>
      <div ref={ref} data-testid={`page-${route.tpl}`} data-bt-page={route.kind} />
      {portalTargets.account && createPortal(<ShopperAccountEntry navigate={to => navRef.current(to)} />, portalTargets.account)}
      {portalTargets.packaging && createPortal(
        <CorporatePackagingGallery
          title="Keepsake packaging with Pop Bani"
          description="Every box carries the same Mithila love-story illustration, in five materials. Design mock-ups; final artwork can be customised for each couple or brand."
        />,
        portalTargets.packaging,
      )}
    </div>
  );
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
export default function ApprovedApp() {
  const [location] = useLocation();
  if (['/admin/site', '/admin/launch', '/admin/operations', '/sign-in'].includes(location) || location === '/maker/sahayak') return <BaksaApp />;
  if (location === '/studio-preview') return <StudioRoute localOnly preview={document => <HomeV5 document={document} />} />;
  return <ApprovedRoutes />;
}

function PublicPageHeader({ navigate, siteDocument, siteSettingsActive }: { navigate: (path: string) => void; siteDocument: SiteDocument; siteSettingsActive: boolean }) {
  return (
    <header className="bt-public-header" data-testid="shopper-site-header">
      <a className="bt-public-header__brand" href="/" onClick={event => { event.preventDefault(); navigate('/'); }}>
        {siteSettingsActive ? siteDocument.brand.name : 'Baksa Tales'}
      </a>
      <nav className="bt-public-header__nav" aria-label="Shopper navigation">
        <a href="/shop" onClick={event => { event.preventDefault(); navigate('/shop'); }}>Shop gifts</a>
        <a href="/corporate" onClick={event => { event.preventDefault(); navigate('/corporate'); }}>For teams</a>
      </nav>
      <ShopperAccountEntry navigate={navigate} />
    </header>
  );
}

function PublicFooter({ navigate, siteDocument, siteSettingsActive }: { navigate: (path: string) => void; siteDocument: SiteDocument; siteSettingsActive: boolean }) {
  const submitSampleContact = (contact: string) => {
    const number = normalisePhone(contact);
    if (!/^[6-9]\d{9}$/.test(number)) throw new Error('Enter a valid 10-digit Indian mobile number.');
    update(state => ({ ...state, newsletter: [...new Set([...state.newsletter, number])] }));
    return 'Sample preview: saved in this browser only. No WhatsApp message was sent.';
  };
  const brand = siteSettingsActive ? siteDocument.brand : undefined;
  return (
    <StorefrontFooter
      brandName={brand?.name}
      brandMark={brand?.mark && brand.mark !== STARTER_SITE_DOCUMENT.brand.mark ? siteImageUrl(brand.mark) : undefined}
      tagline={brand?.tagline}
      title={brand?.footerTitle}
      copy={brand?.footerText}
      copyright={brand?.copyright}
      groups={siteSettingsActive ? footerGroupsFromDocument(siteDocument) : undefined}
      sampleMode
      onSubmit={submitSampleContact}
      onNavigate={navigate}
      onShowInfo={openDemoInformation}
    />
  );
}

function ApprovedRoutes() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const siteQuery = useGetSite();
  const [localSiteDocument, setLocalSiteDocument] = useState(readLocalSitePreview);
  useEffect(() => {
    const refreshLocal = () => setLocalSiteDocument(readLocalSitePreview());
    const onPreviewDocument = (event: Event) => {
      const value = (event as CustomEvent<SiteDocument | null>).detail;
      setLocalSiteDocument(value || readLocalSitePreview());
    };
    window.addEventListener('storage', refreshLocal);
    window.addEventListener('bt:site-preview-document', onPreviewDocument);
    return () => {
      window.removeEventListener('storage', refreshLocal);
      window.removeEventListener('bt:site-preview-document', onPreviewDocument);
    };
  }, []);
  useEffect(() => { setLocalSiteDocument(readLocalSitePreview()); }, [location]);
  const remoteSiteActive = Boolean((siteQuery.data?.revision ?? 0) > 0);
  const siteDocument = localSiteDocument ?? (remoteSiteActive ? siteQuery.data?.document : undefined) ?? STARTER_SITE_DOCUMENT;
  const siteSettingsActive = Boolean(localSiteDocument || remoteSiteActive);
  const publicTheme = siteThemeStyle(siteDocument, siteSettingsActive);
  const directBea = location === '/bea' || location === '/finder';
  const pageLocation = directBea ? '/' : location;
  const autoOpenKey = directBea ? `${location}?${search}` : '';
  const autoOpenDetail = directBea ? { step: Math.max(0, Number(new URLSearchParams(search).get('step') ?? '1') - 1) } : {};

  useEffect(() => {
    if (directBea) navigate('/');
  }, [directBea, navigate]);

  if (location === '/account' || location.startsWith('/account/')) {
    return <div className="bt-site-theme" style={publicTheme} {...siteThemeAttributes(siteDocument, siteSettingsActive)}><PublicPageHeader navigate={navigate} siteDocument={siteDocument} siteSettingsActive={siteSettingsActive} /><SampleAccount path={location} /><PublicFooter navigate={navigate} siteDocument={siteDocument} siteSettingsActive={siteSettingsActive} /><BeaWidget /><InformationDialog /></div>;
  }
  if (location === '/blog' || location.startsWith('/blog/')) {
    return <div className="bt-site-theme" style={publicTheme} {...siteThemeAttributes(siteDocument, siteSettingsActive)}><PublicPageHeader navigate={navigate} siteDocument={siteDocument} siteSettingsActive={siteSettingsActive} /><SampleBlog path={location} /><PublicFooter navigate={navigate} siteDocument={siteDocument} siteSettingsActive={siteSettingsActive} /><BeaWidget /><InformationDialog /></div>;
  }
  if (location === '/admin/blog') {
    return <><SampleDashboardGate role="admin"><SampleAdminBlog /></SampleDashboardGate><InformationDialog /></>;
  }
  if (location === '/admin/coupons') {
    return <><SampleDashboardGate role="admin"><SampleAdminCoupons /></SampleDashboardGate><InformationDialog /></>;
  }
  const dashboardKind = resolve(location)?.kind;
  if (dashboardKind === 'maker' || dashboardKind === 'admin') {
    return <><SampleDashboardGate role={dashboardKind}><TemplatePage path={location} search={search} siteDocument={siteDocument} siteSettingsActive={false} /><BagDrawer /><InformationDialog /></SampleDashboardGate></>;
  }
  return (
    <div className="bt-site-theme" style={publicTheme} {...siteThemeAttributes(siteDocument, siteSettingsActive)}>
      {pageLocation === '/'
        ? <HomeV5 document={remoteSiteActive ? siteQuery.data?.document : undefined} />
        : <TemplatePage key={pageLocation} path={pageLocation} search={directBea ? '' : search} siteDocument={siteDocument} siteSettingsActive={siteSettingsActive} />}
      <BagDrawer />
      <BeaWidget autoOpenKey={autoOpenKey} autoOpenDetail={autoOpenDetail} />
      <InformationDialog />
      {pageLocation !== '/' && <SampleNote inline />}
      {pageLocation !== '/' && !pageLocation.startsWith('/design') && <PublicFooter navigate={navigate} siteDocument={siteDocument} siteSettingsActive={siteSettingsActive} />}
    </div>
  );
}
