import { lazy, useContext, useEffect, useMemo, useRef, useState, type AnchorHTMLAttributes, type CSSProperties, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react';
import { Link, useLocation } from 'wouter';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { ArrowLeft, ArrowRight, BookOpen, Check, Heart, Menu, Minus, Package, Plus, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetWorkspaceQueryKey, getGetOperationsQueryKey,
  setAuthTokenGetter, useApplyToSell, useCreateBrief, useFindGifts, useGetCatalog,
  useGetRuntime, useGetWorkspace, useGetSite, useGetOperations,
} from '@workspace/api-client-react';
import type { Catalog, GiftMatch, Maker, Product, Runtime, Workspace, SiteDocument } from '@workspace/api-client-react';
import { starterDocument } from './starter-document';
import { SiteDocumentContext, useSitePage, PageArtwork, Seo, imageUrl, money, errText } from './storefront-shared';
import { RouteContent } from '../components/route-content';
import { commerceDestination, trackEvent } from '../lib/analytics';
import '../baksa.css';
import '../editorial-refinements.css';

const base = import.meta.env.BASE_URL;
const safeSiteHref=(value:string)=>/^\/(?!\/)[a-zA-Z0-9/_?=&%#.,~-]*$/.test(value)||/^https:\/\/[a-zA-Z0-9.-]+(?::443)?(?:\/[^\s<>\\]*)?$/.test(value);
const siteHref=(value:string)=>safeSiteHref(value)?value:'/';
function DocLink({href,...props}:{href:string}&AnchorHTMLAttributes<HTMLAnchorElement>){const safe=siteHref(href);return /^https:\/\//i.test(safe)?<a href={safe} target="_blank" rel="noopener noreferrer" {...props}/>:<Link href={safe} {...props}/>;}
const SiteStudio = lazy(() => import('./SiteStudio'));
const MakerArea = lazy(() => import('./MakerArea'));
const AdminArea = lazy(() => import('./AdminArea'));
type CartItem = { productId: string; quantity: number };
type SellValues = { brand:string;contactName:string;phone:string;craft:string;city:string;state:string;gstRegistered:boolean;gstin:string;link:string };
function readList<T>(key: string, validate: (value: unknown) => value is T, fallback: T[]): T[] {
  try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(value) ? value.filter(validate) : fallback; } catch { return fallback; }
}
const validCart = (v: unknown): v is CartItem => !!v && typeof v === 'object' && typeof (v as CartItem).productId === 'string' && Number.isInteger((v as CartItem).quantity) && (v as CartItem).quantity > 0;
const validString = (v: unknown): v is string => typeof v === 'string';
function Frame({ children, bagCount, savedCount, onBag, document:siteDoc }: { children: ReactNode; bagCount: number; savedCount: number; onBag: () => void; document:SiteDocument }) {
  const [menu, setMenu] = useState(false);
  const theme=siteDoc.theme;
  const themeStyle={'--bk-paper':theme.background,'--bk-cream':theme.surface,'--bk-maroon':theme.primary,'--bk-crimson':theme.primary,'--bk-teal':theme.secondary,'--bk-gold':theme.accent,'--bk-ink':theme.ink,'--bk-muted':theme.muted,'--bk-line':theme.primary+'30','--bk-display':theme.headingFont==='georgia'?'Georgia,serif':theme.headingFont==='cormorant'?'Cormorant Garamond,Georgia,serif':"'EB Garamond',Georgia,serif",'--bk-body':theme.bodyFont==='system'?'system-ui,sans-serif':theme.bodyFont==='georgia'?'Georgia,serif':"'Source Sans 3',sans-serif",'--bk-radius':`${theme.radius}px`,'--bk-space':theme.spacing==='compact'?'48px':theme.spacing==='generous'?'94px':'72px' } as CSSProperties;
  return <SiteDocumentContext.Provider value={siteDoc}><div className={`baksa ${theme.motion?'bk-motion':'bk-still'} ${theme.ornament?'bk-ornament':''}`} style={themeStyle}>
    <div className="bk-notice">{siteDoc.brand.announcement}</div>
    <header className="bk-header"><div className="bk-header-main">
      <Link href="/" className="bk-logo"><img src={imageUrl(siteDoc.brand.mark)} alt="" /><span className="bk-wordmark">{siteDoc.brand.name}<small>{siteDoc.brand.tagline}</small></span></Link>
      <nav className="bk-nav" aria-label="Main navigation">{siteDoc.navigation.map((item,i)=><DocLink key={`${item.href}-${i}`} href={item.href}>{item.label}</DocLink>)}</nav>
      <div className="bk-actions">
        <Link className="bk-iconbtn" href="/wishlist" aria-label={`Wishlist, ${savedCount} saved`}><Heart size={19}/>{savedCount > 0 && <span className="bk-count">{savedCount}</span>}</Link>
        <button className="bk-iconbtn" onClick={onBag} aria-label={`Open bag, ${bagCount} items`}><ShoppingBag size={19}/>{bagCount > 0 && <span className="bk-count">{bagCount}</span>}</button>
        <Link className="bk-iconbtn" href="/account" aria-label="Your account"><UserRound size={19}/></Link>
        <button className="bk-iconbtn bk-mobile-menu" onClick={() => setMenu(!menu)} aria-label={menu ? 'Close menu' : 'Open menu'}>{menu ? <X size={20}/> : <Menu size={20}/>}</button>
      </div>
    </div>{menu && <nav className="bk-mobile-panel">{siteDoc.navigation.map((item,i)=><DocLink key={`${item.href}-${i}`} href={item.href}>{item.label}</DocLink>)}<Link href="/sell">For makers</Link></nav>}</header>
    {children}
    <footer className="bk-footer"><div className="bk-footgrid">
      <div><img className="bk-footmark" src={imageUrl(siteDoc.brand.logo)} alt={`${siteDoc.brand.name} — ${siteDoc.brand.tagline}`}/><h3>{siteDoc.brand.footerTitle}</h3><p>{siteDoc.brand.footerText}</p><small>{siteDoc.brand.copyright}</small></div>
      <div><h3>Find your way</h3>{siteDoc.footerLinks.slice(0,Math.ceil(siteDoc.footerLinks.length/2)).map((item,i)=><DocLink key={`${item.href}-${i}`} href={item.href}>{item.label}</DocLink>)}</div>
      <div><h3>Make something together</h3>{siteDoc.footerLinks.slice(Math.ceil(siteDoc.footerLinks.length/2)).map((item,i)=><DocLink key={`${item.href}-${i}`} href={item.href}>{item.label}</DocLink>)}{!siteDoc.footerLinks.some(item=>item.href==='/admin/site')&&<Link href="/admin/site">Site Studio</Link>}<Link className="bk-preview-link" href="/studio-preview">Local design playground · unsaved</Link></div>
    </div></footer>
  </div></SiteDocumentContext.Provider>;
}
function ProductCard({ product, maker, saved, onToggle }: { product: Product; maker?: Maker; saved: boolean; onToggle: () => void }) {
  const labels=useContext(SiteDocumentContext)?.labels||{};
  return <article className="bk-card" data-testid={`card-product-${product.id}`}><Link className="bk-cardmedia" href={`/products/${product.slug}`} aria-label={`View ${product.name}`}><img src={imageUrl(product.image)} alt={product.name}/>{product.sample && <span className="bk-cardtag">Sample catalogue</span>}</Link><button className={`bk-heart ${saved ? 'active' : ''}`} aria-label={`${saved ? 'Remove' : labels['product.save']||'Save'} ${product.name}`} aria-pressed={saved} onClick={onToggle}><Heart size={18} fill={saved ? 'currentColor' : 'none'}/></button><div className="bk-cardcopy"><h3><Link href={`/products/${product.slug}`} style={{textDecoration:'none'}}>{product.name}</Link></h3><p>{maker?.brand || product.category}</p><div className="bk-cardprice">{money(product.pricePaise)}</div></div></article>;
}
function ProductGrid({ products, makers, saved, toggle }: { products: Product[]; makers: Maker[]; saved: string[]; toggle: (id: string) => void }) {
  if (!products.length) return <div className="bk-empty"><strong style={{font:'27px var(--bk-display)',color:'var(--bk-ink)'}}>Nothing in this edit just yet.</strong><p>Try a different filter or clear your search.</p></div>;
  return <div className="bk-productgrid">{products.map(p => <ProductCard key={p.id} product={p} maker={makers.find(m => m.id === p.makerId)} saved={saved.includes(p.id)} onToggle={() => toggle(p.id)}/>)}</div>;
}
function HomePage({ catalog, saved, toggle, catalogError, retryCatalog, document:siteDoc, measure=true }: { catalog?: Catalog; saved: string[]; toggle: (id:string)=>void;catalogError?:string;retryCatalog:()=>void;document:SiteDocument;measure?:boolean }) {
  const [opened, setOpened] = useState(false);
  const products = catalog?.products || [];
  const page=(id:string)=>siteDoc.pages.find(p=>p.id===id);
  const visibleStories=siteDoc.stories.filter(s=>s.visible);
  const imageUrlSafe=(v:string)=>imageUrl(v||'baksatales-trunk-mark.png');
  const renderSection=(section:SiteDocument['sections'][number],index:number)=>{
    const toneClass=`bk-home-section tone-${section.tone} layout-${section.layout}`;
     if(section.type==='hero') {
       const heroImage=section.image;
       const isGarden=heroImage.endsWith('baksa-painted-garden.webp');
       return <section key={section.id} className={`${toneClass} bk-dynamic-hero ${heroImage?'has-art':''}`} aria-labelledby={`home-title-${section.id}`}>
         {heroImage&&<div className="bk-dynamic-image"><img src={imageUrlSafe(heroImage)} alt={section.imageAlt}/><span className="bk-image-index">{siteDoc.brand.name.toUpperCase()} · {String(index+1).padStart(2,'0')}</span>{isGarden&&<span className="bk-art-credit">{siteDoc.labels['art.credit']||'A painted garden · decorative original artwork'}</span>}</div>}
         <div className="bk-dynamic-copy"><span className="bk-eyebrow">{section.eyebrow}</span><h1 id={`home-title-${section.id}`}>{section.title}</h1><p>{section.text}</p><div className="bk-hero-actions"><DocLink className="bk-btn" href={section.link.href}>{section.link.label}<ArrowRight size={16}/></DocLink><span className="bk-hero-note">{siteDoc.labels['hero.note']||'Independent Indian makers · stories worth keeping'}</span></div></div>
         <div className="bk-trunk-stage"><div className="bk-trunk-caption"><span className="bk-eyebrow">{siteDoc.labels['trunk.eyebrow']||'A little something inside'}</span><p>{siteDoc.labels['trunk.intro']||'Open the baksa; let a story find you.'}</p></div><div className="bk-trunk-area"><div className={`stage ${opened?'open':''}`}><div className="trunk"><div className="cards" aria-hidden={!opened}>{siteDoc.trunkCards.slice(0,3).map((card,i)=><DocLink key={card.id} className={`scard bk-trunk-card ${i===2?'smood':''}`} href={card.link.href} tabIndex={opened?0:-1} aria-label={`${card.link.label}: ${card.title}`} onClick={e=>{if(!opened)e.preventDefault()}}>{card.image&&<img className="art" src={imageUrlSafe(card.image)} alt=""/>}<span className="cap"><b>{card.sponsored?'SPONSORED · LABELLED':siteDoc.brand.name.toUpperCase()}</b><strong>{card.title}</strong><small>{card.caption}</small></span></DocLink>)}</div><div className="inside" aria-hidden="true"/><img className="body" src={imageUrl(siteDoc.brand.logo)} alt={`${siteDoc.brand.name} trunk`}/><img className="lid" src={imageUrl(siteDoc.brand.logo)} alt="" aria-hidden="true"/></div></div><div className="stage-ctl"><button className="bk-btn secondary bk-trunk-toggle" aria-expanded={opened} onClick={()=>setOpened(v=>!v)}>{opened?<><Minus size={15}/> {siteDoc.labels['trunk.close']||'Close the baksa'}</>:<><Plus size={15}/> {siteDoc.labels['trunk.open']||'Open the baksa'}</>}</button></div></div></div>
       </section>;
     }
    if(section.type==='products'){
      const selected=section.productIds.length?section.productIds.flatMap(id=>products.find(p=>p.id===id)??[]):products.slice(0,4);
      return <section key={section.id} className={`bk-section ${toneClass}`}><div className="bk-sectionhead"><div><span className="bk-eyebrow">{section.eyebrow}</span><h2>{section.title}</h2><p className="bk-muted">{section.text}</p></div><DocLink className="bk-textlink" href={section.link.href}>{section.link.label}<ArrowRight size={15}/></DocLink></div>{catalog?<ProductGrid products={selected} makers={catalog.makers} saved={saved} toggle={toggle}/>:catalogError?<div className="bk-errorbox"><p>{catalogError}</p><button className="bk-btn secondary" onClick={retryCatalog}>Try again</button></div>:<div className="bk-skeleton"/>}</section>;
    }
    if(section.type==='story'){
      const story=visibleStories.find(s=>s.id===section.storyId)||visibleStories[0];
      return <section key={section.id} className={`bk-section bk-editorial-story ${toneClass}`}><div><span className="bk-eyebrow">{section.eyebrow}</span><h2>{section.title}</h2><p>{section.text}</p><DocLink className="bk-textlink" href={section.link.href}>{section.link.label}<ArrowRight size={15}/></DocLink></div><div className="bk-story-stamp"><img src={imageUrlSafe(section.image||story?.image||'t-bluelotus.webp')} alt={section.imageAlt||story?.imageAlt}/><span>{story?.maker||'Baksa Tales'}<small>{story?.sponsored?'Sponsored placement':story?.sample?'Sample catalogue story':'Maker story'}</small></span></div></section>;
    }
    if(section.type==='maker'){
      const maker=catalog?.makers[0];
      return <section key={section.id} className={`bk-section bk-split ${toneClass}`}><img className="bk-storyimg" src={imageUrlSafe(section.image||maker?.image||'t-bluelotus.webp')} alt={section.imageAlt||maker?.brand||''}/><div className="bk-storycopy"><span className="bk-eyebrow">{section.eyebrow}</span><h2>{section.title}</h2><p>{section.text}</p><DocLink className="bk-btn secondary" href={section.link.href}>{section.link.label}<ArrowRight size={16}/></DocLink></div></section>;
    }
    if(section.type==='quiz')return <section key={section.id} className={`bk-section ${toneClass}`}><div className="bk-banner"><div><span className="bk-eyebrow">{section.eyebrow}</span><h2>{section.title}</h2><p>{section.text}</p></div><DocLink className="bk-btn" href="/gift-finder">{section.link.label}<ArrowRight size={16}/></DocLink></div></section>;
    return <section key={section.id} className={`bk-section ${toneClass}`}><div className="bk-banner"><div><span className="bk-eyebrow">{section.eyebrow}</span><h2>{section.title}</h2><p>{section.text}</p></div><DocLink className="bk-btn" href={section.link.href}>{section.link.label}<ArrowRight size={16}/></DocLink></div></section>;
  };
  return <main onClickCapture={e=>{
    if(!measure||e.defaultPrevented||!(e.target instanceof Element))return;
    if(e.target.closest('.bk-trunk-toggle')&&!opened)trackEvent('trunk_opened',undefined);
    const card=e.target.closest('.bk-trunk-card');
    if(!opened||!card)return;
    const position=Array.from(card.parentElement?.children||[]).indexOf(card);
    if(siteDoc.trunkCards[position]?.sponsored)trackEvent('sponsored_card_followed',{card_position:position+1});
  }} className={`bk-home ${siteDoc.theme.motion?'bk-motion':'bk-still'} ${siteDoc.theme.ornament?'bk-ornament':''}`} style={{'--bk-paper':siteDoc.theme.background,'--bk-cream':siteDoc.theme.surface,'--bk-maroon':siteDoc.theme.primary,'--bk-crimson':siteDoc.theme.primary,'--bk-teal':siteDoc.theme.secondary,'--bk-gold':siteDoc.theme.accent,'--bk-ink':siteDoc.theme.ink,'--bk-muted':siteDoc.theme.muted,'--bk-display':siteDoc.theme.headingFont==='georgia'?'Georgia,serif':siteDoc.theme.headingFont==='cormorant'?'Cormorant Garamond,Georgia,serif':"'EB Garamond',Georgia,serif",'--bk-body':siteDoc.theme.bodyFont==='system'?'system-ui,sans-serif':siteDoc.theme.bodyFont==='georgia'?'Georgia,serif':"'Source Sans 3',sans-serif",'--bk-radius':`${siteDoc.theme.radius}px`,'--bk-space':siteDoc.theme.spacing==='compact'?'48px':siteDoc.theme.spacing==='generous'?'94px':'72px'} as CSSProperties}>
    <Seo title={page('shop')?.title||'Handmade gifts, found with feeling'} description={page('shop')?.description||'Discover meaningful gifts through the makers and stories behind them.'}/>
    {siteDoc.sections.filter(s=>s.visible).map(renderSection)}
  </main>;
}

function StorefrontPreview({document:doc,catalog,catalogError,retryCatalog,storyId}:{document:SiteDocument;catalog?:Catalog;catalogError?:string;retryCatalog:()=>void;storyId?:string}){
  const [saved,setSaved]=useState<string[]>([]);const [cart,setCart]=useState<CartItem[]>([]);const [bagOpen,setBagOpen]=useState(false);
  const toggle=(id:string)=>setSaved(items=>items.includes(id)?items.filter(x=>x!==id):[...items,id]);
  return <div className="bk-preview-no-nav" onClickCapture={e=>{if((e.target as HTMLElement).closest('a'))e.preventDefault();}}><Frame document={doc} bagCount={cart.reduce((n,item)=>n+item.quantity,0)} savedCount={saved.length} onBag={()=>setBagOpen(true)}>{storyId?<StoryPage id={storyId} document={doc} measure={false}/>:<HomePage catalog={catalog} saved={saved} toggle={toggle} document={doc} catalogError={catalogError} retryCatalog={retryCatalog} measure={false}/>} {catalog&&<BagDrawer open={bagOpen} close={()=>setBagOpen(false)} catalog={catalog} cart={cart} setCart={setCart}/>}</Frame></div>;
}

function StoryPage({id,document:siteDoc,measure=true}:{id:string;document:SiteDocument;measure?:boolean}){
  const story=siteDoc.stories.find(s=>s.id===id&&s.visible);
  const openedStory=useRef<string|null>(null);
  const storyPosition=siteDoc.stories.findIndex(s=>s.id===id)+1;
  useEffect(()=>{
    if(!measure||!story||openedStory.current===id)return;
    openedStory.current=id;
    trackEvent('story_opened',{story_position:storyPosition,sponsored:story.sponsored,sample:story.sample});
  },[id,measure,storyPosition,story]);
  if(!story)return <main className="bk-formpage"><Seo title="Story not found" description="This editorial story is not currently available."/><span className="bk-eyebrow">A story not in this edit</span><h1>This chapter is not available.</h1><Link className="bk-btn" href="/makers">Meet the makers</Link></main>;
  return <main className="bk-story-page" onClickCapture={e=>{
    if(!measure||e.defaultPrevented||!(e.target instanceof Element))return;
    const anchor=e.target.closest('a');
    if(!anchor)return;
    // Read the app route, not the rendered href (which can include a preview base).
    const destination=commerceDestination(anchor.closest('.bk-story-cover')?siteHref(story.link.href):'/makers');
    if(destination)trackEvent('story_commerce_link_followed',{story_position:storyPosition,sponsored:story.sponsored,sample:story.sample,destination});
  }}><Seo title={story.title} description={story.intro}/><header className="bk-story-cover"><img src={imageUrl(story.image)} alt={story.imageAlt}/><div><span className="bk-eyebrow">{story.sponsored?'Sponsored placement':story.sample?'Sample catalogue story':'Maker story'}{story.sample?' · sample':''}</span><p className="bk-story-maker">{story.maker}</p><h1>{story.title}</h1><p>{story.intro}</p><Link className="bk-btn secondary" href={siteHref(story.link.href)}>{story.link.label}<ArrowRight size={16}/></Link></div></header>{story.chapters.map((chapter,i)=><article className={`bk-story-chapter ${i%2?'reverse':''}`} key={chapter.id}><div className="bk-story-chapter-copy"><span className="bk-eyebrow">Chapter {String(i+1).padStart(2,'0')}</span><h2>{chapter.title}</h2><p>{chapter.body}</p>{chapter.quote&&<blockquote>“{chapter.quote}”</blockquote>}</div>{chapter.image&&<img src={imageUrl(chapter.image)} alt={chapter.imageAlt}/>}</article>)}<footer className="bk-story-end"><span className="bk-eyebrow">Keep exploring</span><h2>Find another story in the baksa.</h2><Link className="bk-btn" href="/makers">Meet the makers <ArrowRight size={16}/></Link></footer></main>;
}
function PageHeading({id,eyebrow,title,intro,description}:{id:string;eyebrow:string;title:string;intro:string;description:string}){
  const content=useSitePage(id);
  return <><Seo title={content?.title||title} description={content?.description||description}/><header className="bk-pagehead"><span className="bk-eyebrow">{content?.eyebrow||eyebrow}</span><h1>{content?.heading||title}</h1><p>{content?.intro||intro}</p>{content?.image&&<img className="bk-pagehead-image" src={imageUrl(content.image)} alt={content.imageAlt}/>}</header></>;
}

function ShopPage({ catalog, saved, toggle, makerOnly }: { catalog: Catalog; saved: string[]; toggle: (id:string)=>void; makerOnly?: string }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [maker, setMaker] = useState(makerOnly || '');
  const [budget, setBudget] = useState('');
  const [sort, setSort] = useState('curated');
  const makers = catalog.makers;
  const categories = [...new Set(catalog.products.map(p => p.category))];
  const matches = useMemo(() => catalog.products.filter(p => {
    const mk = makers.find(m => m.id === p.makerId);
    return (!maker || p.makerId === maker || mk?.slug === maker) &&
      (!category || p.category === category) &&
      (!budget || p.pricePaise <= Number(budget)) &&
      (!query || `${p.name} ${p.category} ${p.material} ${mk?.brand}`.toLowerCase().includes(query.toLowerCase()));
  }).sort((a,b) => sort === 'price-low' ? a.pricePaise - b.pricePaise : sort === 'price-high' ? b.pricePaise - a.pricePaise : sort === 'name' ? a.name.localeCompare(b.name) : 0), [catalog.products, makers, maker, category, budget, query, sort]);
  return <main><PageHeading id="shop" eyebrow="An edit with a point of view" title="The considered edit." intro="Objects chosen for the care in their making, and the meaning they carry when given." description="Shop handmade gifts, home objects and thoughtful pieces from independent makers."/><header className="bk-pagehead" style={{paddingTop:0}}>{catalog.sample&&<p className="bk-status">Sample catalogue · indicative prices and product details</p>}</header><section className="bk-catalog"><div className="bk-toolbar"><div className="bk-filters"><label className="bk-search"><Search size={17}/><input aria-label="Search products" placeholder="Search objects, craft, material…" value={query} onChange={e=>setQuery(e.target.value)}/></label><select className="bk-select" aria-label="Filter by category" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All crafts</option>{categories.map(c=><option key={c}>{c}</option>)}</select><select className="bk-select" aria-label="Filter by maker" value={maker} onChange={e=>setMaker(e.target.value)}><option value="">All makers</option>{makers.map(m=><option key={m.id} value={m.id}>{m.brand}</option>)}</select><select className="bk-select" aria-label="Filter by budget" value={budget} onChange={e=>setBudget(e.target.value)}><option value="">Any budget</option><option value="150000">Under ₹1,500</option><option value="300000">Under ₹3,000</option><option value="500000">Under ₹5,000</option></select></div><label>Sort <select className="bk-select" value={sort} onChange={e=>setSort(e.target.value)}><option value="curated">Curated</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select></label></div><p className="bk-muted">{matches.length} {matches.length === 1 ? 'piece' : 'pieces'} in this edit</p><ProductGrid products={matches} makers={makers} saved={saved} toggle={toggle}/></section></main>;
}
function MakersPage({ catalog }: { catalog: Catalog }) {
  return <main><PageHeading id="makers" eyebrow="People behind the work" title="Meet the makers." intro="Start with the work itself. Maker stories here stay close to the details provided in each catalogue listing." description="Meet independent makers represented in the Baksa Tales catalogue."/><header className="bk-pagehead" style={{paddingTop:0}}>{catalog.sample&&<p className="bk-status">Maker listings are sample catalogue entries.</p>}</header><section className="bk-catalog"><div className="bk-productgrid">{catalog.makers.map((m,i)=><article key={m.id} className="bk-panel" style={{padding:0,overflow:'hidden',margin:0}}><Link href={`/makers/${m.slug}`} style={{textDecoration:'none'}}><img src={imageUrl(m.image || ['t-bluelotus.webp','mu-box.webp','sv-sandhya.webp','an-range.webp'][i%4])} alt="" style={{width:'100%',height:290,objectFit:'cover',display:'block'}}/><div style={{padding:20}}><span className="bk-eyebrow">{m.craft}</span><h2 style={{fontSize:31,margin:'8px 0'}}>{m.brand}</h2><p className="bk-muted">{m.tagline}</p><span className="bk-textlink">Explore the story <ArrowRight size={15}/></span></div></Link></article>)}</div></section></main>;
}
function ProductPage({ catalog, product, makers, saved, toggle, add }: { catalog: Catalog; product?: Product; makers: Maker[]; saved: string[]; toggle:(id:string)=>void; add:(id:string,n:number)=>void }) {
  const [quantity, setQuantity] = useState(1);
  const labels=useContext(SiteDocumentContext)?.labels||{};
  if (!product) return <main className="bk-formpage"><Seo title="Piece not found" description="This piece is not available in the current catalogue."/><span className="bk-eyebrow">Not in this edit</span><h1>We couldn’t find that piece.</h1><Link className="bk-btn" href="/shop">Return to the edit</Link></main>;
  const maker = makers.find(m => m.id === product.makerId);
  const related = catalog.products.filter(p => p.makerId === product.makerId && p.id !== product.id).slice(0,4);
  return <main><Seo title={product.name} description={`${product.name} from ${maker?.brand || 'an independent maker'} — explore its story in the Baksa Tales catalogue.`}/><section className="bk-product-main"><p className="bk-muted"><Link href="/">Home</Link> / <Link href="/shop">The edit</Link> / {product.name}</p><div className="bk-product-layout"><img className="bk-product-mainimg" src={imageUrl(product.image)} alt={product.name}/><div className="bk-product-info"><span className="bk-eyebrow">{product.category}</span><h1>{product.name}</h1>{maker && <p className="bk-product-maker">By <Link href={`/makers/${maker.slug}`}>{maker.brand}</Link> · {maker.craft}</p>}<p className="bk-product-price">{money(product.pricePaise)}</p>{product.sample && <p className="bk-product-sample">Sample catalogue · indicative price</p>}<p className="bk-product-desc">{product.description}</p><div className="bk-product-detailrow"><Package size={18}/><span>{product.material}</span></div><div className="bk-product-detailrow"><BookOpen size={18}/><span>Dispatch estimate: usually {product.dispatchDays} days before dispatch. Delivery timing depends on destination and carrier.</span></div><div className="bk-product-detailrow"><Check size={18}/><span>{product.stock > 0 ? 'Availability shown in sample catalogue' : 'Currently shown as unavailable'}</span></div><div className="bk-product-buyrow"><div className="bk-quantity"><button aria-label="Decrease quantity" onClick={()=>setQuantity(q=>Math.max(1,q-1))}><Minus size={16}/></button><span>{quantity}</span><button aria-label="Increase quantity" onClick={()=>setQuantity(q=>Math.min(Math.max(1,product.stock),q+1))} disabled={quantity>=product.stock}><Plus size={16}/></button></div><button className="bk-btn" disabled={product.stock<=0} onClick={()=>add(product.id,quantity)}>{labels['product.add']||'Add to bag'} <ShoppingBag size={16}/></button><button className={`bk-iconbtn ${saved.includes(product.id)?'active':''}`} style={{border:'1px solid var(--bk-line)',borderRadius:2,minWidth:48}} onClick={()=>toggle(product.id)} aria-label={saved.includes(product.id)?'Remove from wishlist':labels['product.save']||'Save to wishlist'}><Heart fill={saved.includes(product.id)?'currentColor':'none'}/></button></div><div className="bk-preview-note">Please note: delivery estimates are not guaranteed dates. Checkout is unavailable while payment setup is being connected.</div><details className="bk-panel"><summary>About this listing</summary><p>Product information is drawn from the catalogue. No maker biography or additional product claims have been added.</p></details></div></div></section>{related.length>0&&<section className="bk-section"><div className="bk-sectionhead"><div><span className="bk-eyebrow">From this maker</span><h2>More from {maker?.brand}</h2></div></div><ProductGrid products={related} makers={makers} saved={saved} toggle={toggle}/></section>}</main>;
}
function MakerPage({ maker, catalog, saved, toggle }: { maker?: Maker; catalog: Catalog; saved:string[]; toggle:(id:string)=>void }) {
  if (!maker) return <main className="bk-formpage"><Seo title="Maker not found" description="This maker is not in the current catalogue."/><h1>Maker not found.</h1><Link className="bk-btn" href="/makers">Meet the makers</Link></main>;
  const items = catalog.products.filter(p => p.makerId === maker.id);
  return <main><Seo title={maker.brand} description={`${maker.brand}, ${maker.craft}. Maker story and work from the current catalogue.`}/><section className="bk-section bk-split"><img className="bk-storyimg" src={imageUrl(maker.image)} alt={`${maker.brand} catalogue image`}/><div className="bk-storycopy"><span className="bk-eyebrow">{maker.craft}{catalog.sample?' · sample catalogue':''}</span><h1 style={{fontSize:'clamp(44px,6vw,72px)',margin:'10px 0'}}>{maker.brand}</h1><h2 style={{fontSize:33}}>{maker.tagline}</h2><p>{maker.story}</p><p className="bk-muted">This page shares the maker description provided in the catalogue. No additional biography has been invented.</p>{catalog.sample&&<span className="bk-status">Maker profile · sample catalogue</span>}</div></section><section className="bk-section" style={{paddingTop:0}}><div className="bk-sectionhead"><div><span className="bk-eyebrow">The work</span><h2>Pieces by {maker.brand}</h2></div></div><ProductGrid products={items} makers={catalog.makers} saved={saved} toggle={toggle}/></section></main>;
}
function FinderPage() {
  const page=useSitePage('gift-finder');
  const labels=useContext(SiteDocumentContext)?.labels||{};
  const mutation = useFindGifts({mutation:{onSuccess:result=>{
    trackEvent('gift_finder_completed',{recommendation_count:result.matches.length,sample:result.sample});
  }}});
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(['','','','']);
  const [budgetPaise,setBudget] = useState(300000);
  const steps = [
    {key:'recipient', title:labels['quiz.recipient.title']||labels['quiz.recipient']||'Who is this for?', prompt:'A little context can make a gift feel more personal.', options:['parent|A parent','partner|A partner','friend|A friend','colleague|A colleague','self|Myself']},
    {key:'occasion', title:labels['quiz.occasion.title']||labels['quiz.occasion']||'What brings you here?', prompt:'Or choose “just because”.', options:['diwali|Diwali','wedding|A wedding','birthday|A birthday','thanks|A thank you','housewarming|A new home','justbecause|Just because']},
    {key:'feeling', title:labels['quiz.feeling.title']||labels['quiz.feeling']||'What should it feel like?', prompt:'Choose the feeling you hope the gift carries.', options:['heart|From the heart','showstopper|A little showstopper','soother|Calm and comforting','thoughtful|Quietly thoughtful','explorer|For the curious']},
    {key:'budget', title:labels['quiz.budget.title']||labels['quiz.budget']||'What feels comfortable?', prompt:'Choose a range. You can change this later.', options:['150000|Under ₹1,500','300000|₹1,500–₹3,000','500000|₹3,000–₹5,000','10000000|Any budget']},
  ];
  const choose=(option:string) => { const value=option.split('|')[0];setAnswers(a=>a.map((v,i)=>i===step?value:v)); if(step===3)setBudget(Number(value)); };
  const next=() => { if(step<3){setStep(s=>s+1);return;} mutation.mutate({data:{recipient:answers[0],occasion:answers[1],feeling:answers[2],budgetPaise}}); };
   return <main className="bk-finder-wrap" onClickCapture={e=>{
     if(e.defaultPrevented||!(e.target instanceof Element)||!mutation.data)return;
     const card=e.target.closest('.bk-resultcard');
     if(!card)return;
     const position=Array.from(card.parentElement?.children||[]).indexOf(card);
     trackEvent('gift_recommendation_opened',{recommendation_position:position+1,sample:mutation.data.sample});
   }}><Seo title={page?.title||'Gift finder'} description={page?.description||'A guided gift finder with recommendations from the current catalogue.'}/><div className="bk-finder-intro"><span className="bk-eyebrow">{page?.eyebrow||'A thoughtful place to begin'}</span><h1>{page?.heading||'Find a gift with feeling.'}</h1><p>{page?.intro||'Four small questions help us look through the catalogue. Recommendations come from the current catalogue service, not live AI.'}</p><PageArtwork page={page}/></div><div className="bk-finder-card"><aside className="bk-finder-side"><div><span className="bk-eyebrow" style={{color:'#e5c37e'}}>A little guidance</span><h2>Start with what matters.</h2><p>Skip anything you are not sure about. You can go back and change an answer.</p></div><div><strong>Question {Math.min(step+1,4)} of 4</strong><div className="bk-finder-progress">{steps.map((_,i)=><i key={i} className={i<=step?'on':''}/>)}</div></div></aside><section className="bk-finder-content">{mutation.data ? <><span className="bk-eyebrow">Your gift edit</span><h2>A few pieces to consider.</h2><p>{mutation.data.message}</p>{mutation.data.sample&&<p className="bk-status">Recommendations from sample catalogue</p>}{mutation.data.matches.length ? <div className="bk-results">{mutation.data.matches.map(({product,reason}:GiftMatch)=><Link className="bk-resultcard" key={product.id} href={`/products/${product.slug}`}><img src={imageUrl(product.image)} alt=""/><div><strong>{product.name}</strong><small>{reason}</small><b>{money(product.pricePaise)}</b></div></Link>)}</div>:<p className="bk-empty">No matches for this combination. Try a broader budget or another feeling.</p>}<button className="bk-btn secondary" onClick={()=>{mutation.reset();setStep(0)}}>Start again</button></> : <>
    <span className="bk-eyebrow">{steps[step].key}</span><h2>{steps[step].title}</h2><p>{steps[step].prompt}</p><div className="bk-options">{steps[step].options.map(o=>{const [id,label]=o.split('|');return <button className={`bk-option ${answers[step]===id?'chosen':''}`} onClick={()=>choose(o)} key={o}>{labels[`quiz.${steps[step].key}.${id}`]||label}{answers[step]===id&&<Check size={16}/>}</button>})}</div>{mutation.isError&&<p className="bk-errorbox" role="alert">{errText(mutation.error)}</p>}<div className="bk-finder-controls"><button className="bk-skip" onClick={()=>{if(step>0)setStep(s=>s-1)}} disabled={step===0}>Back</button><div><button className="bk-skip" onClick={()=>{setAnswers(a=>a.map((v,i)=>i===step?'':v));if(step===3)setBudget(10000000);if(step<3)setStep(s=>s+1);else next()}}>Skip</button><button className="bk-btn" disabled={mutation.isPending} onClick={next}>{mutation.isPending?'Finding…':step===3?labels['quiz.results']||'Show my ideas':labels['quiz.next']||'Continue'} <ArrowRight size={15}/></button></div></div></>}</section></div></main>;
}

function CorporatePage() {
  const page=useSitePage('corporate');
  const create = useCreateBrief();
  const [done,setDone]=useState<{id:string;message:string}|null>(null);
  const [values,setValues]=useState({purpose:'',quantity:'',budget:'',neededBy:'',contactName:'',company:'',email:'',message:''});
  const update=(key:keyof typeof values,value:string)=>setValues(v=>({...v,[key]:value}));
  const submit=(e:FormEvent)=>{e.preventDefault();create.mutate({data:{purpose:values.purpose,quantity:Number(values.quantity),budgetPaise:Math.round(Number(values.budget)*100),neededBy:values.neededBy,contactName:values.contactName,company:values.company,email:values.email,message:values.message}},{onSuccess:r=>setDone(r)});};
  return <main className="bk-formpage"><Seo title={page?.title||'Corporate gifting'} description={page?.description||'Share a brief for thoughtful corporate gifting from independent makers.'}/><span className="bk-eyebrow">{page?.eyebrow||'For teams and gatherings'}</span><h1>{page?.heading||'Gifts that say something.'}</h1><p>{page?.intro||'Tell us what you are planning. A brief is only considered received when the service confirms it below; this form does not guarantee availability or delivery timing.'}</p><PageArtwork page={page}/>{done ? <div className="bk-success" role="status"><h2>Brief received</h2><p>{done.message}</p><small>Reference {done.id}</small></div> : <form className="bk-form" onSubmit={submit}>
    <label>Purpose<input required value={values.purpose} onChange={e=>update('purpose',e.target.value)} maxLength={200} placeholder="A gathering, welcome, thank you…"/></label><label>Quantity<input type="number" min="1" max="100000" required value={values.quantity} onChange={e=>update('quantity',e.target.value)}/></label><label>Approximate total budget (₹)<input type="number" min="1" step="1" required value={values.budget} onChange={e=>update('budget',e.target.value)}/></label><label>Needed by<input type="date" required value={values.neededBy} onChange={e=>update('neededBy',e.target.value)}/></label><label>Your name<input required value={values.contactName} onChange={e=>update('contactName',e.target.value)}/></label><label>Company or organisation<input required value={values.company} onChange={e=>update('company',e.target.value)}/></label><label>Email<input type="email" required value={values.email} onChange={e=>update('email',e.target.value)}/></label><label className="wide">Notes<textarea value={values.message} onChange={e=>update('message',e.target.value)} maxLength={4000} placeholder="Tell us about the occasion, preferences or questions."/></label>{create.isError&&<p className="bk-error" role="alert">{errText(create.error)}</p>}<button className="bk-btn" disabled={create.isPending}>{create.isPending?'Sending brief…':'Send a brief'} <ArrowRight size={16}/></button></form>}</main>;
}
function SellPage({user,v,setV,onSignIn}:{user:User|null;v:SellValues;setV:Dispatch<SetStateAction<SellValues>>;onSignIn:()=>void}) {
  const page=useSitePage('sell');
  const apply=useApplyToSell();const [done,setDone]=useState<{id:string;message:string}|null>(null);
  const [authError,setAuthError]=useState('');
  const up=(key:keyof typeof v,value:string|boolean)=>setV(x=>({...x,[key]:value}));
  const submit=(e:FormEvent)=>{e.preventDefault();setAuthError('');if(!user?.email_confirmed_at){setAuthError('A verified sign-in is required before submitting a maker application. Your entries are still here.');return;}apply.mutate({data:{brand:v.brand,contactName:v.contactName,phone:v.phone,craft:v.craft,city:v.city,state:v.state,gstRegistered:v.gstRegistered,gstin:v.gstin||undefined,link:v.link||undefined}},{onSuccess:r=>setDone(r)});};
  return <main className="bk-formpage"><Seo title={page?.title||'Sell with Baksa Tales'} description={page?.description||'Introduce your handmade work to Baksa Tales.'}/><span className="bk-eyebrow">{page?.eyebrow||'For independent makers'}</span><h1>{page?.heading||'Introduce your work.'}</h1><p>{page?.intro||'Tell us a little about your practice. This is an application for consideration, not a promise of acceptance or a live seller account.'}</p><PageArtwork page={page}/>{done?<div className="bk-success" role="status"><h2>Application received</h2><p>{done.message}</p><small>Reference {done.id}</small></div>:<form className="bk-form" onSubmit={submit}>
    <label>Brand or studio name<input required maxLength={150} value={v.brand} onChange={e=>up('brand',e.target.value)}/></label><label>Your name<input required maxLength={150} value={v.contactName} onChange={e=>up('contactName',e.target.value)}/></label><label>Phone number<input required pattern="[6-9][0-9]{9}" inputMode="numeric" value={v.phone} onChange={e=>up('phone',e.target.value)} placeholder="10 digit Indian mobile number"/></label><label>Craft or practice<input required maxLength={200} value={v.craft} onChange={e=>up('craft',e.target.value)}/></label><label>City<input required maxLength={100} value={v.city} onChange={e=>up('city',e.target.value)}/></label><label>State<input required maxLength={100} value={v.state} onChange={e=>up('state',e.target.value)}/></label><label className="bk-check wide"><input type="checkbox" checked={v.gstRegistered} onChange={e=>up('gstRegistered',e.target.checked)}/> GST registered</label>{v.gstRegistered&&<label>GSTIN<input maxLength={15} value={v.gstin} onChange={e=>up('gstin',e.target.value)}/></label>}<label className="wide">Website or portfolio link (optional)<input type="url" maxLength={400} value={v.link} onChange={e=>up('link',e.target.value)} placeholder="https://"/></label>{(!user?.email_confirmed_at)&&<p className="bk-panel wide">Maker applications require a verified account. <Link href="/sign-in" onClick={onSignIn}>Sign in or create an account</Link>, then return to send this form.</p>}{authError&&<p className="bk-error" role="alert">{authError}</p>}{apply.isError&&<p className="bk-error" role="alert">{errText(apply.error)}</p>}<button className="bk-btn" disabled={apply.isPending}>{apply.isPending?'Sending application…':'Send application'} <ArrowRight size={16}/></button></form>}</main>;
}

function BagView({ catalog, cart, setCart, checkout = false, runtime }: { catalog: Catalog; cart: CartItem[]; setCart:(items:CartItem[])=>void; checkout?:boolean; runtime?:Runtime }) {
  const page=useSitePage(checkout?'checkout':'bag');
  const entries = cart.map(item=>({item,product:catalog.products.find(p=>p.id===item.productId)})).filter(x=>x.product) as {item:CartItem;product:Product}[];
  const total=entries.reduce((sum,e)=>sum+e.product.pricePaise*e.item.quantity,0);
  const groups = catalog.makers.map(m=>({maker:m,items:entries.filter(e=>e.product.makerId===m.id)})).filter(g=>g.items.length);
  return <main className="bk-formpage"><Seo title={page?.title||(checkout?'Checkout':'Your bag')} description={page?.description||(checkout?'Checkout setup information for your Baksa Tales bag.':'Review the pieces in your Baksa Tales bag.')}/><span className="bk-eyebrow">{page?.eyebrow||(checkout?'A note before checkout':'Your considered selection')}</span><h1>{page?.heading||(checkout?'Checkout':'Your bag')}</h1>{page?.intro&&<p>{page.intro}</p>}<PageArtwork page={page}/>
    {checkout ? <div className="bk-errorbox"><h2 style={{fontSize:30}}>Payment setup is not connected yet.</h2><p>Your bag is still here. No order has been created and no payment has been taken. {runtime?.payments ? 'Payment service is available, but checkout is not yet enabled on this storefront.' : 'The marketplace is not ready to accept payments.'}</p><Link className="bk-btn secondary" href="/bag">Return to your bag</Link></div> : <>
      {!entries.length?<div className="bk-empty"><strong style={{font:'30px var(--bk-display)',color:'var(--bk-ink)'}}>Your bag is waiting for a story.</strong><p>When something feels right, it will be kept here.</p><Link className="bk-btn" href="/shop">Explore the edit</Link></div>:<><div>{groups.map(group=><section className="bk-panel" key={group.maker.id}><h2>From {group.maker.brand}</h2>{group.items.map(({item,product})=><div className="bk-draweritem" key={item.productId}><Link href={`/products/${product.slug}`}><img src={imageUrl(product.image)} alt={product.name}/></Link><div><Link href={`/products/${product.slug}`} style={{font:'20px var(--bk-display)'}}>{product.name}</Link><p>{money(product.pricePaise)}</p><div className="bk-quantity"><button aria-label={`Decrease ${product.name}`} onClick={()=>setCart(cart.map(x=>x.productId===item.productId?{...x,quantity:Math.max(1,x.quantity-1)}:x))}><Minus size={14}/></button><span>{item.quantity}</span><button aria-label={`Increase ${product.name}`} onClick={()=>setCart(cart.map(x=>x.productId===item.productId?{...x,quantity:x.quantity+1}:x))}><Plus size={14}/></button></div></div><button className="bk-iconbtn" aria-label={`Remove ${product.name}`} onClick={()=>setCart(cart.filter(x=>x.productId!==item.productId))}><X size={18}/></button></div>)}</section>)}</div><div className="bk-panel"><div style={{display:'flex',justifyContent:'space-between',fontSize:18}}><span>Subtotal</span><strong>{money(total)}</strong></div><p className="bk-muted">Shipping and final availability are confirmed only when checkout is available.</p><Link className="bk-btn" href="/checkout">Continue to checkout <ArrowRight size={16}/></Link></div></>}</>}
  </main>;
}
function BagDrawer({ open, close, catalog, cart, setCart }: { open:boolean;close:()=>void;catalog:Catalog;cart:CartItem[];setCart:(items:CartItem[])=>void }) {
  const closeRef=useRef(close);closeRef.current=close;
  const dialogRef=useRef<HTMLElement>(null);
  useEffect(()=>{if(!open)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';dialogRef.current?.querySelector<HTMLElement>('button')?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();closeRef.current()}if(e.key==='Tab'&&dialogRef.current){const a=Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input')).filter(x=>x.offsetParent!==null);const first=a[0],last=a.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};window.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;window.removeEventListener('keydown',key)}},[open]);
  if(!open)return null;
  const items=cart.map(i=>({i,p:catalog.products.find(p=>p.id===i.productId)})).filter(x=>x.p) as {i:CartItem;p:Product}[];
  return <div className="bk-drawerback" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><aside className="bk-drawer" role="dialog" aria-modal="true" aria-label="Shopping bag" ref={dialogRef}><header className="bk-drawerhead"><h2>Your bag</h2><button className="bk-iconbtn" aria-label="Close bag" onClick={close}><X/></button></header>{items.length? <>{items.map(({i,p})=><div className="bk-draweritem" key={p.id}><img src={imageUrl(p.image)} alt={p.name}/><div><strong>{p.name}</strong><p>{money(p.pricePaise)}</p><div className="bk-quantity"><button aria-label="Decrease quantity" onClick={()=>setCart(cart.map(x=>x.productId===p.id?{...x,quantity:Math.max(1,x.quantity-1)}:x))}><Minus size={14}/></button><span>{i.quantity}</span><button aria-label="Increase quantity" onClick={()=>setCart(cart.map(x=>x.productId===p.id?{...x,quantity:x.quantity+1}:x))}><Plus size={14}/></button></div></div><button className="bk-iconbtn" aria-label={`Remove ${p.name}`} onClick={()=>setCart(cart.filter(x=>x.productId!==p.id))}><X size={17}/></button></div>)}<div style={{marginTop:'auto',borderTop:'1px solid var(--bk-line)',paddingTop:18}}><p>Subtotal <strong style={{float:'right'}}>{money(items.reduce((s,x)=>s+x.p.pricePaise*x.i.quantity,0))}</strong></p><Link className="bk-btn" style={{width:'100%'}} href="/bag" onClick={close}>View bag</Link></div></>:<div className="bk-empty" style={{margin:'auto 0'}}><strong style={{font:'28px var(--bk-display)',color:'var(--bk-ink)'}}>A little room for something meaningful.</strong><p>Your bag is empty.</p><Link className="bk-btn" href="/shop" onClick={close}>Explore the edit</Link></div>}</aside></div>;
}
function SignInPage({ runtime, runtimeLoading, client, user, returnTo }: { runtime?:Runtime;runtimeLoading:boolean;client:SupabaseClient|null;user:User|null;returnTo:string }) {
  const page=useSitePage('sign-in');
  const [,navigate]=useLocation();const [signup,setSignup]=useState(false);const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  useEffect(()=>{if(user)navigate(returnTo)},[user,navigate,returnTo]);
  const submit=async(e:FormEvent)=>{e.preventDefault();setError('');setMessage('');if(!client)return;setBusy(true);try{const result=signup?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});if(result.error)throw result.error;if(signup&&!result.data.session)setMessage('Check your email for the confirmation link.');else if(result.data.user)setMessage('You are signed in.');}catch(e){setError((e as Error).message||'Authentication could not be completed.')}finally{setBusy(false)}};
  return <main className="bk-formpage" style={{maxWidth:690}}><Seo title={page?.title||'Sign in'} description={page?.description||'Sign in to your Baksa Tales account.'}/><span className="bk-eyebrow">{page?.eyebrow||'A familiar place to return to'}</span><h1>{signup?'Create your account':page?.heading||'Welcome back.'}</h1><p>{page?.intro||'Sign in is securely handled by the connected Supabase authentication service.'}</p><PageArtwork page={page}/>{runtimeLoading?<div className="bk-skeleton"/>:!runtime?.auth||!client?<div className="bk-panel"><h2>Sign-in setup is not connected yet.</h2><p>{runtime?.message || 'The marketplace owner needs to connect Supabase authentication before accounts can be created.'}</p><span className="bk-status">No demo account or simulated login</span></div>:<form className="bk-form" onSubmit={submit}><label className="wide">Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="wide">Password<input required type="password" autoComplete={signup?'new-password':'current-password'} minLength={6} value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="bk-error" role="alert">{error}</p>}{message&&<p className="bk-success" role="status">{message}</p>}<button className="bk-btn" disabled={busy}>{busy?'Please wait…':signup?'Create account':'Sign in'}</button><button type="button" className="bk-btn secondary" onClick={()=>{setSignup(v=>!v);setError('');setMessage('')}}>{signup?'I already have an account':'Create an account'}</button></form>}</main>;
}
function AcademyPage(){const page=useSitePage('academy');return <main className="bk-formpage"><Seo title={page?.title||'Baksa Academy'} description={page?.description||'Information about upcoming Baksa Academy classes.'}/><span className="bk-eyebrow">{page?.eyebrow||'Learn, share, make'}</span><h1>{page?.heading||'Baksa Academy.'}</h1><p>{page?.intro||'A future home for practical learning around craft, small creative businesses and the thoughtful work of making.'}</p><PageArtwork page={page}/><div className="bk-panel"><h2>Classes are not open yet.</h2><p>We are shaping the programme. There are no enrolments or scheduled classes to book at this time.</p><Link className="bk-btn secondary" href="/sell">For maker enquiries <ArrowRight size={16}/></Link></div></main>}
function BuyerOrderList(){const q=useGetOperations({query:{queryKey:getGetOperationsQueryKey()}});return <div className="bk-panel"><h2>Your orders</h2>{q.isLoading?<div className="bk-skeleton"/>:q.isError?<><p className="bk-errorbox">{errText(q.error)}</p><button className="bk-btn secondary" onClick={()=>void q.refetch()}>Retry</button></>:q.data?.orders.length?<><p>Recent order records available to your account; the feed returns up to 100 recent records per category.</p>{q.data.orders.map(o=><article className="bk-account-order" key={o.id}><div><strong>{o.ref}</strong><small>{new Date(o.createdAt).toLocaleDateString()}</small></div><div><span>{o.status}</span><small>Payment: {o.paymentStatus}</small></div><b>{money(o.totalPaise)}</b>{o.trackingNumber&&<small className="tracking">Tracking · {o.carrier} · {o.trackingNumber}</small>}</article>)}</>:<div className="bk-empty"><strong>No order records yet.</strong><p>Orders appear here when the service returns them. A checkout attempt is not treated as a paid order.</p></div>}</div>}


