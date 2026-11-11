import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { getState, subscribe } from '../demo/store';
import { openDemoInformation } from '../demo/InformationDialog';
import SampleNote from '../demo/SampleNote';
import { pair, parsePills, resolvePicks, safeExternal, safeRoute, validateWhatsApp } from './content';
import { ProductCard } from './ProductCard';
import { AppLink, Band, Em, Modal, TrunkMark, asset } from './ui';

type V = (key: string) => string;

export function MostGifted({ v }: { v: V }) {
  const s = useSyncExternalStore(subscribe, getState);
  const picks = resolvePicks(s.products, v('h5.picks.gifted'), 4);
  const pills = parsePills(v('h5.copy.gifted.pills'));
  return (
    <section className="h5-section" aria-labelledby="h5-gifted">
      <div className="h5-head-row">
        <div><h2 id="h5-gifted" className="h5-h2"><Em text={v('h5.copy.gifted.title')} /></h2><p className="h5-sub">{v('h5.copy.gifted.sub')}</p></div>
        <AppLink href={v('h5.link.hero.browse')} className="h5-textlink" testId="link-see-all-gifts">{v('h5.copy.gifted.all')}</AppLink>
      </div>
      <div className="h5-grid4" data-testid="grid-most-gifted">
        {picks.map((p, i) => <ProductCard key={p.kind === 'product' ? p.product.id : `pb${i}`} pick={p} v={v} pill={p.kind === 'product' ? pills[p.product.id] : undefined} testPrefix="gifted" />)}
      </div>
    </section>
  );
}

export function MakerSection({ v }: { v: V }) {
  const [read, shop] = pair(v('h5.copy.maker.buttons'));
  const href = v('h5.link.maker');
  return (
    <section className="h5-section h5-maker" aria-labelledby="h5-maker">
      <figure className="h5-maker-photo">
        <span className="h5-dots" aria-hidden="true" />
        <img src={asset(v('h5.image.maker'))} alt={v('h5.copy.maker.alt')} loading="lazy" />
        <figcaption className="h5-tilt">{v('h5.copy.maker.pill')}</figcaption>
      </figure>
      <div>
        <p className="h5-label">{v('h5.copy.maker.label')}</p>
        <h2 id="h5-maker" className="h5-h2"><Em text={v('h5.copy.maker.title')} /></h2>
        <p className="h5-body">{v('h5.copy.maker.body')}</p>
        <p className="h5-italic">{v('h5.copy.maker.note')}</p>
        <div className="h5-btns">
          <AppLink href={href} className="h5-pill" testId="link-read-maker-story">{read}</AppLink>
          <AppLink href={href} className="h5-pill h5-pill--ghost" testId="link-shop-maker">{shop}</AppLink>
        </div>
      </div>
    </section>
  );
}

