import { useCallback, useEffect, useReducer, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLocation } from 'wouter';

export const BEA_OPEN_EVENT = 'bt:open-bea';
export const BEA_NEW_CHAT_EVENT = 'bt:new-bea-chat';

export interface BeaOpenDetail {
  recipient?: string;
  step?: number;
}

export function requestOpenBea(detail: BeaOpenDetail = {}) {
  window.dispatchEvent(new CustomEvent<BeaOpenDetail>(BEA_OPEN_EVENT, { detail }));
}

interface ChatMessage { role: 'user' | 'assistant'; content: string; }

const GREETING: ChatMessage = {
  role: 'assistant',
  content: "Namaste! I'm Bea, your Baksa Tales gifting concierge. Who are you shopping for today, and what's the occasion?",
};

// ─── Module-level persistent store ───────────────────────────────────────────
// Lives outside React so navigation never destroys the conversation.
// Persisted to sessionStorage so it survives a hard page reload within the tab.
const STORAGE_KEY = 'bt-bea-history';

function loadHistory(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [GREETING];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.length) return [GREETING];
    return parsed as ChatMessage[];
  } catch {
    return [GREETING];
  }
}

function saveHistory(msgs: ChatMessage[]) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)); } catch { /* quota exceeded — ignore */ }
}

function clearHistory() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

let _history: ChatMessage[] = loadHistory();
const _listeners = new Set<() => void>();

function getHistory() { return _history; }
function setHistory(msgs: ChatMessage[]) {
  _history = msgs;
  saveHistory(msgs);
  _listeners.forEach(fn => fn());
}
function subscribeHistory(fn: () => void) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

async function sendToOllama(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${API_BASE}/bea/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json() as { reply?: string; error?: string };
  if (!res.ok || data.error) throw new Error(data.error ?? 'Unexpected error');
  return data.reply ?? '';
}

export function BeaWidget({ autoOpenKey = '', autoOpenDetail = {} }: { autoOpenKey?: string; autoOpenDetail?: BeaOpenDetail }) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(open); openRef.current = open;
  const triggerRef = useRef<HTMLElement | null>(null);

  const launch = useCallback((detail: BeaOpenDetail = {}) => {
    if (!openRef.current) triggerRef.current = document.activeElement as HTMLElement | null;
    void detail;
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => launch((e as CustomEvent<BeaOpenDetail>).detail ?? {});
    const onNewChat = () => { clearHistory(); setHistory([GREETING]); };
    window.addEventListener(BEA_OPEN_EVENT, onOpen);
    window.addEventListener(BEA_NEW_CHAT_EVENT, onNewChat);
    return () => {
      window.removeEventListener(BEA_OPEN_EVENT, onOpen);
      window.removeEventListener(BEA_NEW_CHAT_EVENT, onNewChat);
    };
  }, [launch]);

  useEffect(() => { if (autoOpenKey) launch(autoOpenDetail); }, [autoOpenKey, launch]);

  return (
    <>
      {!open && (
        <button type="button" className="bt-bea-launcher" data-testid="button-open-bea"
          aria-label="Ask Bea" aria-expanded="false" onClick={() => launch()}>
          <span className="bt-bea-launcher-icon" aria-hidden="true">B</span>
          <span>Ask Bea</span>
        </button>
      )}
      <BeaPopover open={open} onClose={close} />
    </>
  );
}

const PRODUCT_SLUGS: Record<string, string> = {
  'blue lotus': 't-bluelotus', 'crimson lotus': 't-crimson', 'marigold urli': 't-marigold',
  'teapot bouquet': 't-teapot', 'lotus pond candle': 't-lotuspond', 'succulent bowl': 't-succulents',
  'mushhk essential': 'mu-box', 'dream haven': 'mu-dream', 'tranquil toes': 'mu-toes',
  'svara sandhya': 'sv-sandhya', 'svara divya': 'sv-divya', 'anirveda': 'an-range',
};
function findSlug(text: string) {
  const lower = text.toLowerCase();
  return Object.entries(PRODUCT_SLUGS).find(([k]) => lower.includes(k))?.[1];
}

function BeaPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, navigate] = useLocation();
  const dialogRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to the module-level store — re-render on any history change
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  useEffect(() => subscribeHistory(forceUpdate), []);
  const messages = getHistory();

  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Focus input when popover opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Scroll to bottom when messages change or loading state flips
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // Focus trap + Escape
  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled])'
      )).filter(el => el.offsetParent !== null);
      if (!focusable.length) return;
      if (e.shiftKey && document.activeElement === focusable[0]) { e.preventDefault(); focusable.at(-1)?.focus(); }
      else if (!e.shiftKey && document.activeElement === focusable.at(-1)) { e.preventDefault(); focusable[0]?.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); document.body.style.overflow = oldOverflow; };
  }, [open, onClose]);

  if (!open) return null;

  const send = async () => {
    const text = draft.trim();
    if (!text || loading) return;
    setDraft('');
    setError('');
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setHistory(next);
    setLoading(true);
    try {
      const reply = await sendToOllama(next);
      setHistory([...next, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send(); };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  const startNewChat = () => {
    clearHistory();
    setHistory([GREETING]);
    setDraft('');
    setError('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const hasConversation = messages.length > 1;

  return (
    <div className="bt-bea-layer" data-testid="bea-popover-layer"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="bt-bea-popover" role="dialog" aria-modal="true"
        aria-labelledby="bt-bea-title" data-testid="bea-popover">

        <header className="bt-bea-popover-head">
          <div>
            <span>BAKSA TALES · GIFTING CONCIERGE</span>
            <h2 id="bt-bea-title">Ask Bea</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hasConversation && (
              <button type="button" className="bt-bea-new-chat" aria-label="Start a new conversation"
                title="New conversation" onClick={startNewChat}>
                ✦ New chat
              </button>
            )}
            <button type="button" className="bt-bea-close" aria-label="Close Bea"
              data-testid="button-close-bea" onClick={onClose}>×</button>
          </div>
        </header>

        <div className="bt-bea-popover-body">
          <div className="bt-bea-transcript" aria-live="polite" aria-label="Conversation with Bea">
            {messages.map((msg, i) => {
              const slug = msg.role === 'assistant' ? findSlug(msg.content) : undefined;
              return (
                <div key={i} className="bt-bea-turn">
                  <p className={msg.role === 'user' ? 'bt-bea-reply' : 'bt-bea-message'}>
                    {msg.content}
                  </p>
                  {slug && (
                    <button type="button" className="bt-bea-product-link"
                      onClick={() => { onClose(); navigate(`/product/${slug}`); window.scrollTo({ top: 0 }); }}>
                      View this piece →
                    </button>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className="bt-bea-turn">
                <p className="bt-bea-message bt-bea-typing" aria-label="Bea is thinking">
                  <span /><span /><span />
                </p>
              </div>
            )}
            {error && <p className="bt-bea-error" role="alert">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <form className="bt-bea-input-row" onSubmit={onSubmit}>
            <textarea
              ref={inputRef}
              className="bt-bea-input"
              data-testid="input-bea-message"
              placeholder="A Diwali gift for my mother under ₹2,000…"
              maxLength={500}
              rows={2}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
              aria-label="Your message to Bea"
            />
            <button type="submit" className="bt-bea-send" data-testid="button-bea-send"
              disabled={loading || !draft.trim()} aria-label="Send message">
              ↑
            </button>
          </form>
          <p className="bt-bea-disclosure">Bea is powered by Llama 3.2 running locally. Responses are suggestions only.</p>
        </div>
      </section>
    </div>
  );
}
