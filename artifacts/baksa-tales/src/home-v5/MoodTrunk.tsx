import { useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { useLocation } from 'wouter';
import { getState, subscribe } from '../demo/store';
import { MOODS, nextMood, resolvePicks, type MoodId } from './content';
import { EditCard } from './ProductCard';
import { AppLink, Em, asset } from './ui';

type V = (key: string) => string;

const TILE_LEFT = ['6.95%', '24.42%', '41.89%', '59.36%', '76.83%'];
const NOTCH    = ['15.4%', '32.9%',  '50.4%',  '67.8%',  '85.3%'];

export function MoodTrunk({ v, mood: moodProp, setMood: setMoodProp }: { v: V; mood: MoodId; setMood: (m: MoodId) => void }) {
  const [touched, setTouched] = useState(false);
  const [mood, setMood] = useState<MoodId>(moodProp);
  // boxOpen: whether the trunk box itself is open (tiles visible)
  const [boxOpen, setBoxOpen] = useState(false);
  const [boxOpening, setBoxOpening] = useState(false);
  const [boxClosing, setBoxClosing] = useState(false);
  // tile open/close state (which tile is lifted)
  const [tileOpen, setTileOpen] = useState(false);
  const [tileClosing, setTileClosing] = useState(false);
  const [, navigate] = useLocation();
  const desk = useRef<Record<string, HTMLButtonElement | null>>({});
  const mob = useRef<Record<string, HTMLButtonElement | null>>({});

  const openBox = () => {
    setTouched(true);
    setBoxOpening(true);
    setBoxClosing(false);
    // After brief "pop" animation on the closed image, swap to open
    setTimeout(() => {
      setBoxOpen(true);
      setBoxOpening(false);
    }, 350);
  };

  const closeBox = () => {
    setBoxClosing(true);
    setTileOpen(false);
    setTileClosing(false);
    setTimeout(() => { setBoxOpen(false); setBoxClosing(false); setTouched(false); }, 500);
  };

  const doTileClose = () => {
    setTileClosing(true);
    setTimeout(() => { setTileOpen(false); setTileClosing(false); }, 400);
  };

  const pick = (m: MoodId) => {
    if (!boxOpen) return; // box must be open first
    if (mood === m && tileOpen) {
      doTileClose();
    } else {
      setMood(m);
      setMoodProp(m);
      setTileClosing(false);
      setTileOpen(true);
      setTimeout(() => navigate(v(`h5.link.mood.${m}`)), 800);
    }
  };

  const onKey = (e: KeyboardEvent, refs: typeof desk) => {
    let to: MoodId | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = nextMood(mood, 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = nextMood(mood, -1);
    if (e.key === 'Home') to = MOODS[0];
    if (e.key === 'End') to = MOODS[MOODS.length - 1];
    if (!to) return;
    e.preventDefault(); pick(to);
    const el = refs.current[to]; el?.focus(); el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };
  const name = (m: MoodId) => v(`h5.copy.mood.${m}.name`);
  const line = (m: MoodId) => v(`h5.copy.mood.${m}.line`);
  const obj = (m: MoodId) => asset(v(`h5.image.mood.${m}`));
  const group = 'Gifting Moods';

  // box is "closed view" = not yet open and not in opening animation
  const showClosed = !boxOpen && !boxClosing;

  return (
    <>
      <div className="trunk5wrap" style={{ position: 'relative', marginTop: 80, overflow: 'visible' }}>

        {/* ── Closed state: standalone image, full natural aspect ratio ─ */}
        {showClosed && (
          <div className={`trunk5-closed-wrap${boxOpening ? ' trunk5-popping' : ''}`}
            style={{ maxWidth: 1180, margin: '0 auto', cursor: 'pointer', position: 'relative' }}
            onClick={boxOpening ? undefined : openBox}
            role="button"
            aria-label="Open the baksa trunk"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBox(); } }}
          >
            <img
              src={asset(v('h5.image.trunk.closed'))}
              alt="Click to open the baksa"
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />
            {!touched && (
              <span className="hint" aria-hidden="true" data-testid="hint-first-click"
                style={{ position: 'absolute', left: '58%', top: '-18%', pointerEvents: 'none' }}>
                <span style={{ display: 'block', fontSize: 'clamp(15px, 1.7vw, 22px)', fontStyle: 'italic', color: '#C23A36', transform: 'rotate(-5deg)', whiteSpace: 'nowrap', marginBottom: 6 }}>Lift the lid ✦</span>
                <svg viewBox="0 0 30 64" style={{ display: 'block', width: 26, height: 54, marginLeft: 6 }}>
                  <path d="M22 4 C 20 22, 10 40, 6 58" fill="none" stroke="#4A1020" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M2 50 L 6 60 L 13 53" fill="none" stroke="#4A1020" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </div>
        )}

        {/* ── Open state: trunk with tiles ─────────────────────────────── */}
        {(boxOpen || boxClosing) && (
          <>
            <div className={`trunk5${boxClosing ? ' trunk5-closing' : ' trunk5-open'}`} data-testid="trunk-desktop">
              <img className="bg" src={asset(v('h5.image.trunk'))} alt={v('h5.copy.trunk.alt')} />

              <div role="group" aria-label={group}>
                {MOODS.map((m, i) => {
                  const isOn = m === mood && tileOpen;
                  const isClosing = m === mood && tileClosing;
                  return (
                    <button key={m} type="button" ref={el => { desk.current[m] = el; }}
                      className={`tile5 t${i + 1}${isOn ? ' on' : ''}${isClosing ? ' closing' : ''}${boxClosing ? ' tile5-hiding' : ' tile5-showing'}`}
                      style={{ left: TILE_LEFT[i] }}
                      aria-expanded={isOn} tabIndex={m === mood ? 0 : -1} data-testid={`mood-${m}`}
                      onClick={() => pick(m)} onKeyDown={e => onKey(e, desk)}>
                      <span style={{ fontSize: 'clamp(14px, 1.75vw, 25px)', fontStyle: 'italic', lineHeight: 1 }}>{name(m)}</span>
                      <span className="ow"><img src={obj(m)} alt={v(`h5.copy.mood.${m}.alt`)} /></span>
                      <span style={{ fontSize: 'clamp(11px, 1.05vw, 15px)', lineHeight: 1.15, color: '#5C463C', fontStyle: 'italic' }}>{line(m)}</span>
                      <span style={{ marginTop: 'auto', fontSize: 'clamp(11px, 1.1vw, 16px)', fontStyle: 'italic', color: '#68142F' }}>
                        {isOn || isClosing ? 'Close ✕' : 'Peek in'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Close button — outside trunk5 so it isn't clipped by aspect-ratio container */}
            {!boxClosing && (
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <button
                  type="button"
                  aria-label="Close the trunk"
                  onClick={closeBox}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 'clamp(12px, 1.1vw, 15px)', fontStyle: 'italic', color: '#68142F',
                    fontFamily: 'inherit', padding: '4px 12px',
                  }}
                >
                  Close trunk ↑
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mswipe" role="group" aria-label={group} data-testid="swipe-moods" style={{ gap: 12, overflowX: 'auto', padding: '24px 2px 12px' }}>
        {MOODS.map(m => (
          <button key={m} type="button" ref={el => { mob.current[m] = el; }} className={`mcard${m === mood && tileOpen ? ' on' : ''}`}
            aria-expanded={m === mood && tileOpen} tabIndex={m === mood ? 0 : -1} data-testid={`swipe-mood-${m}`}
            onClick={() => pick(m)} onKeyDown={e => onKey(e, mob)}>
            <span style={{ display: 'block', fontSize: 20, fontStyle: 'italic' }}>{name(m)}</span>
            <img src={obj(m)} alt="" style={{ display: 'block', width: '100%', height: 96, objectFit: 'contain', margin: '8px 0' }} />
            <span style={{ display: 'block', fontSize: 15, color: '#5C463C', fontStyle: 'italic' }}>{line(m)}</span>
          </button>
        ))}
      </div>

      <div style={{ margin: '16px 0 20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 32px', fontSize: 18 }}>
        <AppLink href={v('h5.link.hero.browse')} testId="link-browse-all" style={{ color: '#4A1020' }}>{v('h5.copy.hero.browse')}</AppLink>
        <AppLink href={v('h5.link.hero.self')} testId="link-for-yourself" style={{ color: '#4A1020' }}>{v('h5.copy.hero.self')}</AppLink>
      </div>

      {tileOpen && (
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <MoodPanel key={mood} v={v} mood={mood} notch={NOTCH[MOODS.indexOf(mood)]} navigate={navigate} />
        </div>
      )}
    </>
  );
}

function MoodPanel({ v, mood, notch, navigate }: { v: V; mood: MoodId; notch: string; navigate: (to: string) => void }) {
  const s = useSyncExternalStore(subscribe, getState);
  const picks = resolvePicks(s.products, v(`h5.picks.mood.${mood}`), 3, mood);
  const nm = v(`h5.copy.mood.${mood}.name`);
  return (
    <section className="panel5" aria-live="polite" data-testid="panel-mood" data-mood={mood}
      style={{ position: 'relative', border: '1.5px solid #68142F', borderRadius: 20, background: '#FFFBF0', padding: '34px 36px 28px' }}>
      <span aria-hidden="true" style={{ position: 'absolute', top: -10, left: `calc(${notch} - 9px)`, width: 18, height: 18, background: '#FFFBF0', borderLeft: '1.5px solid #68142F', borderTop: '1.5px solid #68142F', transform: 'rotate(45deg)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '24px 22px', alignItems: 'start' }}>
        <div style={{ paddingRight: 12 }}>
          <p style={{ margin: 0, fontFamily: 'Arvo, Georgia, serif', fontSize: 12, letterSpacing: '.14em', color: '#68142F', textTransform: 'uppercase' }}>{v('h5.copy.mood.editLabel').replace('{mood}', nm)}</p>
          <h2 style={{ margin: '14px 0 0', fontSize: 'clamp(36px, 3.6vw, 52px)', fontWeight: 500, lineHeight: 1, color: '#4A1020' }}><Em text={v(`h5.copy.mood.${mood}.headline`)} /></h2>
          <p style={{ margin: '14px 0 0', fontSize: 19, lineHeight: 1.45, color: '#5C463C' }}>{v(`h5.copy.mood.${mood}.sub`)}</p>
        </div>
        {picks.map((p, i) => <EditCard key={p.kind === 'product' ? p.product.id : `pb${i}`} pick={p} v={v} testPrefix={`panel-${mood}`} />)}
      </div>
      <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 20 }}>
        <span style={{ flex: 1, height: 1, background: '#DCCAB0' }} />
        <AppLink href={v(`h5.link.mood.${mood}`)} testId={`link-explore-${mood}`} style={{ fontSize: 21, color: '#4A1020' }}>{v('h5.copy.mood.explore').replace('{mood}', nm)}</AppLink>
        <span style={{ flex: 1, height: 1, background: '#DCCAB0' }} />
      </div>
    </section>
  );
}
