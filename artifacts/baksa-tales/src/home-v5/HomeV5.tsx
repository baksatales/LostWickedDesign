import { useCallback, useEffect, useState } from 'react';
import type { SiteDocument } from '@workspace/api-client-react';
import { DEFAULT_MOOD, emphasis, homeValue, type MoodId } from './content';
import HomeHeader, { brandAnnouncement } from './HomeHeader';
import { MoodTrunk } from './MoodTrunk';
import { Tales } from './Tales';
import { BaksaWay, Footer, Kala, MakerSection, MostGifted, PromiseRow } from './Sections';
import './home-v5.css';
import './premium-homepage.css';

const FONTS = 'https://fonts.googleapis.com/css2?family=Arvo:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Noto+Serif+Devanagari:wght@400;500;600&display=swap';

function HeroTitle({ text }: { text: string }) {
  return <>{emphasis(text).map((s, i) => i % 2 ? (
    <span key={i} style={{ position: 'relative', display: 'inline-block', fontStyle: 'italic', color: '#C23A36' }}>{s}
      <svg viewBox="0 0 220 24" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', left: '2%', bottom: -8, width: '96%', height: 14 }}><path d="M4 16 C 40 4, 70 22, 110 12 S 180 4, 216 14" fill="none" stroke="#EBA937" strokeWidth="7" strokeLinecap="round" /></svg>
    </span>
  ) : <span key={i}>{s}</span>)}</>;
}

export default function HomeV5({ document: doc }: { document?: SiteDocument }) {
  const v = useCallback((key: string) => homeValue(doc, key), [doc]);
  const [mood, setMood] = useState<MoodId>(DEFAULT_MOOD);

  useEffect(() => {
    if (window.document.querySelector('link[data-h5-fonts]')) return;
    const l = window.document.createElement('link');
    l.rel = 'stylesheet'; l.href = FONTS; l.setAttribute('data-h5-fonts', '');
    window.document.head.appendChild(l);
  }, []);
  useEffect(() => {
    const heading = v('h5.copy.hero.title').replaceAll('*', '');
    window.document.title = `${heading} | Baksa Tales`;
    for (const [attribute, key, content] of [
      ['name', 'description', v('h5.copy.hero.tagline')],
      ['property', 'og:title', window.document.title],
      ['property', 'og:description', v('h5.copy.hero.tagline')],
    ]) {
      let meta = window.document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!meta) { meta = window.document.createElement('meta'); meta.setAttribute(attribute, key); window.document.head.append(meta); }
      meta.content = content;
    }
  }, [v]);

  return (
    <div className="h5" data-bt-page="store" data-testid="page-home-v5">
      <div data-testid="text-announcement" style={{ background: '#EBA937', color: '#2B1712', fontFamily: 'Arvo, Georgia, serif', fontSize: 12, textAlign: 'center', padding: '7px 20px', letterSpacing: '.08em' }}>{brandAnnouncement(doc) || v('h5.copy.announce')}</div>
      <HomeHeader document={doc} />
      <main>
        <section id="top" aria-labelledby="h5-hero-title" style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '20px 32px 16px' }}>
          <p style={{ margin: 0, textAlign: 'center', fontFamily: 'Arvo, Georgia, serif', fontSize: 11, letterSpacing: '.2em', color: '#4A1020', textTransform: 'uppercase' }}>{v('h5.copy.hero.eyebrow')}</p>
          <h1 id="h5-hero-title" style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 'clamp(40px, 5vw, 72px)', lineHeight: 1, fontWeight: 500, letterSpacing: '-.02em', color: '#4A1020' }}>
            <HeroTitle text={v('h5.copy.hero.title')} />
          </h1>
          <div style={{ margin: '14px auto 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, maxWidth: 760 }}>
            <span style={{ flex: 1, height: 1, background: '#CDB79A' }} />
            <p style={{ margin: 0, fontSize: 19, fontStyle: 'italic', color: '#5C463C', textAlign: 'center' }}>{v('h5.copy.hero.tagline')}</p>
            <span style={{ flex: 1, height: 1, background: '#CDB79A' }} />
          </div>
          <MoodTrunk v={v} mood={mood} setMood={setMood} />
        </section>
        <Tales v={v} doc={doc} />
        <MostGifted v={v} />
        <MakerSection v={v} />
        <Kala v={v} />
        <PromiseRow v={v} />
      </main>
      <Footer v={v} />
    </div>
  );
}
