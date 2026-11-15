import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetCatalogQueryKey, getGetWorkspaceQueryKey, getGetOperationsQueryKey, useGetOperations, useSaveProduct, useSubmitProduct, useSaveProductImages, useDraftEditorial, useSaveMakerFullProfile } from '@workspace/api-client-react';
import type { Product, Workspace } from '@workspace/api-client-react';
import { useSitePage, PageArtwork, Seo, imageUrl, safeImagePath, money, errText } from './storefront-shared';
import { SpeechDictationButton } from '../components/SpeechDictationButton';

const makerLinks=[['Overview','/maker'],['Products','/maker/products'],['Orders','/maker/orders'],['Earnings','/maker/earnings'],['Opportunities','/maker/opportunities'],['Growth tools','/maker/growth'],['Sahayak','/maker/sahayak'],['Brand profile','/maker/brand']];
export default function MakerArea({ path, workspace, verifiedUser, aiAvailable }: { path:string;workspace:Workspace|undefined;verifiedUser:boolean;aiAvailable:boolean }) {
  const page=useSitePage('maker');
  const products=workspace?.products||[];
  const orderQuery=useGetOperations({query:{enabled:path==='/maker/orders'||path==='/maker',queryKey:getGetOperationsQueryKey()}});
  const queryClient=useQueryClient();
  const saveBrand=useSaveMakerFullProfile();
  const mp=workspace?.makerProfile;
  const [brandDraft,setBrandDraft]=useState({tagline:workspace?.maker?.tagline||'',story:workspace?.maker?.story||'',heroImage:workspace?.maker?.image||'',bio:mp?.bio||'',displayName:mp?.displayName||'',city:mp?.city||'',state:mp?.state||'',instagram:mp?.instagram||'',techniques:mp?.techniques||[] as string[]});
  useEffect(()=>{if(workspace?.maker){const m=workspace.makerProfile;setBrandDraft({tagline:workspace.maker.tagline,story:workspace.maker.story,heroImage:workspace.maker.image,bio:m?.bio||'',displayName:m?.displayName||'',city:m?.city||'',state:m?.state||'',instagram:m?.instagram||'',techniques:m?.techniques||[]})}},[workspace?.maker?.id]);
  if(path==='/maker/products/new'||path.startsWith('/maker/products/')&&path!=='/maker/products'){
    const editingId=path==='/maker/products/new'?undefined:decodeURIComponent(path.split('/').pop()||'');
    const existing=editingId?products.find(p=>p.id===editingId):undefined;
     return <ProductWizard existing={existing} productId={editingId} verifiedUser={verifiedUser} aiAvailable={aiAvailable}/>;
  }
  const active = makerLinks.find(x=>x[1]===path)?.[0]||'Overview';
  const section=path==='/maker/products'?'products':path==='/maker/orders'?'orders':path==='/maker/earnings'?'earnings':path==='/maker/opportunities'?'opportunities':path==='/maker/growth'||path==='/maker/sahayak'?'growth':path==='/maker/brand'?'brand':'overview';
  return <main className="bk-dashboard"><aside><span className="bk-eyebrow">Maker workspace</span><h2 style={{fontSize:32}}>{workspace?.maker?.brand||'Your studio'}</h2><nav className="bk-dashnav">{makerLinks.map(([label,href])=><Link key={href} href={href} aria-current={active===label?'page':undefined}>{label}</Link>)}</nav></aside><section><span className="bk-eyebrow">{active}</span><h1 style={{fontSize:'clamp(40px,5vw,60px)',margin:'8px 0 20px'}}>{section==='overview'?page?.heading||'Your maker workspace':active}</h1>{section==='overview'&&page?.intro&&<p className="bk-muted">{page.intro}</p>}{section==='overview'&&<PageArtwork page={page}/>}
    {section==='overview'&&<><p className="bk-muted">A clear view of your work on Baksa Tales.</p><div className="bk-panel"><h2>Products</h2><p>{products.length} products in your workspace. Listing status is shown from the service; draft work is not presented as published.</p><Link className="bk-btn" href="/maker/products/new">Start a product draft <Plus size={16}/></Link></div><div className="bk-panel"><h2>Orders</h2><p>{workspace?.ordersCount ?? 0} orders recorded by the workspace.</p><Link className="bk-textlink" href="/maker/orders">View orders <ArrowRight size={15}/></Link></div></>}
    {section==='products'&&<><p className="bk-muted">Your workspace products. A draft is not live until submitted and reviewed.</p><Link className="bk-btn" href="/maker/products/new">Create a product draft <Plus size={16}/></Link>{products.length?products.map(p=><div className="bk-panel" key={p.id} style={{display:'flex',gap:16,alignItems:'center'}}><img src={imageUrl(p.image||'baksatales-trunk-mark.png')} alt="" style={{width:76,height:76,objectFit:'cover'}}/><div style={{flex:1}}><h2>{p.name}</h2><p>{money(p.pricePaise)} · {p.material}</p><span className="bk-status">{p.status||'Draft'}</span>{p.reviewNote&&<p>{p.reviewNote}</p>}</div><Link className="bk-btn secondary" href={`/maker/products/${p.id}`}>Edit draft</Link></div>):<div className="bk-empty"><strong style={{font:'26px var(--bk-display)',color:'var(--bk-ink)'}}>No products in your workspace.</strong><p>Start with a draft. Product images cannot be uploaded until storage is connected.</p></div>}</>}
    {section==='orders'&&<div><div className="bk-panel"><h2>Order desk</h2><p>Only orders returned for your authenticated maker workspace appear here. Payment status is informational; payout data is not available.</p></div>{orderQuery.isLoading?<div className="bk-skeleton"/>:orderQuery.isError?<div className="bk-errorbox"><p>{errText(orderQuery.error)}</p><button className="bk-btn secondary" onClick={()=>void orderQuery.refetch()}>Try again</button></div>:orderQuery.data?.orders.length?orderQuery.data.orders.map(order=><article className="bk-panel bk-operation-row" key={order.id}><div><span className="bk-eyebrow">{order.ref}</span><h2>{money(order.totalPaise)}</h2><p>Placed {new Date(order.createdAt).toLocaleDateString()} · {order.status}</p><span className="bk-status">Payment: {order.paymentStatus}</span>{order.trackingNumber&&<p>Tracking {order.carrier}: {order.trackingNumber}</p>}</div></article>):<div className="bk-empty"><strong>No orders in this workspace.</strong><p>When the service returns a maker order, it will appear here.</p></div>}</div>}
    {section==='earnings'&&<div className="bk-panel"><h2>Earnings are not connected.</h2><p>There is no payout or earnings data in the workspace response. This space will show actual figures when the payout integration is available.</p></div>}
    {section==='opportunities'&&<div className="bk-panel"><h2>Opportunities are coming later.</h2><p>No open briefs or placements are exposed in this workspace yet.</p></div>}
    {section==='growth'&&<><MarginCalculator/><MakerEditorialDraft verifiedUser={verifiedUser} aiAvailable={aiAvailable}/></>}
    {section==='brand'&&<MakerBrandCard brandDraft={brandDraft} setBrandDraft={setBrandDraft} saveBrand={saveBrand} queryClient={queryClient} maker={workspace?.maker}/>}
  </section></main>;
}

