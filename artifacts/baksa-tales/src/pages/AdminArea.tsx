import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, ClipboardCheck, Users, MessageSquare, ShoppingBag, Paintbrush, Banknote, Rocket, GitBranch, ArrowRight, LogOut } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetCatalogQueryKey, getGetWorkspaceQueryKey, getGetOperationsQueryKey, useGetOperations, useReviewProduct, useReviewApplication, useUpdateBrief, useUpdateFulfilment } from '@workspace/api-client-react';
import type { Catalog, Workspace, Product, OperationApplication, OperationBrief, OperationOrder } from '@workspace/api-client-react';
import { imageUrl, money, errText } from './storefront-shared';
import SalesOperations from './SalesOperations';
import './role-shells.css';

const adminLinks = [
  { label: 'Overview',        href: '/admin',             icon: LayoutDashboard },
  { label: 'Reviews',         href: '/admin/reviews',     icon: ClipboardCheck },
  { label: 'Applications',    href: '/admin/applications',icon: Users },
  { label: 'Enquiries',       href: '/admin/enquiries',   icon: MessageSquare },
  { label: 'Orders',          href: '/admin/orders',      icon: ShoppingBag },
  { label: 'Site Studio',     href: '/admin/site',        icon: Paintbrush },
  { label: 'Payouts',         href: '/admin/payouts',     icon: Banknote },
  { label: 'Launch checks',   href: '/admin/launch',      icon: Rocket },
  { label: 'Dev orders',      href: '/admin/operations',  icon: GitBranch },
];

interface AdminShellProps {
  path: string;
  children: React.ReactNode;
  pageTitle?: string;
  onSignOut?: () => void;
}

function AdminShell({ path, children, pageTitle, onSignOut }: AdminShellProps) {
  const active = adminLinks.find(l => l.href === path)?.label ?? 'Overview';
  return (
    <div className="baksa rs-shell rs-shell--admin">
      <aside className="rs-sidebar">
        <div className="rs-sidebar-top">
          <div className="rs-role-badge">Admin</div>
          <p className="rs-brand">Baksa Tales</p>
          <p className="rs-sub">Marketplace operations</p>
        </div>
        <nav className="rs-nav">
          <span className="rs-nav-section">Workspace</span>
          {adminLinks.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} aria-current={active === label ? 'page' : undefined}>
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="rs-sidebar-foot">
          {onSignOut && (
            <button className="rs-signout" onClick={onSignOut}>
              <LogOut size={15} /> Sign out
            </button>
          )}
        </div>
      </aside>
      <div className="rs-main">
        <header className="rs-topbar">
          <h1 className="rs-page-title">{pageTitle ?? active}</h1>
        </header>
        <div className="rs-content">{children}</div>
      </div>
    </div>
  );
}

