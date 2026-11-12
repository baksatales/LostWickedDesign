import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import { type FinderAnswers } from './domain';
import { DEFAULT_RESULTS_ANSWERS, FINDER_STEPS, finderResult, finderSummary, formatINR, getState, imgUrl, makerById, productById, setFinderAnswer, subscribe, update } from './store';

export const BEA_OPEN_EVENT = 'bt:open-bea';

export interface BeaOpenDetail {
  recipient?: FinderAnswers['recipient'];
  step?: number;
}

export function requestOpenBea(detail: BeaOpenDetail = {}) {
  window.dispatchEvent(new CustomEvent<BeaOpenDetail>(BEA_OPEN_EVENT, { detail }));
}

function parseRequest(query: string): Partial<FinderAnswers> {
  const text = query.toLowerCase();
  const answers: Partial<FinderAnswers> = {};
  if (/\b(mum|mom|mother|father|dad|parent)\b/.test(text)) answers.recipient = 'parent';
  else if (/\b(wife|husband|partner|girlfriend|boyfriend)\b/.test(text)) answers.recipient = 'partner';
  else if (/\b(friend|bestie)\b/.test(text)) answers.recipient = 'friend';
  else if (/\b(colleague|client|coworker|boss)\b/.test(text)) answers.recipient = 'colleague';
  else if (/\bmyself|for me\b/.test(text)) answers.recipient = 'self';
  if (/\bdiwali|festival\b/.test(text)) answers.occasion = 'diwali';
  else if (/\bwedding|marriage\b/.test(text)) answers.occasion = 'wedding';
  else if (/\bbirthday|bday\b/.test(text)) answers.occasion = 'birthday';
  else if (/\bthank|thanks|gratitude\b/.test(text)) answers.occasion = 'thanks';
  else if (/\bhousewarming|new home\b/.test(text)) answers.occasion = 'housewarming';
  if (/\brelax|calm|soothe|unwind\b/.test(text)) answers.feel = 'soother';
  else if (/\buseful|practical|everyday\b/.test(text)) answers.feel = 'thoughtful';
  else if (/\bsurprise|special|memorable|showstopper\b/.test(text)) answers.feel = 'showstopper';
  else if (/\bpersonal|heartfelt|meaningful\b/.test(text)) answers.feel = 'heart';
  const amountMatch = text.match(/(?:under|below|less than|up to|upto|max(?:imum)?|budget(?: is)?)[^\d]{0,12}(\d[\d,]*)/);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : null;
  if (amount !== null && amount > 0) answers.budget = amount < 1500 ? 'b1' : amount < 3500 ? 'b2' : amount < 8000 ? 'b3' : 'b4';
  return answers;
}

export function BeaWidget({ autoOpenKey = '', autoOpenDetail = {} }: { autoOpenKey?: string; autoOpenDetail?: BeaOpenDetail }) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(open); openRef.current = open;
  const [session, setSession] = useState(0);
  const [detail, setDetail] = useState<BeaOpenDetail>(autoOpenDetail);
  const triggerRef = useRef<HTMLElement | null>(null);

  const launch = useCallback((next: BeaOpenDetail = {}) => {
    if (!openRef.current) triggerRef.current = document.activeElement as HTMLElement | null;
    setDetail(next);
    setSession(value => value + 1);
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    const onOpen = (event: Event) => launch((event as CustomEvent<BeaOpenDetail>).detail ?? {});
    window.addEventListener(BEA_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(BEA_OPEN_EVENT, onOpen);
  }, [launch]);

  useEffect(() => {
    if (autoOpenKey) launch(autoOpenDetail);
  }, [autoOpenKey, launch]);

  return (
    <>
      {!open && <button type="button" className="bt-bea-launcher" data-testid="button-open-bea" aria-label="Ask Bea" aria-expanded="false" onClick={() => launch()}>
        <span className="bt-bea-launcher-icon" aria-hidden="true">B</span>
        <span>Ask Bea</span>
      </button>}
      <BeaPopover open={open} session={session} detail={detail} onClose={close} />
    </>
  );
}

