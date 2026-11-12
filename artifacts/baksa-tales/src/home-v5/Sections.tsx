import { useState, useSyncExternalStore, type CSSProperties, type FormEvent } from 'react';
import { getState, subscribe } from '../demo/store';
import { openDemoInformation } from '../demo/InformationDialog';
import { pair, parsePills, resolvePicks, safeExternal, safeRoute, validateWhatsApp } from './content';
import { GiftedCard } from './ProductCard';
import { AppLink, Band, Em, Modal, asset } from './ui';

type V = (key: string) => string;
const ARVO = 'Arvo, Georgia, serif';
const DEVA = "'Noto Serif Devanagari', serif";
const ACCENT = '#C23A36';
const twoCol = (min: number, gap: string): CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`, gap, alignItems: 'center' });
const wrap = (padding: string): CSSProperties => ({ position: 'relative', maxWidth: 1280, margin: '0 auto', padding });
const pillTag: CSSProperties = { position: 'absolute', background: '#FFFDF4', border: '1.5px solid #DCCAB0', borderRadius: 999, padding: '10px 18px', fontFamily: ARVO, fontSize: 12, transform: 'rotate(-4deg)' };
const h2Big: CSSProperties = { margin: '10px 0 0', fontSize: 'clamp(42px, 4.8vw, 66px)', fontWeight: 500, lineHeight: 1 };
const linkArvo: CSSProperties = { fontFamily: ARVO, fontSize: 14 };

export function MostGifted({ v }: { v: V }) {
  const s = useSyncExternalStore(subscribe, getState);
  const picks = resolvePicks(s.products, v('h5.picks.gifted'), 4);
  const pills = parsePills(v('h5.copy.gifted.pills'));
  const bgs = ['#D5E6DE', '#FBE3B2', '#F7D9CF', '#E9DFF0'];
  return (
    <section id="shop" aria-labelledby="h5-gifted" style={wrap('96px 32px 24px')}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'end', gap: 16, marginBottom: 34 }}>
        <div>
          <h2 id="h5-gifted" style={{ margin: 0, fontSize: 'clamp(40px, 4.4vw, 60px)', fontWeight: 500, lineHeight: 1 }}><Em text={v('h5.copy.gifted.title')} color={ACCENT} /></h2>
          <p style={{ margin: '8px 0 0', fontSize: 19, color: '#5C463C' }}>{v('h5.copy.gifted.sub')}</p>
        </div>
        <AppLink href={v('h5.link.hero.browse')} testId="link-see-all-gifts" style={linkArvo}>{v('h5.copy.gifted.all')}</AppLink>
      </div>
      <div data-testid="grid-most-gifted" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '36px 24px' }}>
        {picks.map((p, i) => <GiftedCard key={p.kind === 'product' ? p.product.id : `pb${i}`} pick={p} v={v} bg={bgs[i % 4]} pill={p.kind === 'product' ? pills[p.product.id] : undefined} />)}
      </div>
    </section>
  );
}

const DOTS = Array.from({ length: 48 }, (_, i) => {
  const a = (i / 48) * Math.PI * 2;
  return [+(100 + 92 * Math.cos(a)).toFixed(1), +(100 + 92 * Math.sin(a)).toFixed(1)];
});

export function MakerSection({ v }: { v: V }) {
  const [read, shop] = pair(v('h5.copy.maker.buttons'));
  const href = v('h5.link.maker');
  return (
    <section id="makers" aria-labelledby="h5-maker" style={wrap('104px 32px 104px')}>
      <div style={twoCol(420, '48px 88px')}>
        <div style={{ position: 'relative', maxWidth: 520, width: '100%', justifySelf: 'center', aspectRatio: '1' }}>
          <svg viewBox="0 0 200 200" aria-hidden="true" style={{ position: 'absolute', inset: '-6%', width: '112%', height: '112%' }}>
            <g fill="#F7D9CF" stroke={ACCENT} strokeWidth="1.2">{DOTS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.2" />)}</g>
            <circle cx="100" cy="100" r="86" fill="none" stroke={ACCENT} strokeWidth="1.4" />
          </svg>
          <div style={{ position: 'absolute', inset: '7%', borderRadius: '50%', overflow: 'hidden', background: '#F7D9CF' }}>
            <img src={asset(v('h5.image.maker'))} alt={v('h5.copy.maker.alt')} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <span style={{ ...pillTag, right: 0, bottom: '8%', color: '#34514B' }}>{v('h5.copy.maker.pill')}</span>
        </div>
        <div>
          <p style={{ margin: 0, fontFamily: ARVO, fontSize: 13, color: '#34514B' }}>{v('h5.copy.maker.label')}</p>
          <h2 id="h5-maker" style={h2Big}><Em text={v('h5.copy.maker.title')} color={ACCENT} /></h2>
          <p style={{ margin: '24px 0 0', fontSize: 21, lineHeight: 1.6, color: '#5C463C', maxWidth: '28em' }}>{v('h5.copy.maker.body')}</p>
          <p style={{ margin: '22px 0 0', fontSize: 18, color: '#2B1712' }}><em>{v('h5.copy.maker.note')}</em></p>
          <div style={{ marginTop: 30, display: 'flex', flexWrap: 'wrap', gap: '14px 26px', alignItems: 'center' }}>
            <AppLink href={href} className="btn" testId="link-read-maker-story" style={{ display: 'inline-flex', alignItems: 'center', height: 54, padding: '0 28px', borderRadius: 999, background: '#611811', color: '#FFF8EC', textDecoration: 'none', fontFamily: ARVO, fontSize: 14 }}>{read}</AppLink>
            <AppLink href={href} testId="link-shop-maker" style={linkArvo}>{shop}</AppLink>
          </div>
        </div>
      </div>
    </section>
  );
}

const WAY_ICONS = [
  <svg key="1" width="26" height="26" viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="12" width="32" height="24" rx="2" fill="none" stroke="#611811" strokeWidth="2.4" /><path d="M8 14l16 12 16-12" fill="none" stroke="#611811" strokeWidth="2.4" /></svg>,
  <svg key="2" width="26" height="26" viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="19" width="30" height="20" rx="2" fill="none" stroke="#611811" strokeWidth="2.4" /><path d="M7 14h34v6H7zM24 14v25M24 14c-3-6-11-6-9 0M24 14c3-6 11-6 9 0" fill="none" stroke="#611811" strokeWidth="2.4" strokeLinejoin="round" /></svg>,
  <svg key="3" width="26" height="26" viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="16" width="32" height="22" rx="2" fill="none" stroke="#F6EBD3" strokeWidth="2.4" /><path d="M18 16v-4h12v4M8 26h32" fill="none" stroke="#F6EBD3" strokeWidth="2.4" /></svg>,
];

export function BaksaWay({ v }: { v: V }) {
  const rows = [1, 2, 3].map(n => pair(v(`h5.copy.way.row${n}`)));
  return (
    <section id="corporate" aria-labelledby="h5-way" style={wrap('24px 32px 104px')}>
      <div style={twoCol(420, '48px 80px')}>
        <div style={{ position: 'relative' }}>
          <div style={{ aspectRatio: '4 / 4.4', borderRadius: '999px 999px 24px 24px', overflow: 'hidden', background: '#F7D9CF' }}>
            <img src={asset(v('h5.image.way'))} alt={v('h5.copy.way.alt')} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <span style={{ ...pillTag, left: -12, bottom: 30, color: '#611811' }}>{v('h5.copy.way.pill')}</span>
        </div>
        <div>
          <p style={{ margin: 0, fontFamily: ARVO, fontSize: 13, color: '#34514B' }}>{v('h5.copy.way.label')}</p>
          <h2 id="h5-way" style={h2Big}><Em text={v('h5.copy.way.title')} color={ACCENT} /></h2>
          <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {rows.map(([t, d], i) => {
              const teal = i === 2;
              return (
                <div key={i} data-testid={`row-way-${i + 1}`} style={{ display: 'grid', gridTemplateColumns: teal ? '56px 1fr auto' : '56px 1fr', gap: 16, alignItems: 'center', background: teal ? '#34514B' : '#FFFDF4', color: teal ? '#F6EBD3' : undefined, border: teal ? undefined : '1px solid #E8D9BE', borderRadius: 18, padding: '16px 18px' }}>
                  <span style={{ width: 52, height: 52, borderRadius: '50%', background: teal ? 'rgba(246,235,211,.14)' : i === 0 ? '#F7D9CF' : '#FBE3B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{WAY_ICONS[i]}</span>
                  <div><p style={{ margin: 0, fontSize: 23 }}>{t}</p><p style={{ margin: '2px 0 0', fontSize: 17, color: teal ? 'rgba(246,235,211,.85)' : '#5C463C' }}>{d}</p></div>
                  {teal ? <AppLink href={v('h5.link.way.cta')} testId="link-start-brief" style={{ display: 'inline-flex', alignItems: 'center', height: 46, padding: '0 18px', borderRadius: 999, background: '#EBA937', color: '#2B1712', textDecoration: 'none', fontFamily: ARVO, fontSize: 13, whiteSpace: 'nowrap' }}>{v('h5.copy.way.cta')}</AppLink> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Kala({ v }: { v: V }) {
  const [notice, setNotice] = useState(false);
  const [dsdtOpen, setDsdtOpen] = useState(false);
  const dsdt = v('h5.link.dsdt');
  const dsdtStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '12px 32px', alignItems: 'center', padding: '24px 30px', border: '1px solid rgba(246,235,211,.3)', borderRadius: 20, textDecoration: 'none', color: '#F6EBD3', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit' };
  const dsdtInner = (
    <>
      <span><span lang="hi" style={{ display: 'block', fontFamily: DEVA, fontSize: 28, color: '#EBA937', lineHeight: 1.3 }}>{v('h5.copy.dsdt.hindi')}</span><span style={{ display: 'block', fontFamily: ARVO, fontSize: 12, marginTop: 2 }}>{v('h5.copy.dsdt.title')}</span></span>
      <span style={{ fontSize: 20, lineHeight: 1.45, color: 'rgba(246,235,211,.9)' }}><Em text={v('h5.copy.dsdt.body').replace(/(\[[^\]]+\])/, '*$1*')} /></span>
      <span style={{ justifySelf: 'end', fontFamily: ARVO, fontSize: 13, color: '#EBA937' }}>{v('h5.copy.dsdt.cta')}</span>
    </>
  );
  return (
    <section id="kala" aria-labelledby="h5-kala" style={{ position: 'relative', background: '#34514B', color: '#F6EBD3', overflow: 'hidden' }}>
      <p lang="hi" aria-hidden="true" style={{ position: 'absolute', right: -30, top: 30, margin: 0, fontFamily: DEVA, fontSize: 200, lineHeight: 1, color: 'rgba(235,169,55,.12)', whiteSpace: 'nowrap' }}>{v('h5.copy.kala.hindi')}</p>
      <div style={{ ...wrap('96px 32px 80px'), ...twoCol(420, '48px 72px') }}>
        <div>
          <p style={{ margin: 0, fontFamily: ARVO, fontSize: 13, color: '#EBA937' }}>{v('h5.copy.kala.label')}</p>
          <h2 id="h5-kala" style={{ margin: '10px 0 0', fontSize: 'clamp(46px, 5.4vw, 80px)', fontWeight: 500, lineHeight: 1 }}>{v('h5.copy.kala.title')}</h2>
          <p style={{ margin: '20px 0 0', fontSize: 22, lineHeight: 1.55, maxWidth: '26em', color: 'rgba(246,235,211,.92)' }}>{v('h5.copy.kala.body')}</p>
        </div>
        <div data-testid="card-ticket" style={{ display: 'flex', background: '#F6F3DF', color: '#2B1712', borderRadius: 20, overflow: 'hidden', transform: 'rotate(1.5deg)', boxShadow: '0 30px 50px -28px rgba(0,0,0,.6)' }}>
          <div style={{ flex: '1 1 auto', padding: '28px 28px 26px' }}>
            <p style={{ margin: 0, fontFamily: ARVO, fontSize: 11, letterSpacing: '.14em', color: '#34514B', textTransform: 'uppercase' }}>{v('h5.copy.kala.admit')}</p>
            <p style={{ margin: '10px 0 0', fontSize: 30, lineHeight: 1.1 }}>{v('h5.copy.kala.next')}</p>
            <p style={{ margin: '6px 0 0', fontSize: 21, color: '#5C463C' }} data-testid="text-event-dates">{v('h5.copy.kala.dates')}</p>
            <button type="button" className="btn" data-testid="button-event-interest" aria-describedby={notice ? 'h5-event-status' : undefined} onClick={() => setNotice(true)}
              style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', height: 50, padding: '0 24px', borderRadius: 999, border: 0, background: '#611811', color: '#FFF8EC', fontFamily: ARVO, fontSize: 13, cursor: 'pointer' }}>{v('h5.copy.kala.cta')}</button>
            {notice ? <p id="h5-event-status" role="status" className="h5-notlive" data-testid="status-event-interest">{v('h5.copy.kala.notlive')}</p> : null}
          </div>
          <div aria-hidden="true" style={{ flex: '0 0 92px', borderLeft: '3px dotted #CDB79A', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FBE3B2' }}>
            <img src={asset(v('h5.image.mark'))} alt="" style={{ width: 56, height: 'auto', transform: 'rotate(-90deg)' }} />
          </div>
        </div>
      </div>
      <div id="dsdt" style={wrap('0 32px 88px')}>
        {safeExternal(dsdt)
          ? <a href={dsdt} target="_blank" rel="noopener noreferrer" data-testid="link-dsdt" style={dsdtStyle}>{dsdtInner}</a>
          : <button type="button" data-testid="button-dsdt" onClick={() => setDsdtOpen(true)} style={dsdtStyle}>{dsdtInner}</button>}
      </div>
      <Modal open={dsdtOpen} onClose={() => setDsdtOpen(false)} label={v('h5.copy.dsdt.title')} testId="dialog-dsdt">
        <h3>{v('h5.copy.dsdt.title')}</h3>
        <p>{v('h5.copy.dsdt.unavailable')}</p>
        <button type="button" className="h5-pill" data-testid="button-dsdt-close" onClick={() => setDsdtOpen(false)}>Close</button>
      </Modal>
    </section>
  );
}

const T = { fill: 'none', stroke: '#34514B', strokeWidth: 1.5 };
const PROMISE_ICONS = [
  <><circle cx="12" cy="12" r="9" {...T} /><path d="M8 12.5l2.6 2.5L16 9.5" {...T} /></>,
  <path d="M12 3c3 4 6 6 6 10a6 6 0 0 1-12 0c0-4 3-6 6-10z" {...T} />,
  <><path d="M3 7h12v9H3zM15 10h4l2 3v3h-6" {...T} strokeLinejoin="round" /><circle cx="7" cy="17.5" r="1.6" {...T} /><circle cx="17" cy="17.5" r="1.6" {...T} /></>,
  <path d="M5 19l1.2-3.6A7.5 7.5 0 1 1 9 18.3z" {...T} strokeLinejoin="round" />,
];

export function PromiseRow({ v }: { v: V }) {
  return (
    <section aria-label="Our promise" style={{ position: 'relative', padding: '52px 0 68px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: '24px 32px' }}>
        {[1, 2, 3, 4].map((n, i) => {
          const [t, d] = pair(v(`h5.copy.promise${n}`));
          return (
            <div key={n} data-testid={`promise-${n}`} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}>{PROMISE_ICONS[i]}</svg>
              <div><p style={{ margin: 0, fontSize: 21 }}>{t}</p><p style={{ margin: '2px 0 0', fontSize: 16, color: '#5C463C' }}>{d}</p></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const SCALLOP = `M0 40 ${Array.from({ length: 24 }, (_, i) => `Q ${i * 60 + 30} 0 ${i * 60 + 60} 40`).join(' ')} Z`;
const HASH_OK = /^#(kala|dsdt|orders|returns|faq|contact|email|whatsapp|instagram)$/;

export function Footer({ v }: { v: V }) {
  const columns = [1, 2, 3, 4].map(number => {
    const [h, ...items] = v(`h5.copy.foot.column${number}`).split('|');
    const links = items.filter(item => item.includes('=>')).map(item => {
      const i = item.indexOf('=>');
      return [item.slice(0, i).trim(), item.slice(i + 2).trim()] as [string, string];
    }).filter(([label, href]) => label && (safeRoute(href) || safeExternal(href) || HASH_OK.test(href)));
    return { h: h.trim(), links };
  });
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notLive, setNotLive] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateWhatsApp(phone);
    setError(err); setNotLive(!err);
  };
  const small: CSSProperties = { fontFamily: ARVO, fontSize: 12, color: 'rgba(246,235,211,.8)' };
  const testId = (label: string) => `link-footer-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return (
    <footer data-testid="site-footer" style={{ position: 'relative', marginTop: 40, background: '#611811', color: '#F6EBD3' }}>
      <svg viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', left: 0, top: -39, width: '100%', height: 40, display: 'block' }}><path d={SCALLOP} fill="#611811" /></svg>
      <div style={{ ...wrap('80px 32px 56px'), ...twoCol(420, '48px 72px') }}>
        <div>
          <p lang="hi" style={{ margin: 0, fontFamily: DEVA, fontSize: 24, color: '#EBA937' }}>{v('h5.copy.foot.hindi')}</p>
          <h2 style={{ margin: '10px 0 0', fontSize: 'clamp(50px, 5.6vw, 84px)', fontWeight: 500, lineHeight: .98, color: '#FFF8EC' }}><Em text={v('h5.copy.foot.title')} color="#EBA937" /></h2>
          <p style={{ margin: '20px 0 0', fontSize: 21, lineHeight: 1.55, color: 'rgba(246,235,211,.9)', maxWidth: '26em' }}>{v('h5.copy.foot.body')}</p>
        </div>
        <form onSubmit={submit} noValidate data-testid="form-signup" style={{ position: 'relative', background: '#FFFDF4', color: '#2B1712', borderRadius: 18, padding: 34, transform: 'rotate(-1.5deg)', boxShadow: '0 30px 60px -28px rgba(0,0,0,.6)', maxWidth: 560, width: '100%', justifySelf: 'center', boxSizing: 'border-box' }}>
          <div aria-hidden="true" style={{ position: 'absolute', top: 22, right: 22, width: 92, height: 108, border: '3px dotted #E14B49', borderRadius: 6, background: '#F6F3DF', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(4deg)' }}>
            <img src={asset(v('h5.image.mark'))} alt="" style={{ width: 72, height: 'auto' }} />
          </div>
          <svg viewBox="0 0 120 120" aria-hidden="true" style={{ position: 'absolute', top: 70, right: 92, width: 96, height: 96, opacity: .55 }}><circle cx="60" cy="60" r="50" fill="none" stroke="#611811" strokeWidth="2" /><circle cx="60" cy="60" r="40" fill="none" stroke="#611811" strokeWidth="1" /><path d="M14 54 Q 60 40 106 54 M14 66 Q 60 52 106 66" fill="none" stroke="#611811" strokeWidth="1.5" /></svg>
          <p style={{ margin: 0, fontFamily: ARVO, fontSize: 12, color: '#611811' }}>{v('h5.copy.foot.card')}</p>
          <p style={{ margin: '10px 0 0', fontSize: 30, lineHeight: 1.12, maxWidth: '9.5em', fontStyle: 'italic' }}>{v('h5.copy.foot.dear')}</p>
          <div style={{ marginTop: 26, borderTop: '1.5px solid #DCCAB0', paddingTop: 22 }}>
            <label htmlFor="h5-wa" style={{ display: 'block', fontFamily: ARVO, fontSize: 12, color: '#5C463C' }}>{v('h5.copy.foot.phoneLabel')}</label>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 14px', height: 52, borderRadius: 14, background: '#ECE6CC', fontFamily: ARVO, fontSize: 14 }}>+91</span>
              <input id="h5-wa" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder={v('h5.copy.foot.phonePlaceholder')} value={phone}
                aria-invalid={!!error} aria-describedby={error ? 'h5-wa-err' : notLive ? 'h5-wa-status' : undefined} data-testid="input-signup-whatsapp"
                onChange={e => { setPhone(e.target.value); setNotLive(false); }}
                style={{ flex: '1 1 180px', height: 52, borderRadius: 14, border: '1.5px solid #DCCAB0', background: '#FFFDF4', padding: '0 16px', fontFamily: "'EB Garamond', Georgia, serif", fontSize: 19, color: '#2B1712', boxSizing: 'border-box', minWidth: 0 }} />
              <button type="submit" className="pill" data-testid="button-signup" style={{ height: 52, padding: '0 24px', borderRadius: 14, border: 0, background: '#611811', color: '#FFF8EC', fontFamily: ARVO, fontSize: 14, cursor: 'pointer' }}>{v('h5.copy.foot.button')}</button>
            </div>
            {error ? <p id="h5-wa-err" role="alert" className="h5-err" data-testid="error-signup">{error}</p> : null}
            {notLive ? <p id="h5-wa-status" role="status" className="h5-notlive" data-testid="status-signup">{v('h5.copy.foot.notlive')}</p> : null}
            <p style={{ margin: '12px 0 0', fontSize: 15, color: '#5C463C' }}>{v('h5.copy.foot.nospam')}</p>
          </div>
        </form>
      </div>

      <nav aria-label="Footer" style={{ maxWidth: 1280, margin: '0 auto', padding: '44px 32px', borderTop: '1px solid rgba(246,235,211,.25)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 32 }}>
        {columns.map(c => (
          <div key={c.h} aria-label={c.h} role="group" style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 19, alignItems: 'flex-start' }}>
            {c.links.map(([label, href]) => href.startsWith('/')
              ? <AppLink key={label} href={href} className="flink" testId={testId(label)}>{label}</AppLink>
              : safeExternal(href) ? <a key={label} className="flink" href={href} rel="noopener noreferrer">{label}</a>
              : <button key={label} type="button" className="flink" data-testid={testId(label)} onClick={() => {
                  const id = href.slice(1);
                  if (id === 'kala' || id === 'dsdt') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); else openDemoInformation(id, label);
                }}>{label}</button>)}
          </div>
        ))}
      </nav>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px 40px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <span lang="hi" style={{ fontFamily: DEVA, fontSize: 22, color: '#EBA937' }}>{v('h5.copy.foot.hindi')}</span>
        <span style={small}>{v('h5.copy.foot.copyright')}</span>
      </div>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px 28px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <span style={small}>{v('h5.copy.foot.payments')}</span>
        <span style={small} data-testid="sample-note">{v('h5.copy.foot.sample')}</span>
      </div>
      <Band color="#EBA937" />
    </footer>
  );
}
