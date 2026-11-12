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
  const makers = getState().makers;
  const storySlug = info?.topic.startsWith('story-') ? info.topic.slice('story-'.length) : '';
  const storyMaker = storySlug ? makers.find(maker => maker.slug === storySlug) : undefined;
  const allStories = info?.topic === 'all-tales'
    ? makers.map(maker => `${maker.brand}: ${maker.story}`).join('\n\n')
    : '';
  const text = !info ? '' : info.topic === 'orders'
    ? order ? `Sample order ${order.ref}. Your demo order summary is saved in this browser only. No real order has been placed.` : 'No checkout has been completed in this browser. Complete the sample checkout to create a demo order summary.'
    : info.topic === 'returns' ? 'The approved screens do not include a confirmed shipping and returns policy. These details need to be supplied before launch.'
    : info.topic === 'all-tales' ? `Maker stories in this preview:\n\n${allStories}`
    : storyMaker ? `${storyMaker.story}\n\n${storyMaker.bio}\n\nThis preview shows the maker story as text; video playback is not connected.`
    : info.topic === 'kala-samagam' ? 'Kala Samāgam dates are not announced in this preview. Event registration and invitations are not connected.'
    : info.topic === 'newsletter' ? 'Newsletter sign-up is not connected in this preview. No contact details are saved or sent.'
    : ['whatsapp', 'email', 'instagram', 'contact'].includes(info.topic) ? 'This contact service is not connected in the demo. No message is sent. A confirmed contact destination and integration are required before launch.'
    : 'This is a frontend demonstration. Live support and confirmed answers need to be connected before launch.';
  return (
    <dialog ref={ref} className="bt-information" aria-labelledby="information-title" onClose={() => setInfo(null)} onClick={e => { if (e.target === ref.current) ref.current?.close(); }}>
      <h2 id="information-title">{info?.title}</h2>
       <p style={{ whiteSpace: 'pre-line' }}>{text}</p>
      <p className="bt-information-note">Sample data</p>
      <button type="button" className="bt-btn-outline" onClick={() => ref.current?.close()}>Close</button>
    </dialog>
  );
}