const CRAFT_TECHNIQUES=['Dhokra casting','Warli painting','Bidriware','Madhubani','Kalamkari','Block printing','Terracotta','Bamboo weaving','Kantha embroidery','Pashmina','Ikat weaving','Jamdani','Phulkari','Tanjore painting','Pattachitra','Channapatna toys','Blue pottery','Banjara beadwork','Cane & bamboo','Silk weaving','Metalwork','Stone carving','Leather craft','Paper mache','Lacquerware'];

type BrandDraft={tagline:string;story:string;heroImage:string;bio:string;displayName:string;city:string;state:string;instagram:string;techniques:string[]};
type Maker={brand:string;craft:string;tagline:string;story:string;image:string;id:string};

function makerProfilePct(d:BrandDraft,maker:Maker|undefined):number{
  if(!maker)return 0;
  const checks=[!!d.tagline.trim(),!!d.story.trim()&&d.story.trim().length>80,!!d.heroImage.trim(),!!d.bio.trim(),!!d.displayName.trim(),!!d.city.trim(),!!d.instagram.trim(),d.techniques.length>0];
  return Math.round(checks.filter(Boolean).length/checks.length*100);
}

function MakerBrandCard({brandDraft,setBrandDraft,saveBrand,queryClient,maker}:{brandDraft:BrandDraft;setBrandDraft:React.Dispatch<React.SetStateAction<BrandDraft>>;saveBrand:{mutate:(args:{data:BrandDraft},opts:{onSuccess:()=>void})=>void;isPending:boolean;isError:boolean;isSuccess:boolean;error:unknown};queryClient:{invalidateQueries:(opts:{queryKey:unknown[]})=>Promise<unknown>};maker:Maker|undefined}){
  const pct=makerProfilePct(brandDraft,maker);
  const fields=[
    {label:'Display name',done:!!brandDraft.displayName.trim()},
    {label:'Tagline',done:!!brandDraft.tagline.trim()},
    {label:'Bio',done:!!brandDraft.bio.trim()},
    {label:'Hero image',done:!!brandDraft.heroImage.trim()},
    {label:'Maker story',done:!!brandDraft.story.trim()&&brandDraft.story.trim().length>80},
    {label:'City',done:!!brandDraft.city.trim()},
    {label:'Instagram',done:!!brandDraft.instagram.trim()},
    {label:'Craft techniques',done:brandDraft.techniques.length>0},
  ];
  const barColor=pct<40?'#f59e0b':pct<75?'#8b5cf6':'#10b981';
  const handleSave=(e:React.FormEvent)=>{e.preventDefault();saveBrand.mutate({data:brandDraft},{onSuccess:()=>{void queryClient.invalidateQueries({queryKey:getGetWorkspaceQueryKey()});void queryClient.invalidateQueries({queryKey:getGetCatalogQueryKey()})}})};
  if(!maker)return <div className="bk-panel"><p>No maker profile was returned for this workspace. Contact the Baksa team to check your application status.</p></div>;
  return <div style={{display:'flex',flexDirection:'column',gap:20}}>
    <div className="bk-panel" style={{background:'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4c1d95 100%)',color:'#fff',border:'none'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
        <div><span style={{fontSize:11,letterSpacing:2,opacity:.7,textTransform:'uppercase'}}>Brand profile</span><h2 style={{fontSize:28,margin:'4px 0',color:'#fff'}}>{maker.brand}</h2><p style={{opacity:.8,margin:0}}>{maker.craft}</p></div>
        <div style={{textAlign:'center',background:'rgba(255,255,255,.1)',borderRadius:16,padding:'12px 20px'}}>
          <div style={{fontSize:36,fontWeight:800,color:pct===100?'#10b981':'#fff'}}>{pct}%</div>
          <div style={{fontSize:11,opacity:.7}}>complete</div>
        </div>
      </div>
      <div style={{background:'rgba(255,255,255,.15)',borderRadius:999,height:8,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:barColor,borderRadius:999,transition:'width .5s ease'}}/>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:12}}>
        {fields.map(f=><span key={f.label} style={{fontSize:12,padding:'3px 10px',borderRadius:999,background:f.done?'rgba(16,185,129,.25)':'rgba(255,255,255,.1)',color:f.done?'#6ee7b7':'rgba(255,255,255,.6)',border:`1px solid ${f.done?'rgba(16,185,129,.4)':'rgba(255,255,255,.15)'}`}}>{f.done?'✓':'○'} {f.label}</span>)}
      </div>
    </div>
    <form className="bk-form" onSubmit={handleSave}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <label>Display name<input maxLength={100} placeholder="How your brand appears to shoppers" value={brandDraft.displayName} onChange={e=>setBrandDraft(x=>({...x,displayName:e.target.value}))}/></label>
        <label>City<input maxLength={80} placeholder="Where you create" value={brandDraft.city} onChange={e=>setBrandDraft(x=>({...x,city:e.target.value}))}/></label>
        <label>State<input maxLength={60} placeholder="State / region" value={brandDraft.state} onChange={e=>setBrandDraft(x=>({...x,state:e.target.value}))}/></label>
        <label>Instagram<input maxLength={60} placeholder="@yourstudio" value={brandDraft.instagram} onChange={e=>setBrandDraft(x=>({...x,instagram:e.target.value}))}/></label>
      </div>
      <label className="wide">Tagline<small style={{float:'right',opacity:.5}}>{brandDraft.tagline.length}/240</small><input maxLength={240} placeholder="One powerful line — what makes your craft yours" value={brandDraft.tagline} onChange={e=>setBrandDraft(x=>({...x,tagline:e.target.value}))}/></label>
      <label className="wide">Brand bio<small style={{float:'right',opacity:.5}}>{brandDraft.bio.length}/500</small><textarea maxLength={500} rows={3} placeholder="Short intro shown on your brand page (2–3 sentences)" value={brandDraft.bio} onChange={e=>setBrandDraft(x=>({...x,bio:e.target.value}))}/></label>
      <label className="wide">Your maker story<small style={{float:'right',opacity:.5}}>{brandDraft.story.length}/6000</small><textarea maxLength={6000} rows={6} placeholder="Tell shoppers why you make, where you learned, what drives you. The more genuine, the more trust." value={brandDraft.story} onChange={e=>setBrandDraft(x=>({...x,story:e.target.value}))}/></label>
      <label className="wide">Hero image<input maxLength={500} placeholder="/images/baksa/your-hero.webp or https://…" value={brandDraft.heroImage} onChange={e=>setBrandDraft(x=>({...x,heroImage:e.target.value}))}/></label>
      <div style={{marginTop:4}}>
        <span style={{fontSize:13,fontWeight:600,display:'block',marginBottom:8}}>Your craft techniques</span>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {CRAFT_TECHNIQUES.map(t=>{const sel=brandDraft.techniques.includes(t);return <button type="button" key={t} onClick={()=>setBrandDraft(x=>({...x,techniques:sel?x.techniques.filter(v=>v!==t):[...x.techniques,t]}))} style={{fontSize:12,padding:'5px 12px',borderRadius:999,border:`1.5px solid ${sel?'#8b5cf6':'var(--bk-rule,#e2e2e2)'}`,background:sel?'#f5f3ff':'transparent',color:sel?'#7c3aed':'inherit',cursor:'pointer',transition:'all .15s'}}>{t}</button>})}
        </div>
      </div>
      {saveBrand.isError&&<p className="bk-error">{errText(saveBrand.error)}</p>}
      {saveBrand.isSuccess&&<p className="bk-success" role="status">Brand profile saved.</p>}
      <button className="bk-btn" disabled={saveBrand.isPending} style={{marginTop:8}}>{saveBrand.isPending?'Saving…':'Save brand profile'}</button>
    </form>
  </div>;
}
function MakerEditorialDraft({verifiedUser,aiAvailable}:{verifiedUser:boolean;aiAvailable:boolean}){
  const [facts,setFacts]=useState('');
  return <div className="bk-panel"><span className="bk-eyebrow">Sahayak · human review required</span><h2>Write from facts you know.</h2><p>Dictate or type verified details. Sahayak can rewrite the text, but suggestions are unsaved and never publish by themselves. AI usage consumes Replit credits.</p><label>Verified product or craft facts<textarea className="bk-input" minLength={20} maxLength={8000} value={facts} onChange={e=>setFacts(e.target.value)} placeholder="Materials, dimensions, listed features, and confirmed background only."/></label><SpeechDictationButton value={facts} onChange={setFacts}/><SahayakWriter text={facts} onUse={setFacts} verifiedUser={verifiedUser} aiAvailable={aiAvailable} sourceLabel="verified facts"/></div>;
}
function MarginCalculator(){
  const [price,setPrice]=useState(2500);const [materials,setMaterials]=useState(500);const [labour,setLabour]=useState(750);const [fee,setFee]=useState(12);
  const estimate=Math.round(price-(price*fee/100)-materials-labour);
  return <div className="bk-panel"><span className="bk-status">Local estimate only · not a payout forecast</span><h2>Try a price, see the shape.</h2><p>Change the assumptions. Nothing is saved or sent to the marketplace.</p><div className="bk-form"><label>Sale price (₹)<input type="number" min="0" value={price} onChange={e=>setPrice(Number(e.target.value))}/></label><label>Materials (₹)<input type="number" min="0" value={materials} onChange={e=>setMaterials(Number(e.target.value))}/></label><label>Your time (₹)<input type="number" min="0" value={labour} onChange={e=>setLabour(Number(e.target.value))}/></label><label>Estimated platform fee (%)<input type="number" min="0" max="100" step=".5" value={fee} onChange={e=>setFee(Number(e.target.value))}/></label></div><div className="bk-panel" style={{background:'var(--bk-teal)',color:'var(--bk-paper)'}}><small>Illustrative remainder after entered costs and fee</small><h2>{money(estimate*100)}</h2><small>Rates are editable assumptions, not Baksa Tales fee terms.</small></div></div>;
}
function ProductWizard({ existing, productId, verifiedUser, aiAvailable }: { existing?:Product;productId?:string;verifiedUser:boolean;aiAvailable:boolean }) {
  const save=useSaveProduct();const submitProduct=useSubmitProduct();const saveImages=useSaveProductImages();const [,navigate]=useLocation();
  const queryClient=useQueryClient();
  const refresh=()=>{void queryClient.invalidateQueries({queryKey:getGetCatalogQueryKey()});void queryClient.invalidateQueries({queryKey:getGetWorkspaceQueryKey()});};
  const [step,setStep]=useState(0);const [savedId,setSavedId]=useState<string|undefined>(existing?.id);const [formIssue,setFormIssue]=useState('');
  const [imageText,setImageText]=useState(existing?.image||'');
  const [v,setV]=useState({name:existing?.name||'',price:String(existing?existing.pricePaise/100:''),stock:String(existing?.stock??''),material:existing?.material||'',description:existing?.description||'',dispatch:String(existing?.dispatchDays??''),confirm:false});
  const up=(key:keyof typeof v,value:string|boolean)=>setV(old=>({...old,[key]:value}));
  const steps=['Name your piece','Set a price','Availability','Materials','Describe your work','Dispatch preparation','Confirm the facts'];
  useEffect(()=>{if(existing)setV({name:existing.name,price:String(existing.pricePaise/100),stock:String(existing.stock),material:existing.material,description:existing.description,dispatch:String(existing.dispatchDays),confirm:false})},[existing?.id]);
  useEffect(()=>{if(existing?.image)setImageText(existing.image)},[existing?.id]);
  const current = !productId || !!existing && ['draft','changes','needs_changes'].includes(existing.status||'');
  const validate=()=>{const invalidStep=!v.name.trim()?0:!Number.isFinite(Number(v.price))||Number(v.price)<=0?1:!v.stock.trim()||!Number.isInteger(Number(v.stock))||Number(v.stock)<0?2:!v.material.trim()?3:!v.description.trim()?4:!Number.isInteger(Number(v.dispatch))||Number(v.dispatch)<1||Number(v.dispatch)>60?5:!v.confirm?6:-1;if(invalidStep>=0){setStep(invalidStep);setFormIssue(invalidStep===6?'Please confirm the accuracy of the listing facts before saving.':'Complete this step with a valid value before saving.');return false}setFormIssue('');return true};
  const photos=()=>imageText.split(/[\n,]+/).map(x=>x.trim()).filter(Boolean).slice(0,8);
  const validPhotos=()=>photos().length>0&&photos().every(safeImagePath);
  const savePhotos=(id:string,done:()=>void)=>{
    // A summary contains only the cover image. Do not erase other stored photos
    // when a maker is editing unrelated product fields.
    if(existing&&imageText.trim()===existing.image){done();return;}
    saveImages.mutate({id,data:{images:photos()}},{onSuccess:done});
  };
  const saveDraft=()=>{if(!validate())return;save.mutate({data:{...(savedId?{id:savedId}:{}),name:v.name,pricePaise:Math.round(Number(v.price)*100),stock:Number(v.stock),material:v.material,description:v.description,dispatchDays:Number(v.dispatch),factualConfirmation:v.confirm}},{onSuccess:r=>{setSavedId(r.id);refresh();if(photos().length)savePhotos(r.id,()=>{refresh();navigate('/maker/products')});else navigate('/maker/products');}});};
  const saveAndSubmit=()=>{if(!validate())return;if(!validPhotos()){setStep(5);setFormIssue('Add at least one valid /images/baksa/ path or hosted HTTPS image before submitting for review.');return;}save.mutate({data:{...(savedId?{id:savedId}:{}),name:v.name,pricePaise:Math.round(Number(v.price)*100),stock:Number(v.stock),material:v.material,description:v.description,dispatchDays:Number(v.dispatch),factualConfirmation:v.confirm}},{onSuccess:r=>{setSavedId(r.id);refresh();savePhotos(r.id,()=>submitProduct.mutate({id:r.id},{onSuccess:()=>{refresh();navigate('/maker/products')}}));}});};
  if(!current)return <main className="bk-formpage"><Seo title="Draft not found" description="Draft unavailable."/><h1>That draft is not in your workspace.</h1><p>Only products returned by your account workspace can be edited.</p><Link className="bk-btn" href="/maker/products">Back to products</Link></main>;
  const showUpload=step===5;
  return <main className="bk-formpage"><Seo title={existing?'Edit product draft':'New product draft'} description="Build a product draft for maker review."/><span className="bk-eyebrow">Maker workspace · {existing?'Edit draft':'New listing draft'}</span><h1>{existing?`Edit ${existing.name}`:'A new piece, step by step.'}</h1><div className="bk-steps">{steps.map((s,i)=><span key={s} className={`bk-step ${i===step?'active':''}`}>{i+1}. {s}</span>)}</div><div className="bk-panel"><h2>{steps[step]}</h2>
    {step===0&&<label>Listing name<input className="bk-input" required maxLength={200} value={v.name} onChange={e=>up('name',e.target.value)} placeholder="Name the piece"/></label>}
    {step===1&&<label>Price in rupees<input className="bk-input" type="number" required min="1" step=".01" value={v.price} onChange={e=>up('price',e.target.value)}/><small>Entered as rupees; the service receives integer paise.</small></label>}
    {step===2&&<label>Available stock<input className="bk-input" type="number" required min="0" value={v.stock} onChange={e=>up('stock',e.target.value)}/></label>}
    {step===3&&<label>Materials and components<textarea className="bk-input" required maxLength={500} value={v.material} onChange={e=>up('material',e.target.value)}/></label>}
    {step===4&&<><label>Factual product description<textarea className="bk-input" required maxLength={5000} value={v.description} onChange={e=>up('description',e.target.value)} placeholder="Describe the piece, its materials, dimensions or process you can verify."/></label><SpeechDictationButton value={v.description} maxLength={5000} onChange={value=>up('description',value)}/><SahayakWriter text={v.description} onUse={value=>up('description',value)} verifiedUser={verifiedUser} aiAvailable={aiAvailable} sourceLabel="current product description"/></>}
    {showUpload&&<><label>Dispatch preparation days<input className="bk-input" type="number" required min="1" max="60" value={v.dispatch} onChange={e=>up('dispatch',e.target.value)}/></label><label>Product photo paths or hosted HTTPS URLs<textarea className="bk-input" required maxLength={4000} value={imageText} onChange={e=>setImageText(e.target.value)} placeholder="/images/baksa/your-piece.webp&#10;https://your-image-host.example/photo.jpg"/><small>One per line, up to eight. The image URL service must be configured separately for uploaded files.</small></label></>}
    {step===6&&<><p>Review the listing information you entered before saving a draft.</p><div className="bk-panel"><strong>{v.name || 'Untitled piece'}</strong><p>{v.material}</p><p>{v.description}</p><p>{v.price?`₹${v.price}`:''} · {v.stock||'—'} available · {v.dispatch||'—'} dispatch preparation days</p></div><label className="bk-check"><input type="checkbox" checked={v.confirm} onChange={e=>up('confirm',e.target.checked)}/> I confirm these listing facts are accurate to the best of my knowledge.</label><p className="bk-muted">Saving creates a draft only. It does not publish the product.</p></>}
    {formIssue&&<p className="bk-error" role="alert">{formIssue}</p>}{(save.isError||submitProduct.isError||saveImages.isError)&&<p className="bk-error" role="alert">{errText(save.error||submitProduct.error||saveImages.error)}</p>}
    <div style={{display:'flex',justifyContent:'space-between',gap:10,marginTop:24}}><button className="bk-btn secondary" disabled={step===0} onClick={()=>setStep(s=>Math.max(s-1,0))}><ArrowLeft size={15}/> Back</button><div style={{display:'flex',gap:8}}><button className="bk-btn secondary" onClick={saveDraft} disabled={save.isPending||submitProduct.isPending||saveImages.isPending}>Save draft</button>{step<6?<button className="bk-btn" onClick={()=>setStep(s=>Math.min(s+1,6))}>Next <ArrowRight size={15}/></button>:<button className="bk-btn" disabled={!v.confirm||save.isPending||submitProduct.isPending||saveImages.isPending} onClick={saveAndSubmit}>{submitProduct.isPending?'Submitting…':'Save and submit for review'}</button>}</div></div>
  </div></main>;
}

