import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { getState, subscribe } from '../demo/store';
import { MOODS, isPlaceholderArt, nextMood, pair, resolvePicks, type MoodId } from './content';
import { ProductCard } from './ProductCard';
import { AppLink, Em, asset } from './ui';

type V = (key: string) => string;

export function MoodTrunk({ v, mood, setMood }: { v: V; mood: MoodId; setMood: (m: MoodId) => void }) {
  const [touched, setTouched] = useState(false);
  const desk = useRef<Record<string, HTMLButtonElement | null>>({});
  const mob = useRef<Record<string, HTMLButtonElement | null>>({});
  const swipe = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const row = swipe.current, selected = mob.current.heart;
      if (!row || !selected || !row.clientWidth) return;
      row.scrollLeft += selected.getBoundingClientRect().left - row.getBoundingClientRect().left
        - (row.clientWidth - selected.clientWidth) / 2;
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const [, tempLabel] = pair(v('h5.copy.sample'));
  const trunk = v('h5.image.trunk');

  const choose = (m: MoodId) => { setMood(m); setTouched(true); };
  const onKey = (e: KeyboardEvent, refs: typeof desk) => {
    const k = e.key;
    let to: MoodId | null = null;
    if (k === 'ArrowRight' || k === 'ArrowDown') to = nextMood(mood, 1);
    if (k === 'ArrowLeft' || k === 'ArrowUp') to = nextMood(mood, -1);
    if (k === 'Home') to = MOODS[0];
    if (k === 'End') to = MOODS[MOODS.length - 1];
    if (!to) return;
    e.preventDefault(); choose(to);
    const el = refs.current[to]; el?.focus(); el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };
  const name = (m: MoodId) => v(`h5.copy.mood.${m}.name`);
  const objImg = (m: MoodId) => v(`h5.image.mood.${m}`);
  const idx = MOODS.indexOf(mood);

  return (
    <div className="h5-trunkwrap">
      <div className="h5-trunk" data-testid="trunk-desktop">
        <img className="h5-trunk-img" src={asset(trunk)} alt={v('h5.copy.trunk.alt')} />
        {isPlaceholderArt(trunk) ? <span className="h5-temp h5-temp--trunk">{tempLabel}</span> : null}
        <div className="h5-comps" role="group" aria-label={v('h5.copy.moodsMark')}>
          {MOODS.map((m, i) => (
            <button key={m} type="button" ref={el => { desk.current[m] = el; }}
              className={`h5-comp${m === mood ? ' is-on' : ''}`} style={{ ['--i' as string]: i }}
              aria-pressed={m === mood} tabIndex={m === mood ? 0 : -1} data-testid={`mood-${m}`}
              onClick={() => choose(m)} onKeyDown={e => onKey(e, desk)}>
              <span className="h5-comp-name">{name(m)}</span>
              <span className="h5-comp-obj"><img src={asset(objImg(m))} alt="" />{isPlaceholderArt(objImg(m)) ? <span className="h5-temp">{tempLabel}</span> : null}</span>
              <span className="h5-comp-line">{v(`h5.copy.mood.${m}.line`)}</span>
              <span className="h5-comp-open">{v('h5.copy.mood.open')}</span>
            </button>
          ))}
        </div>
        {!touched ? (
          <div className="h5-hint" data-testid="hint-first-click" aria-hidden="true" style={{ ['--x' as string]: `${16.33 + 16.83 * MOODS.indexOf('heart')}%` }}>
            <span>{v('h5.copy.hint')}</span>
            <svg width="60" height="46" viewBox="0 0 60 46"><path d="M6 6c14 2 30 10 38 30" fill="none" stroke="#C23A36" strokeWidth="2.2" strokeLinecap="round" /><path d="M36 30l8 7 3-10" fill="none" stroke="#C23A36" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        ) : null}
      </div>

      <div ref={swipe} className="h5-swipe" role="group" aria-label={v('h5.copy.moodsMark')} data-testid="swipe-moods">
        {MOODS.map(m => (
          <button key={m} type="button" ref={el => { mob.current[m] = el; }}
            className={`h5-swipecard${m === mood ? ' is-on' : ''}`} aria-pressed={m === mood} tabIndex={m === mood ? 0 : -1}
            data-testid={`swipe-mood-${m}`} onClick={() => choose(m)} onKeyDown={e => onKey(e, mob)}>
            <span className="h5-comp-name">{name(m)}</span>
            <span className="h5-comp-obj"><img src={asset(objImg(m))} alt="" /></span>
            <span className="h5-comp-line">{v(`h5.copy.mood.${m}.line`)}</span>
            {!touched && m === 'heart' ? <span className="h5-hint-mobile" data-testid="hint-first-click-mobile">{v('h5.copy.hint')}</span> : null}
          </button>
        ))}
      </div>
      <p className="h5-mark">{v('h5.copy.moodsMark')}</p>
      <div className="h5-hero-links">
        <AppLink href={v('h5.link.hero.browse')} className="h5-textlink" testId="link-browse-all">{v('h5.copy.hero.browse')}</AppLink>
        <AppLink href={v('h5.link.hero.self')} className="h5-textlink" testId="link-for-yourself">{v('h5.copy.hero.self')}</AppLink>
      </div>
      <MoodPanel v={v} mood={mood} notch={16.33 + 16.83 * idx} />
    </div>
  );
}

function MoodPanel({ v, mood, notch }: { v: V; mood: MoodId; notch: number }) {
  const s = useSyncExternalStore(subscribe, getState);
  const picks = resolvePicks(s.products, v(`h5.picks.mood.${mood}`), 3, mood);
  const nm = v(`h5.copy.mood.${mood}.name`);
  return (
    <section className="h5-panel" aria-live="polite" data-testid="panel-mood" data-mood={mood} style={{ ['--notch' as string]: `${notch}%` }}>
      <p className="h5-caps">{v('h5.copy.mood.editLabel').replace('{mood}', nm)}</p>
      <h2 className="h5-panel-title" key={mood}><Em text={v(`h5.copy.mood.${mood}.headline`)} /></h2>
      <p className="h5-panel-sub">{v(`h5.copy.mood.${mood}.sub`)}</p>
      <div className="h5-grid3">
        {picks.map((p, i) => <ProductCard key={p.kind === 'product' ? p.product.id : `pb${i}`} pick={p} v={v} testPrefix={`panel-${mood}`} />)}
      </div>
      <div className="h5-ruled"><AppLink href={v(`h5.link.mood.${mood}`)} testId={`link-explore-${mood}`} className="h5-textlink">{v('h5.copy.mood.explore').replace('{mood}', nm)}</AppLink></div>
    </section>
  );
}
