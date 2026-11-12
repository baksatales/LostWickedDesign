import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import type { SiteDocument } from '@workspace/api-client-react';
import { bagCount, getState, setBagOpen, subscribe } from '../demo/store';
import { ShopperAccountEntry } from '../demo/components';
import { starterDocument } from '../pages/starter-document';
import { asset } from './ui';

const STARTER = starterDocument();
const DEFAULT_MARK = '/images/baksa/homev5-mark.webp';

function navLabel(doc: SiteDocument | undefined, href: string, fallback: string) {
  if (!doc) return fallback;
  const current = doc.navigation?.find(link => link.href === href);
  const original = STARTER.navigation.find(link => link.href === href);
  return current && original && current.label !== original.label ? current.label : fallback;
}

/** The homepage header as it shipped in demo/HomepageV5: brand, editorial nav labels, account entry, search toggle, wishlist, bag and mobile menu. */
export default function HomeHeader({ document: doc }: { document?: SiteDocument }) {
  const [, setLocation] = useLocation();
  const state = useSyncExternalStore(subscribe, getState);
  const count = bagCount(state);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = (path: string) => { setMobileOpen(false); setLocation(path); window.scrollTo({ top: 0 }); };
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = searchText.trim();
    setSearchOpen(false);
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };
  const brandName = doc?.brand?.name && doc.brand.name !== STARTER.brand.name ? doc.brand.name : 'Baksa Tales';
  const brandMark = doc?.brand?.mark && doc.brand.mark !== STARTER.brand.mark ? asset(doc.brand.mark) : asset(DEFAULT_MARK);

  return (
    <>
      <header className="h5-hdr" data-testid="shopper-site-header">
        <a className="h5-hdr__brand" href="#top" aria-label={`${brandName} home`} data-testid="link-home">
          <img src={brandMark} alt="" />
          <span>{brandName}</span>
        </a>
        <nav className={`h5-hdr__nav${mobileOpen ? ' h5-hdr__nav--open' : ''}`} aria-label="Main">
          <a href="/shop" data-testid="link-shop" onClick={e => { e.preventDefault(); navigate('/shop'); }}>{navLabel(doc, '/shop', 'Shop gifts')}</a>
          <button type="button" className="h5-hdr__nav-action" data-testid="link-open-bea" onClick={() => { setMobileOpen(false); window.dispatchEvent(new CustomEvent('bt:open-bea')); }}>Gift finder</button>
          <a href="/makers/tathaastu" data-testid="link-makers" onClick={e => { e.preventDefault(); navigate('/makers/tathaastu'); }}>{navLabel(doc, '/makers', 'Our makers')}</a>
          <a href="/corporate" data-testid="link-corporate" onClick={e => { e.preventDefault(); navigate('/corporate'); }}>{navLabel(doc, '/corporate', 'For teams')}</a>
        </nav>
        <div className="h5-hdr__tools">
          <ShopperAccountEntry navigate={navigate} className="bt-account-entry--home" />
          <button type="button" className="h5-hdr__icon" aria-label="Search" aria-expanded={searchOpen} data-testid="button-search-open" onClick={() => setSearchOpen(!searchOpen)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
          <button type="button" className="h5-hdr__icon" aria-label="Wishlist" data-testid="link-wishlist" onClick={() => navigate('/shop?wishlist=1')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
          </button>
          <button type="button" className="h5-hdr__bag" aria-label={`Bag, ${count} items`} data-testid="button-bag" onClick={() => setBagOpen(true)}>
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.7" /></svg>
            <span className="h5-hdr__count" data-testid="text-bag-count">{count}</span>
          </button>
          <button type="button" className="h5-hdr__icon h5-hdr__menu" aria-label="Toggle navigation menu" aria-expanded={mobileOpen} data-testid="button-mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={mobileOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
        </div>
      </header>
      {searchOpen && (
        <div className="h5-hdr__search">
          <form role="search" onSubmit={submitSearch}>
            <label className="h5-sr" htmlFor="h5-search">Search gifts</label>
            <input id="h5-search" type="search" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search lotus, oils, gifts…" data-testid="input-search" />
            <button type="submit" data-testid="button-search-submit">Search</button>
          </form>
        </div>
      )}
    </>
  );
}

export const brandAnnouncement = (doc: SiteDocument | undefined) =>
  doc?.brand?.announcement && doc.brand.announcement !== STARTER.brand.announcement ? doc.brand.announcement : '';
