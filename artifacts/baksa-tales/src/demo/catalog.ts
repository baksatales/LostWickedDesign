/**
 * Baksa Tales approved demo: seed SAMPLE data.
 * Taken from the approved prototype (developer-kit/reference/prototype.html) and the
 * approved static designs. Money is in PAISE, as in domain.ts.
 */
import type { GiftFeel, Maker, Occasion, OrderStatus, Product, ProductStatus, Recipient } from './domain';

export const TODAY = '2026-11-04';

export interface DemoMaker extends Maker {
  slug: string; img: string; craft: string; tagline: string; bio: string; story: string;
}

export interface DemoProduct extends Product {
  slug: string; img: string; material: string; technique: string; size: string;
  corp: boolean; published?: string; story?: string; note?: string; reason?: string; submitted?: string;
  badge?: string; spot?: boolean;
}

export interface DemoOrder {
  id: string; productId: string; makerId: string; qty: number; amountPaise: number;
  customer: string; city: string; date: string; status: OrderStatus;
  courier?: string; tracking?: string; deliveredOn: string | null; settled: boolean; issue?: string;
}

export interface DemoCourse { id: string; title: string; by: string; format: 'Recorded class' | 'Live workshop'; when: string; pricePaise: number }

export interface DemoEnquiry {
  ref: string; company: string; contact: string; email: string; purpose: string; qty: number; budgetPaise: number;
  neededBy: string; custom: string[]; message: string; stage: 'new' | 'contacted' | 'quote' | 'won' | 'lost';
  date: string; matched: string[]; sentTo: string[]; saidYes: string[]; quotePaise: number | null;
}

export interface DemoOpp { id: string; makerId: string; from?: string; type: string; title: string; detail: string; status: 'open' | 'yes' | 'no' }

export interface DemoApplication { id: string; brand: string; name: string; place: string; craft: string; gst: string; status: 'pending' | 'call' | 'approved' | 'declined' }

export const MAKERS: DemoMaker[] = [
  { id: 'm1', slug: 'tathaastu', brand: 'Tathaastu', gstRegistered: true, state: null, trusted: true, approvedCount: 3, published: true, img: 't-lotuspond', craft: 'Hand-shaped soy wax florals',
    tagline: 'Where craftsmanship meets the art of gifting.',
    bio: 'An Olive Green partner. Every Tathaastu piece supports war widows and army wives as they rebuild their lives and become financially independent.',
    story: 'Soy wax is shaped petal by petal into lotuses, peonies and sunflowers, then set in brass urlis, teapots and sculpted vessels.' },
  { id: 'm2', slug: 'mushhk', brand: 'Mushhk', gstRegistered: true, state: null, trusted: false, approvedCount: 1, published: true, img: 'mu-box', craft: 'Botanical oils, mists and salts',
    tagline: 'Serenity in a bottle.',
    bio: 'Mushhk believes beauty lives not in youth but in continuity, in caring for yourself as you are.',
    story: 'Its oils, mists, salts and scrubs are made for the ten quiet minutes at either end of a day.' },
  { id: 'm3', slug: 'svara', brand: 'Svara', gstRegistered: true, state: null, trusted: false, approvedCount: 2, published: true, img: 'sv-sandhya', craft: 'Alcohol-free fragrance',
    tagline: 'A fragrance you wear for how it makes you feel.',
    bio: 'Svara sets Indian botanicals on a magnesium oil base, with no alcohol.',
    story: 'Each spray carries 9 mg of magnesium and settles into the skin as a small evening ritual.' },
  { id: 'm4', slug: 'anirveda', brand: 'Anirveda', gstRegistered: true, state: null, trusted: true, approvedCount: 3, published: true, img: 'an-range', craft: 'Ayurvedic skincare',
    tagline: 'Skincare that begins in the Indian kitchen and bathhouse.',
    bio: 'Saffron, triphala and ubtan, kept in jars and bottles painted with peacocks and lotus blooms.',
    story: 'Anirveda draws on old Indian bath rituals: a bath ubtan, a kumkumadi face pack, a saffron face wash, a triphala night cream, oil pulling and a face mist.' },
];