function SecureGate({runtime,runtimeLoading,ready,user,workspace,workspaceLoading,workspaceError,retryWorkspace,roles,children}:{runtime?:Runtime;runtimeLoading:boolean;ready:boolean;user:User|null;workspace:Workspace|undefined;workspaceLoading:boolean;workspaceError:unknown;retryWorkspace:()=>void;roles:string[];children:ReactNode}){
  if(runtimeLoading)return <main className="bk-formpage"><div className="bk-skeleton"/></main>;
  if(!runtime?.auth)return <main className="bk-formpage"><Seo title="Workspace setup" description="Secure workspace access setup information."/><span className="bk-eyebrow">Private workspace</span><h1>Access is not connected.</h1><p>{runtime?.message||'Supabase authentication is not configured for this marketplace.'}</p><div className="bk-panel"><p>Workspace pages remain protected until the owner connects Supabase and assigns real roles. No demo login or role switch is available.</p><Link className="bk-btn secondary" href="/">Return to the shop</Link></div></main>;
  if(!ready)return <main className="bk-formpage"><Seo title="Checking access" description="Checking secure workspace access."/><div className="bk-skeleton"/></main>;
  if(!user)return <main className="bk-formpage"><Seo title="Sign in required" description="Sign in to continue to your workspace."/><span className="bk-eyebrow">Private workspace</span><h1>Please sign in first.</h1><p>Your private pages use your real verified account and workspace role.</p><Link className="bk-btn" href="/sign-in">Continue to sign in <ArrowRight size={16}/></Link></main>;
  if(workspaceLoading)return <main className="bk-formpage"><div className="bk-skeleton"/></main>;
  if(workspaceError)return <main className="bk-formpage"><Seo title="Workspace unavailable" description="Workspace access could not be confirmed."/><h1>We could not confirm this workspace.</h1><p className="bk-errorbox">{errText(workspaceError)}</p><p>No role or account access is assumed when the service cannot confirm it.</p><button className="bk-btn secondary" onClick={retryWorkspace}>Try again</button></main>;
  if(!roles.some(r=>workspace?.roles.includes(r)))return <main className="bk-formpage"><Seo title="Access unavailable" description="This account does not have the required workspace role."/><h1>This workspace is not available to this account.</h1><p>Access is determined by roles returned from the API workspace, not a public role switch.</p><Link className="bk-btn secondary" href="/">Return to the shop</Link></main>;
  return <>{children}</>;
}
function LoadingError({retry}:{retry:()=>void}){return <div className="bk-formpage"><Seo title="Catalogue unavailable" description="Catalogue data could not be loaded."/><div className="bk-errorbox"><h2>The catalogue is taking a moment.</h2><p>We could not load the current marketplace catalogue. No substitute products have been added.</p><button className="bk-btn secondary" onClick={retry}>Try again</button></div></div>}

