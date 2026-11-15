import { useEffect, useRef, useCallback } from 'react';

const SIZE = 28;

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
    const stretch = Math.min(1 + speed * 0.045, 1.7);
    const squish = 1 / stretch;
    const angle = speed > 1 ? Math.atan2(s.vy, s.vx) * (180 / Math.PI) + 90 : 0;

    let scaleX = squish;
    let scaleY = stretch;
    if (s.clicking) { scaleX = 1.4; scaleY = 0.6; }
    else if (s.excited) { scaleX = 1.15; scaleY = 1.15; }

    el.style.transform = `translate(${s.x - SIZE / 2}px, ${s.y - SIZE / 2}px) rotate(${angle}deg) scale(${scaleX}, ${scaleY})`;

    const eyeMaxOffset = 3;
    const norm = speed > 0.5 ? speed : 1;
    const ex = speed > 0.5 ? (s.vx / norm) * eyeMaxOffset : 0;
    const ey = speed > 0.5 ? (s.vy / norm) * eyeMaxOffset : 0;

    const pupils = el.querySelectorAll<SVGCircleElement>('.creature-pupil');
    pupils.forEach((p, i) => {
      p.setAttribute('cx', String((i === 0 ? 9 : 19) + ex));
      p.setAttribute('cy', String(13 + ey));
    });

    const mouth = el.querySelector<SVGPathElement>('.creature-mouth');
    if (mouth) {
      if (s.clicking) mouth.setAttribute('d', 'M10 20 Q14 17 18 20');
      else if (s.excited) mouth.setAttribute('d', 'M10 19 Q14 24 18 19');
      else mouth.setAttribute('d', 'M10 20 Q14 22 18 20');
    }

    s.raf = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:' + SIZE + 'px',
      'height:' + SIZE + 'px',
      'pointer-events:none',
      'z-index:999999',
      'will-change:transform',
      'user-select:none',
    ].join(';');

    el.innerHTML = `
      <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" overflow="visible">
        <ellipse cx="14" cy="27" rx="7" ry="2" fill="#00000018"/>
        <ellipse cx="14" cy="15" rx="10" ry="11" fill="#f0c040" stroke="#b07000" stroke-width="1.2"/>
        <ellipse cx="14" cy="18" rx="6" ry="5" fill="#fde880" opacity="0.6"/>
        <circle cx="9" cy="13" r="4" fill="white" stroke="#b07000" stroke-width="0.8"/>
        <circle cx="19" cy="13" r="4" fill="white" stroke="#b07000" stroke-width="0.8"/>
        <circle class="creature-pupil" cx="9" cy="13" r="2.2" fill="#1a0a00"/>
        <circle class="creature-pupil" cx="19" cy="13" r="2.2" fill="#1a0a00"/>
        <circle cx="10" cy="12" r="0.8" fill="white"/>
        <circle cx="20" cy="12" r="0.8" fill="white"/>
        <path class="creature-mouth" d="M10 20 Q14 22 18 20" fill="none" stroke="#b07000" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="9" y1="4" x2="6" y2="0" stroke="#b07000" stroke-width="1" stroke-linecap="round"/>
        <circle cx="6" cy="0" r="1.5" fill="#f04040"/>
        <line x1="19" y1="4" x2="22" y2="0" stroke="#b07000" stroke-width="1" stroke-linecap="round"/>
        <circle cx="22" cy="0" r="1.5" fill="#f04040"/>
        <ellipse cx="8" cy="25" rx="3.5" ry="2" fill="#d09000" stroke="#b07000" stroke-width="0.8"/>
        <ellipse cx="20" cy="25" rx="3.5" ry="2" fill="#d09000" stroke="#b07000" stroke-width="0.8"/>
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
