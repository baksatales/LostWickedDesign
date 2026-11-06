import { GetSiteResponse } from "@workspace/api-zod";
import { HttpError } from "./supabase";

const link = (label: string, href: string) => ({ label, href });
const section = (id: string, type: "hero" | "story" | "products" | "maker" | "quiz" | "invitation", title: string, text: string, href: string, label: string) => ({
  id, type, title, text, visible: true, eyebrow: "", image: "", imageAlt: "",
  tone: "light" as const, layout: "editorial" as const, link: link(label, href), storyId: "", productIds: [],
});
const page = (id: string, heading: string, intro: string, eyebrow: string) => ({
  id, title: heading, description: intro.slice(0, 300), heading, intro, eyebrow, image: "", imageAlt: "",
});
export const siteDocumentSchema = GetSiteResponse.shape.document;
export type EditorialDocument = ReturnType<typeof siteDocumentSchema.parse>;

export const defaultSite = siteDocumentSchema.parse({
  brand: {
    name: "Baksa Tales", tagline: "Dil Se Duniya Tak",
    logo: "/images/baksa/baksatales-logo-transparent.png",
    mark: "/images/baksa/baksatales-trunk-mark.png",
    announcement: "A little wonder. A world of Indian makers.",
    footerTitle: "Objects worth keeping. Stories worth telling.",
    footerText: "An invitation to independent Indian makers, thoughtful objects and the joy of giving.",
    copyright: "Baksa Tales · Dil Se Duniya Tak",
  },
  theme: {
    background: "#F6F3DF", surface: "#FFF8EC", primary: "#611811", secondary: "#3E0F0B",
    accent: "#EBA937", ink: "#2B1712", muted: "#5C463C", headingFont: "garamond",
    bodyFont: "inter", radius: 4, spacing: "generous", motion: true, ornament: true,
  },
  navigation: [
    link("The BT Edit", "/shop"), link("Our makers", "/makers"),
    link("The gift quiz", "/gift-finder"), link("Corporate gifting", "/corporate"),
  ],
  footerLinks: [
    link("The BT Edit", "/shop"), link("Our makers", "/makers"), link("The gift quiz", "/gift-finder"),
    link("Corporate gifting", "/corporate"), link("Sell with Baksa", "/sell"),
    link("Makers’ Academy", "/academy"), link("My account", "/account"), link("Site Studio", "/admin/site"),
  ],
  sections: [
    { ...section("opening", "hero", "Every creation has a story.\nFind the one that speaks to yours.",
      "Open the baksa. Meet a thoughtful edit of Indian makers, objects with personality, and gifts you’ll want to keep.",
      "/gift-finder", "Find a gift in four questions"), eyebrow: "दिल से दुनिया तक", layout: "split",
      image: "/images/baksa/baksa-painted-garden.webp", imageAlt: "An original decorative Indian garden illustration with flowering trees, peacocks and a lotus pond" },
    { ...section("todays-tale", "story", "A little lotus.\nA lovely place to begin.",
      "A closer look at Blue Lotus Pond, from the supplied Tathaastu catalogue. One object, three small chapters.",
      "/stories/tathaastu", "Read the tale"), eyebrow: "Today’s Tale · No. 01",
      image: "/images/baksa/t-bluelotus.webp", imageAlt: "Blue Lotus Pond from the Tathaastu catalogue", storyId: "tathaastu", tone: "dark", layout: "split" },
    { ...section("the-edit", "products", "For the joy of giving.",
      "A small edit. A little less searching. A little more meaning.", "/shop", "Explore the whole edit"), eyebrow: "The BT Edit" },
    { ...section("maker-note", "maker", "An object is only half the story.",
      "Get to know the independent names behind the work. Start with their pieces, then explore their corner of Baksa.",
      "/makers", "Meet our makers"), eyebrow: "The people behind the pieces",
      image: "/images/baksa/t-teapot.webp", imageAlt: "A teapot-shaped piece in the supplied Tathaastu catalogue", layout: "split" },
    { ...section("gift-quiz", "quiz", "A thoughtful gift.\nWithout the overthinking.",
      "Four short questions. A considered shortlist, with a reason for every match.",
      "/gift-finder", "Take the gift quiz"), eyebrow: "Your one place to begin", tone: "accent", layout: "centred" },
    { ...section("makers-invitation", "invitation", "Good work deserves\na thoughtful home.",
      "An invitation to independent makers. Tell us what you make, and the people and ideas behind it.",
      "/sell", "Introduce your work"), eyebrow: "A place at Baksa", tone: "dark", layout: "centred" },
  ],
  stories: [
    {
      id: "tathaastu", maker: "Tathaastu", title: "A little lotus. A lovely place to begin.",
      intro: "An editorial look at Blue Lotus Pond from the supplied catalogue. Maker interviews and process photography will follow after verification.",
      image: "/images/baksa/t-bluelotus.webp", imageAlt: "Blue Lotus Pond catalogue photograph",
      sponsored: false, sample: true, visible: true,
      chapters: [
        { id: "first-look", title: "First, a closer look.", body: "Blue Lotus Pond is the name of this piece in the Tathaastu catalogue. Let the supplied photograph introduce its shapes and colour.", image: "/images/baksa/t-bluelotus.webp", imageAlt: "Blue Lotus Pond, shown in the supplied catalogue", quote: "" },
        { id: "the-detail", title: "The detail makes the difference.", body: "The supplied listing describes cobalt lotuses in brass. Material, dimensions and making details require maker confirmation before this becomes a live listing.", image: "/images/baksa/t-lotuspond.webp", imageAlt: "Lotus-inspired work from the Tathaastu catalogue", quote: "" },
        { id: "your-chapter", title: "Then, your chapter begins.", body: "Keep a favourite in your wishlist, or look through the maker’s edit. This is a sample catalogue, not a claim of live availability.", image: "/images/baksa/t-teapot.webp", imageAlt: "Another piece from the supplied Tathaastu catalogue", quote: "" },
      ],
      link: link("Explore Tathaastu", "/makers/tathaastu"),
    },
    {
      id: "mushhk", maker: "Mushhk", title: "A box, with a little more inside.",
      intro: "The Essential Box, from the supplied Mushhk catalogue. A sample sponsored-story treatment, not a real sponsorship.",
      image: "/images/baksa/mu-box.webp", imageAlt: "Mushhk Essential Box catalogue photograph",
      sponsored: true, sample: true, visible: true,
      chapters: [
        { id: "inside-the-box", title: "Inside the Essential Box.", body: "The supplied listing names a face oil, room mist, foot salt and coffee scrub in a keepsake case. This sample makes no wellness claims.", image: "/images/baksa/mu-box.webp", imageAlt: "The supplied Mushhk Essential Box image", quote: "" },
      ],
      link: link("Explore Mushhk", "/makers/mushhk"),
    },
  ],
  trunkCards: [
    { id: "a-tale", title: "A little lotus", caption: "Today’s Tale · Tathaastu", image: "/images/baksa/t-bluelotus.webp", imageAlt: "Blue Lotus Pond", sponsored: false, link: link("Read the tale", "/stories/tathaastu") },
    { id: "a-feature", title: "The Essential Box", caption: "Mushhk · sample placement", image: "/images/baksa/mu-box.webp", imageAlt: "Mushhk Essential Box", sponsored: true, link: link("Explore the story", "/stories/mushhk") },
    { id: "your-gift", title: "For someone lovely", caption: "Four questions. A thoughtful shortlist.", image: "", imageAlt: "", sponsored: false, link: link("Take the gift quiz", "/gift-finder") },
  ],
  pages: [
    page("shop", "The considered edit.", "Objects chosen for their personality, their making, and the meaning they can carry.", "The BT Edit"),
    page("makers", "The people behind the pieces.", "Independent names, distinct points of view. Meet the makers in the Baksa catalogue.", "Our makers"),
    page("gift-finder", "Let’s find their kind of lovely.", "Four short questions. A few thoughtful matches, with a reason for each.", "The gift quiz"),
    page("corporate", "Gifts your team will want to keep.", "Tell us about your occasion, quantity and budget. The Baksa team will review your brief.", "Corporate gifting"),
    page("sell", "There’s a place for your story.", "Tell us what you make, where you make it, and what makes it yours.", "Sell with Baksa"),
    page("academy", "Good work. Shared knowledge.", "A future home for learning from makers. Enrolment is not open yet.", "Makers’ Academy"),
    page("sign-in", "Your place at Baksa.", "Sign in to your account or begin a new chapter.", "Welcome"),
    page("account", "Your little corner of Baksa.", "Your account, your orders, and the pieces you keep coming back to.", "My account"),
    page("maker", "Namaste, maker.", "Your work, your listings, and what needs your attention.", "Maker workspace"),
    page("admin", "The Baksa desk.", "Review the work, care for the makers, and curate the experience.", "Team workspace"),
    page("wishlist", "For another lovely day.", "The pieces you’ve saved in this browser.", "Your wishlist"),
    page("bag", "A little joy, set aside.", "Review your selected pieces, grouped by maker.", "Your bag"),
    page("checkout", "The final thoughtful details.", "Review your bag. Payment will open only after secure commerce setup is complete.", "Checkout"),
  ],
  labels: {
    "hero.note": "Independent Indian makers · stories worth keeping",
    "trunk.eyebrow": "A little something inside",
    "trunk.intro": "Open the baksa; let a story find you.",
    "art.credit": "A painted garden · decorative original artwork",
    "quiz.recipient.title": "Who is the lucky person?",
    "quiz.occasion.title": "What are we celebrating?",
    "quiz.feeling.title": "What would make them smile?",
    "quiz.budget.title": "What feels comfortable to spend?",
    "quiz.recipient.parent": "A parent", "quiz.recipient.partner": "A partner",
    "quiz.recipient.friend": "A friend", "quiz.recipient.colleague": "A colleague or client",
    "quiz.recipient.self": "Myself, obviously",
    "quiz.occasion.diwali": "Diwali", "quiz.occasion.wedding": "A wedding",
    "quiz.occasion.birthday": "A birthday", "quiz.occasion.thanks": "A little thank you",
    "quiz.occasion.housewarming": "A new home", "quiz.occasion.justbecause": "Just because",
    "quiz.feeling.heart": "Something personal", "quiz.feeling.showstopper": "A lovely surprise",
    "quiz.feeling.soother": "A quiet moment", "quiz.feeling.thoughtful": "Everyday thoughtfulness",
    "quiz.feeling.explorer": "Something unexpected",
    "quiz.next": "Next question", "quiz.results": "Find their kind of lovely",
    "trunk.open": "Open the baksa", "trunk.close": "Close the baksa",
    "story.read": "Read the tale", "product.save": "Save for later", "product.add": "Add to bag",
  },
});