export default function BaksaApp(){
  const [path,setLocation]=useLocation();const queryClient=useQueryClient();
  const runtimeQuery=useGetRuntime();const runtime=runtimeQuery.data;
  const catalogQuery=useGetCatalog();const catalog=catalogQuery.data;
  const siteQuery=useGetSite();
  const siteDocument=useMemo(()=>siteQuery.data?.document||starterDocument(),[siteQuery.data?.document]);
  const [cart,setCart]=useState<CartItem[]>(()=>readList('baksa-cart',validCart,[]));
  const [sellDraft,setSellDraft]=useState<SellValues>({brand:'',contactName:'',phone:'',craft:'',city:'',state:'',gstRegistered:false,gstin:'',link:''});
  const [saved,setSaved]=useState<string[]>(()=>readList('baksa-wishlist',validString,[]));
  const [bagOpen,setBagOpen]=useState(false);
  const [toast,setToast]=useState('');
  const [user,setUser]=useState<User|null>(null);const [authReady,setAuthReady]=useState(false);
  const [authReturn,setAuthReturn]=useState('/account');
  const previousId=useRef<string|null|undefined>(undefined);
  const supabase=useMemo(()=>runtime?.auth&&runtime.supabaseUrl&&runtime.supabaseAnonKey?createClient(runtime.supabaseUrl,runtime.supabaseAnonKey):null,[runtime?.auth,runtime?.supabaseUrl,runtime?.supabaseAnonKey]);
  useEffect(()=>{localStorage.setItem('baksa-cart',JSON.stringify(cart))},[cart]);
  useEffect(()=>{localStorage.setItem('baksa-wishlist',JSON.stringify(saved))},[saved]);
  useEffect(()=>{
    if(!supabase){setAuthReady(true);setUser(null);setAuthTokenGetter(null);return;}
    setAuthReady(false);
    setAuthTokenGetter(async()=> (await supabase.auth.getSession()).data.session?.access_token ?? null);
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{const next=session?.user||null;setUser(next);setAuthReady(true);});
    supabase.auth.getSession().then(({data,error})=>{setUser(error?null:data.session?.user||null);setAuthReady(true);});
    return ()=>{subscription.unsubscribe();setAuthTokenGetter(null)};
  },[supabase]);
  useEffect(()=>{const id=user?.id||null;if(previousId.current!==undefined&&id!==previousId.current)queryClient.clear();previousId.current=id},[user?.id,queryClient]);
  const workspaceQuery=useGetWorkspace({query:{queryKey:getGetWorkspaceQueryKey(),enabled:!!user}});
  const workspace=workspaceQuery.data;
  const totalItems=cart.reduce((sum,x)=>sum+x.quantity,0);
  const toggleSave=(id:string)=>setSaved(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const addToBag=(id:string,quantity:number)=>{setCart(old=>old.some(x=>x.productId===id)?old.map(x=>x.productId===id?{...x,quantity:x.quantity+quantity}:x):[...old,{productId:id,quantity}]);setToast('Added to your bag');window.setTimeout(()=>setToast(''),2200)};
  const route=path.replace(/\/+$/,'')||'/';
  let content:ReactNode;
  const catContent=()=>catalogQuery.isError?<LoadingError retry={()=>catalogQuery.refetch()}/>:<main className="bk-formpage"><div className="bk-skeleton"/></main>;
  if(siteQuery.isError&&!route.startsWith('/admin')&&route!=='/studio-preview') content=<main className="bk-formpage"><h1>The stories are taking a moment.</h1><p className="bk-errorbox">We could not load the published site content. Your stored content has not been changed or replaced.</p><button className="bk-btn" onClick={()=>void siteQuery.refetch()}>Try again</button></main>;
  else if((route==='/'||route.startsWith('/stories/'))&&!siteQuery.data) content=<main className="bk-formpage" aria-busy="true"><div className="bk-skeleton"/><p>Loading the published stories…</p></main>;
  else if(route==='/') content=<HomePage catalog={catalog} saved={saved} toggle={toggleSave} document={siteDocument} catalogError={catalogQuery.isError?errText(catalogQuery.error):undefined} retryCatalog={()=>void catalogQuery.refetch()}/>;
  else if(route==='/studio-preview') content=<SiteStudio localOnly preview={(doc,storyId)=><StorefrontPreview document={doc} storyId={storyId} catalog={catalog} catalogError={catalogQuery.isError?errText(catalogQuery.error):undefined} retryCatalog={()=>void catalogQuery.refetch()}/>}/>;
  else if(route.startsWith('/stories/')) content=<StoryPage id={decodeURIComponent(route.slice('/stories/'.length))} document={siteDocument}/>;
  else if(route==='/shop'||route==='/edit') content=catalog? <ShopPage catalog={catalog} saved={saved} toggle={toggleSave}/>:catContent();
  else if(route==='/makers') content=catalog?<MakersPage catalog={catalog}/>:catContent();
  else if(route.startsWith('/makers/')) content=catalog?<MakerPage maker={catalog.makers.find(m=>m.slug===decodeURIComponent(route.slice('/makers/'.length)))} catalog={catalog} saved={saved} toggle={toggleSave}/>:catContent();
  else if(route.startsWith('/products/')) content=catalog?<ProductPage catalog={catalog} product={catalog.products.find(p=>p.slug===decodeURIComponent(route.slice('/products/'.length)))} makers={catalog.makers} saved={saved} toggle={toggleSave} add={addToBag}/>:catContent();
  else if(route==='/gift-finder') content=catalog?<FinderPage/>:catContent();
  else if(route==='/wishlist') content=<main className="bk-formpage"><PageHeading id="wishlist" eyebrow="Saved for another day" title="Your wishlist." intro="The pieces you have kept in mind." description="Your saved pieces in this browser."/>{catalog ? <ProductGrid products={catalog.products.filter(p=>saved.includes(p.id))} makers={catalog.makers} saved={saved} toggle={toggleSave}/>:catContent()}</main>;
  else if(route==='/bag') content=catalog?<BagView catalog={catalog} cart={cart} setCart={setCart}/>:catContent();
  else if(route==='/checkout') content=<BagView catalog={catalog||{sample:true,products:[],makers:[]}} cart={cart} setCart={setCart} checkout runtime={runtime}/>;
  else if(route==='/corporate') content=<CorporatePage/>;
  else if(route==='/sell') content=<SellPage user={user} v={sellDraft} setV={setSellDraft} onSignIn={()=>setAuthReturn('/sell')}/>;
  else if(route==='/academy') content=<AcademyPage/>;
  else if(route==='/sign-in') content=<SignInPage runtime={runtime} runtimeLoading={runtimeQuery.isLoading} client={supabase} user={user} returnTo={authReturn}/>;
  else if(route==='/account') content=<SecureGate runtime={runtime} runtimeLoading={runtimeQuery.isLoading} ready={authReady} user={user} workspace={workspace} workspaceLoading={workspaceQuery.isLoading} workspaceError={workspaceQuery.error} retryWorkspace={()=>void workspaceQuery.refetch()} roles={['buyer','maker','admin']}><main className="bk-formpage"><PageHeading id="account" eyebrow="Your place at Baksa Tales" title="Your account." intro="Your account, orders, and your favourite pieces." description="Your Baksa Tales account and order summary."/><div className="bk-panel"><h2>{user?.email}</h2><p>Signed in with your secure Supabase account.</p><span className="bk-status">{user?.email_confirmed_at?'Email verified':'Email verification pending'}</span></div><BuyerOrderList/><button className="bk-btn secondary" onClick={async()=>{await supabase?.auth.signOut();setLocation('/')}}>Sign out</button></main></SecureGate>;
  else if(route==='/maker'||route.startsWith('/maker/')) content=<SecureGate runtime={runtime} runtimeLoading={runtimeQuery.isLoading} ready={authReady} user={user} workspace={workspace} workspaceLoading={workspaceQuery.isLoading} workspaceError={workspaceQuery.error} retryWorkspace={()=>void workspaceQuery.refetch()} roles={['maker']}><MakerArea path={route} workspace={workspace} verifiedUser={!!user?.email_confirmed_at} aiAvailable={!!runtime?.ai}/></SecureGate>;
  else if(route==='/admin'||route.startsWith('/admin/')) content=<SecureGate runtime={runtime} runtimeLoading={runtimeQuery.isLoading} ready={authReady} user={user} workspace={workspace} workspaceLoading={workspaceQuery.isLoading} workspaceError={workspaceQuery.error} retryWorkspace={()=>void workspaceQuery.refetch()} roles={['admin']}>{route==='/admin/site'?<SiteStudio verifiedUser={!!user?.email_confirmed_at} aiAvailable={!!runtime?.ai} preview={(doc,storyId)=><StorefrontPreview document={doc} storyId={storyId} catalog={catalog} catalogError={catalogQuery.isError?errText(catalogQuery.error):undefined} retryCatalog={()=>void catalogQuery.refetch()}/>} />:<AdminArea path={route} workspace={workspace} catalog={catalog||{sample:true,products:[],makers:[]}}/>}</SecureGate>;
  else content=<main className="bk-formpage"><Seo title="Page not found" description="This Baksa Tales page does not exist."/><span className="bk-eyebrow">A wrong turn</span><h1>This page is not in the baksa.</h1><p>The address may have changed, or the page has not been made available.</p><Link className="bk-btn" href="/">Back to the beginning</Link></main>;
  return <Frame bagCount={totalItems} savedCount={saved.length} onBag={()=>setBagOpen(true)} document={siteDocument}><RouteContent>{content}</RouteContent>{catalog&&<BagDrawer open={bagOpen} close={()=>setBagOpen(false)} catalog={catalog} cart={cart} setCart={setCart} />}{toast&&<div className="bk-toast" role="status">{toast}</div>}</Frame>;
}
