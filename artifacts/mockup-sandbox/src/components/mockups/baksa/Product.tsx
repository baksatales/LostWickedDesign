import { useState } from "react";
import { ArrowRight, Check, Heart, Minus, Plus, ShieldCheck, Truck } from "lucide-react";
import "./_group.css";
import { BagDrawer, Footer, Header, Notice } from "./_shared/Chrome";
import { Link } from "./_shared/Link";

export function Product() {
  const [qty,setQty]=useState(1),[saved,setSaved]=useState(false),[bag,setBag]=useState(0),[drawer,setDrawer]=useState(false),[toast,setToast]=useState(""),[open,setOpen]=useState("story");
  const announce=(s:string)=>{setToast(s);window.setTimeout(()=>setToast(""),2400);};
  const addToBag=()=>{setBag(n=>n+qty);setDrawer(true);announce("Added to your sample bag. No order has been placed.");};
  const sections=[
    {id:"story",title:"The story",body:"Blue Lotus Pond is part of Tathaastu’s lotus-inspired sample edit. A considered object for bringing a little ceremony to the everyday."},
    {id:"details",title:"Details to know",body:"Dimensions and additional material details are awaiting maker confirmation. Product imagery and catalogue details are shown for design review only."},
    {id:"dispatch",title:"Dispatch & delivery",body:"Sample draft information indicates an estimated dispatch in 4 days for Tathaastu. This is indicative only, not a delivery guarantee. No live fulfilment is connected."},
  ];
  return <main className="baksa bk-product">
    <Notice/><Header bagCount={bag} savedCount={saved?1:0} onBag={()=>setDrawer(true)} onSaved={()=>announce(saved?"Blue Lotus Pond is saved in this preview":"Use the heart to save this sample item")}/>
    <div className="bk-product-main">
      <div className="bk-crumbs"><Link href="/__mockup/preview/baksa/Home">Home</Link> / <Link href="/__mockup/preview/baksa/Home#shop">Objects with a story</Link> / Blue Lotus Pond</div>
      <div className="bk-product-layout">
        <div className="bk-product-gallery">
          <img className="bk-product-mainimg" src="/__mockup/images/baksa/t-bluelotus.webp" alt="Blue Lotus Pond from Tathaastu"/>
          <p className="bk-preview-note" style={{margin:"12px 0 0"}}>One supplied product image is available for this preview; further views await maker confirmation.</p>
        </div>
        <section className="bk-product-info">
          <span className="bk-eyebrow">A thoughtful favourite · sample</span>
          <h1>Blue Lotus Pond</h1>
          <div className="bk-product-maker">Made by <strong>Tathaastu</strong></div>
          <div className="bk-product-price">₹2,400</div><div className="bk-product-sample">Indicative sample catalogue price</div>
          <p className="bk-product-desc">A lotus-inspired arrangement for bringing a little ceremony to the everyday. A considered gift for a new home, a gracious host, or simply because.</p>
          <div className="bk-product-detailrow"><Truck size={18}/><span>Indicative dispatch in 4 days, based on supplied draft data. Not a delivery guarantee.</span></div>
          <div className="bk-product-detailrow"><ShieldCheck size={18}/><span>Dimensions and further details awaiting maker confirmation.</span></div>
          <div className="bk-product-buyrow">
            <div className="bk-quantity" aria-label="Quantity"><button aria-label="Decrease quantity" onClick={()=>setQty(n=>Math.max(1,n-1))}><Minus size={15}/></button><span aria-live="polite">{qty}</span><button aria-label="Increase quantity" onClick={()=>setQty(n=>n+1)}><Plus size={15}/></button></div>
            <button className="bk-btn" onClick={addToBag}>Add to sample bag <ArrowRight size={16}/></button>
            <button className={`bk-iconbtn ${saved?"active":""}`} aria-label={saved?"Remove from saved":"Save this item"} aria-pressed={saved} onClick={()=>{setSaved(!saved);announce(saved?"Removed from saved preview":"Saved for this preview");}}><Heart size={20} fill={saved?"currentColor":"none"}/></button>
          </div>
          <p className="bk-preview-note"><strong>Design preview.</strong> This local sample bag is for inspection only. No checkout, order, or payment is connected.</p>
          <div className="bk-accordions">{sections.map(s=><div className="bk-accordion" key={s.id}><button aria-expanded={open===s.id} onClick={()=>setOpen(open===s.id?"":s.id)}>{s.title}{open===s.id?<Minus size={16}/>:<Plus size={16}/>}</button>{open===s.id&&<p>{s.body}</p>}</div>)}</div>
          <Link className="bk-textlink" href="/__mockup/preview/baksa/GiftFinder">Need another idea? Try the gift finder <ArrowRight size={15}/></Link>
        </section>
      </div>
    </div>
    <section className="bk-related"><div className="bk-section"><div className="bk-sectionhead"><div><span className="bk-eyebrow">Related sample products</span><h2>Other objects to consider.</h2></div><Link href="/__mockup/preview/baksa/Home#shop" className="bk-textlink">Back to the collection <ArrowRight size={15}/></Link></div><div className="bk-productgrid">{["t-crimson.webp","t-marigold.webp","t-teapot.webp","t-succulents.webp"].map((img,i)=><Link className="bk-card" href="/__mockup/preview/baksa/Home#shop" key={img}><span className="bk-cardmedia"><img src={`/__mockup/images/baksa/${img}`} alt={["Crimson Lotus Urli","Marigold Urli","Large Teapot Bouquet","Succulent Bowl"][i]}/></span><span className="bk-cardcopy"><h3>{["Crimson Lotus Urli","Marigold Urli","Large Teapot Bouquet","Succulent Bowl"][i]}</h3><span className="bk-cardprice">{["₹1,800","₹1,200","₹3,200","₹1,300"][i]}</span></span></Link>)}</div></div></section>
    <Footer/><BagDrawer open={drawer} onClose={()=>setDrawer(false)} count={bag} onQuantity={setBag}/>
    {toast&&<div role="status" className="bk-toast"><Check size={16} style={{verticalAlign:"middle",marginRight:7}}/>{toast}</div>}
  </main>;
}
