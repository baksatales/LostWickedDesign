import { useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Link } from "./Link";

export type StoryId = "tathaastu" | "mushhk" | "svara" | "anirveda";

type Slide = {
  image: string;
  eyebrow: string;
  title: string;
  body: string;
};

type Story = {
  id: StoryId;
  brand: string;
  sponsored: boolean;
  slides: [Slide, Slide];
};

export const stories: Story[] = [
  {
    id: "tathaastu",
    brand: "Tathaastu",
    sponsored: false,
    slides: [
      {
        image: "t-bluelotus.webp",
        eyebrow: "Editorial maker story · sample catalogue",
        title: "Tathaastu",
        body: "A maker represented in this sample catalogue. These story cards share supplied product names and catalogue imagery, not an extended maker biography.",
      },
      {
        image: "t-bluelotus.webp",
        eyebrow: "A product in the sample edit",
        title: "Blue Lotus Pond",
        body: "Indicative sample catalogue price: ₹2,400. The supplied product listing describes cobalt lotuses in brass.",
      },
    ],
  },
  {
    id: "mushhk",
    brand: "Mushhk",
    sponsored: true,
    slides: [
      {
        image: "mu-box.webp",
        eyebrow: "Sponsored · SAMPLE placement",
        title: "Mushhk",
        body: "This is a design-preview sponsorship concept only. No real commercial relationship, paid placement, or endorsement is represented.",
      },
      {
        image: "mu-box.webp",
        eyebrow: "A product in the sample catalogue",
        title: "The Mushhk Essential Box",
        body: "Indicative sample catalogue price: ₹3,200. The supplied listing names a face oil, room mist, foot salt, and coffee scrub in a keepsake case.",
      },
    ],
  },
  {
    id: "svara",
    brand: "Svara",
    sponsored: false,
    slides: [
      {
        image: "sv-sandhya.webp",
        eyebrow: "Editorial maker story · sample catalogue",
        title: "Svara",
        body: "A maker represented in this sample catalogue. The preview uses a supplied Svara product image and the listed product name only.",
      },
      {
        image: "sv-sandhya.webp",
        eyebrow: "A product in the sample catalogue",
        title: "Svara Sandhya",
        body: "Indicative sample catalogue price: ₹1,800. Additional product details await maker confirmation for this design preview.",
      },
    ],
  },
  {
    id: "anirveda",
    brand: "Anirveda",
    sponsored: false,
    slides: [
      {
        image: "an-range.webp",
        eyebrow: "Editorial maker story · sample catalogue",
        title: "Anirveda",
        body: "A maker represented in this sample catalogue. The preview shares supplied product imagery and listing information without making product or wellness claims.",
      },
      {
        image: "an-range.webp",
        eyebrow: "A product in the sample catalogue",
        title: "The Anirveda Ritual Set",
        body: "Indicative sample catalogue price: ₹3,500. The supplied listing names face wash, serum, night cream, oil pulling, and face mist.",
      },
    ],
  },
];

export function StoryViewer({ storyId, onClose }: { storyId: StoryId; onClose: () => void }) {
  const story = stories.find((item) => item.id === storyId) ?? stories[0];
  const [slideIndex, setSlideIndex] = useState(0);
  const [previewMessage, setPreviewMessage] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setSlideIndex((index) => Math.min(index + 1, story.slides.length - 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSlideIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex="0"]',
        )).filter((element) => element.offsetParent !== null);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = oldOverflow;
      previouslyFocused?.focus();
    };
  }, [story.id, story.slides.length]);

  const onTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined || Math.abs(end - start) < 48) return;
    setSlideIndex((index) => Math.max(0, Math.min(story.slides.length - 1, index + (end < start ? 1 : -1))));
  };

  const slide = story.slides[slideIndex];
  return (
    <div className="bk-storybackdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        className="bk-storydialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bk-story-title"
        aria-describedby="bk-story-copy"
        ref={dialogRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <header className="bk-story-dialoghead">
          <div className="bk-story-brand"><img src={`/__mockup/images/baksa/${slide.image}`} alt=""/><span>{story.brand}<small>Today’s story · sample catalogue</small></span></div>
          {story.sponsored && <div className="bk-story-sponsor" role="note">Sponsored · SAMPLE placement — design concept only; no real commercial relationship is represented.</div>}
          <button className="bk-iconbtn bk-story-close" onClick={onClose} aria-label="Close story" ref={closeButtonRef}><X size={20}/></button>
        </header>
        <div className="bk-story-progress" aria-label={`Slide ${slideIndex + 1} of ${story.slides.length}`}>
          {story.slides.map((item, index) => <button key={item.title} onClick={() => setSlideIndex(index)} aria-label={`Go to slide ${index + 1}`} aria-current={index === slideIndex ? "step" : undefined}><span className={index === slideIndex ? "current" : index < slideIndex ? "passed" : ""}/></button>)}
        </div>
        <div className="bk-story-slide" aria-live="polite">
          <img className="bk-story-slideimage" src={`/__mockup/images/baksa/${slide.image}`} alt={`${story.brand} catalogue image`}/>
          <section className="bk-story-copy">
            <span className="bk-eyebrow">{slide.eyebrow}</span>
            <h2 id="bk-story-title">{slide.title}</h2>
            <p id="bk-story-copy">{slide.body}</p>
            {story.sponsored && <p className="bk-story-sponsor-copy">Sponsored · SAMPLE placement. This preview does not represent an actual paid relationship.</p>}
            {storyId === "tathaastu" && slideIndex === 1 ? (
              <Link className="bk-btn" href="/__mockup/preview/baksa/Product" onClick={onClose}>View Blue Lotus Pond sample <ArrowRight size={15}/></Link>
            ) : (
              <button className="bk-btn secondary" onClick={() => setPreviewMessage(`${story.brand} product details are not a destination in this design preview.`)}>Check this preview’s available detail</button>
            )}
            {previewMessage && <p className="bk-story-previewmsg" role="status">{previewMessage}</p>}
          </section>
        </div>
        <footer className="bk-story-controls">
          <span>Slide {slideIndex + 1} of {story.slides.length}</span>
          <div>
            <button className="bk-btn secondary" onClick={() => setSlideIndex((index) => Math.max(0, index - 1))} disabled={slideIndex === 0} aria-label="Previous story slide"><ArrowLeft size={16}/> Previous</button>
            <button className="bk-btn" onClick={() => setSlideIndex((index) => Math.min(story.slides.length - 1, index + 1))} disabled={slideIndex === story.slides.length - 1} aria-label="Next story slide">Next <ArrowRight size={16}/></button>
          </div>
        </footer>
      </div>
    </div>
  );
}