export default function AdminArea({ path, workspace, catalog: publicCatalog, onSignOut }: { path:string;workspace:Workspace|undefined;catalog:Catalog;onSignOut?:()=>void }) {
  const catalog = { ...publicCatalog, products: workspace?.products || [] };
  const review=useReviewProduct();const [,setLocation]=useLocation();const queryClient=useQueryClient();
  const salesPath=path==='/admin/launch'||path==='/admin/operations';
  const ops=useGetOperations({query:{queryKey:getGetOperationsQueryKey(),enabled:!salesPath}});
  const reviewApplication=useReviewApplication();const updateBrief=useUpdateBrief();const updateFulfilment=useUpdateFulfilment();
  const refreshOps=()=>{void queryClient.invalidateQueries({queryKey:getGetOperationsQueryKey()});void queryClient.invalidateQueries({queryKey:getGetWorkspaceQueryKey()})};
  const active = adminLinks.find(l=>l.href===path)?.label ?? 'Overview';

  return (
    <AdminShell path={path} pageTitle={path==='/admin'?'Overview':active} onSignOut={onSignOut}>
      {salesPath ? (
        <SalesOperations path={path} userId={workspace?.userId||''}/>
      ) : ops.isLoading ? (
        <div className="bk-skeleton"/>
      ) : ops.isError ? (
        <div className="bk-errorbox"><h2>Operations data is unavailable.</h2><p>{errText(ops.error)}</p><button className="bk-btn secondary" onClick={()=>void ops.refetch()}>Try again</button></div>
      ) : path==='/admin' ? (
        <AdminOverview ops={ops.data} catalog={catalog}/>
      ) : path==='/admin/reviews' ? (
        <><p className="bk-muted">Product facts are reviewed against the five checks. Only products marked for review appear here.</p>{catalog.products.filter(p=>p.status==='pending_review'||p.status==='review').map(p=><ReviewRow key={p.id} product={p} busy={review.isPending} onReview={data=>review.mutate({data},{onSuccess:()=>{void queryClient.invalidateQueries({queryKey:getGetCatalogQueryKey()});void queryClient.invalidateQueries({queryKey:getGetWorkspaceQueryKey()});setLocation('/admin/reviews')}})}/>)}{!catalog.products.some(p=>p.status==='pending_review'||p.status==='review')&&<div className="bk-empty"><strong style={{font:'26px var(--bk-display)',color:'var(--bk-ink)'}}>No review queue.</strong><p>No products awaiting review in this workspace.</p></div>}{review.isError&&<p className="bk-errorbox">{errText(review.error)}</p>}</>
      ) : path==='/admin/applications' ? (
        <><p className="bk-muted">Maker applications returned by the operations service. A decision is recorded only after the API confirms it.</p>{ops.data?.applications.map(app=><ApplicationOperation key={app.id} app={app} busy={reviewApplication.isPending} onDecide={(decision,note)=>reviewApplication.mutate({id:app.id,data:{decision,note}},{onSuccess:refreshOps})}/>)}{!ops.data?.applications.length&&<div className="bk-empty"><strong>No applications in queue.</strong><p>Nothing beyond records from the service.</p></div>}{reviewApplication.isError&&<p className="bk-errorbox">{errText(reviewApplication.error)}</p>}</>
      ) : path==='/admin/enquiries' ? (
        <><p className="bk-muted">Corporate enquiries and their live workflow stage.</p>{ops.data?.briefs.map(brief=><BriefOperation key={brief.id} brief={brief} busy={updateBrief.isPending} onStage={stage=>updateBrief.mutate({id:brief.id,data:{stage}},{onSuccess:refreshOps})}/>)}{!ops.data?.briefs.length&&<div className="bk-empty"><strong>No briefs returned.</strong><p>New enquiries will appear when the service records them.</p></div>}{updateBrief.isError&&<p className="bk-errorbox">{errText(updateBrief.error)}</p>}</>
      ) : path==='/admin/orders' ? (
        <><p className="bk-muted">Fulfilment tools update the actual order record; they do not mark payments as received.</p>{ops.data?.orders.map(order=><FulfilmentOperation key={order.id} order={order} busy={updateFulfilment.isPending} onSave={data=>updateFulfilment.mutate({id:order.id,data},{onSuccess:refreshOps})}/>)}{!ops.data?.orders.length&&<div className="bk-empty"><strong>No orders in the operations response.</strong><p>Order records are not fabricated for this view.</p></div>}{updateFulfilment.isError&&<p className="bk-errorbox">{errText(updateFulfilment.error)}</p>}</>
      ) : path==='/admin/payouts' ? (
        <div className="bk-panel"><h2>Payout controls are unavailable.</h2><p>No payment provider or payout data is connected.</p></div>
      ) : null}
    </AdminShell>
  );
}

