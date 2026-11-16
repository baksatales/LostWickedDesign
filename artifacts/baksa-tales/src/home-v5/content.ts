/**
 * Homepage v5 content: every buyer-facing string, image, link and pick list is a Site Studio
 * label. Parent can render `homeFields` as controls and store values in `document.labels`.
 * Pure helpers only (no DOM), so tests can import them.
 */
import type { SiteDocument } from '@workspace/api-client-react';
import type { DemoProduct } from '../demo/catalog';
import { safeHomepageImage, safeHomepageLink } from '../home-studio/safety';

export type FieldKind = 'text' | 'image' | 'link' | 'picks';
export interface HomeField { key: string; label: string; group: string; kind: FieldKind; value: string }
export type MoodId = 'explorer' | 'heart' | 'showstopper' | 'soother' | 'thoughtful';
export const MOODS: MoodId[] = ['explorer', 'heart', 'showstopper', 'soother', 'thoughtful'];
export const DEFAULT_MOOD: MoodId = 'heart';
export const MAX_VALUE = 500;

const P = { text: 'copy', image: 'image', link: 'link', picks: 'picks' } as const;
const f = (group: string, kind: FieldKind, key: string, label: string, value: string): HomeField =>
  ({ key: `h5.${P[kind]}.${key}`, label, group, kind, value });
const IMG = '/images/baksa/';

const MOOD_DEFAULTS: Record<MoodId, { name: string; line: string; headline: string; sub: string; picks: string; alt: string }> = {
  explorer: { name: 'Explorer', line: 'something they’ve never seen', headline: 'Wait, what *is* this?', sub: 'For the one who’s always first to try something new.', picks: 'sv-divya,popbani,t-bluelotus', alt: 'Compass and map' },
  heart: { name: 'Heart-Giver', line: 'they remember little things', headline: 'Of course *I remembered.*', sub: 'For the person who remembers the little things.', picks: 't-message,t-marigold,sv-divya', alt: 'Gift wrapped in printed cloth' },
  showstopper: { name: 'Showstopper', line: 'when it should get a gasp', headline: 'Make them *gasp.*', sub: 'For the gift that gets opened in front of everyone.', picks: 't-teapot,t-bluelotus,t-lotuspond', alt: 'Golden painted dome' },
  soother: { name: 'Soul Soother', line: 'for a slow, quiet evening', headline: 'Breathe out. *Slowly.*', sub: 'For someone who needs a quiet evening to themselves.', picks: 'an-range,mu-box,sv-divya', alt: 'Tea cup on a book' },
  thoughtful: { name: 'Thoughtful One', line: 'useful, and lovely', headline: 'Useful, *and lovely.*', sub: 'For the practical one who still loves pretty things.', picks: 'mu-box,an-range,t-marigold', alt: 'Leather journal and pen' },
};

export const REELS = [
  { id: 'tathaastu', maker: 'Tathaastu', hook: 'Watch a lotus come alive, petal by petal', image: 'homev5-p-t-lotuspond.webp', body: 'Sample chapter, no video yet. Tathaastu shapes soy wax petal by petal into lotuses, peonies and sunflowers, then sets them in brass urlis, teapots and sculpted vessels.' },
  { id: 'anirveda', maker: 'Anirveda', hook: 'Inside a slow Ayurvedic bath ritual', image: 'homev5-p-an-range.webp', body: 'Sample chapter, no video yet. Anirveda draws on old Indian bath rituals: a bath ubtan, a kumkumadi face pack, a saffron face wash and a triphala night cream.' },
  { id: 'svara', maker: 'Svara', hook: 'Why their fragrance has no alcohol', image: 'homev5-p-sv-divya.webp', body: 'Sample chapter, no video yet. Svara sets Indian botanicals on a magnesium oil base, with no alcohol.' },
  { id: 'popbani', maker: 'Pop Bani', hook: 'A box you’ll never throw away', image: 'homev5-p-popbani.webp', body: 'Sample chapter, no video yet. Keepsake boxes with Mithila art, made with Pop Bani for Baksa Tales.' },
  { id: 'mushhk', maker: 'Mushhk', hook: 'Oils, pressed slowly', image: 'homev5-p-mu-box.webp', body: 'Sample chapter, no video yet. Mushhk’s oils, mists, salts and scrubs are made for the ten quiet minutes at either end of a day.' },
] as const;

