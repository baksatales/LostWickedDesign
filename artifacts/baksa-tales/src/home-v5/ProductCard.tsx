import { useSyncExternalStore, type CSSProperties } from 'react';
import { formatINR, getState, imgUrl, makerById, subscribe, toggleWishlist, update } from '../demo/store';
import { triple, type Pick } from './content';
import { AppLink, asset } from './ui';

type V = (key: string) => string;

/** Tile background per product, as painted in the approved source. */
export const TILE_BG: Record<string, string> = {
  'sv-divya': '#E9DFF0', popbani: '#F7D9CF', 't-bluelotus': '#D5E6DE', 't-message': '#F7D9CF', 't-marigold': '#FBE3B2',
  't-teapot': '#F7D9CF', 't-lotuspond': '#D5E6DE', 'an-range': '#E9DFF0', 'mu-box': '#FBE3B2',
};
const ARVO = 'Arvo, Georgia, serif';
const HEART = 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z';

function useLabels(v: V, pick: Pick) {
  const s = useSyncExternalStore(subscribe, getState);
  if (pick.kind === 'popbani') {
    const [maker, name, cta] = triple(v('h5.copy.popbani'));
    return { s, id: 'popbani', maker, name, price: cta, href: '/shop', img: asset(v('h5.image.product.popbani')) };
  }
  const p = pick.product;
  const custom = v('h5.copy.productLabels').split('|').find(item => item.startsWith(`${p.id}=>`))?.split('=>')[1]?.split('~');
  const own = v(`h5.image.product.${p.id}`);
  return {
    s, id: p.id, maker: custom?.[0]?.trim() || makerById(s, p.makerId)?.brand || '', name: custom?.[1]?.trim() || p.name,
    price: formatINR(p.pricePaise), href: `/product/${p.slug}`, img: own ? asset(own) : imgUrl(p.img),
  };
}

/** Small card inside the open-compartment edit panel. */
export function EditCard({ pick, v, testPrefix }: { pick: Pick; v: V; testPrefix: string }) {
  const l = useLabels(v, pick);
  return (
    <AppLink href={l.href} className="card" testId={`${testPrefix}-${l.id}`} style={{ display: 'block', textDecoration: 'none', color: '#2B1712' }}>
      <span style={{ display: 'block', aspectRatio: '1', borderRadius: 14, overflow: 'hidden', background: TILE_BG[l.id] ?? '#F7D9CF' }}>
        <img src={l.img} alt={l.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </span>
      <span style={{ display: 'block', marginTop: 10, fontFamily: ARVO, fontSize: 11, color: '#34514B' }}>{l.maker}</span>
      <span className="pname" style={{ display: 'block', fontSize: 21, lineHeight: 1.15 }}>{l.name}</span>
      <span style={{ display: 'block', marginTop: 2, fontFamily: ARVO, fontSize: 13 }} data-testid={`text-price-${testPrefix}-${l.id}`}>{l.price}</span>
    </AppLink>
  );
}

/** Large shop-window card in Most gifted, with a working guest wishlist heart. */
export function GiftedCard({ pick, v, pill, bg }: { pick: Pick; v: V; pill?: string; bg: string }) {
  const l = useLabels(v, pick);
  const saved = l.s.wishlist.includes(l.id);
  const heart: CSSProperties = { position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: '50%', border: 0, background: '#FFFDF4', color: '#611811', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
  return (
    <div className="card" data-testid={`gifted-${l.id}`}>
      <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 24, overflow: 'hidden', background: bg }}>
        <img src={l.img} alt={l.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {pill ? <span style={{ position: 'absolute', left: 12, bottom: 12, background: '#FFFDF4', borderRadius: 999, padding: '6px 12px', fontFamily: ARVO, fontSize: 11, color: '#611811' }}>{pill}</span> : null}
        {pick.kind === 'product' ? (
          <button type="button" style={heart} aria-pressed={saved} aria-label={saved ? `Remove ${l.name} from wishlist` : `Save ${l.name} to wishlist`}
            data-testid={`button-wishlist-gifted-${l.id}`} onClick={() => update(x => toggleWishlist(x, l.id))}>
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d={HEART} fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" /></svg>
          </button>
        ) : null}
      </div>
      <p style={{ margin: '14px 0 0', fontFamily: ARVO, fontSize: 12, color: '#34514B' }}>{l.maker}</p>
      <AppLink href={l.href} className="pname" testId={`link-gifted-${l.id}`} style={{ display: 'block', fontSize: 24, color: '#2B1712', textDecoration: 'none' }}>{l.name}</AppLink>
      <p style={{ margin: '2px 0 0', fontFamily: ARVO, fontSize: 14 }} data-testid={`text-price-gifted-${l.id}`}>{l.price}</p>
    </div>
  );
}
