import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'wouter';
import { emphasis } from './content';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const asset = (path: string) => (path.startsWith('/') ? `${BASE}${path}` : path);

export function Em({ text, color }: { text: string; color?: string }) {
  return <>{emphasis(text).map((s, i) => (i % 2 ? <em key={i} style={color ? { color } : undefined}>{s}</em> : <span key={i}>{s}</span>))}</>;
}

export function AppLink({ href, className, children, testId, onClick, style }: { href: string; className?: string; children: ReactNode; testId?: string; onClick?: () => void; style?: CSSProperties }) {
  if (href.startsWith('https://')) return <a href={href} className={className} style={style} data-testid={testId} onClick={onClick} rel="noopener noreferrer">{children}</a>;
  return <Link href={href} className={className} style={style} data-testid={testId} onClick={() => { onClick?.(); window.scrollTo({ top: 0 }); }}>{children}</Link>;
}

/** Block-print band exactly as the source SVG pattern. */
export function Band({ color = '#C23A36' }: { color?: string }) {
  const id = `h5band${useId().replace(/:/g, '')}`;
  return (
    <svg aria-hidden="true" style={{ position: 'relative', display: 'block', width: '100%', height: 26 }}>
      <defs><pattern id={id} width="26" height="26" patternUnits="userSpaceOnUse">
        <path d="M13 5 L21 13 L13 21 L5 13 Z" fill="none" stroke={color} strokeWidth="1.4" />
        <circle cx="13" cy="13" r="2.2" fill={color} /><circle cx="0" cy="13" r="1.4" fill={color} /><circle cx="26" cy="13" r="1.4" fill={color} />
      </pattern></defs>
      <line x1="0" y1="1.5" x2="100%" y2="1.5" stroke={color} strokeWidth="1.5" />
      <rect x="0" y="2" width="100%" height="22" fill={`url(#${id})`} />
      <line x1="0" y1="24.5" x2="100%" y2="24.5" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function Modal({ open, onClose, label, children, className, testId }: { open: boolean; onClose: () => void; label: string; children: ReactNode; className?: string; testId?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, a[href]')?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab' && ref.current) {
        const items = [...ref.current.querySelectorAll<HTMLElement>('button, a[href], input')];
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); prev?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="h5-scrim" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} className={className ?? 'h5-dialog'} data-testid={testId} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function TrunkMark({ size = 28, src }: { size?: number; src?: string }) {
  if (src) return <img src={asset(src)} width={size} alt="" style={{ objectFit: 'contain' }} />;
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 40 32" aria-hidden="true">
      <path d="M6 4h28l4 8H2z" fill="#611811" />
      <rect x="2" y="12" width="36" height="18" rx="3" fill="#611811" />
      <rect x="16" y="17" width="8" height="6" rx="1.5" fill="#EBA937" />
      <path d="M2 12h5l-5 5zM38 12h-5l5 5z" fill="#EBA937" />
    </svg>
  );
}
