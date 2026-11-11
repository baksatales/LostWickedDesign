/**
 * Loads the approved static designs (src/demo/templates/*.html, copied unmodified from
 * reference/approved/baksa-tales-replit/designs) as raw strings and prepares them for the app:
 * head <style> blocks are kept, the <body> markup is kept verbatim, image paths and
 * page links are rewritten to app routes.
 */
const RAW = import.meta.glob('./templates/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export type TemplateName =
  | 'Main' | 'Shop' | 'Product' | 'Finder' | 'Results' | 'Checkout' | 'Maker' | 'Corporate' | 'Academy'
  | 'MakerHome' | 'MakerOrders' | 'MakerProducts' | 'MakerAddProduct' | 'MakerEarnings' | 'MakerGrowth' | 'MakerOpportunities'
  | 'AdminOverview' | 'AdminReviews' | 'AdminOrders' | 'AdminEnquiries' | 'AdminAcademy'
  | 'Header' | 'Footer' | 'MakerNav' | 'AdminNav' | 'index';

export const PAGE_ROUTES: Record<TemplateName, string> = {
  Main: '/', Shop: '/shop', Product: '/product/blue-lotus-pond', Finder: '/finder', Results: '/results', Checkout: '/checkout',
  Maker: '/makers/tathaastu', Corporate: '/corporate', Academy: '/academy',
  MakerHome: '/maker', MakerOrders: '/maker/orders', MakerProducts: '/maker/products', MakerAddProduct: '/maker/products/new',
  MakerEarnings: '/maker/earnings', MakerGrowth: '/maker/growth', MakerOpportunities: '/maker/opportunities',
  AdminOverview: '/admin', AdminReviews: '/admin/reviews', AdminOrders: '/admin/orders', AdminEnquiries: '/admin/enquiries', AdminAcademy: '/admin/academy',
  Header: '/design/header', Footer: '/design/footer', MakerNav: '/design/maker-nav', AdminNav: '/design/admin-nav', index: '/design',
};

export const rawTemplate = (name: TemplateName): string => RAW[`./templates/${name}.html`] ?? '';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const routeHref = (path: string) => `${BASE}${path}`;

/** Returns the prepared markup: head styles + body content. */
export function prepareTemplate(name: TemplateName): string {
  const raw = rawTemplate(name);
  const styles = (raw.split(/<body[^>]*>/i)[0].match(/<style>[\s\S]*?<\/style>/gi) ?? []).join('\n');
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : raw;
  if (name === 'index') {
    // index.html keeps its whole design inline; scope its global element rules to the page.
    body = raw.replace(/^[\s\S]*?<\/head>/i, '').replace(/<\/?(html|body)[^>]*>/gi, '');
  }
  let html = (name === 'index' ? (raw.match(/<style>[\s\S]*?<\/style>/i)?.[0] ?? '') : styles) + body;
  html = html.replace(/(src|href)="images\//g, `$1="${BASE}/approved/images/`);
  html = html.replace(/href="([A-Za-z]+)\.html"/g, (m, page: string) => {
    const r = PAGE_ROUTES[page as TemplateName];
    return r ? `href="${routeHref(r)}" data-route="${r}"` : m;
  });
  return html;
}

/** The shared pieces as markup (used to replace each page's embedded copy). */
export const sharedPiece = (name: 'Header' | 'Footer' | 'MakerNav' | 'AdminNav') => {
  const html = prepareTemplate(name).replace(/<style>[\s\S]*?<\/style>/gi, '');
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content;
};
