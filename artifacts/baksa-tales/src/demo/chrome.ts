/**
 * Shared chrome: the site header, footer, maker sidebar and admin sidebar come from the approved
 * Header.html / Footer.html / MakerNav.html / AdminNav.html and are hydrated here once for every page.
 */
import { $, $$, ARVO, type Ctx, fieldError, norm, on, setStyle, styleOf, tid } from './dom';
import { routeHref } from './templates';
import { bagCount, getState, normalisePhone, setBagOpen, subscribe, update } from './store';

// Each approved screen embeds its own exact chrome, sometimes with small
// page-specific differences. Share the behavior below, never replace that
// markup with the standalone Header/Footer/Nav examples.

/** Active link styling in the sidebars: the approved markup marks one link differently. */
function sidebarActive(root: HTMLElement, path: string) {
  const nav = $(root, 'aside nav');
  if (!nav) return;
  const links = $$<HTMLAnchorElement>(nav, 'a');
  const counts = new Map<string, number>();
  links.forEach(a => counts.set(styleOf(a), (counts.get(styleOf(a)) ?? 0) + 1));
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length < 2) return;
  const idle = sorted[0][0], active = sorted[sorted.length - 1][0];
  const activeLink = links.find(a => norm(a.textContent).startsWith('My courses') && path === '/maker/courses')
    ?? links.find(a => a.getAttribute('data-route') === path && !(path === '/maker/opportunities' && norm(a.textContent).startsWith('My courses')))
    ?? links.find(a => path.startsWith(a.getAttribute('data-route') ?? '###') && a.getAttribute('data-route') !== '/maker' && a.getAttribute('data-route') !== '/admin');
  if (!activeLink) return;
  links.forEach(a => { setStyle(a, a === activeLink ? active : idle); if (a === activeLink) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  // badge spans inside links keep their own styles
}

const MENU_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg>';

export function hydrateChrome(ctx: Ctx, kind: 'store' | 'maker' | 'admin' | 'none') {
  const { root } = ctx;
  if (kind === 'maker' || kind === 'admin') {
    if (kind === 'maker') {
      const courses = $$<HTMLAnchorElement>(root, 'aside nav a').find(link => norm(link.textContent) === 'My courses');
      if (courses) { courses.setAttribute('href', '/maker/courses'); courses.setAttribute('data-route', '/maker/courses'); }
      const nav = $(root, 'aside nav');
      if (nav && !$$<HTMLAnchorElement>(nav, 'a').some(link => norm(link.textContent) === 'Settings')) {
        const templateLink = $$<HTMLAnchorElement>(nav, 'a').find(link => norm(link.textContent) === 'My brand')
          ?? $$<HTMLAnchorElement>(nav, 'a').at(-1);
        if (templateLink) {
          const settingsLink = templateLink.cloneNode(true) as HTMLAnchorElement;
          settingsLink.textContent = 'Settings';
          settingsLink.setAttribute('href', routeHref('/maker/settings'));
          settingsLink.setAttribute('data-route', '/maker/settings');
          nav.appendChild(settingsLink);
        }
      }
    }
    sidebarActive(root, ctx.path);
    const aside = $(root, 'aside');
    const nav = aside && $(aside, 'nav');
    if (kind === 'admin' && nav && !nav.querySelector('[data-route="/admin/launch"]')) {
      const templateLink = nav.querySelector('a');
      if (templateLink) {
        const link = templateLink.cloneNode(true) as HTMLAnchorElement;
        link.textContent = 'Launch checks · real account';
        link.setAttribute('href', routeHref('/admin/launch'));
        link.setAttribute('data-route', '/admin/launch');
        nav.appendChild(link);
      }
    }
    if (kind === 'admin' && nav && !$$<HTMLAnchorElement>(nav, 'a').some(link => norm(link.textContent) === 'Coupons')) {
      const templateLink = $$<HTMLAnchorElement>(nav, 'a').find(link => norm(link.textContent) === 'Academy')
        ?? $$<HTMLAnchorElement>(nav, 'a').at(-1);
      if (templateLink) {
        const couponLink = templateLink.cloneNode(true) as HTMLAnchorElement;
        couponLink.textContent = 'Coupons';
        couponLink.setAttribute('href', routeHref('/admin/coupons'));
        couponLink.setAttribute('data-route', '/admin/coupons');
        nav.appendChild(couponLink);
      }
    }
    if (kind === 'admin' && nav && !$$<HTMLAnchorElement>(nav, 'a').some(link => norm(link.textContent) === 'Blog')) {
      const templateLink = $$<HTMLAnchorElement>(nav, 'a').find(link => norm(link.textContent) === 'Academy')
        ?? $$<HTMLAnchorElement>(nav, 'a').at(-1);
      if (templateLink) {
        const blogLink = templateLink.cloneNode(true) as HTMLAnchorElement;
        blogLink.textContent = 'Blog';
        blogLink.setAttribute('href', routeHref('/admin/blog'));
        blogLink.setAttribute('data-route', '/admin/blog');
        nav.appendChild(blogLink);
      }
    }
    if (kind === 'admin' && nav && !$$<HTMLAnchorElement>(nav, 'a').some(link => norm(link.textContent).startsWith('Site Studio'))) {
      const templateLink = $$<HTMLAnchorElement>(nav, 'a').find(link => norm(link.textContent) === 'Academy')
        ?? $$<HTMLAnchorElement>(nav, 'a').at(-1);
      if (templateLink) {
        const siteLink = templateLink.cloneNode(true) as HTMLAnchorElement;
        siteLink.textContent = 'Site Studio · secure';
        siteLink.setAttribute('href', routeHref('/admin/site'));
        siteLink.setAttribute('data-route', '/admin/site');
        nav.appendChild(siteLink);
      }
    }
    if (aside && nav) {
      aside.setAttribute('data-bt-sidebar', kind);
      tid(aside, `sidebar-${kind}`);
      $$<HTMLAnchorElement>(nav, 'a').forEach((a, i) => tid(a, `link-sidebar-${norm(a.firstElementChild?.textContent ?? a.textContent).toLowerCase().replace(/[^a-z]+/g, '-')}-${i}`));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-bt-menu-btn', '');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open menu');
      tid(btn, 'button-sidebar-menu');
      btn.setAttribute('style', `display: none; align-items: center; gap: 8px; height: 44px; padding: 0 16px; border-radius: 999px; border: 1.5px solid ${kind === 'admin' ? '#71645E' : '#E8DDD1'}; background: transparent; color: inherit; font-family: ${ARVO}; font-size: 13px; cursor: pointer`);
      btn.innerHTML = `${MENU_SVG}<span>Menu</span>`;
      nav.insertAdjacentElement('beforebegin', btn);
      on(ctx, btn, 'click', () => {
        const open = aside.toggleAttribute('data-menu-open');
        btn.setAttribute('aria-expanded', String(open));
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
    }
    const ask = $(root, 'aside a[href="#ask"]');
    if (ask) { tid(ask, 'link-ask-sahayak'); ask.setAttribute('href', routeHref('/maker/sahayak')); ask.setAttribute('data-route', '/maker/sahayak'); on(ctx, ask, 'click', e => { e.preventDefault(); ctx.navigate('/maker/sahayak'); }); }
  }

  if (kind === 'store') {
    $$<HTMLAnchorElement>(root, 'a').forEach(a => {
      if (norm(a.textContent).toLowerCase() !== 'gift finder') return;
      a.textContent = a.closest('nav[aria-label="Main"]') ? 'Ask Bea' : 'Meet Bea';
      a.setAttribute('href', '#ask-bea');
      a.removeAttribute('data-route');
      a.setAttribute('data-bea-open', '');
    });
    const header = $$(root, 'header').find(h => $(h, 'nav[aria-label="Main"]'));
    if (header) {
      header.setAttribute('data-bt-header', '');
      tid(header, 'site-header');
      const nav = $(header, 'nav[aria-label="Main"]')!;
      const NAV_ROUTES: Record<string, string> = { '#finder': '/bea', '#edit': '/shop', '#makers': '/makers/tathaastu', '#corporate': '/corporate', '#academy': '/academy' };
      $$<HTMLAnchorElement>(nav, 'a').forEach(a => {
        const r = NAV_ROUTES[a.getAttribute('href') ?? ''];
        if (r) {
          if (r === '/bea') {
            a.textContent = 'Ask Bea';
            a.setAttribute('href', '#ask-bea');
            a.removeAttribute('data-route');
            a.setAttribute('data-bea-open', '');
          } else {
            a.setAttribute('href', routeHref(r));
            a.setAttribute('data-route', r);
          }
        }
      });
      // Bea is opened from the floating launcher; keep the primary nav focused
      // on shopping and discovery destinations.
      $$<HTMLAnchorElement>(nav, 'a').filter(a => a.hasAttribute('data-bea-open') || norm(a.textContent) === 'Ask Bea').forEach(a => a.remove());
      if (!$$<HTMLAnchorElement>(nav, 'a').some(link => norm(link.textContent) === 'Journal')) {
        const templateLink = $$<HTMLAnchorElement>(nav, 'a').find(link => link.getAttribute('data-route') === '/academy')
          ?? $$<HTMLAnchorElement>(nav, 'a').at(-1);
        if (templateLink) {
          const journalLink = templateLink.cloneNode(true) as HTMLAnchorElement;
          journalLink.textContent = 'Journal';
          journalLink.setAttribute('href', routeHref('/blog'));
          journalLink.setAttribute('data-route', '/blog');
          nav.appendChild(journalLink);
        }
      }
      $$<HTMLAnchorElement>(nav, 'a').forEach(a => tid(a, `link-nav-${norm(a.textContent).toLowerCase().replace(/[^a-z]+/g, '-')}`));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-bt-menu-btn', '');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open menu');
      tid(btn, 'button-mobile-menu');
      btn.setAttribute('style', 'display: none; width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid #E8DDD1; background: #FFFDF9; color: #352C2B; align-items: center; justify-content: center; cursor: pointer');
      btn.innerHTML = MENU_SVG;
      nav.insertAdjacentElement('beforebegin', btn);
      on(ctx, btn, 'click', () => {
        const open = header.toggleAttribute('data-menu-open');
        btn.setAttribute('aria-expanded', String(open));
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      on(ctx, nav, 'click', () => { header.removeAttribute('data-menu-open'); btn.setAttribute('aria-expanded', 'false'); });

      const search = $<HTMLInputElement>(header, 'input[type="search"]');
      tid(search, 'input-search');
      on(ctx, search, 'keydown', e => {
        if ((e as KeyboardEvent).key === 'Enter' && search) { e.preventDefault(); ctx.navigate(`/shop?q=${encodeURIComponent(search.value.trim())}`); }
      });
      const signIn = $$<HTMLAnchorElement>(header, 'a').find(a => norm(a.textContent) === 'Sign in');
      tid(signIn, 'link-sign-in');
      on(ctx, signIn, 'click', e => { e.preventDefault(); e.stopPropagation(); ctx.navigate('/account'); });

      const wish = $<HTMLAnchorElement>(header, 'a[aria-label^="Wishlist"]');
      const bag = $<HTMLAnchorElement>(header, 'a[aria-label^="Bag"]');
      tid(wish, 'link-wishlist'); tid(bag, 'button-bag');
      const bagBadge = bag && $(bag, 'span');
      tid(bagBadge, 'text-bag-count');
      let wishBadge: HTMLElement | null = null;
      if (wish && bagBadge) {
        wish.style.position = 'relative';
        wishBadge = bagBadge.cloneNode(false) as HTMLElement;
        tid(wishBadge, 'text-wishlist-count');
        wish.appendChild(wishBadge);
      }
      on(ctx, wish, 'click', e => { e.preventDefault(); e.stopPropagation(); ctx.navigate('/shop?wishlist=1'); });
      on(ctx, bag, 'click', e => { e.preventDefault(); e.stopPropagation(); setBagOpen(true); });
      const paint = () => {
        const s = getState(); const n = bagCount(s); const w = s.wishlist.length;
        if (bag) bag.setAttribute('aria-label', `Bag, ${n} item${n === 1 ? '' : 's'}`);
        if (bagBadge) { bagBadge.textContent = String(n); bagBadge.style.display = n ? 'flex' : 'none'; }
        if (wish) wish.setAttribute('aria-label', `Wishlist, ${w} saved`);
        if (wishBadge) { wishBadge.textContent = String(w); wishBadge.style.display = w ? 'flex' : 'none'; }
      };
      paint();
      ctx.cleanups.push(subscribe(paint));
    }

    const footer = $(root, 'footer');
    if (footer) {
      tid(footer, 'site-footer');
      const input = $<HTMLInputElement>(footer, '#fwa');
      const btn = $$<HTMLButtonElement>(footer, 'button').find(b => norm(b.textContent) === 'Count me in');
      tid(input, 'input-footer-whatsapp'); tid(btn, 'button-footer-join');
      const done = () => {
        const n = input && normalisePhone(input.value);
        if (n && getState().newsletter.includes(n) && btn) { btn.textContent = 'You’re in'; btn.disabled = true; }
      };
      done();
      on(ctx, btn, 'click', () => {
        if (!input || !btn) return;
        const n = normalisePhone(input.value);
        const row = input.parentElement!;
        if (!/^\d{10}$/.test(n)) { fieldError(row, 'Enter a 10-digit WhatsApp number.', 'error-footer-whatsapp'); return; }
        fieldError(row, null, 'error-footer-whatsapp');
        update(s => ({ ...s, newsletter: [...new Set([...s.newsletter, n])] }));
        btn.textContent = 'You’re in'; btn.disabled = true;
      });
    }
  }
}
