import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetSalesReadiness, useGetSalesOrders, useUpdateSalesOrder,
  getGetSalesOrdersQueryKey, type OperationOrder, type SalesFulfilmentInput,
} from '@workspace/api-client-react';
import { errText, money } from './storefront-shared';
import './sales-operations.css';

/** Uses the existing account shell, never the sample dashboard session. */
export default function SalesOperations({ path, userId }: { path: string; userId: string }) {
  const readiness = useGetSalesReadiness({ query: { staleTime: 30_000 } });
  const [search, setSearch] = useState('');
  const showOrders = path === '/admin/operations';
  const queryKey = [...getGetSalesOrdersQueryKey(), userId];
  const orders = useGetSalesOrders({ query: {
    queryKey, enabled: showOrders, staleTime: 0, refetchOnWindowFocus: true, refetchInterval: 30_000,
  } });
  const client = useQueryClient();
  const mutation = useUpdateSalesOrder();
  const [message, setMessage] = useState('');
  const visible = (orders.data?.orders ?? []).filter(order =>
    [order.ref, order.productName, order.deliveryName, order.trackingNumber].join(' ').toLowerCase().includes(search.toLowerCase()));

  if (!showOrders) return <div data-testid="sales-launch-checks">
    <div className="bk-panel">
      <h2>Sales launch checks</h2>
      <p>Real checkout is disabled. Sample orders are demonstrations, not purchases. These checks do not authorize publishing or live charges.</p>
      {readiness.isPending ? <p role="status">Checking launch prerequisites…</p> : readiness.isError
        ? <p className="bk-errorbox" role="alert">{errText(readiness.error)}</p>
        : <><p>Development project authorization: <strong>{readiness.data.developmentAuthorized ? 'Confirmed in server configuration' : 'Not confirmed'}</strong></p>
          <p>Reviewed sales schema: <strong>{readiness.data.schemaReady ? 'Detected' : 'Not verified'}</strong></p>
          <p>Approved sales listings: <strong>{readiness.data.approvedProducts}</strong></p>
          <ul>{readiness.data.blockers.map(item => <li key={item}>{item}</li>)}</ul></>}
      <button className="bk-btn secondary" onClick={() => void readiness.refetch()}>Recheck setup</button>
    </div>
    <div className="bk-panel"><h2>Keep the first release focused.</h2><p>Launch with approved products and manual order handling first. SMS, WhatsApp, couriers, CRM, live classes and advanced dashboards are not prerequisites for this build to be handed over.</p><a className="bk-textlink" href="/admin/operations">Open development order operations →</a></div>
  </div>;

  return <div data-testid="sales-order-operations">
    <p className="bk-muted">Authorized development records only. Manual updates do not book couriers, collect payments, issue refunds or transfer payouts.</p>
    <label>Find an order<input className="bk-input" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Order reference, recipient or tracking number" /></label>
    <button className="bk-btn secondary" style={{ margin: '12px 0' }} onClick={() => void orders.refetch()}>Refresh orders</button>
    {message && <p role="status">{message}</p>}
    {mutation.isError && <p className="bk-errorbox" role="alert">{errText(mutation.error)}</p>}
    {orders.isPending ? <p role="status">Loading development orders…</p> : orders.isError
      ? <div className="bk-errorbox" role="alert"><h2>Order operations are not available.</h2><p>{errText(orders.error)}</p><a href="/admin/launch">Review launch setup →</a></div>
      : visible.length ? visible.map(order => <OrderRow key={`${order.id}:${order.status}:${order.trackingNumber}`} order={order} busy={mutation.isPending} save={data => {
        setMessage('');
        mutation.mutate({ id: order.id, data }, { onSuccess: result => {
          setMessage(result.message);
          void client.invalidateQueries({ queryKey: getGetSalesOrdersQueryKey() });
        } });
      }} />) : <div className="bk-empty"><h2>{search ? 'No matching order.' : 'No development orders yet.'}</h2><p>{search ? 'Try another reference or recipient.' : 'Only saved records appear here; no example orders have been added.'}</p></div>}
  </div>;
}

function OrderRow({ order, busy, save }: { order: OperationOrder; busy: boolean; save: (input: SalesFulfilmentInput) => void }) {
  const possible: SalesFulfilmentInput['status'][] = order.status === 'new' || order.status === 'delayed'
    ? ['packed', 'delayed', 'problem'] : order.status === 'packed'
      ? ['dispatched', 'delayed', 'problem'] : order.status === 'dispatched' ? ['delivered', 'problem'] : [];
  const [status, setStatus] = useState<SalesFulfilmentInput['status']>(possible[0] ?? 'problem');
  const [carrier, setCarrier] = useState(order.carrier);
  const [trackingNumber, setTracking] = useState(order.trackingNumber);
  const [note, setNote] = useState('');
  const paid = ['paid', 'cod_pending'].includes(order.paymentStatus);
  return <article className="bk-panel" data-testid="sales-order">
    <span className="bk-eyebrow">{order.ref} · {order.status}</span>
    <h2>{order.productName || 'Order line'} {order.quantity ? `× ${order.quantity}` : ''}</h2>
    <p>{money(order.totalPaise)} · Payment: <strong>{order.paymentStatus}</strong></p>
    {order.deliveryName && <p>{order.deliveryName}<br />{order.deliveryAddress}<br />{order.deliveryPhone}</p>}
    <p><strong>Gift note:</strong> {order.giftNote || 'No gift note supplied.'}</p>
    {order.issueNote && <p><strong>Delay or problem:</strong> {order.issueNote}</p>}
    {!paid ? <p>Payment has not been confirmed. Packing and dispatch are blocked.</p> : !possible.length
      ? <p>No further manual fulfilment action is available for this status.</p>
      : <form className="bk-form" onSubmit={event => { event.preventDefault(); save({ status, carrier, trackingNumber, note }); }}>
        <label>Next step<select aria-label="Next step" value={status} onChange={event => setStatus(event.target.value as typeof status)}>{possible.map(value => <option key={value} value={value}>{value === 'dispatched' ? 'On the way' : value}</option>)}</select></label>
        <label>Courier<input maxLength={100} required={status === 'dispatched'} value={carrier} onChange={event => setCarrier(event.target.value)} /></label>
        <label>Tracking number<input maxLength={120} required={status === 'dispatched'} value={trackingNumber} onChange={event => setTracking(event.target.value)} /></label>
        <label>Buyer-visible delay or problem note<textarea maxLength={1000} required={['problem', 'delayed'].includes(status)} value={note} onChange={event => setNote(event.target.value)} /></label>
        <button className="bk-btn" disabled={busy}>{busy ? 'Saving…' : 'Save fulfilment update'}</button>
      </form>}
    <p className="bk-muted">Payment/refund status is read-only here. “Delivered” records manual confirmation, not a courier scan or a payout.</p>
  </article>;
}
