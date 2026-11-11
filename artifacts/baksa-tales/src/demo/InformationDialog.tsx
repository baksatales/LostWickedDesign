import { useEffect, useRef, useState } from 'react';
import { getState } from './store';

export const DEMO_INFO_EVENT = 'baksa:demo-information';
export function openDemoInformation(topic: string, title: string) {
  window.dispatchEvent(new CustomEvent(DEMO_INFO_EVENT, { detail: { topic, title } }));
}

/** Source links with no supplied destination disclose the missing service rather
 * than silently doing nothing or inventing a policy/contact address. */
export default function InformationDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [info, setInfo] = useState<{ topic: string; title: string } | null>(null);
  useEffect(() => {
    const listener = (event: Event) => setInfo((event as CustomEvent).detail);
    window.addEventListener(DEMO_INFO_EVENT, listener);
    return () => window.removeEventListener(DEMO_INFO_EVENT, listener);
  }, []);
  useEffect(() => {
    if (info) ref.current?.showModal();
  }, [info]);
  const order = getState().checkout.lastOrder;
  const text = !info ? '' : info.topic === 'orders'
    ? order ? `Sample order ${order.ref}. Your demo order summary is saved in this browser only. No real order has been placed.` : 'No checkout has been completed in this browser. Complete the sample checkout to create a demo order summary.'
    : info.topic === 'returns' ? 'The approved screens do not include a confirmed shipping and returns policy. These details need to be supplied before launch.'
    : ['whatsapp', 'email', 'instagram', 'contact'].includes(info.topic) ? 'This contact service is not connected in the demo. No message is sent. A confirmed contact destination and integration are required before launch.'
    : 'This is a frontend demonstration. Live support and confirmed answers need to be connected before launch.';
  return (
    <dialog ref={ref} className="bt-information" aria-labelledby="information-title" onClose={() => setInfo(null)} onClick={e => { if (e.target === ref.current) ref.current?.close(); }}>
      <h2 id="information-title">{info?.title}</h2>
      <p>{text}</p>
      <p className="bt-information-note">Sample data</p>
      <button type="button" className="bt-btn-outline" onClick={() => ref.current?.close()}>Close</button>
    </dialog>
  );
}
