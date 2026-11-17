import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SiteDocument } from '@workspace/api-client-react';
import { REELS, readSeen, writeSeen, triple } from './content';
import { Em, Modal, asset } from './ui';

type V = (key: string) => string;
interface Chapter { id: string; title: string; body: string; image: string; imageAlt: string }
export interface Tale { id: string; maker: string; hook: string; image: string; videoUrl: string; chapters: Chapter[]; sponsored: boolean; sample: boolean; fromDocument: boolean }

type DocStory = { maker?: string; title?: string; image?: string; imageAlt?: string; sponsored?: boolean; sample?: boolean; visible?: boolean; chapters?: { id?: string; title?: string; body?: string; image?: string; imageAlt?: string }[] };

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') { const v = u.searchParams.get('v'); return v ? `https://www.youtube.com/embed/${v}` : null; }
    if (u.hostname === 'youtu.be') { const v = u.pathname.slice(1); return v ? `https://www.youtube.com/embed/${v}` : null; }
    if (u.hostname === 'www.instagram.com' || u.hostname === 'instagram.com') { const m = u.pathname.match(/\/(p|reel|tv)\/([\w-]+)/); return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed/` : null; }
  } catch { /* ignore */ }
  return null;
}

/** Builds the five tales: editable hooks and video URLs; chapters from document stories when the maker matches. */
export function buildTales(doc: SiteDocument | undefined, v: V): Tale[] {
  const stories = ((doc as { stories?: DocStory[] } | undefined)?.stories ?? []).filter(s => s.visible !== false);
  return REELS.map((r, i) => {
    const n = i + 1;
    const maker = v(`h5.copy.reel${n}.maker`);
    const hook = v(`h5.copy.reel${n}.hook`);
    const image = v(`h5.image.reel${n}`);
    const videoUrl = v(`h5.link.reel${n}.video`);
    const story = stories.find(s => (s.maker ?? '').trim().toLowerCase() === maker.trim().toLowerCase());
    const chapters = (story?.chapters ?? []).filter(c => c.body).map((c, j) => ({ id: c.id || `c${j}`, title: c.title || hook, body: c.body!, image: c.image || image, imageAlt: c.imageAlt || '' }));
    if (story && chapters.length) return { id: r.id, maker, hook, image, videoUrl, chapters, sponsored: !!story.sponsored, sample: story.sample !== false, fromDocument: true };
    return { id: r.id, maker, hook, image, videoUrl, chapters: [], sponsored: false, sample: true, fromDocument: false };
  });
}

const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

export function Tales({ v, doc }: { v: V; doc?: SiteDocument }) {
  const tales = useMemo(() => buildTales(doc, v), [doc, v]);
  const [seen, setSeen] = useState<string[]>(() => readSeen());
  const [open, setOpen] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const paused = useRef(false);
  const markSeen = (id: string) => setSeen(prev => { if (prev.includes(id)) return prev; const n = [...prev, id]; writeSeen(n); return n; });
  const openAt = (i: number) => { setOpen(i); markSeen(tales[i].id); };

  // Auto-revolve every 3s, pause on hover
  useEffect(() => {
    const id = setInterval(() => {
      if (!paused.current) setActive(a => (a + 1) % tales.length);
    }, 3000);
    return () => clearInterval(id);
  }, [tales.length]);

  const goTo = useCallback((i: number) => { setActive(i); }, []);

  const [seenLabel, , sponsoredLabel, sampleSponsorLabel] = triple(v('h5.copy.reels.status'));
  const grad = (top: boolean) => ({ position: 'absolute' as const, left: 0, right: 0, [top ? 'top' : 'bottom']: 0, height: top ? '34%' : '48%', background: top ? 'linear-gradient(rgba(27,19,17,.55), rgba(27,19,17,0))' : 'linear-gradient(rgba(27,19,17,0), rgba(27,19,17,.85))' });

  const CARD_W = 200;
  const GAP = 28;

  return (
    <section id="tales" aria-labelledby="h5-tales-title" style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '64px 32px 48px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'end', gap: 16, marginBottom: 40 }}>
        <div>
          <p style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'Arvo, Georgia, serif', fontSize: 12, color: '#611811', textTransform: 'uppercase' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C23A36' }} />{v('h5.copy.reels.label')}</p>
          <h2 id="h5-tales-title" style={{ margin: '8px 0 0', fontSize: 'clamp(40px, 4.4vw, 60px)', fontWeight: 500, lineHeight: 1 }}><Em text={v('h5.copy.reels.title')} color="#C23A36" /></h2>
          <p style={{ margin: '8px 0 0', fontSize: 19, color: '#5C463C' }}>{v('h5.copy.reels.sub')}</p>
        </div>
        <button type="button" data-testid="button-all-tales" onClick={() => openAt(0)} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontFamily: 'Arvo, Georgia, serif', fontSize: 14, color: '#611811', textDecoration: 'underline' }}>{v('h5.copy.reels.all')}</button>
      </div>

      {/* 3-D revolving carousel */}
      <div
        data-testid="row-tales"
        onMouseEnter={() => { paused.current = true; }}
        onMouseLeave={() => { paused.current = false; }}
        style={{ position: 'relative', height: Math.round(CARD_W / 9 * 16) + 40, perspective: 1100, perspectiveOrigin: '50% 50%', overflow: 'visible' }}
      >
        {tales.map((t, i) => {
          const isSeen = seen.includes(t.id);
          const offset = i - active;
          // wrap so nearest neighbour is always chosen
          const total = tales.length;
          const wrapped = ((offset + Math.floor(total / 2)) % total) - Math.floor(total / 2);
          const absW = Math.abs(wrapped);
          const isCenter = wrapped === 0;
          const sign = Math.sign(wrapped) || 1;

          const rotateY = wrapped * 28;
          const translateX = wrapped * (CARD_W + GAP) * 0.82;
          const translateZ = isCenter ? 60 : -absW * 80;
          const scale = isCenter ? 1 : absW === 1 ? 0.82 : 0.66;
          const opacity = absW <= 2 ? 1 - absW * 0.18 : 0;
          const zIndex = 10 - absW;
          const visible = absW <= 2;

          return (
            <button
              key={t.id}
              type="button"
              data-testid={`button-tale-${t.id}`}
              aria-label={`${t.maker}: ${t.hook}${isSeen ? ` (${seenLabel})` : ''}`}
              tabIndex={visible ? 0 : -1}
              aria-hidden={!visible}
              onClick={() => { if (isCenter) openAt(i); else goTo(i); }}
              style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                width: CARD_W,
                aspectRatio: '9 / 16',
                marginLeft: -CARD_W / 2,
                borderRadius: 22,
                overflow: 'hidden',
                border: isCenter ? '2px solid rgba(235,169,55,.6)' : '0',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
                color: '#FFF8EC',
                background: '#2B1712',
                boxShadow: isCenter
                  ? '0 32px 56px -18px rgba(43,23,18,.7), 0 0 0 3px rgba(235,169,55,.18)'
                  : '0 16px 28px -14px rgba(43,23,18,.45)',
                transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                transformOrigin: `${sign < 0 ? '100%' : '0%'} 50%`,
                opacity,
                transition: 'transform .55s cubic-bezier(.3,1,.4,1), opacity .4s ease, box-shadow .3s ease',
                zIndex,
                pointerEvents: visible ? 'auto' : 'none',
              }}
            >
              <img src={asset(t.image)} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <span style={grad(true)} /><span style={grad(false)} />
              <span aria-hidden="true" style={{ position: 'absolute', left: 12, right: 12, top: 12, display: 'flex', gap: 4 }}>{[0, 1, 2].map(b => <span key={b} style={{ flex: 1, height: 3, borderRadius: 2, background: isSeen ? '#FFF8EC' : 'rgba(255,248,236,.4)' }} />)}</span>
              <span style={{ position: 'absolute', left: 12, top: 26, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Arvo, Georgia, serif', fontSize: 12 }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', border: `2.5px solid ${isSeen ? '#B7A890' : '#C23A36'}`, padding: 2, boxSizing: 'border-box', background: '#F6F3DF' }}><img src={asset(t.image)} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} /></span>
                {t.maker}{isSeen ? ` · ${seenLabel}` : ''}
              </span>
              {t.sponsored ? <span style={{ position: 'absolute', left: 12, top: 66, fontFamily: 'Arvo, Georgia, serif', fontSize: 10, background: 'rgba(255,248,236,.9)', color: '#5C463C', padding: '2px 8px', borderRadius: 999 }}>{t.sample ? sampleSponsorLabel : sponsoredLabel}</span> : null}
              {isCenter && <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '46%', width: 54, height: 54, margin: '-27px 0 0 -27px', borderRadius: '50%', background: 'rgba(255,253,244,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" fill="#611811" /></svg></span>}
              <span style={{ position: 'absolute', left: 14, right: 14, bottom: 16, fontSize: isCenter ? 18 : 15, lineHeight: 1.15 }}>{t.hook}</span>
            </button>
          );
        })}
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28 }}>
        {tales.map((_, i) => (
          <button key={i} type="button" aria-label={`Go to tale ${i + 1}`} onClick={() => goTo(i)}
            style={{ width: i === active ? 24 : 8, height: 8, borderRadius: 4, border: 0, padding: 0, cursor: 'pointer', background: i === active ? '#611811' : '#DCCAB0', transition: 'width .35s ease, background .3s ease' }} />
        ))}
      </div>

      <StoryViewer tales={tales} index={open} v={v} onClose={() => setOpen(null)} onIndex={i => { setOpen(i); markSeen(tales[i].id); }} />
    </section>
  );
}

function StoryViewer({ tales, index, onClose, onIndex, v }: { tales: Tale[]; index: number | null; onClose: () => void; onIndex: (i: number) => void; v: V }) {
  const [chapter, setChapter] = useState(0);
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  if (index !== lastIndex) { setLastIndex(index); setChapter(0); }
  const t = index === null ? null : tales[index];
  const embedUrl = t?.videoUrl ? toEmbedUrl(t.videoUrl) : null;
  const c = !embedUrl ? t?.chapters[Math.min(chapter, (t?.chapters.length ?? 1) - 1)] : undefined;
  const next = () => { if (!t || index === null) return; if (!embedUrl && chapter < t.chapters.length - 1) setChapter(chapter + 1); else if (index < tales.length - 1) onIndex(index + 1); else onClose(); };
  const prev = () => { if (!t || index === null) return; if (!embedUrl && chapter > 0) setChapter(chapter - 1); else if (index > 0) onIndex(index - 1); };
  return (
    <Modal open={!!t} onClose={onClose} label={t ? `${t.maker} tale` : 'Tale'} className="h5-viewer" testId="story-viewer">
      {t ? (
        <div onKeyDown={e => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); }}>
          <div className="h5-viewer-top">
            <span className="h5-avatar">{initials(t.maker)}</span><strong>{t.maker}</strong>
            <button type="button" className="h5-iconbtn" aria-label="Close tale" data-testid="button-story-close" onClick={onClose}>×</button>
          </div>
          {embedUrl ? (
            <div className="h5-viewer-video">
              <iframe src={embedUrl} title={t.hook} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" style={{ width: '100%', aspectRatio: '9/16', border: 0, borderRadius: 12 }} />
            </div>
          ) : c ? (
            <>
              <div className="h5-viewer-bars" aria-hidden="true">{t.chapters.map((x, i) => <i key={x.id} className={i <= chapter ? 'on' : ''} />)}</div>
              <img className="h5-viewer-img" src={asset(c.image)} alt={c.imageAlt || t.hook} />
              <h3 data-testid="text-story-title">{c.title}</h3>
              <p data-testid="text-story-body">{c.body}</p>
              <p className="h5-disclose" data-testid="text-story-disclosure">
                {t.sponsored ? 'Paid partnership. ' : ''}{t.fromDocument ? (t.sample ? 'Sample story.' : '') : v('h5.copy.reels.disclosure')}
              </p>
            </>
          ) : (
            <p className="h5-disclose" style={{ padding: '32px 0' }}>{v('h5.copy.reels.disclosure')}</p>
          )}
          <div className="h5-viewer-ctrl">
            <button type="button" className="h5-pill h5-pill--ghost" data-testid="button-story-prev" onClick={prev} disabled={index === 0 && (embedUrl ? true : chapter === 0)}>Back</button>
            <span aria-live="polite">{index! + 1} of {tales.length}</span>
            <button type="button" className="h5-pill" data-testid="button-story-next" onClick={next}>{index === tales.length - 1 ? 'Done' : 'Next'}</button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
