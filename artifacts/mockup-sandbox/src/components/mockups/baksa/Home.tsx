import { useState } from "react";
import { ArrowRight, Heart } from "lucide-react";
import "./_group.css";
import { BagDrawer, Footer, Header, Notice } from "./_shared/Chrome";
import { Link } from "./_shared/Link";

const pieces = [
  {name:"Lotus Pond Candle Set", maker:"Tathaastu", price:"₹2,400", image:"t-lotuspond.webp", tag:"A thoughtful favourite"},
  {name:"Crimson Lotus Urli", maker:"Tathaastu", price:"₹1,800", image:"t-crimson.webp"},
  {name:"Marigold Urli", maker:"Tathaastu", price:"₹1,200", image:"t-marigold.webp"},
  {name:"Large Teapot Bouquet", maker:"Sample catalogue", price:"₹3,200", image:"t-teapot.webp"},
];
export function Home() {
  const [bagOpen,setBagOpen]=useState(false);
  const [saved,setSaved]=useState<string[]>([]);
  const [bag,setBag]=useState(0);
  const [toast,setToast]=useState("");
  const announce=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),2400);};
  const toggleSave=(name:string)=>{setSaved(prev=>{const exists=prev.includes(name);announce(exists?"Removed from your saved preview":"Saved for this preview");return exists?prev.filter(x=>x!==name):[...prev,name];});};
  return <main className="baksa bk-home">
    <Notice/><Header bagCount={bag} savedCount={saved.length} onBag={()=>setBagOpen(true)} onSaved={()=>announce(saved.length?`${saved.length} item${saved.length===1?"":"s"} saved in this preview`:"Save an object with the heart to keep it here")}/>
    <section className="bk-homehero">
      <div className="bk-homehero-inner">
        <div className="bk-homehero-copy">
          <span className="bk-eyebrow">Objects with a story to tell</span>
          <h1>Give a little <em>more meaning.</em></h1>
          <p>Handmade finds from thoughtful makers, gathered for the people you hold close.</p>
          <Link href="/__mockup/preview/baksa/Home#shop" className="bk-btn">Explore the collection <ArrowRight size={16}/></Link>
          <Link href="/__mockup/preview/baksa/GiftFinder" className="bk-textlink" style={{marginTop:12}}>Not sure what to choose? Try the gift finder <ArrowRight size={14}/></Link>
        </div>
        <div className="bk-homehero-image"><img src="/__mockup/images/baksa/t-bluelotus.webp" alt="Blue Lotus Pond from Tathaastu"/><div className="bk-homehero-caption">Blue Lotus Pond · ₹2,400 · Tathaastu</div></div>
      </div>
    </section>
    <section className="bk-valueband" aria-label="Baksa Tales values">
      <div className="bk-values">
        <div className="bk-value"><b>Made by real hands</b><span>Discover independent Indian makers and their considered work.</span></div>
        <div className="bk-value"><b>Chosen with feeling</b><span>Objects for the moments that deserve more than a quick click.</span></div>
        <div className="bk-value"><b>Sent with a story</b><span>Thoughtful details bring the maker and the moment closer.</span></div>
      </div>
    </section>
    <section className="bk-section" id="shop">
      <div className="bk-sectionhead"><div><span className="bk-eyebrow">The considered edit</span><h2>Gifts to keep close.</h2></div><Link className="bk-textlink" href="/__mockup/preview/baksa/Product">Open a sample product <ArrowRight size={15}/></Link></div>
      <div className="bk-productgrid">{pieces.map((piece,i)=><article className="bk-card" key={piece.name}>
        <Link className="bk-cardmedia" href="/__mockup/preview/baksa/Product"><img src={`/__mockup/images/baksa/${piece.image}`} alt={piece.name}/>{piece.tag&&<span className="bk-cardtag">{piece.tag}</span>}</Link>
        <button className={`bk-heart ${saved.includes(piece.name)?"active":""}`} aria-label={`${saved.includes(piece.name)?"Unsave":"Save"} ${piece.name}`} aria-pressed={saved.includes(piece.name)} onClick={()=>toggleSave(piece.name)}><Heart size={18} fill={saved.includes(piece.name)?"currentColor":"none"}/></button>
        <div className="bk-cardcopy"><h3>{piece.name}</h3><p>{piece.maker}</p><div className="bk-cardprice">{piece.price}</div></div>
      </article>)}</div>
    </section>
    <section className="bk-section" style={{paddingTop:8}}>
      <div className="bk-sectionhead"><div><span className="bk-eyebrow">A gift for every kind of moment</span><h2>Start with the feeling.</h2></div></div>
      <div className="bk-categories">
        <Link className="bk-cat" href="/__mockup/preview/baksa/GiftFinder"><span>For a new beginning</span><small>Housewarmings, fresh starts</small></Link>
        <Link className="bk-cat" href="/__mockup/preview/baksa/GiftFinder"><span>For the everyday</span><small>Little reasons to say thanks</small></Link>
        <Link className="bk-cat" href="/__mockup/preview/baksa/GiftFinder"><span>For the host</span><small>Bring something thoughtful</small></Link>
        <Link className="bk-cat" href="/__mockup/preview/baksa/GiftFinder"><span>For no occasion</span><small>Just because you thought of them</small></Link>
      </div>
    </section>
    <section className="bk-section bk-split" id="makers">
      <img className="bk-storyimg" src="/__mockup/images/baksa/t-bluelotus.webp" alt="Blue Lotus Pond decorative piece from Tathaastu"/>
      <div className="bk-storycopy"><span className="bk-eyebrow">Made with care, found with care</span><h2>Every object begins somewhere.</h2><p>Baksa Tales brings you closer to the people behind the things you give. Begin with Tathaastu’s lotus-inspired pieces, made to bring a little beauty into a room.</p><p className="bk-quote">“Dil Se Duniya Tak”<br/><span className="bk-hindi">दिल से दुनिया तक</span></p><Link className="bk-btn secondary" href="/__mockup/preview/baksa/Product">Explore a maker’s piece <ArrowRight size={16}/></Link></div>
    </section>
    <section className="bk-section" style={{paddingTop:0}}>
      <div className="bk-banner"><div><span className="bk-eyebrow" style={{color:"#e7c47e"}}>A considered place to begin</span><h2>Let the gift finder help.</h2><p>Four small questions. A handful of sample ideas. No algorithmic magic.</p></div><Link className="bk-btn" href="/__mockup/preview/baksa/GiftFinder">Find a thoughtful gift <ArrowRight size={16}/></Link></div>
    </section>
    <Footer/><BagDrawer open={bagOpen} onClose={()=>setBagOpen(false)} count={bag} onQuantity={setBag}/>
    {toast&&<div role="status" className="bk-toast">{toast}</div>}
  </main>;
}
