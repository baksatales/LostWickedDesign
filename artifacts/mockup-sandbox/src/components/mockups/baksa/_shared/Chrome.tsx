import { useState } from "react";
import { Menu, Search, ShoppingBag, Heart, X, ArrowRight } from "lucide-react";
import { Link } from "./Link";

type ChromeProps = { bagCount?: number; onBag?: () => void; onSaved?: () => void; savedCount?: number };
export function Notice() {
  return <div className="bk-notice">Design preview · sample catalogue</div>;
}
export function Header({ bagCount = 0, onBag, onSaved, savedCount = 0 }: ChromeProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <>
    <div className="bk-topline">Dil Se Duniya Tak <span aria-hidden="true">·</span> दिल से दुनिया तक</div>
    <header className="bk-header">
      <div className="bk-header-main">
        <button className="bk-iconbtn bk-mobile-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21}/> : <Menu size={21}/>}</button>
        <Link href="/__mockup/preview/baksa/Home" className="bk-logo" aria-label="Baksa Tales home"><img src="/__mockup/images/baksa/baksatales-trunk-mark.png" alt=""/><span className="bk-wordmark">Baksa Tales<small>Dil Se Duniya Tak</small></span></Link>
        <nav className="bk-nav" aria-label="Main navigation">
          <Link href="/__mockup/preview/baksa/Home#shop">Shop gifts</Link>
          <Link href="/__mockup/preview/baksa/Home#makers">Meet the makers</Link>
          <Link href="/__mockup/preview/baksa/GiftFinder">Gift finder</Link>
        </nav>
        <div className="bk-actions">
          <button className="bk-iconbtn" aria-label={`Saved items${savedCount ? `, ${savedCount}` : ""}`} title="Saved items" onClick={onSaved}><Heart size={20}/>{savedCount > 0 && <span className="bk-count">{savedCount}</span>}</button>
          <button className="bk-iconbtn" aria-label={`Open sample bag${bagCount ? `, ${bagCount} items` : ""}`} onClick={onBag}><ShoppingBag size={21}/>{bagCount > 0 && <span className="bk-count">{bagCount}</span>}</button>
        </div>
      </div>
      {menuOpen && <nav className="bk-mobile-nav" aria-label="Mobile navigation" style={{display:"grid",padding:"5px 20px 14px",background:"var(--bk-paper)"}}>
        <Link onClick={() => setMenuOpen(false)} href="/__mockup/preview/baksa/Home#shop">Shop gifts</Link>
        <Link onClick={() => setMenuOpen(false)} href="/__mockup/preview/baksa/Home#makers">Meet the makers</Link>
        <Link onClick={() => setMenuOpen(false)} href="/__mockup/preview/baksa/GiftFinder">Gift finder</Link>
      </nav>}
      <div className="bk-searchbar">
        <label className="bk-search"><Search size={17}/><input aria-label="Search sample catalogue" placeholder="Search objects, makers, occasions"/></label>
        <div className="bk-previewlinks">Preview: <Link href="/__mockup/preview/baksa/Product">Product</Link> · <Link href="/__mockup/preview/baksa/GiftFinder">Gift finder</Link></div>
      </div>
    </header>
  </>;
}
export function Footer() {
  return <footer className="bk-footer">
    <div className="bk-footgrid">
      <div><img className="bk-footmark" src="/__mockup/images/baksa/baksatales-trunk-mark.png" alt="Baksa Tales trunk mark"/><h3>Meaning travels well.</h3><p>Objects made with care, chosen to be remembered.</p><span className="bk-hindi">दिल से दुनिया तक</span></div>
      <div><h3>Explore</h3><Link href="/__mockup/preview/baksa/Home#shop">Shop the edit</Link><Link href="/__mockup/preview/baksa/GiftFinder">Find a thoughtful gift</Link><Link href="/__mockup/preview/baksa/Product">Blue Lotus Pond</Link></div>
      <div><h3>A note on this preview</h3><p>This is a design review with sample catalogue details. No live orders or payments.</p></div>
    </div>
  </footer>;
}
export function BagDrawer({ open, onClose, count, onQuantity, item = "Blue Lotus Pond", image = "t-bluelotus.webp" }: {open:boolean;onClose:()=>void;count:number;onQuantity:(n:number)=>void;item?:string;image?:string}) {
  if (!open) return null;
  return <div className="bk-drawerback" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <aside className="bk-drawer" role="dialog" aria-modal="true" aria-label="Sample bag">
      <div className="bk-drawerhead"><h2>Your sample bag</h2><button className="bk-iconbtn" onClick={onClose} aria-label="Close sample bag"><X/></button></div>
      {count < 1 ? <div className="bk-drawermsg"><strong>A little room for meaning.</strong>Your sample bag is empty.<p><Link className="bk-textlink" href="/__mockup/preview/baksa/Home#shop" onClick={onClose}>Explore the edit <ArrowRight size={15}/></Link></p></div> :
      <div className="bk-draweritem"><img src={`/__mockup/images/baksa/${image}`} alt=""/><div><strong>{item}</strong><p>Indicative sample · ₹2,400</p><div className="bk-quantity"><button aria-label="Remove one" onClick={() => onQuantity(count-1)}>−</button><span>{count}</span><button aria-label="Add one" onClick={() => onQuantity(count+1)}>+</button></div></div></div>}
      <div className="bk-drawerfoot"><p className="bk-preview-note">Preview only. This bag does not place an order or reserve an item.</p><button className="bk-btn secondary" style={{width:"100%"}} onClick={onClose}>Continue exploring</button></div>
    </aside>
  </div>;
}