function BeaPopover({ open, session, detail, onClose }: { open: boolean; session: number; detail: BeaOpenDetail; onClose: () => void }) {
  const state = useSyncExternalStore(subscribe, getState);
  const [, navigate] = useLocation();
  const dialogRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [screen, setScreen] = useState<'questions' | 'results'>('questions');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setScreen('questions');
    setQuery('');
    setError('');
    if (detail.recipient) {
      update(s => ({ ...s, finder: { ...s.finder, answers: { recipient: detail.recipient! }, done: false, query: '' } }));
      setStep(Math.min(3, Math.max(0, detail.step ?? 1)));
    } else {
      update(s => ({ ...s, finder: { ...s.finder, answers: {}, done: false, query: '' } }));
      setStep(0);
    }
  }, [open, session, detail.recipient, detail.step]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, summary[tabindex], summary'))
        .filter(el => el.offsetParent !== null);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0]?.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = oldOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const activeStep = FINDER_STEPS[step];
  const advance = (key: keyof FinderAnswers, value: string) => {
    update(s => setFinderAnswer(s, key, value));
    setError('');
    if (step < FINDER_STEPS.length - 1) setStep(current => current + 1);
    else {
      update(s => ({ ...s, finder: { ...s.finder, done: true, query: '' } }));
      setScreen('results');
    }
  };
  const submitText = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = query.trim();
    if (clean.length < 3) { setError('Tell Bea a little more about the gift.'); return; }
    const answers = parseRequest(clean);
    update(s => ({ ...s, finder: { ...s.finder, answers, query: clean, done: true } }));
    setError('');
    setScreen('results');
  };

  const resultAnswers = state.finder.query
    ? { ...state.finder.answers, budget: state.finder.answers.budget ?? 'b4' }
    : { ...DEFAULT_RESULTS_ANSWERS, ...state.finder.answers, budget: state.finder.answers.budget ?? DEFAULT_RESULTS_ANSWERS.budget };
  const recommendation = finderResult(state, resultAnswers, state.finder.needBy);
  const picks = [...(recommendation.picks.length ? recommendation.picks : recommendation.nearMisses)];
  if (state.finder.query) {
    const words = state.finder.query.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2 && !['under', 'with', 'for', 'and', 'the', 'gift', 'her', 'him'].includes(word));
    const score = (id: string) => {
      const product = productById(state, id);
      if (!product) return 0;
      const maker = makerById(state, product.makerId)?.brand ?? '';
      const text = `${product.name} ${product.story ?? ''} ${product.material} ${product.technique} ${maker}`.toLowerCase();
      return words.reduce((sum, word) => sum + Number(text.includes(word)), 0);
    };
    picks.sort((a, b) => score(b.productId) - score(a.productId));
  }

  return (
    <div className="bt-bea-layer" data-testid="bea-popover-layer" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="bt-bea-popover" role="dialog" aria-modal="true" aria-labelledby="bt-bea-title" data-testid="bea-popover">
        <header className="bt-bea-popover-head">
          <div><span>BAKSA TALES · GIFTING CONCIERGE</span><h2 id="bt-bea-title">Ask Bea</h2></div>
          <button type="button" className="bt-bea-close" aria-label="Close Bea" data-testid="button-close-bea" onClick={onClose}>×</button>
        </header>
        <div className="bt-bea-popover-body">
          {screen === 'questions' ? (
            <>
              <p className="bt-bea-popover-note">Let’s find something thoughtful from the sample catalogue.</p>
              <div className="bt-bea-progress" data-testid="text-question-count" aria-label={`Question ${step + 1} of ${FINDER_STEPS.length}`}>
                <span>Question {step + 1} of {FINDER_STEPS.length}</span>
                <div>{FINDER_STEPS.map((_, index) => <i key={index} className={index <= step ? 'active' : ''} />)}</div>
              </div>
              <h3 className="bt-bea-question">{activeStep.q[0]}<em>{activeStep.q[1]}</em></h3>
              <div className="bt-bea-options">
                {activeStep.opts.map(([value, label], index) => (
                  <button type="button" key={value} data-testid={`button-option-${value}`} aria-pressed={state.finder.answers[activeStep.key] === value} onClick={() => advance(activeStep.key, value)}>
                    <span>{index + 1}</span>{label}
                  </button>
                ))}
              </div>
              <div className="bt-bea-popover-actions">
                <button type="button" className="bt-bea-text-button" data-testid="button-finder-back" onClick={() => setStep(value => Math.max(0, value - 1))} disabled={step === 0}>Back</button>
                <button type="button" className="bt-bea-text-button" data-testid="button-browse-all-gifts" onClick={() => { setScreen('results'); update(s => ({ ...s, finder: { ...s.finder, done: true, query: '' } })); }}>Browse all gifts</button>
              </div>
              <details className="bt-bea-free-text">
                <summary>Or ask Bea in your own words</summary>
                <form onSubmit={submitText}>
                  <label htmlFor="bt-bea-message">What are you looking for?</label>
                  <textarea id="bt-bea-message" data-testid="input-bea-message" maxLength={500} value={query} onChange={event => setQuery(event.target.value)} placeholder="A birthday gift for my mother under ₹1,500" />
                  {error && <p className="bt-bea-error" role="alert">{error}</p>}
                  <button type="submit" data-testid="button-bea-send">Find gift ideas</button>
                  <p className="bt-bea-disclosure">Sample concierge: matches your words to the sample catalogue; it does not use an AI service.</p>
                </form>
              </details>
            </>
          ) : (
            <>
              <p className="bt-bea-popover-note" data-testid="text-results-summary">{state.finder.query ? `Bea read: “${state.finder.query}”.` : finderSummary(state.finder.answers)}</p>
              <h3 className="bt-bea-results-heading">A few thoughtful ideas</h3>
              {picks.length ? <div className="bt-bea-result-list">
                {picks.slice(0, 3).map(item => {
                  const product = productById(state, item.productId);
                  if (!product) return null;
                  const maker = makerById(state, product.makerId);
                  return <article className="bt-bea-result" data-testid={`card-result-${product.slug}`} key={product.id}>
                    <img src={imgUrl(product.img)} alt="" />
                    <div><span>{maker?.brand}</span><strong>{product.name}</strong><small>{formatINR(product.pricePaise)}</small>
                      <button type="button" onClick={() => { onClose(); navigate(`/product/${product.slug}`); window.scrollTo({ top: 0 }); }}>View piece</button>
                    </div>
                  </article>;
                })}
              </div> : <p className="bt-bea-popover-note">I couldn’t find a close match just yet. Try different details or browse the full Edit.</p>}
              <div className="bt-bea-popover-actions">
                <button type="button" className="bt-bea-text-button" onClick={() => { setScreen('questions'); setStep(0); setQuery(''); update(s => ({ ...s, finder: { ...s.finder, answers: {}, query: '', done: false } })); }}>Start again</button>
                <button type="button" className="bt-bea-results-link" onClick={() => { onClose(); navigate('/shop'); window.scrollTo({ top: 0 }); }}>Browse the Edit</button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
