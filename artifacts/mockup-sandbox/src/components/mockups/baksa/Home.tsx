import { useState } from "react";
import { ArrowRight, Heart, Plus, Minus } from "lucide-react";
import "./_group.css";
import { BagDrawer, Footer, Header, Notice } from "./_shared/Chrome";
import { Link } from "./_shared/Link";
import { StoryViewer, stories, type StoryId } from "./_shared/StoryViewer";

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
  const [trunkOpen,setTrunkOpen]=useState(false);
  const [storyId,setStoryId]=useState<StoryId|null>(null);
  const [placementInfo,setPlacementInfo]=useState(false);
  const announce=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),2400);};
  const toggleSave=(name:string)=>{setSaved(prev=>{const exists=prev.includes(name);announce(exists?"Removed from your saved preview":"Saved for this preview");return exists?prev.filter(x=>x!==name):[...prev,name];});};
  return <main className="baksa bk-home">
    <Notice/><Header bagCount={bag} savedCount={saved.length} onBag={()=>setBagOpen(true)} onSaved={()=>announce(saved.length?`${saved.length} item${saved.length===1?"":"s"} saved in this preview`:"Save an object with the heart to keep it here")}/>
    <section className="bk-homehero">
      <div className="bk-homehero-inner">
        <div className="bk-homehero-copy">
          <span className="bk-eyebrow">Objects with a story to tell</span>
          <h1>Every creation has a story. Find the one that speaks to yours.</h1>
          <p>Open the baksa for a small, considered introduction to the makers and objects in this sample catalogue.</p>
          <div className="bk-hero-actions">
            <Link href="/__mockup/preview/baksa/GiftFinder" className="bk-btn">Find a gift <ArrowRight size={16}/></Link>
            <Link href="/__mockup/preview/baksa/Home#shop" className="bk-btn secondary">Explore the Edit <ArrowRight size={16}/></Link>
          </div>
          <p className="bk-trunk-hint">Three ways in: one maker story, one object, one guided gift finder.</p>
        </div>
        <div className="bk-trunk-area">
          <div className={`stage ${trunkOpen?"open":""}`} id="bk-baksa-stage">
            <div className="trunk" id="bk-baksa-trunk">
              <div className="cards" aria-hidden={!trunkOpen}>
                <Link className="scard bk-trunk-card" href="/__mockup/preview/baksa/Product" tabIndex={trunkOpen?0:-1} aria-label="Explore Blue Lotus Pond by Tathaastu, sample price ₹2,400">
                  <img className="art" src="/__mockup/images/baksa/t-bluelotus.webp" alt=""/>
                  <span className="cap"><b>EDITORIAL · TATHAASTU</b><strong>Blue Lotus Pond</strong><small>₹2,400 · sample catalogue</small></span>
                </Link>
                <button className="scard bk-trunk-card bk-trunk-sponsored" type="button" tabIndex={trunkOpen?0:-1} onClick={()=>setStoryId("mushhk")} aria-label="Open Mushhk sponsored sample story">
                  <img className="art" src="/__mockup/images/baksa/mu-box.webp" alt=""/>
                  <span className="cap"><b>SPONSORED · SAMPLE</b><strong>Mushhk</strong><small>The Essential Box · ₹3,200</small></span>
                </button>
                <Link className="scard smood bk-trunk-card" href="/__mockup/preview/baksa/GiftFinder" tabIndex={trunkOpen?0:-1}>
                  <span className="bk-trunk-giftlabel">A guided place to begin</span><strong className="big">Not sure what to give?</strong><span className="ui bk-trunk-giftmeta">Four thoughtful questions</span>
                </Link>
              </div>
              <div className="inside" aria-hidden="true"/>
              <img className="body" src="/__mockup/images/baksa/baksatales-logo-transparent.png" alt="Baksa Tales — Dil Se Duniya Tak"/>
              <img className="lid" src="/__mockup/images/baksa/baksatales-logo-transparent.png" alt="" aria-hidden="true"/>
            </div>
          </div>
          <div className="stage-ctl"><button className="bk-btn secondary bk-trunk-toggle" type="button" aria-expanded={trunkOpen} aria-controls="bk-baksa-trunk" onClick={()=>setTrunkOpen((open)=>!open)}>{trunkOpen?<><Minus size={15}/> Close the baksa</>:<><Plus size={15}/> Open the baksa</>}</button></div>
        </div>
      </div>
    </section>
    <section className="bk-section bk-todays-stories" aria-labelledby="bk-todays-heading">
      <div className="bk-sectionhead"><div><span className="bk-eyebrow">Maker stories · today</span><h2 id="bk-todays-heading">Today’s stories</h2><p>Tap a maker to step into their sample catalogue.</p></div></div>
      <div className="bk-story-grid">
        {stories.map((story)=>(
          <button className="bk-story-tile" type="button" key={story.id} onClick={()=>setStoryId(story.id)} aria-label={`Open ${story.brand}${story.sponsored?", sponsored sample placement":", editorial maker story"}`}>
            <span className="bk-story-tile-image"><img src={`/__mockup/images/baksa/${story.slides[0].image}`} alt=""/>{story.sponsored&&<span className="bk-story-tile-sponsor">Sponsored · SAMPLE</span>}</span>
            <span className="bk-story-tile-copy"><strong>{story.brand}</strong><small>{story.sponsored?"Sponsored · sample placement":"Editorial · sample story"}</small></span>
          </button>
        ))}
      </div>
      <div className="bk-placement-note">
        <p>Editorial maker stories sit beside one clearly marked sample sponsored placement. No actual commercial relationship is represented.</p>
        <button className="bk-placement-toggle" type="button" aria-expanded={placementInfo} aria-controls="bk-placement-info" onClick={()=>setPlacementInfo((open)=>!open)}>{placementInfo?"Hide placement note":"About featured placements"} {placementInfo?<Minus size={14}/>:<Plus size={14}/>}</button>
        {placementInfo&&<p className="bk-placement-detail" id="bk-placement-info">Mushhk is labelled as sponsored only to preview how a paid placement could appear in a future marketplace. This screen has no booking, ranking, or advertising system.</p>}
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
      <div className="bk-sectionhead"><div><span className="bk-eyebrow">The considered edit</span><h2>Gifts to keep close.</h2></div><Link className="bk-textlink" href="/__mockup/preview/baksa/Product">View Blue Lotus Pond sample <ArrowRight size={15}/></Link></div>
      <div className="bk-productgrid">{pieces.map((piece)=><article className="bk-card" key={piece.name}>
        <button className="bk-cardmedia" type="button" onClick={()=>announce(`${piece.name} detail is not included in this preview.`)} aria-label={`Preview note for ${piece.name}`}><img src={`/__mockup/images/baksa/${piece.image}`} alt=""/>{piece.tag&&<span className="bk-cardtag">{piece.tag}</span>}</button>
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
    {storyId&&<StoryViewer storyId={storyId} onClose={()=>setStoryId(null)}/>}
    {toast&&<div role="status" className="bk-toast">{toast}</div>}
  </main>;
}
