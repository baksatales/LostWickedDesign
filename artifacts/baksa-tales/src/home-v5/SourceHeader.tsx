import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { prepareTemplate } from '../demo/templates';
import { hydrateChrome } from '../demo/chrome';
import type { Ctx } from '../demo/dom';

/** Injects the approved source Header (markup only, no old global styles) and hydrates it with the shared chrome. */
export default function SourceHeader() {
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const navRef = useRef(navigate); navRef.current = navigate;

  useEffect(() => {
    const host = ref.current; if (!host) return;
    const source = document.createElement('div');
    source.innerHTML = prepareTemplate('Main');
    const header = source.querySelector('header');
    if (!header) return;
    // Keep the homepage's own existing header, not a visually different standalone
    // component sample. The v5 announcement is rendered separately above it.
    host.replaceChildren(header);
    const nav = (to: string) => { navRef.current(to); window.scrollTo({ top: 0 }); };
    const ctx: Ctx = { root: host, navigate: nav, params: {}, path: '/', search: new URLSearchParams(window.location.search), cleanups: [] };
    hydrateChrome(ctx, 'store');
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const a = (e.target as Element).closest('a'); if (!a || !host.contains(a)) return;
      if (a.hasAttribute('data-bea-open') || a.getAttribute('href') === '#ask-bea') {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('bt:open-bea'));
        return;
      }
      const r = a.getAttribute('data-route');
      if (r) { e.preventDefault(); nav(r); }
    };
    host.addEventListener('click', onClick);
    return () => {
      host.removeEventListener('click', onClick);
      ctx.cleanups.forEach(fn => { try { fn(); } catch { /* ignore */ } });
      host.replaceChildren();
    };
  }, []);

  return <div ref={ref} className="h5-header-host" data-testid="h5-source-header" />;
}
