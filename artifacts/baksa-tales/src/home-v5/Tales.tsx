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

  return (
    <section className="h5-section h5-tales" id="tales" aria-labelledby="h5-tales-title">
      <div className="h5-head-row">
        <div>
          <p className="h5-new"><span className="h5-dot" aria-hidden="true" />{v('h5.copy.reels.label')}</p>
          <h2 id="h5-tales-title" className="h5-h2"><Em text={v('h5.copy.reels.title')} /></h2>
          <p className="h5-sub">{v('h5.copy.reels.sub')}</p>
        </div>
        <button type="button" className="h5-textlink" data-testid="button-all-tales" onClick={() => openAt(0)}>{v('h5.copy.reels.all')}</button>
      </div>
      <div className="h5-reels" data-testid="row-tales">
        {tales.map((t, i) => {
          const isSeen = seen.includes(t.id);
          const [seenLabel, sampleLabel, sponsoredLabel, sampleSponsorLabel] = triple(v('h5.copy.reels.status'));
          return (
            <button key={t.id} type="button" className={`h5-reel${isSeen ? ' is-seen' : ''}`} data-testid={`button-tale-${t.id}`}
              aria-label={`${t.maker}: ${t.hook}${isSeen ? ' (seen)' : ''}`} onClick={() => openAt(i)}>
              <img src={asset(t.image)} alt="" loading="lazy" />
              <span className="h5-reel-bars" aria-hidden="true">{[0, 1, 2].map(b => <i key={b} />)}</span>
              <span className="h5-reel-who"><span className="h5-avatar"><img src={asset(t.image)} alt="" /></span>{t.maker}{isSeen && <small>{seenLabel}</small>}</span>
              <span className="h5-play" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" fill="#611811" /></svg></span>
              <span className="h5-reel-hook">{t.hook}</span>
              {t.sponsored ? <span className="h5-reel-flag">{t.sample ? sampleSponsorLabel || `${sampleLabel} · ${sponsoredLabel}` : sponsoredLabel}</span> : t.sample ? <span className="h5-reel-flag">{sampleLabel}</span> : null}
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