export const homeFields: HomeField[] = [
  f('Announcement', 'text', 'announce', 'Announcement bar', 'A handwritten-style gift note is on us. Free delivery over ₹2,500.'),
  f('Hero', 'text', 'hero.eyebrow', 'Hero small caps', 'Handmade gifts from independent Indian makers'),
  f('Hero', 'text', 'hero.title', 'Hero headline (*word* = coral italic)', 'Every gift has *something* to say.'),
  f('Hero', 'text', 'hero.tagline', 'Hero italic line', 'Open a compartment. See what comes to mind.'),
  f('Hero', 'text', 'hero.browse', 'Browse link text', 'Browse all gifts ↗'),
  f('Hero', 'link', 'hero.browse', 'Browse link destination', '/shop'),
  f('Hero', 'text', 'hero.self', 'Self link text', 'Something for yourself ↗'),
  f('Hero', 'link', 'hero.self', 'Self link destination', '/shop'),
  f('Hero', 'text', 'hero.quiz', 'Quiz link text', 'Not sure? Take the 4-question gift finder'),
  f('Hero', 'link', 'hero.quiz', 'Quiz link destination', '/finder'),
  f('Hero', 'image', 'trunk', 'Empty trunk image', `${IMG}homev5-trunk.webp`),
  f('Hero', 'image', 'trunk.closed', 'Closed trunk image', `${IMG}homev5-trunk-closed.png`),
  f('Hero', 'text', 'trunk.alt', 'Trunk image alt text', 'An open embroidered maroon baksa with five compartments'),
  f('Hero', 'text', 'hint', 'First-click hint', 'This one?'),
  f('Hero', 'text', 'moodsMark', 'Gifting Moods mark', 'The five Gifting Moods™'),
  f('Hero', 'text', 'mood.open', 'Compartment action', 'Unfold'),
  f('Hero', 'text', 'mood.editLabel', 'Edit label ({mood} = selected name)', 'The {mood} edit'),
  f('Hero', 'text', 'mood.explore', 'Explore text ({mood} = selected name)', 'Explore the {mood} edit ↗'),
  ...MOODS.flatMap(m => {
    const d = MOOD_DEFAULTS[m]; const g = `Mood: ${d.name}`;
    return [
      f(g, 'text', `mood.${m}.name`, 'Name (without “The”)', d.name),
      f(g, 'text', `mood.${m}.line`, 'Compartment line', d.line),
      f(g, 'text', `mood.${m}.headline`, 'Edit headline (*words* italic)', d.headline),
      f(g, 'text', `mood.${m}.sub`, 'Edit plain line', d.sub),
      f(g, 'image', `mood.${m}`, 'Compartment object image', `${IMG}homev5-${m}.webp`),
      f(g, 'text', `mood.${m}.alt`, 'Object image alt text', d.alt),
      f(g, 'picks', `mood.${m}`, 'Three product IDs (comma separated; “popbani” = keepsake box card)', d.picks),
      f(g, 'link', `mood.${m}`, 'Explore link', `/shop?feel=${m}`),
    ];
  }),
  f('Mood cards', 'text', 'popbani', 'Pop Bani card: maker|name|price placeholder', 'Pop Bani|Mithila keepsake box|[₹ price]'),
  f('Today’s tales', 'text', 'reels.label', 'Label', 'New this week'),
  f('Today’s tales', 'text', 'reels.title', 'Headline (*word* coral italic)', 'Today’s *tales*'),
  f('Today’s tales', 'text', 'reels.sub', 'Subline', 'Step into the workshops. Under a minute each.'),
  f('Today’s tales', 'text', 'reels.all', 'All tales link', 'All tales →'),
  ...REELS.flatMap((r, i) => [
    f('Today’s tales', 'text', `reel${i + 1}.maker`, `Tale ${i + 1} maker`, r.maker),
    f('Today’s tales', 'text', `reel${i + 1}.hook`, `Tale ${i + 1} hook`, r.hook),
    f('Today’s tales', 'image', `reel${i + 1}`, `Tale ${i + 1} image`, `${IMG}${r.image}`),
    f('Today’s tales', 'text', `reel${i + 1}.body`, `Tale ${i + 1} chapter (used when no story exists)`, r.body),
  ]),
  f('Today’s tales', 'text', 'reels.disclosure', 'Sample tale disclosure', 'Sample tale. Written from the catalogue; no video is claimed.'),
  f('Today’s tales', 'text', 'reels.status', 'Tale badges (seen|sample|sponsorship|sample sponsorship)', 'Seen|Sample|Paid partnership|Sample sponsored placement'),
  f('Most gifted', 'text', 'gifted.title', 'Headline', 'Most gifted *this week*'),
  f('Most gifted', 'text', 'gifted.sub', 'Subline', 'The pieces gifters keep coming back for.'),
  f('Most gifted', 'text', 'gifted.all', 'See all link', 'See all gifts →'),
  f('Most gifted', 'text', 'gifted.pills', 'Pills (id:text|id:text)', 'mu-box:Small batch|sv-divya:Under ₹2,000'),
  f('Most gifted', 'picks', 'gifted', 'Four product IDs', 't-bluelotus,mu-box,sv-divya,an-range'),
  f('Maker', 'image', 'maker', 'Maker photo', `${IMG}homev5-p-t-message.webp`),
  f('Maker', 'text', 'maker.alt', 'Maker photo alt', 'Bouquet with a Message by Tathaastu'),
  f('Maker', 'text', 'maker.pill', 'Tilted pill', 'An Olive Green maker'),
  f('Maker', 'text', 'maker.label', 'Label', 'Meet the maker'),
  f('Maker', 'text', 'maker.title', 'Headline', 'Petal by petal, a *new beginning.*'),
  f('Maker', 'text', 'maker.body', 'Paragraph', 'Tathaastu shapes soy wax into lotuses, peonies and marigolds, one petal at a time. Every piece supports war widows and army wives as they rebuild their lives.'),
  f('Maker', 'text', 'maker.note', 'Italic note', 'When you gift a Tathaastu piece, the card inside tells this story.'),
  f('Maker', 'text', 'maker.buttons', 'Button texts (read|shop)', 'Read their story|Shop Tathaastu →'),
  f('Maker', 'link', 'maker', 'Maker page', '/makers/tathaastu'),
  f('Baksa way', 'image', 'way', 'Keepsake box photo', `${IMG}homev5-p-popbani.webp`),
  f('Baksa way', 'text', 'way.alt', 'Photo alt', 'Pop Bani keepsake box with Mithila art, a design mock-up'),
  f('Baksa way', 'text', 'way.pill', 'Tilted pill', 'Baksa Tales × Pop Bani'),
  f('Baksa way', 'text', 'way.label', 'Label', 'The Baksa way to give'),
  f('Baksa way', 'text', 'way.title', 'Headline', 'Wrapped in a *story.*'),
  f('Baksa way', 'text', 'way.row1', 'Row 1 (title|line)', 'A gift note, on us|Your words at checkout, plus the maker’s story card.'),
  f('Baksa way', 'text', 'way.row2', 'Row 2 (title|line)', 'Keepsake boxes with Mithila art|Made with Pop Bani. Too lovely to throw away.'),
  f('Baksa way', 'text', 'way.row3', 'Row 3 (title|line)', 'Gifting for teams and clients|Your logo on the box, a maker’s story inside.'),
  f('Baksa way', 'text', 'way.cta', 'Brief button', 'Start a brief'),
  f('Baksa way', 'link', 'way.cta', 'Brief destination', '/corporate#brief'),
  f('Kala Samāgam', 'text', 'kala.hindi', 'Background Devanagari', 'कला समागम'),
  f('Kala Samāgam', 'text', 'kala.label', 'Label', 'Meet us in person'),
  f('Kala Samāgam', 'text', 'kala.title', 'Headline', 'Kala Samāgam'),
  f('Kala Samāgam', 'text', 'kala.body', 'Paragraph', 'Our curated craft carnival in Delhi NCR. Hold the work, meet the hands behind it, hear the stories over chai.'),
  f('Kala Samāgam', 'text', 'kala.admit', 'Ticket line', 'Admit one curious gifter'),
  f('Kala Samāgam', 'text', 'kala.next', 'Ticket label', 'Next edition'),
  f('Kala Samāgam', 'text', 'kala.dates', 'Dates and venue', '[Dates to be announced] · [venue], Delhi NCR'),
  f('Kala Samāgam', 'text', 'kala.cta', 'Ticket button', 'Tell me when tickets open'),
  f('Kala Samāgam', 'text', 'kala.notlive', 'Not-live message', 'Ticket alerts aren’t switched on yet, so nothing was saved. Watch this page for the dates.'),
  f('Founder conversations', 'text', 'dsdt.hindi', 'Gold Devanagari', 'दिल से दुनिया तक'),
  f('Founder conversations', 'text', 'dsdt.title', 'Title', 'Founder conversations'),
  f('Founder conversations', 'text', 'dsdt.body', 'Line incl. episode', 'The people behind the pieces, in their own words. Latest: [episode title]'),
  f('Founder conversations', 'text', 'dsdt.cta', 'Link text', 'Watch and listen →'),
  f('Founder conversations', 'link', 'dsdt', 'Episode URL (https, blank = not yet available)', ''),
  f('Founder conversations', 'text', 'dsdt.unavailable', 'Unavailable message', 'The first episode isn’t published yet. When it is, this link will open it.'),
  f('Promise', 'text', 'promise1', 'Promise 1 (title|line)', 'Every maker, met|BT Verified, in person, before they join.'),
  f('Promise', 'text', 'promise2', 'Promise 2 (title|line)', 'Handmade in India|Small batches, made to last.'),
  f('Promise', 'text', 'promise3', 'Promise 3 (title|line)', 'Free delivery over ₹2,500|Anywhere in India.'),
  f('Promise', 'text', 'promise4', 'Promise 4 (title|line)', 'A person on WhatsApp|Gifting help from our team, 10 am – 7 pm.'),
  f('Footer', 'text', 'foot.hindi', 'Gold Devanagari', 'दिल से दुनिया तक'),
  f('Footer', 'text', 'foot.title', 'Headline (*word* gold italic)', 'Come say *namaste.*'),
  f('Footer', 'text', 'foot.body', 'Paragraph', 'New maker tales, first looks at limited drops, and invites to Kala Samāgam, our craft carnival in Delhi NCR. One WhatsApp a week, at most.'),
  f('Footer', 'text', 'foot.card', 'Postcard title', 'Join the Baksa circle'),
  f('Footer', 'text', 'foot.phoneLabel', 'WhatsApp field label', 'Your WhatsApp number'),
  f('Footer', 'text', 'foot.phonePlaceholder', 'WhatsApp field placeholder', '98765 43210'),
  f('Footer', 'text', 'foot.dear', 'Postcard greeting', 'Dear friend, we’d love to write to you.'),
  f('Footer', 'text', 'foot.button', 'Button', 'Count me in'),
  f('Footer', 'text', 'foot.nospam', 'Small print', 'No spam. Leave any time by replying STOP.'),
  f('Footer', 'text', 'foot.notlive', 'Not-live message', 'WhatsApp sign-ups aren’t switched on yet, so your number was not saved.'),
  f('Footer', 'text', 'foot.sample', 'Single sample disclosure', 'Sample storefront: prices, tales and dates are samples. Nothing is sold, sent or charged yet.'),
  f('Footer', 'text', 'foot.payments', 'Payments line', 'UPI, cards, net banking and cash on delivery'),
  f('Footer', 'text', 'foot.copyright', 'Copyright', '© 2026 Baksa Tales, made with love in Delhi NCR'),
  f('Footer', 'image', 'mark', 'Ticket and postcard trunk logo', `${IMG}homev5-mark.webp`),
  f('Footer links', 'text', 'foot.column1', 'Shop column (heading | label=>destination)', 'Shop|Shop gifts=>/shop|Gift finder=>/finder|Our makers=>/makers/tathaastu'),
  f('Footer links', 'text', 'foot.column2', 'Gifting column', 'Gifting|Gifting for teams=>/corporate|Keepsake boxes=>/corporate|Kala Samāgam=>#kala'),
  f('Footer links', 'text', 'foot.column3', 'Maker column', 'Stories and makers|Dil Se Duniya Tak=>#dsdt|Sell with Baksa=>/maker|Makers’ Academy=>/academy'),
  f('Footer links', 'text', 'foot.column4', 'Help column', 'Help|Track my order=>#orders|Shipping and returns=>#returns|Talk to us=>#whatsapp'),
  ...['t-message','t-marigold','sv-divya','t-teapot','t-bluelotus','t-lotuspond','an-range','mu-box'].map(id =>
    f('Product photography', 'image', `product.${id}`, `Homepage photo: ${id}`, `${IMG}homev5-p-${id}.webp`)),
  f('Product photography', 'image', 'product.popbani', 'Homepage photo: Pop Bani keepsake box', `${IMG}homev5-p-popbani.webp`),
  f('Product photography', 'text', 'productLabels', 'Optional homepage labels (id=>maker~product name, separated by |)', ''),
];