type Row = [id: string, maker: string, name: string, priceRupees: number, feels: GiftFeel[], occ: Occasion[], rec: Recipient[], material: string, technique: string, size: string, stock: number, status: ProductStatus, corp: boolean, extra?: Partial<DemoProduct>];

const ROWS: Row[] = [
  ['t-lotuspond', 'm1', 'Lotus Pond Candle Set', 2400, ['showstopper', 'heart'], ['diwali', 'housewarming'], ['parent', 'partner'], 'Soy wax', 'Hand-shaped petal by petal', '[Size]', 6, 'live', true],
  ['t-crimson', 'm1', 'Crimson Lotus Urli', 1800, ['heart', 'showstopper'], ['diwali', 'wedding'], ['parent', 'partner'], 'Soy wax, brass urli', 'Hand-shaped petal by petal', '[Size]', 9, 'live', true],
  ['t-message', 'm1', 'Bouquet with a Message', 2200, ['heart', 'thoughtful'], ['birthday', 'thanks'], ['friend', 'partner'], 'Soy wax', 'Hand-shaped petal by petal', '[Size]', 10, 'live', false, { badge: 'Add your words' }],
  ['t-teapot', 'm1', 'Large Teapot Bouquet', 3200, ['heart', 'showstopper'], ['birthday', 'housewarming'], ['parent', 'friend'], 'Soy wax', 'Hand-shaped petal by petal', '[Size]', 4, 'live', false, { badge: 'Made to order' }],
  ['t-marigold', 'm1', 'Marigold Urli', 1200, ['thoughtful'], ['diwali'], ['colleague', 'friend'], 'Soy wax, gold-toned metal urli', 'Hand-shaped petal by petal', '[Size]', 3, 'live', true, { badge: 'Diwali favourite' }],
  ['t-sunflower', 'm1', 'Sunflower Trio', 1500, ['thoughtful', 'explorer'], ['birthday', 'justbecause'], ['friend', 'self'], 'Soy wax', 'Hand-shaped petal by petal', '[Size]', 12, 'live', false],
  ['t-shell', 'm1', 'Shell and Bloom', 1900, ['soother', 'explorer'], ['housewarming', 'justbecause'], ['friend', 'self'], 'Soy wax', 'Hand-shaped petal by petal', '[Size]', 7, 'live', false],
  ['t-starfish', 'm1', 'Starfish Candle Trio', 1100, ['explorer', 'thoughtful'], ['thanks', 'justbecause'], ['colleague', 'friend'], 'Soy wax', 'Hand-shaped petal by petal', '[Size]', 20, 'live', true],
  ['t-lady', 'm1', 'Lady Diffuser with Peony Candle', 2600, ['showstopper'], ['housewarming', 'wedding'], ['partner', 'friend'], 'Soy wax', 'Hand-shaped petal by petal', '[Size]', 5, 'live', false, { spot: true, published: '2026-11-03' }],
  ['t-gajra', 'm1', 'Fragrant Gajra', 1400, ['soother', 'heart'], ['wedding', 'diwali'], ['parent', 'partner'], 'Soy wax, brass bowl', 'Hand-shaped petal by petal', '[Size]', 8, 'live', false],
  ['t-bluelotus', 'm1', 'Blue Lotus Pond', 2400, ['showstopper', 'explorer'], ['diwali', 'housewarming'], ['parent', 'colleague'], 'Soy wax, brass urli', 'Hand-shaped petal by petal', '[Size]', 6, 'live', true, { badge: 'Editor’s pick' }],
  ['t-succulents', 'm1', 'Succulent Bowl', 1300, ['soother'], ['housewarming', 'justbecause'], ['colleague', 'self'], 'Soy wax', 'Hand-shaped petal by petal', '[Size]', 15, 'live', true],
  ['mu-box', 'm2', 'The Mushhk Essential Box', 3200, ['heart', 'thoughtful'], ['diwali', 'thanks', 'justbecause'], ['parent', 'colleague', 'partner'], 'Face oil, room mist, foot salt, coffee scrub', 'Small-batch botanical blends', 'Keepsake case', 10, 'live', true, { badge: 'Great for teams' }],
  ['mu-dawn', 'm2', 'Dawn Radiance Day Oil', 1450, ['soother', 'thoughtful'], ['justbecause', 'birthday'], ['self', 'friend'], 'Pomegranate, hemp and apricot oils, rose geranium, lavender, frankincense', 'Face oil for dry skin', '10 ml or 30 ml', 12, 'live', false],
  ['mu-moon', 'm2', 'Moonlit Renewal Night Oil', 1450, ['soother'], ['justbecause'], ['self', 'partner'], 'Apricot, pomegranate and hemp oils, frankincense, ylang ylang, helichrysum', 'Night oil for dry skin', '10 ml or 30 ml', 3, 'live', false],
  ['mu-amber', 'm2', 'Amber Cocoon Body Oil', 1250, ['soother', 'heart'], ['justbecause', 'birthday'], ['partner', 'self'], 'Coconut, hemp and apricot oils, amyris, rose geranium', 'Body oil', '50 ml', 12, 'live', false],
  ['mu-dream', 'm2', 'Dream Haven Room Mist', 950, ['soother'], ['housewarming', 'justbecause'], ['friend', 'colleague', 'self'], 'Lavender and patchouli essential oils', 'Room mist', '50 ml', 12, 'live', true],
  ['mu-toes', 'm2', 'Tranquil Toes Foot Soak', 650, ['soother', 'thoughtful'], ['thanks', 'justbecause'], ['colleague', 'parent'], 'Epsom and pink Himalayan salts, tea tree, peppermint and rose oils, rose petals', 'Foot salt', '60 g or 100 g pouch', 30, 'live', true],
  ['mu-espresso', 'm2', 'Espresso Embrace Coffee Scrub', 550, ['thoughtful', 'explorer'], ['thanks', 'birthday'], ['friend', 'colleague'], 'Ground coffee, rosemary and lavender oils, rose petals', 'Coffee scrub', '25 g or 100 g pouch', 30, 'live', true],
  ['sv-sandhya', 'm3', 'Svara Sandhya', 1800, ['thoughtful', 'heart'], ['birthday', 'thanks'], ['partner', 'colleague'], 'Magnesium oil base, Indian botanicals', 'Alcohol-free fragrance', '100 ml', 12, 'live', true],
  ['sv-ratri', 'm3', 'Svara Ratri', 1800, ['soother'], ['justbecause', 'birthday'], ['partner', 'self'], 'Magnesium oil base, Indian botanicals', 'Alcohol-free fragrance', '100 ml', 12, 'live', false],
  ['sv-divya', 'm3', 'Svara Divya', 1800, ['showstopper', 'heart'], ['wedding', 'birthday'], ['partner', 'friend'], 'Magnesium oil base, Indian botanicals', 'Alcohol-free fragrance', '100 ml', 12, 'live', false],
  ['an-range', 'm4', 'The Anirveda Ritual Set', 3500, ['showstopper', 'heart'], ['diwali', 'wedding', 'thanks'], ['parent', 'colleague'], 'Saffron, triphala, ubtan', 'Ayurvedic skincare', 'Gift set', 8, 'live', true],
  ['an-snanika', 'm4', 'Snanika Bath Ubtan', 650, ['soother', 'explorer'], ['wedding', 'justbecause'], ['friend', 'self'], 'Natural', 'Bath ubtan', '100 g', 18, 'live', false],
  ['an-kumkum', 'm4', 'Kumkumadi Amrutham Face Pack', 750, ['thoughtful', 'heart'], ['wedding', 'thanks'], ['parent', 'friend'], 'Natural, saffron', 'Kumkumadi face pack', '100 g', 15, 'live', true],
  ['mu-radiant', 'm2', 'Radiant Awakening Room Mist', 950, ['soother'], ['housewarming'], ['friend'], 'Rose, peppermint and lemon essential oils', 'Room mist', '50 ml', 12, 'review', false, { submitted: '2026-11-02', reason: 'new maker, listing 2 of 3', story: 'Rose, peppermint and lemon essential oils. A calming scent that feels like home, bottled in glass.' }],
  ['sv-nimisha', 'm3', 'Svara Nimisha', 1800, ['explorer'], ['justbecause'], ['friend'], 'Magnesium oil base, Indian botanicals', 'Alcohol-free fragrance', '100 ml', 10, 'review', false, { submitted: '2026-11-03', reason: 'new maker, listing 3 of 3', story: 'Nimisha, for temple-town soul and quiet clarity. Magnesium oil base with Indian botanicals, entirely alcohol free.' }],
  ['t-pinkpeony', 'm1', 'Pink Peony Tray', 1700, ['heart'], ['wedding'], ['friend'], 'Soy wax', 'Hand-shaped petal by petal', '', 6, 'changes', false, { submitted: '2026-10-30', note: 'Lovely piece. Please add the tray size and a close-up of the peonies, then send it again.', story: 'A garland of blush peonies on a tray.' }],
];

