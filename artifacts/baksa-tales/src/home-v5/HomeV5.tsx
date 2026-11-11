import { useCallback, useEffect, useState } from 'react';
import type { SiteDocument } from '@workspace/api-client-react';
import { DEFAULT_MOOD, homeValue, type MoodId } from './content';
import SourceHeader from './SourceHeader';
import { MoodTrunk } from './MoodTrunk';
import { Tales } from './Tales';
import { BaksaWay, Footer, Kala, MakerSection, MostGifted, PromiseRow } from './Sections';
import { AppLink, Band, Em } from './ui';
import './home-v5.css';

const FONTS = 'https://fonts.googleapis.com/css2?family=Arvo:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Noto+Serif+Devanagari:wght@400;600&display=swap';

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
      <p className="h5-announce" data-testid="text-announcement">{v('h5.copy.announce')}</p>
      <SourceHeader />
      <Band />
      <main>
        <section className="h5-hero" aria-labelledby="h5-hero-title">
          <p className="h5-caps h5-hero-eyebrow">{v('h5.copy.hero.eyebrow')}</p>
          <h1 id="h5-hero-title" className="h5-h1">
            <Em text={v('h5.copy.hero.title')} />
          </h1>
          <p className="h5-ruled h5-hero-tag"><span>{v('h5.copy.hero.tagline')}</span></p>
          <MoodTrunk v={v} mood={mood} setMood={setMood} />
          <AppLink href={v('h5.link.hero.quiz')} className="h5-quizlink" testId="link-hero-finder">{v('h5.copy.hero.quiz')}</AppLink>
        </section>
        <Tales v={v} doc={doc} />
        <MostGifted v={v} />
        <MakerSection v={v} />
        <BaksaWay v={v} />
        <Kala v={v} />
        <PromiseRow v={v} />
      </main>
      <Footer v={v} />
    </div>
  );
}