function AdminOverview({ ops, catalog }: { ops: { applications: OperationApplication[]; briefs: OperationBrief[]; orders: OperationOrder[] } | undefined; catalog: { products: Product[] } }) {
  const reviewQueue = catalog.products.filter(p => p.status === 'pending_review' || p.status === 'review').length;
  const pendingApps = ops?.applications.filter(a => a.status === 'pending' || a.status === 'new').length ?? 0;
  const openBriefs = ops?.briefs.filter(b => b.stage !== 'won' && b.stage !== 'lost').length ?? 0;
  const totalOrders = ops?.orders.length ?? 0;

  return (
    <>
      {/* Pulse row */}
      <div className="rs-pulse-grid">
        <div className="rs-pulse">
          <div className="rs-pulse__label">Review queue</div>
          <div className="rs-pulse__value">{reviewQueue}</div>
          <div className="rs-pulse__delta">Products awaiting review</div>
        </div>
        <div className="rs-pulse">
          <div className="rs-pulse__label">Applications</div>
          <div className="rs-pulse__value">{pendingApps}</div>
          <div className="rs-pulse__delta">Pending maker decisions</div>
        </div>
        <div className="rs-pulse">
          <div className="rs-pulse__label">Open briefs</div>
          <div className="rs-pulse__value">{openBriefs}</div>
          <div className="rs-pulse__delta">Corporate enquiries active</div>
        </div>
      </div>

      {/* Data cards */}
      <div className="rs-data-grid">
        <div className="rs-card">
          <div className="rs-card__eyebrow">Marketplace</div>
          <p className="rs-card__title">{catalog.products.length} products</p>
          <p className="rs-card__desc">Total product records in this workspace. {reviewQueue > 0 ? `${reviewQueue} awaiting review.` : 'No items awaiting review.'}</p>
          <Link className="rs-card__link" href="/admin/reviews">Open review queue <ArrowRight size={13}/></Link>
        </div>
        <div className="rs-card">
          <div className="rs-card__eyebrow">Operations</div>
          <p className="rs-card__title">{totalOrders} orders</p>
          <p className="rs-card__desc">Most recent order records returned by the operations service. Payment statuses are informational.</p>
          <Link className="rs-card__link" href="/admin/orders">Manage fulfilment <ArrowRight size={13}/></Link>
        </div>
        <div className="rs-card">
          <div className="rs-card__eyebrow">Enquiries</div>
          <p className="rs-card__title">{ops?.briefs.length ?? 0} briefs</p>
          <p className="rs-card__desc">{openBriefs > 0 ? `${openBriefs} active brief${openBriefs > 1 ? 's' : ''} need attention.` : 'No active corporate briefs at this time.'}</p>
          <Link className="rs-card__link" href="/admin/enquiries">View enquiries <ArrowRight size={13}/></Link>
        </div>
        <div className="rs-card">
          <div className="rs-card__eyebrow">Site</div>
          <p className="rs-card__title">Site Studio</p>
          <p className="rs-card__desc">Edit homepage sections, brand copy, and page content without deploying code.</p>
          <Link className="rs-card__link" href="/admin/site">Open Studio <ArrowRight size={13}/></Link>
        </div>
      </div>

      {/* Activity feed from real ops data */}
      {ops && (ops.applications.length > 0 || ops.orders.length > 0) && (
        <div className="rs-activity">
          <div className="rs-activity__head">
            <h2 className="rs-activity__title">Recent activity</h2>
          </div>
          {ops.applications.slice(0, 4).map(app => (
            <div key={app.id} className="rs-activity__row">
              <div className="rs-activity__dot"/>
              <span className="rs-activity__text"><strong>{app.brand}</strong> — maker application · {app.status}</span>
              <span className="rs-activity__meta">{app.craft}</span>
            </div>
          ))}
          {ops.orders.slice(0, 3).map(order => (
            <div key={order.id} className="rs-activity__row">
              <div className="rs-activity__dot" style={{background:'#10b981'}}/>
              <span className="rs-activity__text">Order {order.ref} · {order.status}</span>
              <span className="rs-activity__meta">{money(order.totalPaise)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ApplicationOperation({app,busy,onDecide}:{app:OperationApplication;busy:boolean;onDecide:(decision:'approved'|'declined'|'call',note:string)=>void}){
  const [note,setNote]=useState('');
  return <article className="bk-panel"><span className="bk-eyebrow">{app.status}</span><h2>{app.brand}</h2><p>{app.contactName} · {app.craft} · {app.city}</p><label>Decision note<textarea className="bk-input" value={note} maxLength={1000} onChange={e=>setNote(e.target.value)} placeholder="Add a factual note for the record."/></label><div className="bk-operation-actions"><button className="bk-btn" disabled={busy} onClick={()=>onDecide('approved',note)}>Approve</button><button className="bk-btn secondary" disabled={busy} onClick={()=>onDecide('call',note)}>Request a call</button><button className="bk-btn secondary" disabled={busy} onClick={()=>onDecide('declined',note)}>Decline</button></div></article>;
}
function BriefOperation({brief,busy,onStage}:{brief:OperationBrief;busy:boolean;onStage:(stage:'new'|'contacted'|'proposal'|'won'|'lost')=>void}){
  return <article className="bk-panel"><span className="bk-eyebrow">{brief.ref} · {brief.stage}</span><h2>{brief.company}</h2><p>{brief.purpose}</p><p>{brief.quantity} gifts · indicative budget {money(brief.budgetPaise)} per gift · needed by {brief.neededBy}</p><p>{brief.contactName} · {brief.reach}</p>{brief.customization&&<p><strong>Customisation:</strong> {brief.customization}</p>}{brief.deliveryCities&&<p><strong>Delivery cities:</strong> {brief.deliveryCities}</p>}{brief.referenceUrl&&<p><strong>Reference:</strong> {/^https:\/\//i.test(brief.referenceUrl)?<a href={brief.referenceUrl} target="_blank" rel="noopener noreferrer">{brief.referenceUrl}</a>:brief.referenceUrl}</p>}{brief.message&&<p className="bk-muted">{brief.message}</p>}<label>Update stage<select className="bk-select" value={brief.stage} disabled={busy} onChange={e=>onStage(e.target.value as 'new'|'contacted'|'proposal'|'won'|'lost')}><option value="new">New</option><option value="contacted">Contacted</option><option value="proposal">Proposal</option><option value="won">Won</option><option value="lost">Lost</option></select></label></article>;
}
function FulfilmentOperation({order,busy,onSave}:{order:OperationOrder;busy:boolean;onSave:(data:{status:'packed'|'dispatched'|'delayed'|'problem';trackingNumber:string;carrier:string;note:string})=>void}){
  const [status,setStatus]=useState<'packed'|'dispatched'|'delayed'|'problem'>(['packed','dispatched','delayed','problem'].includes(order.status)?order.status as 'packed'|'dispatched'|'delayed'|'problem':'packed');
  const [trackingNumber,setTracking]=useState(order.trackingNumber);const [carrier,setCarrier]=useState(order.carrier);const [note,setNote]=useState('');
  return <article className="bk-panel"><span className="bk-eyebrow">{order.ref}</span><h2>{money(order.totalPaise)}</h2><p>Placed {new Date(order.createdAt).toLocaleDateString()} · Payment {order.paymentStatus}</p><div className="bk-form"><label>Fulfilment status<select value={status} onChange={e=>setStatus(e.target.value as typeof status)}><option value="packed">Packed</option><option value="dispatched">Dispatched</option><option value="delayed">Delayed</option><option value="problem">Problem</option></select></label><label>Carrier<input maxLength={100} value={carrier} onChange={e=>setCarrier(e.target.value)}/></label><label>Tracking number<input maxLength={120} value={trackingNumber} onChange={e=>setTracking(e.target.value)}/></label><label>Internal note<input maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label></div><button className="bk-btn" disabled={busy} onClick={()=>onSave({status,trackingNumber,carrier,note})}>{busy?'Updating…':'Save fulfilment'}</button></article>;
}
function ReviewRow({product,busy,onReview}:{product:Product;busy:boolean;onReview:(data:{productId:string;decision:'approved'|'changes';handmade:boolean;material:boolean;photos:boolean;price:boolean;story:boolean;note:string})=>void}){
  const [checks,setChecks]=useState([false,false,false,false,false]);const [note,setNote]=useState('');
  const labels=['Handmade origin confirmed','Materials match description','Photos represent item','Price reviewed','Story / description factual'];
  return <article className="bk-panel"><div style={{display:'flex',gap:18,alignItems:'center'}}><img src={imageUrl(product.image)} alt="" style={{width:88,height:88,objectFit:'cover'}}/><div><h2>{product.name}</h2><p>{product.category} · {money(product.pricePaise)}</p><p>{product.reviewNote}</p></div></div><div>{labels.map((l,i)=><label className="bk-check" key={l}><input type="checkbox" checked={checks[i]} onChange={e=>setChecks(c=>c.map((v,j)=>j===i?e.target.checked:v))}/>{l}</label>)}</div><label>Review note<textarea className="bk-input" maxLength={3000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Record what needs attention."/></label><div style={{display:'flex',gap:8,marginTop:12}}><button className="bk-btn" disabled={busy||!checks.every(Boolean)} onClick={()=>onReview({productId:product.id,decision:'approved',handmade:checks[0],material:checks[1],photos:checks[2],price:checks[3],story:checks[4],note})}>Approve after checks</button><button className="bk-btn secondary" disabled={busy} onClick={()=>onReview({productId:product.id,decision:'changes',handmade:checks[0],material:checks[1],photos:checks[2],price:checks[3],story:checks[4],note})}>Request changes</button></div></article>;
}
