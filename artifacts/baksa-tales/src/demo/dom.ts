/** Small DOM helpers used to hydrate the approved static markup. */
export type Nav = (path: string) => void;
export interface Ctx { root: HTMLElement; navigate: Nav; params: Record<string, string>; path: string; search: URLSearchParams; cleanups: (() => void)[] }

export const $ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector(sel) as T | null;
export const $$ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => Array.from(root.querySelectorAll(sel)) as T[];
export const norm = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
export const byText = <T extends Element = HTMLElement>(root: ParentNode, sel: string, text: string | RegExp) =>
  $$<T>(root, sel).find(el => (typeof text === 'string' ? norm(el.textContent) === text : text.test(norm(el.textContent)))) ?? null;
export const byTextAll = <T extends Element = HTMLElement>(root: ParentNode, sel: string, text: RegExp) => $$<T>(root, sel).filter(el => text.test(norm(el.textContent)));
export const tid = (el: Element | null | undefined, id: string) => { if (el) el.setAttribute('data-testid', id); return el; };
export const styleOf = (el: Element | null | undefined) => el?.getAttribute('style') ?? '';
export const setStyle = (el: Element | null | undefined, s: string) => { if (el) el.setAttribute('style', s); };
const originalDisplay = new WeakMap<HTMLElement, string>();
export function setVisible(el: HTMLElement | null | undefined, visible: boolean) {
  if (!el) return;
  if (!originalDisplay.has(el)) originalDisplay.set(el, el.style.display);
  el.style.display = visible ? originalDisplay.get(el)! : 'none';
}
export const cloneEl = <T extends Element>(el: T) => el.cloneNode(true) as T;
export const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function on<K extends keyof HTMLElementEventMap>(ctx: Ctx, el: EventTarget | null | undefined, type: K, fn: (e: HTMLElementEventMap[K]) => void) {
  if (!el) return;
  el.addEventListener(type, fn as EventListener);
  ctx.cleanups.push(() => el.removeEventListener(type, fn as EventListener));
}

/** Toggle between two style strings captured from the approved markup (pressed/unpressed pills). */
export function pillGroup(buttons: HTMLElement[], activeStyle: string, idleStyle: string, active: number) {
  buttons.forEach((b, i) => {
    setStyle(b, i === active ? activeStyle : idleStyle);
    if (b.hasAttribute('aria-pressed') || b.closest('[role="group"]')) b.setAttribute('aria-pressed', String(i === active));
  });
}

/** Inline error message in the approved palette. */
export function fieldError(anchor: Element | null, msg: string | null | undefined, id: string) {
  if (!anchor) return;
  const host = anchor.parentElement ?? anchor;
  let p = host.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  if (!msg) { p?.remove(); return; }
  if (!p) {
    p = document.createElement('p');
    p.setAttribute('data-testid', id);
    p.setAttribute('role', 'alert');
    p.setAttribute('style', "margin: 6px 0 0; font-family: 'Bodoni Moda', Georgia, serif; font-size: 16px; color: #752F43");
    anchor.insertAdjacentElement('afterend', p);
  }
  p.textContent = msg;
}

export const ARVO = 'Jost, Georgia, serif';
export const GARAMOND = "'Bodoni Moda', Georgia, serif";
export const BTN_PRIMARY = `height: 50px; padding: 0 22px; border-radius: 999px; border: 0; background: #752F43; color: #FAF6EF; font-family: ${ARVO}; font-size: 13px; cursor: pointer`;
export const BTN_OUTLINE = `height: 50px; padding: 0 22px; border-radius: 999px; border: 1.5px solid #752F43; background: transparent; color: #752F43; font-family: ${ARVO}; font-size: 13px; cursor: pointer`;
export const CHIP = (bg: string, fg: string) => `margin-left: 6px; background: ${bg}; color: ${fg}; border-radius: 999px; padding: 4px 10px; font-family: ${ARVO}; font-size: 11px`;
