import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import './homepage-v5.css';
import './premium-homepage.css';
import { ShopperAccountEntry } from './components';
import type { SiteDocument } from '@workspace/api-client-react';
import { starterDocument } from '../pages/starter-document';

export type HomepageV5Mood = 'explorer' | 'heart' | 'showstopper' | 'soother' | 'thoughtful';

export interface HomepageV5Product {
  id: string;
  slug: string;
  name: string;
  maker: string;
  priceLabel: string;
  imageUrl: string;
}

export interface HomepageV5Props {
  products: HomepageV5Product[];
  bagCount: number;
  wishlistIds: string[];
  onNavigate: (path: string) => void;
  onOpenBag: () => void;
  onToggleWishlist: (productId: string) => void;
  onSearch: (query: string) => void;
  onSelectMood: (feel: HomepageV5Mood) => void;
  onJoinList: () => void;
  onOpenBea: () => void;
  onShowInfo: (key: string, label: string) => void;
  siteDocument?: SiteDocument;
  siteSettingsActive?: boolean;
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const asset = (file: string) => `${base}/homepage-v5/${file}.webp`;
const MOODS: { key: HomepageV5Mood; label: string; description: string; art: string }[] = [
  { key: 'explorer', label: 'Explorer', description: 'something they’ve never seen', art: '49450dce0879ea60ea523e1bd34f8e42' },
  { key: 'heart', label: 'Heart-Giver', description: 'they remember little things', art: '33255644773ec0a0ba4d250b1b1b6549' },
  { key: 'showstopper', label: 'Showstopper', description: 'when it should get a gasp', art: '171f7435b9e9e68d6190276d8640aee3' },
  { key: 'soother', label: 'Soul Soother', description: 'for a slow, quiet evening', art: 'd5ff2b799d9cee62a9df821661524a86' },
  { key: 'thoughtful', label: 'Thoughtful One', description: 'useful, and lovely', art: '87cf078b829c7dbb9801f1d172305c0c' },
];

const editContent: Record<HomepageV5Mood, { eyebrow: string; title: ReactNode; copy: string; order: string[]; link: string; notch: string }> = {
  explorer: { eyebrow: 'THE EXPLORER EDIT', title: <>Wait, what <em>is</em> this?</>, copy: 'For the one who’s always first to try something new.', order: ['svara-divya', 'blue-lotus-pond', 'the-mushhk-essential-box'], link: 'Explore the Explorer edit ↗', notch: '15%' },
  heart: { eyebrow: 'THE HEART-GIVER EDIT', title: <>Of course <em>I remembered.</em></>, copy: 'For the person who remembers the little things.', order: ['bouquet-with-a-message', 'marigold-urli', 'svara-divya'], link: 'Explore the Heart-Giver edit ↗', notch: '33%' },
  showstopper: { eyebrow: 'THE SHOWSTOPPER EDIT', title: <>Make them <em>gasp.</em></>, copy: 'For the gift that gets opened in front of everyone.', order: ['large-teapot-bouquet', 'blue-lotus-pond', 'lotus-pond-candle-set'], link: 'Explore the Showstopper edit ↗', notch: '50%' },
  soother: { eyebrow: 'THE SOUL SOOTHER EDIT', title: <>Breathe out. <em>Slowly.</em></>, copy: 'For someone who needs a quiet evening to themselves.', order: ['the-anirveda-ritual-set', 'the-mushhk-essential-box', 'svara-divya'], link: 'Explore the Soul Soother edit ↗', notch: '68%' },
  thoughtful: { eyebrow: 'THE THOUGHTFUL ONE EDIT', title: <>Useful, <em>and lovely.</em></>, copy: 'For the practical one who still loves pretty things.', order: ['the-mushhk-essential-box', 'the-anirveda-ritual-set', 'marigold-urli'], link: 'Explore the Thoughtful One edit ↗', notch: '85%' },
};

const moodFor = (mood: HomepageV5Mood, onSelectMood: HomepageV5Props['onSelectMood']) => () => onSelectMood(mood);
const defaultSiteDocument = starterDocument();

function editableSectionText(document: SiteDocument | undefined, active: boolean, id: string, field: 'title' | 'text' | 'eyebrow') {
  if (!active || !document) return undefined;
  const current = document.sections.find(section => section.id === id);
  const original = defaultSiteDocument.sections.find(section => section.id === id);
  if (!current || !original || current[field] === original[field]) return undefined;
  return current[field];
}

function editableSectionVisible(document: SiteDocument | undefined, active: boolean, id: string) {
  return !active || document?.sections.find(section => section.id === id)?.visible !== false;
}

function editableNavigationLabel(document: SiteDocument | undefined, active: boolean, href: string, fallback: string) {
  if (!active || !document) return fallback;
  const current = document.navigation.find(link => link.href === href);
  const original = defaultSiteDocument.navigation.find(link => link.href === href);
  return current && original && current.label !== original.label ? current.label : fallback;
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" /></svg>;
}

function ProductCard({ product, wishlistIds, onNavigate, onToggleWishlist, surface }: {
  product: HomepageV5Product; wishlistIds: string[]; onNavigate: HomepageV5Props['onNavigate'];
  onToggleWishlist: HomepageV5Props['onToggleWishlist']; surface: 'edit' | 'featured';
}) {
  const saved = wishlistIds.includes(product.id);
  return (
    <article className={`bt-homev5__product${surface === 'featured' ? ' bt-homev5__product--featured' : ''}`} data-testid={`card-home-product-${surface}-${product.slug}`}>
      <div className="bt-homev5__product-media">
        <button type="button" className="bt-homev5__product-image-button" aria-label={`View ${product.name}`} data-testid={`button-view-product-${surface}-${product.slug}`} onClick={() => onNavigate(`/product/${product.slug}`)}>
          <img src={product.imageUrl} alt={`${product.name} by ${product.maker}`} loading="lazy" />
        </button>
        <button className="bt-homev5__wish" type="button" aria-label={`${saved ? 'Remove' : 'Save'} ${product.name} ${saved ? 'from' : 'to'} wishlist`} aria-pressed={saved} data-testid={`button-wishlist-${surface}-${product.slug}`} onClick={() => onToggleWishlist(product.id)}>
          <HeartIcon filled={saved} />
        </button>
      </div>
      <button type="button" className="bt-homev5__product-details" data-testid={`link-product-${surface}-${product.slug}`} onClick={() => onNavigate(`/product/${product.slug}`)}>
        <span className="bt-homev5__product-meta">{product.maker}</span>
        <span className="bt-homev5__product-name">{product.name}</span>
        <span className="bt-homev5__product-price">{product.priceLabel}</span>
      </button>
    </article>
  );
}

function Reel({ maker, title, image, onClick, testId }: { maker: string; title: string; image: string; onClick: () => void; testId: string }) {
  return (
    <button type="button" className="bt-homev5__reel" data-testid={testId} onClick={onClick} aria-label={`Open ${maker} maker story: ${title}`}>
      <img src={asset(image)} alt="" loading="lazy" />
      <span className="bt-homev5__reel-maker">{maker}</span>
      <span className="bt-homev5__reel-play" aria-hidden="true"><svg width="17" height="17" viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" fill="currentColor" /></svg></span>
      <span className="bt-homev5__reel-title">{title}</span>
    </button>
  );
}

export default function HomepageV5({
  products, bagCount, wishlistIds, onNavigate, onOpenBag, onToggleWishlist,
  onSearch, onSelectMood, onOpenBea, onShowInfo, siteDocument, siteSettingsActive = false,
}: HomepageV5Props) {
  const [selectedMood, setSelectedMood] = useState<HomepageV5Mood>('explorer');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.title = 'Baksa Tales — Every gift has something to say';
    const metadata = [
      ['name', 'description', 'Thoughtful handmade gifts from independent Indian makers, chosen for the stories they carry.'],
      ['property', 'og:title', 'Baksa Tales — Every gift has something to say'],
      ['property', 'og:description', 'Thoughtful handmade gifts from independent Indian makers, chosen for the stories they carry.'],
      ['property', 'og:type', 'website'],
    ];
    for (const [attribute, key, content] of metadata) {
      let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, key);
        document.head.appendChild(meta);
      }
      meta.content = content;
    }
  }, []);

  const orderedProduct = (slugs: string[]) => slugs.map(slug => products.find(product => product.slug === slug)).filter((product): product is HomepageV5Product => Boolean(product));
  const featured = orderedProduct(['blue-lotus-pond', 'the-mushhk-essential-box', 'svara-divya', 'the-anirveda-ritual-set']);
  const edition = orderedProduct(editContent[selectedMood].order);
  const selectMood = (mood: HomepageV5Mood) => setSelectedMood(mood);
  const navigate = (path: string) => { setMobileOpen(false); onNavigate(path); };
  const submitSearch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSearch(searchText.trim()); setSearchOpen(false); };
  const info = (key: string, label: string) => () => onShowInfo(key, label);
  const moodEdit = editContent[selectedMood];
  const brandName = siteSettingsActive && siteDocument?.brand.name !== defaultSiteDocument.brand.name ? siteDocument?.brand.name : 'Baksa Tales';
  const brandMark = siteSettingsActive && siteDocument?.brand.mark && siteDocument.brand.mark !== defaultSiteDocument.brand.mark
    ? (/^https:\/\//i.test(siteDocument.brand.mark) ? siteDocument.brand.mark : `${base}${siteDocument.brand.mark}`)
    : asset('b4bbee1f68f49a8578e3c48caf417f09');
  const announcement = siteSettingsActive && siteDocument?.brand.announcement !== defaultSiteDocument.brand.announcement
    ? siteDocument?.brand.announcement
    : 'A handwritten-style gift note is on us. Free delivery over ₹2,500.';
  const heroTitle = editableSectionText(siteDocument, siteSettingsActive, 'welcome', 'title');
  const heroEyebrow = editableSectionText(siteDocument, siteSettingsActive, 'welcome', 'eyebrow') ?? 'HANDMADE GIFTS FROM INDEPENDENT INDIAN MAKERS';
  const heroCopy = editableSectionText(siteDocument, siteSettingsActive, 'welcome', 'text') ?? 'Open a compartment. See what comes to mind.';
  const talesTitle = editableSectionText(siteDocument, siteSettingsActive, 'stories', 'title') ?? 'Today’s tales';
  const talesCopy = editableSectionText(siteDocument, siteSettingsActive, 'stories', 'text') ?? 'Step into the workshops. Under a minute each.';
  const editTitle = editableSectionText(siteDocument, siteSettingsActive, 'the-edit', 'title') ?? 'Most gifted this week';
  const editCopy = editableSectionText(siteDocument, siteSettingsActive, 'the-edit', 'text') ?? 'The pieces gifters keep coming back for.';
  const guidedTitle = editableSectionText(siteDocument, siteSettingsActive, 'guided-gifting', 'title');
  const guidedCopy = editableSectionText(siteDocument, siteSettingsActive, 'guided-gifting', 'text');
  const makerTitle = editableSectionText(siteDocument, siteSettingsActive, 'maker-invitation', 'title');
  const makerCopy = editableSectionText(siteDocument, siteSettingsActive, 'maker-invitation', 'text');

  return (
    <main className="bt-homev5" data-testid="homepage-v5">
      <div className="bt-homev5__announcement">{announcement}</div>
      <header className="bt-homev5__header">
        <a className="bt-homev5__brand" href="#top" aria-label="Baksa Tales home" data-testid="link-home">
          <img src={brandMark} alt="" />
          <span>{brandName}</span>
        </a>
        <nav className={`bt-homev5__nav${mobileOpen ? ' bt-homev5__nav--open' : ''}`} aria-label="Main">
          <a href="#shop" data-testid="link-shop" onClick={event => { event.preventDefault(); navigate('/shop'); }}>{editableNavigationLabel(siteDocument, siteSettingsActive, '/shop', 'Shop gifts')}</a>
          <button type="button" className="bt-homev5__nav-action" data-testid="link-open-bea" onClick={() => { setMobileOpen(false); onOpenBea(); }}>Gift finder</button>
          <a href="#makers" data-testid="link-makers" onClick={event => { event.preventDefault(); navigate('/makers/tathaastu'); }}>{editableNavigationLabel(siteDocument, siteSettingsActive, '/makers', 'Our makers')}</a>
          <a href="#corporate" data-testid="link-corporate" onClick={event => { event.preventDefault(); navigate('/corporate'); }}>{editableNavigationLabel(siteDocument, siteSettingsActive, '/corporate', 'For teams')}</a>
        </nav>
        <div className="bt-homev5__tools">
          <ShopperAccountEntry navigate={navigate} className="bt-account-entry--home" />
          <button type="button" className="bt-homev5__icon-btn" aria-label="Search" aria-expanded={searchOpen} data-testid="button-search-open" onClick={() => setSearchOpen(!searchOpen)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
          <button type="button" className="bt-homev5__icon-btn" aria-label="Wishlist" data-testid="link-wishlist" onClick={() => navigate('/shop?wishlist=1')}>
            <HeartIcon />
          </button>
          <button type="button" className="bt-homev5__bag" aria-label={`Bag, ${bagCount} items`} data-testid="button-bag" onClick={onOpenBag}>
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.7" /></svg>
            <span className="bt-homev5__bag-count" data-testid="text-bag-count">{bagCount}</span>
          </button>
          <button type="button" className="bt-homev5__icon-btn bt-homev5__menu-btn" aria-label="Toggle navigation menu" aria-expanded={mobileOpen} data-testid="button-mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}>
            <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true"><path d={mobileOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
        </div>
      </header>
      {searchOpen && <div className="bt-homev5__search"><form role="search" onSubmit={submitSearch}><label className="sr-only" htmlFor="homepage-v5-search">Search gifts</label><input id="homepage-v5-search" type="search" value={searchText} onChange={event => setSearchText(event.target.value)} placeholder="Search lotus, oils, gifts…" data-testid="input-search" /><button type="submit" data-testid="button-search-submit">Search</button></form></div>}
      <div className="bt-homev5__pattern" aria-hidden="true" />

      <section className="bt-homev5__hero bt-homev5__wrap" id="top" style={{ display: editableSectionVisible(siteDocument, siteSettingsActive, 'welcome') ? undefined : 'none' }}>
        <p className="bt-homev5__eyebrow">{heroEyebrow}</p>
        {heroTitle !== undefined
          ? <h1>{heroTitle}</h1>
          : <h1>Every gift has <em>something<svg className="bt-homev5__underline" viewBox="0 0 220 24" preserveAspectRatio="none" aria-hidden="true"><path d="M4 16 C 40 4, 70 22, 110 12 S 180 4, 216 14" fill="none" stroke="#EBA937" strokeWidth="7" strokeLinecap="round" /></svg></em> to say.</h1>}
        <div className="bt-homev5__subhead"><span /><p>{heroCopy}</p><span /></div>
        <div className="bt-homev5__trunk" aria-label="Choose a gifting mood">
          <img className="bt-homev5__trunk-bg" src={asset('dac6e5697f9ceaeb06594857b6f34c50')} alt="" />
          {MOODS.map((mood, index) => <button className={`bt-homev5__door bt-homev5__door--${index + 1}${selectedMood === mood.key ? ' bt-homev5__door--active' : ''}`} type="button" aria-pressed={selectedMood === mood.key} data-testid={`button-mood-${mood.key}`} key={mood.key} onClick={() => selectMood(mood.key)}>
            <span className="bt-homev5__door-title">{mood.label}</span><img src={asset(mood.art)} alt="" /><span className="bt-homev5__door-copy">{mood.description}</span><span className="bt-homev5__door-open">Open ↗</span>
          </button>)}
        </div>
        <div className="bt-homev5__moods-mobile" aria-label="Choose a gifting mood">
          {MOODS.map(mood => <button className={`bt-homev5__mood-card${selectedMood === mood.key ? ' bt-homev5__mood-card--active' : ''}`} type="button" aria-pressed={selectedMood === mood.key} data-testid={`button-mood-mobile-${mood.key}`} key={mood.key} onClick={() => selectMood(mood.key)}>
            <strong>{mood.label}</strong><img src={asset(mood.art)} alt="" /><span>{mood.description}</span>
          </button>)}
        </div>
        <div className="bt-homev5__browse"><a href="#shop" data-testid="link-browse-gifts">Browse all gifts ↗</a><a href="#shop" data-testid="link-self-gifts">Something for yourself ↗</a></div>
        <div className="bt-homev5__edit-panel" style={{ '--notch': moodEdit.notch } as CSSProperties} data-testid="panel-mood-edit">
          <div className="bt-homev5__edit-inner">
            <div className="bt-homev5__edit-copy"><p>{moodEdit.eyebrow}</p><h2>{guidedTitle !== undefined ? guidedTitle : moodEdit.title}</h2><p>{guidedCopy !== undefined ? guidedCopy : moodEdit.copy}</p></div>
            {edition.map(product => <ProductCard key={`${selectedMood}-${product.id}`} product={product} wishlistIds={wishlistIds} onNavigate={navigate} onToggleWishlist={onToggleWishlist} surface="edit" />)}
          </div>
          <div className="bt-homev5__edit-link"><span /><button type="button" className="bt-homev5__inline-link" data-testid={`button-explore-edit-${selectedMood}`} onClick={() => onSelectMood(selectedMood)}>{moodEdit.link}</button><span /></div>
        </div>
      </section>

      <section className="bt-homev5__section bt-homev5__wrap" id="tales" style={{ display: editableSectionVisible(siteDocument, siteSettingsActive, 'stories') ? undefined : 'none' }}>
        <div className="bt-homev5__section-heading"><div><span className="bt-homev5__new-label">NEW THIS WEEK</span><h2>{talesTitle}</h2><p>{talesCopy}</p></div><button className="bt-homev5__text-link" type="button" data-testid="link-all-tales" onClick={() => onShowInfo('all-tales', 'Today’s tales')}>All tales →</button></div>
        <div className="bt-homev5__reels">
          <Reel maker="Tathaastu" title="Watch a lotus come alive, petal by petal" image="eee7bce16bd2dd1ab05098be9f6ae27c" testId="card-tale-tathaastu" onClick={() => navigate('/makers/tathaastu')} />
          <Reel maker="Anirveda" title="Inside a slow Ayurvedic bath ritual" image="227a4597034c44808ed4c82e2809abbd" testId="card-tale-anirveda" onClick={() => onShowInfo('story-anirveda', 'Anirveda maker story')} />
          <Reel maker="Svara" title="Why their fragrance has no alcohol" image="000b6de55ad26de40d6a0a285401e191" testId="card-tale-svara" onClick={() => onShowInfo('story-svara', 'Svara maker story')} />
          <Reel maker="Mushhk" title="A small ritual for a softer evening" image="da50df6a56a8e6237a40d5a1ad8a054b" testId="card-tale-mushhk" onClick={() => onShowInfo('story-mushhk', 'Mushhk maker story')} />
        </div>
      </section>

      <section className="bt-homev5__section bt-homev5__wrap" id="shop" style={{ display: editableSectionVisible(siteDocument, siteSettingsActive, 'the-edit') ? undefined : 'none' }}>
        <div className="bt-homev5__section-heading"><div><h2>{editTitle}</h2><p>{editCopy}</p></div><button className="bt-homev5__text-link" type="button" data-testid="link-see-all-gifts" onClick={() => navigate('/shop')}>See all gifts →</button></div>
        <div className="bt-homev5__gift-grid">
          {featured.map(product => <ProductCard key={product.id} product={product} wishlistIds={wishlistIds} onNavigate={navigate} onToggleWishlist={onToggleWishlist} surface="featured" />)}
        </div>
      </section>

      <section className="bt-homev5__maker bt-homev5__wrap" id="makers" style={{ display: editableSectionVisible(siteDocument, siteSettingsActive, 'maker-invitation') ? undefined : 'none' }}>
        <div className="bt-homev5__maker-art"><img src={asset('eee7bce16bd2dd1ab05098be9f6ae27c')} alt="Hand-shaped lotus candles by Tathaastu" loading="lazy" /><span className="bt-homev5__maker-stamp">MADE WITH PURPOSE</span></div>
        <div className="bt-homev5__maker-copy"><p>Meet the maker</p><h2>{makerTitle !== undefined ? makerTitle : <>Petal by petal, <em>a new beginning.</em></>}</h2><p>{makerCopy !== undefined ? makerCopy : 'Tathaastu shapes soy wax into lotuses, peonies and marigolds, one petal at a time. Every piece supports war widows and army wives as they rebuild their lives.'}</p><div className="bt-homev5__maker-actions"><button type="button" className="bt-homev5__button" data-testid="button-maker-story" onClick={() => navigate('/makers/tathaastu')}>Read their story</button><button type="button" className="bt-homev5__text-link" data-testid="link-shop-tathaastu" onClick={() => navigate('/shop?q=Tathaastu')}>Shop Tathaastu →</button></div></div>
      </section>

      <section className="bt-homev5__corporate bt-homev5__wrap" id="corporate">
        <div className="bt-homev5__corp-card">
          <div className="bt-homev5__corp-copy"><p>The Baksa way to give</p><h2>Wrapped in <em>a story.</em></h2><p>Thoughtful gifts for teams, clients and gatherings, each one carrying the story of its maker. Ask us about keepsake boxes made for your occasion.</p><button type="button" className="bt-homev5__button" data-testid="button-corporate-brief" onClick={() => navigate('/corporate')}>Explore corporate gifting →</button></div>
          <div className="bt-homev5__corp-image"><img src={asset('fdd8be909c459f769b976b8c045c744d')} alt="Keepsake box wrapped in Mithila art" /></div>
        </div>
      </section>

      <section className="bt-homev5__event" id="kala">
        <div className="bt-homev5__event-inner bt-homev5__wrap">
          <div><p className="bt-homev5__utility">A CRAFT CARNIVAL IN DELHI NCR</p><h2>Kala Samāgam</h2><p>A place to meet the makers, hear the stories and bring home something made by hand.</p><button type="button" className="bt-homev5__button" data-testid="button-kala-info" onClick={info('kala-samagam', 'Kala Samāgam')}>Discover Kala Samāgam</button></div>
          <div className="bt-homev5__event-note"><strong>New dates coming soon</strong><span>Join the Baksa circle for first looks and invitations.</span></div>
        </div>
      </section>

      <section className="bt-homev5__promises bt-homev5__wrap" aria-label="Our promises">
        <div className="bt-homev5__promise"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="m8 12 2.5 2.5L16 9" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg><span>Every maker met by our team</span></div>
        <div className="bt-homev5__promise"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="m8 12 2.5 2.5L16 9" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg><span>Prices include GST</span></div>
        <div className="bt-homev5__promise"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="m8 12 2.5 2.5L16 9" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg><span>A handwritten-style gift note is on us</span></div>
      </section>

    </main>
  );
}