const DEFAULTS: Record<string, string> = Object.fromEntries(homeFields.map(x => [x.key, x.value]));
const KINDS: Record<string, FieldKind> = Object.fromEntries(homeFields.map(x => [x.key, x.kind]));

export const safeImage = safeHomepageImage;
export const safeRoute = (v: string) => v.startsWith('/') && safeHomepageLink(v);
export const safeExternal = (v: string) => /^https:\/\/[a-zA-Z0-9.-]+(\/[^\s<>"'\\]*)?$/.test(v);

/** Value for a label key with validation and fallback to the default. */
export function homeValue(document: SiteDocument | null | undefined, key: string): string {
  const labels = (document as { labels?: Record<string, unknown> } | null | undefined)?.labels;
  const raw = labels?.[key];
  const v = typeof raw === 'string' ? raw.trim().slice(0, MAX_VALUE) : '';
  const def = DEFAULTS[key] ?? '';
  if (!v) return def;
  const k = KINDS[key] ?? (key.startsWith('h5.image.') ? 'image' : key.startsWith('h5.link.') ? 'link' : 'text');
  if (k === 'image') return safeImage(v) ? v : def;
  if (k === 'link') return safeHomepageLink(v) ? v : def;
  return v;
}

export const pair = (v: string): [string, string] => { const i = v.indexOf('|'); return i < 0 ? [v, ''] : [v.slice(0, i).trim(), v.slice(i + 1).trim()]; };
export const triple = (v: string) => v.split('|').map(s => s.trim());

/** Splits "a *b* c" into segments; odd indexes are emphasised. */
export const emphasis = (v: string) => v.split(/\*([^*]+)\*/);

export function parsePills(v: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of v.split('|')) { const i = part.indexOf(':'); if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim(); }
  return out;
}

export type Pick = { kind: 'product'; product: DemoProduct } | { kind: 'popbani' };
/** Resolves comma-delimited IDs against live catalogue products; falls back by feel. */
export function resolvePicks(products: DemoProduct[], raw: string, count: number, feel?: MoodId): Pick[] {
  const live = products.filter(p => p.status === 'live');
  const seen = new Set<string>();
  const picks: Pick[] = [];
  for (const id of raw.split(',').map(s => s.trim()).filter(Boolean)) {
    if (picks.length >= count || seen.has(id)) continue;
    seen.add(id);
    if (id === 'popbani') { picks.push({ kind: 'popbani' }); continue; }
    const p = live.find(x => x.id === id);
    if (p) picks.push({ kind: 'product', product: p });
  }
  if (picks.length < count) {
    for (const p of live) {
      if (picks.length >= count) break;
      if (seen.has(p.id) || (feel && !p.feels.includes(feel))) continue;
      seen.add(p.id); picks.push({ kind: 'product', product: p });
    }
  }
  return picks;
}

export const moodName = (doc: SiteDocument | undefined, m: MoodId) => homeValue(doc, `h5.copy.mood.${m}.name`);
export const isPlaceholderArt = (path: string) => /\/homev5-[a-z]+\.svg$/.test(path);
export const normaliseWhatsApp = (v: string) => v.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
export const validateWhatsApp = (v: string) => /^[6-9]\d{9}$/.test(normaliseWhatsApp(v)) ? null : 'Enter a 10-digit Indian WhatsApp number.';
export const nextMood = (m: MoodId, dir: 1 | -1): MoodId => MOODS[(MOODS.indexOf(m) + dir + MOODS.length) % MOODS.length];

const SEEN_KEY = 'baksa-h5-seen-tales';
export function readSeen(): string[] { try { const v = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; } }
export function writeSeen(ids: string[]) { try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch { /* ignore */ } }
