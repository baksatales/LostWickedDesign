// Merge into tailwind.config.ts -> theme.extend
export const baksaTheme = {
  colors: {
    ground: 'var(--bt-ground)', paper: 'var(--bt-paper)', sunk: 'var(--bt-sunk)', ink: 'var(--bt-ink)', soft: 'var(--bt-soft)', line: 'var(--bt-line)',
    accent: { DEFAULT: 'var(--bt-accent)', ink: 'var(--bt-accent-ink)', on: 'var(--bt-on-accent)' },
    maroon: 'var(--bt-maroon)', teal: { DEFAULT: 'var(--bt-teal)', ink: 'var(--bt-teal-ink)', soft: 'var(--bt-teal-soft)' },
    gold: { DEFAULT: 'var(--bt-gold)', ink: 'var(--bt-gold-ink)' }, coral: 'var(--bt-coral)',
    ok: 'var(--bt-ok)', warn: 'var(--bt-warn)', bad: 'var(--bt-bad)', info: 'var(--bt-info)',
  },
  fontFamily: { serif: ['EB Garamond', 'Iowan Old Style', 'Georgia', 'serif'], slab: ['Arvo', 'Rockwell', 'Roboto Slab', 'Georgia', 'serif'], deva: ['Noto Serif Devanagari', 'Kohinoor Devanagari', 'Mangal', 'serif'] },
  borderRadius: { bt: '4px' },
};
