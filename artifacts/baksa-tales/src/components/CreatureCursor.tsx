import { useEffect, useRef, useCallback } from 'react';

// Arrow cursor SVG is drawn in a 54×60 viewBox tilted to match the reference image.
// Hot-spot is the top-left tip of the arrow (approx 0,0 in SVG coords after tilt).
const VW = 54;
const VH = 60;
// DOM element is sized to contain the whole tilted arrow including the grip tail.
const SIZE_W = 54;
const SIZE_H = 60;

// Eye centre in the arrow body (SVG coords, before any runtime transform).
const EYE_CX = 20;
const EYE_CY = 22;
const EYE_R = 5.5;   // white sclera radius
const PUPIL_R = 2.8; // dark pupil radius
const DOT_CX = 28;
const DOT_CY = 32;

export function CreatureCursor() {
  const elRef = useRef<HTMLDivElement | null>(null);

  const state = useRef({
    x: -200, y: -200,
    vx: 0, vy: 0,
    excited: false,
    clicking: false,
    raf: 0,
  });

  const render = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const s = state.current;

    const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);

    // Stretch along movement direction, squish perpendicular — same as bee.
    const stretch = Math.min(1 + speed * 0.035, 1.5);
    const squish = 1 / stretch;
    // Tilt the cursor to face the direction of travel (offset 45° for arrow tip).
    const angle = speed > 1.5 ? Math.atan2(s.vy, s.vx) * (180 / Math.PI) - 45 : -45;

    let scaleX = squish;
    let scaleY = stretch;
    if (s.clicking) { scaleX = 1.3; scaleY = 0.7; }
    else if (s.excited) { scaleX = 1.1; scaleY = 1.1; }

    // Position so the hot-spot (tip of arrow ≈ top-left) is under the real pointer.
    el.style.transform = `translate(${s.x - 4}px, ${s.y - 4}px) rotate(${angle}deg) scale(${scaleX}, ${scaleY})`;

    // Pupil follows movement direction (capped to stay inside sclera).
    const maxOff = EYE_R - PUPIL_R - 0.5;
    const norm = speed > 0.5 ? speed : 1;
    const ex = speed > 0.5 ? Math.max(-maxOff, Math.min(maxOff, (s.vx / norm) * maxOff)) : 0;
    const ey = speed > 0.5 ? Math.max(-maxOff, Math.min(maxOff, (s.vy / norm) * maxOff)) : 0;

    const pupil = el.querySelector<SVGCircleElement>('.cursor-pupil');
    if (pupil) {
      pupil.setAttribute('cx', String(EYE_CX + ex));
      pupil.setAttribute('cy', String(EYE_CY + ey));
    }
    const glint = el.querySelector<SVGCircleElement>('.cursor-glint');
    if (glint) {
      glint.setAttribute('cx', String(EYE_CX + ex - 1.2));
      glint.setAttribute('cy', String(EYE_CY + ey - 1.2));
    }

    s.raf = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      `width:${SIZE_W}px`,
      `height:${SIZE_H}px`,
      'pointer-events:none',
      'z-index:999999',
      'will-change:transform',
      'user-select:none',
      // Rotate origin at the arrow tip so tilt pivots correctly.
      'transform-origin:4px 4px',
    ].join(';');

    // SVG: hand-drawn arrow cursor with one round eye + one dot.
    // Arrow body is the main filled triangle, grip is the rectangular tail at bottom-right.
    // Stroke only (line-art), fill light cream — matches reference image aesthetic.
    el.innerHTML = `
      <svg width="${SIZE_W}" height="${SIZE_H}" viewBox="0 0 ${VW} ${VH}"
           xmlns="http://www.w3.org/2000/svg" overflow="visible">
        <style>
          @keyframes cursor-blink {
            0%,90%,100% { transform: scaleY(1); }
            93%          { transform: scaleY(0.08); }
          }
          .cursor-eyelid-group {
            transform-origin: ${EYE_CX}px ${EYE_CY}px;
            animation: cursor-blink 4s ease-in-out infinite;
          }
        </style>

        <!-- Main arrow shape: rounded triangular body + rectangular grip (matches reference) -->
        <path d="M5 5
                 C5 5 6 5 8 7
                 L14 44
                 C14 46 16 48 18 46
                 L22 36
                 L32 50
                 C33 52 37 52 38 50
                 L42 46
                 C44 44 43 41 41 40
                 L28 26
                 L42 20
                 C44 19 44 16 42 15
                 L8 5
                 C7 4 5 4 5 5 Z"
              fill="#fffdf7" stroke="#1a1a1a" stroke-width="2.4"
              stroke-linejoin="round" stroke-linecap="round"/>

        <!-- Eye sclera -->
        <circle cx="${EYE_CX}" cy="${EYE_CY}" r="${EYE_R}"
                fill="white" stroke="#1a1a1a" stroke-width="1.8"/>

        <!-- Blinking eyelid group: pupil + glint -->
        <g class="cursor-eyelid-group">
          <circle class="cursor-pupil" cx="${EYE_CX}" cy="${EYE_CY}" r="${PUPIL_R}"
                  fill="#1a1a1a"/>
          <circle class="cursor-glint" cx="${EYE_CX - 1.2}" cy="${EYE_CY - 1.2}" r="0.9"
                  fill="white"/>
        </g>

        <!-- Small dot detail -->
        <circle cx="${DOT_CX}" cy="${DOT_CY}" r="1.6" fill="#1a1a1a"/>
      </svg>
    `;

    elRef.current = el;
    document.body.appendChild(el);

    const s = state.current;

    const style = document.createElement('style');
    style.id = 'creature-cursor-hide';
    style.textContent = '*{cursor:none!important}';
    document.head.appendChild(style);

    const onMove = (e: MouseEvent) => {
      s.vx = e.clientX - s.x;
      s.vy = e.clientY - s.y;
      s.x = e.clientX;
      s.y = e.clientY;
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      s.excited = !!(t?.closest('a,button,[role="button"]'));
    };

    const onDown = () => { s.clicking = true; };
    const onUp = () => { s.clicking = false; };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);

    const dampLoop = setInterval(() => {
      s.vx *= 0.7;
      s.vy *= 0.7;
    }, 16);

    s.raf = requestAnimationFrame(render);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      clearInterval(dampLoop);
      cancelAnimationFrame(s.raf);
      document.getElementById('creature-cursor-hide')?.remove();
      el.remove();
    };
  }, [render]);

  return null;
}