function SahayakWriter({text,onUse,verifiedUser,aiAvailable,sourceLabel}:{text:string;onUse:(value:string)=>void;verifiedUser:boolean;aiAvailable:boolean;sourceLabel:string}){
  const ai=useDraftEditorial();const [suggestion,setSuggestion]=useState('');const [disclosure,setDisclosure]=useState('');
  const canRewrite=verifiedUser&&aiAvailable&&text.trim().length>=20&&text.length<=8000&&!ai.isPending;
  return <div className="bk-sahayak-tools"><button type="button" className="bk-btn secondary" disabled={!canRewrite} onClick={()=>{setSuggestion('');setDisclosure('');ai.mutate({data:{task:'rewrite',purpose:'product',facts:text,currentText:text,tone:'warm'}},{onSuccess:result=>{setSuggestion(result.text);setDisclosure(result.disclosure)}})}}>{ai.isPending?'Sahayak is writing…':'Rewrite with Sahayak'}</button>{!verifiedUser&&<p className="bk-muted">A verified maker account is required. Sample identities cannot use the writing service.</p>}{!aiAvailable&&<p className="bk-muted">Sahayak is unavailable until the writing service is configured.</p>}{text.trim().length<20&&<p className="bk-muted">Add at least 20 characters of {sourceLabel} before requesting a rewrite.</p>}{ai.isError&&<p className="bk-error" role="alert">{errText(ai.error)}</p>}{suggestion&&<div className="bk-panel"><label>Sahayak suggestion · review every fact<textarea className="bk-input" maxLength={5000} value={suggestion} onChange={e=>setSuggestion(e.target.value)}/></label><p className="bk-muted">{disclosure}</p><button type="button" className="bk-btn secondary" onClick={()=>onUse(suggestion.slice(0,5000))}>Use suggestion in the draft</button><p className="bk-muted">This updates the unsaved field only. Review it, then save the product yourself.</p></div>}</div>;
}
