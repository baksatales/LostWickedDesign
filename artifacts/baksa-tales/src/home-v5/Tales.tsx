import { useMemo, useState } from 'react';
import type { SiteDocument } from '@workspace/api-client-react';
import { REELS, readSeen, writeSeen, triple } from './content';
import { Em, Modal, asset } from './ui';

type V = (key: string) => string;
interface Chapter { id: string; title: string; body: string; image: string; imageAlt: string }
export interface Tale { id: string; maker: string; hook: string; image: string; chapters: Chapter[]; sponsored: boolean; sample: boolean; fromDocument: boolean }

type DocStory = { maker?: string; title?: string; image?: string; imageAlt?: string; sponsored?: boolean; sample?: boolean; visible?: boolean; chapters?: { id?: string; title?: string; body?: string; image?: string; imageAlt?: string }[] };

/** Builds the five tales: editable hooks; chapters from document stories when the maker matches, else the editable sample chapter. */
export function buildTales(doc: SiteDocument | undefined, v: V): Tale[] {
  const stories = ((doc as { stories?: DocStory[] } | undefined)?.stories ?? []).filter(s => s.visible !== false);
  return REELS.map((r, i) => {
    const n = i + 1;
    const maker = v(`h5.copy.reel${n}.maker`);
    const hook = v(`h5.copy.reel${n}.hook`);
    const image = v(`h5.image.reel${n}`);
    const story = stories.find(s => (s.maker ?? '').trim().toLowerCase() === maker.trim().toLowerCase());
    const chapters = (story?.chapters ?? []).filter(c => c.body).map((c, j) => ({ id: c.id || `c${j}`, title: c.title || hook, body: c.body!, image: c.image || image, imageAlt: c.imageAlt || '' }));
    if (story && chapters.length) return { id: r.id, maker, hook, image, chapters, sponsored: !!story.sponsored, sample: story.sample !== false, fromDocument: true };
    return { id: r.id, maker, hook, image, chapters: [{ id: 'sample', title: hook, body: v(`h5.copy.reel${n}.body`), image, imageAlt: '' }], sponsored: false, sample: true, fromDocument: false };
  });
}

const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