export const slugify = (s: string) => s.toLowerCase().replace(/’/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const PRODUCTS: DemoProduct[] = ROWS.map(([id, makerId, name, price, feels, occasions, recipients, material, technique, size, stock, status, corp, extra]) => ({
  id, makerId, name, slug: slugify(name), img: id, pricePaise: price * 100, gstPct: 18, stock,
  madeToOrder: id === 't-message' || id === 't-teapot', dispatchDays: makerId === 'm1' ? 4 : 2, status,
  feels, occasions, recipients, material, technique, size, corp, ...(extra ?? {}),
}));

/** Order in which the BT Edit shows pieces (the approved Shop design order first). */
export const EDIT_ORDER = ['t-bluelotus', 'sv-divya', 'mu-box', 't-teapot', 'an-range', 't-message', 't-lotuspond', 't-marigold'];

const addDaysLocal = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

type ORow = [string, string, string, number, number, string, string, string, OrderStatus, Partial<DemoOrder>?];
const OROWS: ORow[] = [
  ['BT-1047', 't-lotuspond', 'm1', 1, 2400, 'Ananya Kulkarni', 'Pune', '2026-11-03', 'new'],
  ['BT-1044', 't-message', 'm1', 1, 2200, 'Rohan Mehta', 'Gurugram', '2026-11-01', 'packed'],
  ['BT-1039', 't-teapot', 'm1', 1, 3200, 'Shalini Rao', 'Bengaluru', '2026-10-29', 'dispatched', { courier: 'Delhivery', tracking: 'DL4471209' }],
  ['BT-1031', 't-marigold', 'm1', 6, 7200, 'Vikram Sethi', 'Delhi', '2026-10-24', 'delivered'],
  ['BT-1028', 't-crimson', 'm1', 1, 1800, 'Farah Khan', 'Mumbai', '2026-10-21', 'delivered'],
  ['BT-1012', 't-sunflower', 'm1', 1, 1500, 'Neha Bansal', 'Noida', '2026-10-08', 'delivered', { settled: true }],
  ['BT-1046', 'mu-box', 'm2', 2, 6400, 'Kabir Singh', 'Jaipur', '2026-11-02', 'new'],
  ['BT-1042', 'an-range', 'm4', 1, 3500, 'Meenakshi Iyer', 'Chennai', '2026-10-31', 'delivered'],
  ['BT-1040', 'sv-divya', 'm3', 1, 1800, 'Aditi Ghosh', 'Kolkata', '2026-10-30', 'dispatched', { courier: 'Blue Dart', tracking: 'BD88120455' }],
  ['BT-1036', 'mu-dream', 'm2', 2, 1900, 'Sana Mirza', 'Hyderabad', '2026-10-27', 'delivered'],
  ['BT-1033', 'an-kumkum', 'm4', 2, 1500, 'Ira Malhotra', 'Delhi', '2026-10-25', 'delivered'],
  ['BT-1030', 'mu-toes', 'm2', 4, 2600, 'Joseph Mathew', 'Kochi', '2026-10-22', 'problem', { issue: 'A pouch arrived torn' }],
];

export const ORDERS: DemoOrder[] = OROWS.map(([id, productId, makerId, qty, amount, customer, city, date, status, extra]) => ({
  id, productId, makerId, qty, amountPaise: amount * 100, customer, city, date, status,
  deliveredOn: status === 'delivered' ? addDaysLocal(date, 4) : null, settled: false, ...(extra ?? {}),
}));

export const COURSES: DemoCourse[] = [
  { id: 'c1', title: 'Price your handmade work with confidence', by: 'Baksa Tales team', format: 'Recorded class', when: 'Watch any time, 6 short lessons', pricePaise: 99900 },
  { id: 'c2', title: 'Tell your brand’s story in 60 seconds', by: 'Baksa Tales team', format: 'Live workshop', when: 'Dates to be confirmed', pricePaise: 150000 },
  { id: 'c3', title: 'Photograph your products with a phone', by: 'Baksa Tales team', format: 'Recorded class', when: 'Watch any time, 4 lessons', pricePaise: 79900 },
  { id: 'c4', title: 'Getting ready for corporate orders', by: 'Baksa Tales team', format: 'Live workshop', when: 'Dates to be confirmed', pricePaise: 120000 },
];

export const ENQUIRIES: DemoEnquiry[] = [
  { ref: 'BT-CG-0012', company: 'Northwind Consulting', contact: 'Priya Nair', email: 'priya@example.com', purpose: 'Client appreciation', qty: 120, budgetPaise: 250000,
    neededBy: '10 December', custom: ['Logo', 'personal notes'], message: 'Diwali and year-end gifts for our top clients. Prefer home décor.', stage: 'contacted', date: '2026-10-30',
    matched: ['m1'], sentTo: ['m1'], saidYes: ['m1'], quotePaise: null },
];

export const OPPS: DemoOpp[] = [
  { id: 'op1', makerId: 'm1', from: 'BT-CG-0012', type: 'Corporate brief', title: '120 client gifts, home décor', detail: 'About ₹2,500 per gift, needed before 10 December. Logo on packaging and personal notes.', status: 'open' },
  { id: 'op2', makerId: 'm1', type: 'Event', title: 'A stall at Kala Samāgam', detail: 'Our curated craft carnival in Delhi NCR. Dates to be announced; stall terms shared when you say yes.', status: 'open' },
];

export const APPLICATIONS: DemoApplication[] = [
  { id: 'a1', brand: 'Pattachitra Ghar', name: 'Bhagaban Mohapatra', place: 'Raghurajpur, Odisha', craft: 'Pattachitra scroll painting', gst: 'not given', status: 'pending' },
  { id: 'a2', brand: 'Moradabad Brass Collective', name: 'Imran Qureshi', place: 'Moradabad, Uttar Pradesh', craft: 'Hand-engraved brassware', gst: 'registered', status: 'call' },
];

/** Per-piece costs the maker entered (Growth Studio "Product profits"), in paise. */
export const COSTS: Record<string, number> = { 't-lotuspond': 60000, 't-marigold': 45000, 't-message': 90000 };
