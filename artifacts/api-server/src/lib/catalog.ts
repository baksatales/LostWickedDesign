import { GetCatalogResponse } from "@workspace/api-zod";
import type { Product as DomainProduct, Maker as DomainMaker } from "./domain";

const image = (slug: string) => `/images/baksa/${slug}.webp`;
export const sampleMakers = [
  { id: "tathaastu", slug: "tathaastu", brand: "Tathaastu", craft: "Sculptural candle florals", tagline: "Small details. Lasting impressions.", story: "Discover the supplied collection of lotus-inspired candles, floral bouquets and decorative vessels. Product facts and dispatch estimates in this development catalogue await maker confirmation.", image: image("t-bluelotus") },
  { id: "mushhk", slug: "mushhk", brand: "Mushhk", craft: "Thoughtful everyday rituals", tagline: "A little space for yourself.", story: "Explore a collection of oils, room mists and gift sets. The supplied product photographs introduce the collection; ingredients, suitability and product claims must be confirmed by the maker.", image: image("mu-box") },
  { id: "svara", slug: "svara", brand: "Svara", craft: "Personal fragrance", tagline: "Find your own note.", story: "A fragrance collection presented through Sandhya, Ratri, Divya and Nimisha. This is a sample catalogue, not a statement of verified ingredients or therapeutic benefits.", image: image("sv-sandhya") },
  { id: "anirveda", slug: "anirveda", brand: "Anirveda", craft: "Bath and skincare gifts", tagline: "The beauty of a daily ritual.", story: "Bath and skincare products in illustrated packaging. Explore the supplied collection as a visual introduction; ingredients and usage information are awaiting maker confirmation.", image: image("an-range") },
];

// Source: uploaded 004_seed.sql. Stock/prices/lead times are explicitly sample data.
const seed = [
  ["t-bluelotus", "Blue Lotus Pond", "tathaastu", 240000, "Candles & home", "Soy wax, brass urli", 4, ["showstopper", "explorer"], ["diwali", "housewarming"], ["parent", "colleague"]],
  ["t-crimson", "Crimson Lotus Urli", "tathaastu", 180000, "Candles & home", "Soy wax, brass urli", 4, ["heart", "showstopper"], ["diwali", "wedding"], ["parent", "partner"]],
  ["t-marigold", "Marigold Urli", "tathaastu", 120000, "Candles & home", "Soy wax", 4, ["heart", "thoughtful"], ["diwali", "housewarming"], ["friend", "parent"]],
  ["t-teapot", "Large Teapot Bouquet", "tathaastu", 320000, "Candles & home", "Soy wax", 4, ["heart", "showstopper"], ["birthday", "housewarming"], ["parent", "friend"]],
  ["t-lotuspond", "Lotus Pond Candle Set", "tathaastu", 240000, "Candles & home", "Soy wax", 4, ["showstopper", "heart"], ["diwali", "housewarming"], ["parent", "partner"]],
  ["t-succulents", "Succulent Bowl", "tathaastu", 130000, "Candles & home", "Soy wax", 4, ["thoughtful", "explorer"], ["birthday", "housewarming"], ["friend", "colleague"]],
  ["mu-box", "The Mushhk Essential Box", "mushhk", 320000, "Rituals & care", "Gift collection — details to confirm", 2, ["heart", "thoughtful"], ["diwali", "thanks", "justbecause"], ["parent", "colleague", "partner"]],
  ["mu-dream", "Dream Haven Room Mist", "mushhk", 95000, "Rituals & care", "Ingredients awaiting confirmation", 2, ["soother"], ["housewarming", "justbecause"], ["friend", "colleague", "self"]],
  ["mu-toes", "Tranquil Toes Foot Soak", "mushhk", 65000, "Rituals & care", "Ingredients awaiting confirmation", 2, ["soother", "thoughtful"], ["thanks", "justbecause"], ["colleague", "parent"]],
  ["sv-sandhya", "Svara Sandhya", "svara", 180000, "Fragrance", "Ingredients awaiting confirmation", 2, ["thoughtful", "heart"], ["birthday", "thanks"], ["partner", "colleague"]],
  ["sv-divya", "Svara Divya", "svara", 180000, "Fragrance", "Ingredients awaiting confirmation", 2, ["showstopper", "heart"], ["wedding", "birthday"], ["partner", "friend"]],
  ["an-range", "The Anirveda Ritual Set", "anirveda", 350000, "Rituals & care", "Ingredients awaiting confirmation", 2, ["showstopper", "heart"], ["diwali", "wedding", "thanks"], ["parent", "colleague"]],
] as const;

export const sampleCatalog = GetCatalogResponse.parse({
  sample: true,
  makers: sampleMakers,
  products: seed.map(([slug, name, makerId, pricePaise, category, material, dispatchDays]) => ({
    id: slug, slug, name, makerId, pricePaise, category, material, dispatchDays,
    image: image(slug), stock: 6, sample: true, status: "live",
    description: `${name}, from ${sampleMakers.find(m => m.id === makerId)?.brand}. An introduction to the supplied collection. Prices, materials and dispatch times are development samples and must be confirmed before sale.`,
  })),
});

export const sampleDomainProducts: DomainProduct[] = seed.map(([slug, name, makerId, pricePaise, , , dispatchDays, feels, occasions, recipients]) => ({
  id: slug, makerId, name, pricePaise, dispatchDays, stock: 6, gstPct: 18,
  madeToOrder: false, status: "live", feels: [...feels], occasions: [...occasions], recipients: [...recipients],
}));
export const sampleDomainMakers = new Map<string, DomainMaker>(sampleMakers.map(m => [
  m.id, { id: m.id, brand: m.brand, gstRegistered: false, state: null, trusted: false, approvedCount: 0, published: true },
]));

export function mapMaker(row: Record<string, unknown>) {
  return {
    id: String(row.id), slug: String(row.id), brand: String(row.brand),
    craft: String(row.craft ?? ""), tagline: String(row.tagline ?? ""),
    story: String(row.story ?? row.bio ?? ""), image: String(row.hero_image_url ?? ""),
  };
}
export function mapProduct(row: Record<string, unknown>, sample = false) {
  const images = (Array.isArray(row.product_images) ? row.product_images : []) as { url: string; sort: number }[];
  const photo = [...images].sort((a, b) => a.sort - b.sort)[0];
  return {
    id: String(row.id), slug: String(row.slug || row.id), makerId: String(row.maker_id),
    name: String(row.name), pricePaise: Number(row.price_paise), image: photo?.url ?? "",
    category: "Handmade", material: String(row.material ?? ""), description: String(row.story ?? ""),
    dispatchDays: Number(row.dispatch_days), stock: Number(row.stock), sample,
    status: String(row.status), reviewNote: String(row.review_note ?? ""),
  };
}