export function Tales({ v, doc }: { v: V; doc?: SiteDocument }) {
  const tales = useMemo(() => buildTales(doc, v), [doc, v]);
  const [seen, setSeen] = useState<string[]>(() => readSeen());
  const [open, setOpen] = useState<number | null>(null);
  const markSeen = (id: string) => setSeen(prev => { if (prev.includes(id)) return prev; const n = [...prev, id]; writeSeen(n); return n; });
  const openAt = (i: number) => { setOpen(i); markSeen(tales[i].id); };

  const [seenLabel, , sponsoredLabel, sampleSponsorLabel] = triple(v('h5.copy.reels.status'));
  const grad = (top: boolean) => ({ position: 'absolute' as const, left: 0, right: 0, [top ? 'top' : 'bottom']: 0, height: top ? '34%' : '48%', background: top ? 'linear-gradient(rgba(27,19,17,.55), rgba(27,19,17,0))' : 'linear-gradient(rgba(27,19,17,0), rgba(27,19,17,.85))' });
  return (
    <section id="tales" aria-labelledby="h5-tales-title" style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '64px 32px 24px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'end', gap: 16, marginBottom: 28 }}>
        <div>
          <p style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'Arvo, Georgia, serif', fontSize: 12, color: '#611811', textTransform: 'uppercase' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C23A36' }} />{v('h5.copy.reels.label')}</p>
          <h2 id="h5-tales-title" style={{ margin: '8px 0 0', fontSize: 'clamp(40px, 4.4vw, 60px)', fontWeight: 500, lineHeight: 1 }}><Em text={v('h5.copy.reels.title')} color="#C23A36" /></h2>
          <p style={{ margin: '8px 0 0', fontSize: 19, color: '#5C463C' }}>{v('h5.copy.reels.sub')}</p>
        </div>
        <button type="button" data-testid="button-all-tales" onClick={() => openAt(0)} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontFamily: 'Arvo, Georgia, serif', fontSize: 14, color: '#611811', textDecoration: 'underline' }}>{v('h5.copy.reels.all')}</button>
      </div>
      <div data-testid="row-tales" style={{ display: 'flex', gap: 18, overflowX: 'auto', padding: '8px 4px 24px' }}>
        {tales.map((t, i) => {
          const isSeen = seen.includes(t.id);
          return (
            <button key={t.id} type="button" className="reel" data-testid={`button-tale-${t.id}`} aria-label={`${t.maker}: ${t.hook}${isSeen ? ` (${seenLabel})` : ''}`} onClick={() => openAt(i)}
              style={{ position: 'relative', flex: '0 0 214px', aspectRatio: '9 / 16', borderRadius: 22, overflow: 'hidden', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left', color: '#FFF8EC', background: '#2B1712', boxShadow: '0 20px 36px -22px rgba(43,23,18,.6)' }}>
              <img src={asset(t.image)} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <span style={grad(true)} /><span style={grad(false)} />
              <span aria-hidden="true" style={{ position: 'absolute', left: 12, right: 12, top: 12, display: 'flex', gap: 4 }}>{[0, 1, 2].map(b => <span key={b} style={{ flex: 1, height: 3, borderRadius: 2, background: isSeen ? '#FFF8EC' : 'rgba(255,248,236,.4)' }} />)}</span>
              <span style={{ position: 'absolute', left: 12, top: 26, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Arvo, Georgia, serif', fontSize: 12 }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', border: `2.5px solid ${isSeen ? '#B7A890' : '#C23A36'}`, padding: 2, boxSizing: 'border-box', background: '#F6F3DF' }}><img src={asset(t.image)} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} /></span>
                {t.maker}{isSeen ? ` · ${seenLabel}` : ''}
              </span>
              {t.sponsored ? <span style={{ position: 'absolute', left: 12, top: 66, fontFamily: 'Arvo, Georgia, serif', fontSize: 10, background: 'rgba(255,248,236,.9)', color: '#5C463C', padding: '2px 8px', borderRadius: 999 }}>{t.sample ? sampleSponsorLabel : sponsoredLabel}</span> : null}
              <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '46%', width: 54, height: 54, margin: '-27px 0 0 -27px', borderRadius: '50%', background: 'rgba(255,253,244,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" fill="#611811" /></svg></span>
              <span style={{ position: 'absolute', left: 14, right: 14, bottom: 16, fontSize: 21, lineHeight: 1.15 }}>{t.hook}</span>
            </button>
          );
        })}
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
  const c = t?.chapters[Math.min(chapter, (t?.chapters.length ?? 1) - 1)];
  const next = () => { if (!t || index === null) return; if (chapter < t.chapters.length - 1) setChapter(chapter + 1); else if (index < tales.length - 1) onIndex(index + 1); else onClose(); };
  const prev = () => { if (!t || index === null) return; if (chapter > 0) setChapter(chapter - 1); else if (index > 0) onIndex(index - 1); };
  return (
    <Modal open={!!t} onClose={onClose} label={t ? `${t.maker} tale` : 'Tale'} className="h5-viewer" testId="story-viewer">
      {t && c ? (
        <div onKeyDown={e => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); }}>
          <div className="h5-viewer-bars" aria-hidden="true">{t.chapters.map((x, i) => <i key={x.id} className={i <= chapter ? 'on' : ''} />)}</div>
          <div className="h5-viewer-top">
            <span className="h5-avatar">{initials(t.maker)}</span><strong>{t.maker}</strong>
            <button type="button" className="h5-iconbtn" aria-label="Close tale" data-testid="button-story-close" onClick={onClose}>×</button>
          </div>
          <img className="h5-viewer-img" src={asset(c.image)} alt={c.imageAlt || t.hook} />
          <h3 data-testid="text-story-title">{c.title}</h3>
          <p data-testid="text-story-body">{c.body}</p>
          <p className="h5-disclose" data-testid="text-story-disclosure">
            {t.sponsored ? 'Paid partnership. ' : ''}{t.fromDocument ? (t.sample ? 'Sample story.' : '') : v('h5.copy.reels.disclosure')}
          </p>
          <div className="h5-viewer-ctrl">
            <button type="button" className="h5-pill h5-pill--ghost" data-testid="button-story-prev" onClick={prev} disabled={index === 0 && chapter === 0}>Back</button>
            <span aria-live="polite">{index! + 1} of {tales.length}</span>
            <button type="button" className="h5-pill" data-testid="button-story-next" onClick={next}>{index === tales.length - 1 && chapter >= t.chapters.length - 1 ? 'Done' : 'Next'}</button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
