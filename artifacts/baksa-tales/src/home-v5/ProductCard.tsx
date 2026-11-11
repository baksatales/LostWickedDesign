import { useSyncExternalStore } from 'react';
import { formatINR, getState, imgUrl, makerById, subscribe, toggleWishlist, update } from '../demo/store';
import { pair, triple, type Pick } from './content';
import { AppLink, asset } from './ui';

type V = (key: string) => string;

export function ProductCard({ pick, v, pill, testPrefix }: { pick: Pick; v: V; pill?: string; testPrefix: string }) {
  const s = useSyncExternalStore(subscribe, getState);
  const [sampleLabel] = pair(v('h5.copy.sample'));
  if (pick.kind === 'popbani') {
    const [maker, name, cta] = triple(v('h5.copy.popbani'));
    return (
      <article className="h5-card" data-testid={`${testPrefix}-popbani`}>
        <AppLink href="/shop" className="h5-card-link">
          <div className="h5-card-img"><img src={asset(v('h5.image.way'))} alt={name} loading="lazy" /></div>
          <p className="h5-card-maker">{maker}</p>
          <p className="h5-card-name">{name}</p>
          <p className="h5-card-price h5-card-price--muted">{cta} ↗</p>
        </AppLink>
      </article>
    );
  }
  const p = pick.product;
  const saved = s.wishlist.includes(p.id);
  const custom = v('h5.copy.productLabels').split('|').find(item => item.startsWith(`${p.id}=>`))?.split('=>')[1]?.split('~');
  const makerLabel = custom?.[0]?.trim() || makerById(s, p.makerId)?.brand;
  const productLabel = custom?.[1]?.trim() || p.name;
  return (
    <article className="h5-card" data-testid={`${testPrefix}-${p.id}`}>
      <AppLink href={`/product/${p.slug}`} className="h5-card-link">
        <div className="h5-card-img"><img src={v(`h5.image.product.${p.id}`) ? asset(v(`h5.image.product.${p.id}`)) : imgUrl(p.img)} alt={productLabel} loading="lazy" />{pill ? <span className="h5-card-pill">{pill}</span> : null}</div>
        <p className="h5-card-maker">{makerLabel}</p>
        <p className="h5-card-name">{productLabel}</p>
        <p className="h5-card-price"><span data-testid={`text-price-${testPrefix}-${p.id}`}>{formatINR(p.pricePaise)}</span> <span className="h5-sample">{sampleLabel}</span></p>
      </AppLink>
      <button type="button" className="h5-heart" aria-pressed={saved} aria-label={saved ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`}
        data-testid={`button-wishlist-${testPrefix}-${p.id}`} onClick={() => update(x => toggleWishlist(x, p.id))}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" /></svg>
      </button>
    </article>
  );
}