export function BaksaWay({ v }: { v: V }) {
  const rows = [1, 2, 3].map(n => pair(v(`h5.copy.way.row${n}`)));
  return (
    <section className="h5-section h5-way" aria-labelledby="h5-way">
      <figure className="h5-arch">
        <img src={asset(v('h5.image.way'))} alt={v('h5.copy.way.alt')} loading="lazy" />
        <figcaption className="h5-tilt h5-tilt--right">{v('h5.copy.way.pill')}</figcaption>
      </figure>
      <div>
        <p className="h5-label">{v('h5.copy.way.label')}</p>
        <h2 id="h5-way" className="h5-h2"><Em text={v('h5.copy.way.title')} /></h2>
        <ul className="h5-rows">
          {rows.map(([t, d], i) => (
            <li key={i} className={i === 2 ? 'is-teal' : ''} data-testid={`row-way-${i + 1}`}>
              <span className="h5-rownum" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div><strong>{t}</strong><span>{d}</span></div>
              {i === 2 ? <AppLink href={v('h5.link.way.cta')} className="h5-pill h5-pill--amber" testId="link-start-brief">{v('h5.copy.way.cta')}</AppLink> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Kala({ v }: { v: V }) {
  const [notice, setNotice] = useState(false);
  const [dsdtOpen, setDsdtOpen] = useState(false);
  const dsdt = v('h5.link.dsdt');
  return (
    <section className="h5-kala" id="kala" aria-labelledby="h5-kala">
      <span className="h5-kala-bg" aria-hidden="true" lang="hi">{v('h5.copy.kala.hindi')}</span>
      <div className="h5-kala-inner">
        <div>
          <p className="h5-label h5-label--light">{v('h5.copy.kala.label')}</p>
          <h2 id="h5-kala" className="h5-h2 h5-h2--light">{v('h5.copy.kala.title')}</h2>
          <p className="h5-body h5-body--light">{v('h5.copy.kala.body')}</p>
        </div>
        <div className="h5-ticket" data-testid="card-ticket">
          <div className="h5-ticket-main">
            <p className="h5-caps">{v('h5.copy.kala.admit')}</p>
            <p className="h5-ticket-next">{v('h5.copy.kala.next')}</p>
            <p className="h5-ticket-dates" data-testid="text-event-dates">{v('h5.copy.kala.dates')}</p>
            <button type="button" className="h5-pill" data-testid="button-event-interest" aria-describedby={notice ? 'h5-event-status' : undefined} onClick={() => setNotice(true)}>{v('h5.copy.kala.cta')}</button>
            {notice ? <p id="h5-event-status" role="status" className="h5-notlive" data-testid="status-event-interest">{v('h5.copy.kala.notlive')}</p> : null}
          </div>
          <div className="h5-ticket-stub" aria-hidden="true"><TrunkMark size={34} src={v('h5.image.mark')} /></div>
        </div>
      </div>
      <div className="h5-dsdt">
        <p className="h5-dsdt-hindi" lang="hi">{v('h5.copy.dsdt.hindi')}</p>
        <div><strong>{v('h5.copy.dsdt.title')}</strong><span>{v('h5.copy.dsdt.body')}</span></div>
        {safeExternal(dsdt)
          ? <a className="h5-textlink h5-textlink--light" href={dsdt} target="_blank" rel="noopener noreferrer" data-testid="link-dsdt">{v('h5.copy.dsdt.cta')}</a>
          : <button type="button" className="h5-textlink h5-textlink--light" data-testid="button-dsdt" onClick={() => setDsdtOpen(true)}>{v('h5.copy.dsdt.cta')}</button>}
      </div>
      <Modal open={dsdtOpen} onClose={() => setDsdtOpen(false)} label={v('h5.copy.dsdt.title')} testId="dialog-dsdt">
        <h3>{v('h5.copy.dsdt.title')}</h3>
        <p>{v('h5.copy.dsdt.unavailable')}</p>
        <button type="button" className="h5-pill" data-testid="button-dsdt-close" onClick={() => setDsdtOpen(false)}>Close</button>
      </Modal>
    </section>
  );
}

const ICONS = [
  <path key="a" d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4" />,
  <path key="b" d="M12 20c-4-3-7-6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 4-3 7-7 10zM12 7v9" />,
  <path key="c" d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7 18.5a1.5 1.5 0 1 0 0-.01M17 18.5a1.5 1.5 0 1 0 0-.01" />,
  <path key="d" d="M5 19l1.3-3.6A7.5 7.5 0 1 1 9 18.5zM9 10c.5 2 2.5 4 5 5" />,
];

export function PromiseRow({ v }: { v: V }) {
  return (
    <section className="h5-promise" aria-label="Our promise">
      {[1, 2, 3, 4].map((n, i) => {
        const [t, d] = pair(v(`h5.copy.promise${n}`));
        return (
          <div key={n} data-testid={`promise-${n}`}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#34514B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[i]}</svg>
            <strong>{t}</strong><span>{d}</span>
          </div>
        );
      })}
    </section>
  );
}

export function Footer({ v }: { v: V }) {
  const columns = [1, 2, 3, 4].map(number => {
    const [h, ...items] = v(`h5.copy.foot.column${number}`).split('|');
    const links = items.filter(item => item.includes('=>')).map(item => {
      const i = item.indexOf('=>');
      return [item.slice(0, i).trim(), item.slice(i + 2).trim()] as [string, string];
    }).filter(([label, href]) => label && (safeRoute(href) || safeExternal(href) || /^#(kala|orders|returns|faq|contact|email|whatsapp|instagram)$/.test(href)));
    return { h, links };
  });
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notLive, setNotLive] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateWhatsApp(phone);
    setError(err); setNotLive(!err);
  };
  return (
    <footer className="h5-footer" data-testid="site-footer">
      <div className="h5-footer-top">
        <div>
          <p className="h5-gold-hindi" lang="hi">{v('h5.copy.foot.hindi')}</p>
          <h2 className="h5-foot-title"><Em text={v('h5.copy.foot.title')} /></h2>
          <p className="h5-body h5-body--light">{v('h5.copy.foot.body')}</p>
        </div>
        <form className="h5-postcard" onSubmit={submit} noValidate data-testid="form-signup">
          <span className="h5-stamp" aria-hidden="true"><TrunkMark size={36} src={v('h5.image.mark')} /></span>
          <span className="h5-postmark" aria-hidden="true" />
          <p className="h5-caps">{v('h5.copy.foot.card')}</p>
          <p className="h5-italic">{v('h5.copy.foot.dear')}</p>
          <label htmlFor="h5-wa" className="h5-sr">WhatsApp number</label>
          <div className="h5-wa">
            <span>+91</span>
            <input id="h5-wa" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="WhatsApp number" value={phone}
              aria-invalid={!!error} aria-describedby={error ? 'h5-wa-err' : notLive ? 'h5-wa-status' : undefined}
              data-testid="input-signup-whatsapp" onChange={e => { setPhone(e.target.value); setNotLive(false); }} />
            <button type="submit" className="h5-pill" data-testid="button-signup">{v('h5.copy.foot.button')}</button>
          </div>
          {error ? <p id="h5-wa-err" role="alert" className="h5-err" data-testid="error-signup">{error}</p> : null}
          {notLive ? <p id="h5-wa-status" role="status" className="h5-notlive" data-testid="status-signup">{v('h5.copy.foot.notlive')}</p> : null}
          <p className="h5-small">{v('h5.copy.foot.nospam')}</p>
        </form>
      </div>
      <nav className="h5-foot-cols" aria-label="Footer">
        {columns.map(c => (
          <div key={c.h}>
            <p className="h5-foot-h">{c.h}</p>
            <ul>{c.links.map(([label, href]) => (
              <li key={label}>
                {href.startsWith('/')
                  ? <AppLink href={href} testId={`link-footer-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{label}</AppLink>
                  : safeExternal(href) ? <a href={href} rel="noopener noreferrer">{label}</a>
                  : <a href={href} data-testid={`link-footer-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={e => {
                      e.preventDefault(); const id = href.slice(1);
                      if (id === 'kala') document.getElementById('kala')?.scrollIntoView({ behavior: 'smooth' }); else openDemoInformation(id, label);
                    }}>{label}</a>}
              </li>
            ))}</ul>
          </div>
        ))}
      </nav>
      <div className="h5-foot-base">
        <span>{v('h5.copy.foot.payments')}</span>
        <span>{v('h5.copy.foot.copyright')}</span>
      </div>
      <SampleNote inline />
      <Band tone="gold" />
    </footer>
  );
}