export function isSafeImage(value: string) {
  if (!value) return true;
  return /^\/images\/baksa\/[a-zA-Z0-9_.-]+\.(webp|png|jpg|jpeg|avif)$/i.test(value)
    || /^https:\/\/[a-zA-Z0-9.-]+(?::443)?\/[^\s<>\\]*$/i.test(value);
}
export function isSafeLink(value: string) {
  // Never allow protocol-relative URLs, active schemes, control characters or backslashes.
  return /^\/(?!\/)[a-zA-Z0-9/_?=&%#.,~-]*$/.test(value)
    || /^https:\/\/[a-zA-Z0-9.-]+(?::443)?(?:\/[^\s<>\\]*)?$/.test(value);
}
function luminance(hex: string) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
}
export function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function validateSiteDocument(value: unknown): EditorialDocument {
  const parsed = siteDocumentSchema.safeParse(value);
  if (!parsed.success) throw new HttpError(400, "Check the site content, field lengths and appearance settings.");
  const d = parsed.data;
  if (Buffer.byteLength(JSON.stringify(d)) > 180_000) throw new HttpError(400, "The site document is too large. Use image URLs, not embedded files.");
  for (const items of [d.sections, d.stories, d.trunkCards, d.pages]) {
    if (new Set(items.map(i => i.id)).size !== items.length) throw new HttpError(400, "Each section, story, card and page needs its own unique ID.");
  }
  for (const story of d.stories) {
    if (new Set(story.chapters.map(c => c.id)).size !== story.chapters.length) throw new HttpError(400, "Story chapter IDs must be unique.");
  }
  for (const s of d.sections) {
    if (s.type === "story" && s.visible && !d.stories.some(story => story.id === s.storyId && story.visible)) {
      throw new HttpError(400, "Choose a visible story for each visible story section.");
    }
  }
  function walk(v: unknown) {
    if (!v || typeof v !== "object") return;
    for (const [key, x] of Object.entries(v)) {
      if (key === "href" && typeof x === "string" && !isSafeLink(x)) throw new HttpError(400, "Links must be a local page or a full https address.");
      if (["image", "logo", "mark"].includes(key) && typeof x === "string" && !isSafeImage(x)) throw new HttpError(400, "Use a supplied image path or a full https image address.");
      if (typeof x === "string" && /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x)) throw new HttpError(400, "Remove control characters from the site content.");
      walk(x);
    }
  }
  walk(d);
  if (Object.keys(d.labels).length > 200) throw new HttpError(400, "Keep the label dictionary to 200 entries.");
  const t = d.theme;
  for (const background of [t.background, t.surface]) {
    for (const foreground of [t.ink, t.muted, t.primary]) {
      if (contrast(foreground, background) < 4.5) throw new HttpError(400, "The chosen text colours need more contrast against the reading backgrounds (at least 4.5:1).");
    }
  }
  if (contrast(t.ink, t.accent) < 4.5 || contrast(t.surface, t.secondary) < 4.5) {
    throw new HttpError(400, "Accent and dark sections need more readable colour combinations (at least 4.5:1).");
  }
  return d;
}
