import { beforeEach, describe, expect, it } from 'vitest';
import { starterDocument } from '../src/pages/starter-document';
import { PRODUCTS } from '../src/demo/catalog';
import { DEFAULT_MOOD, homeFields, homeValue, MOODS, moodName, nextMood, readSeen, resolvePicks, validateWhatsApp, writeSeen } from '../src/home-v5/content';
import { validateHomepageLabels } from '../src/home-studio/safety';

describe('Approved Homepage v5 content', () => {
  beforeEach(() => localStorage.clear());
  it('keeps exactly five moods with Heart-Giver selected first', () => {
    expect(MOODS).toEqual(['explorer', 'heart', 'showstopper', 'soother', 'thoughtful']);
    expect(DEFAULT_MOOD).toBe('heart');
    expect(moodName(undefined, 'thoughtful')).toBe('Thoughtful One');
  });
  it('allows every homepage field through the existing bounded editorial document', () => {
    const labels = { ...starterDocument().labels, ...Object.fromEntries(homeFields.map(field => [field.key, field.value])) };
    expect(new Set(homeFields.map(field => field.key)).size).toBe(homeFields.length);
    expect(Object.keys(labels).length).toBeLessThanOrEqual(200);
    expect(() => validateHomepageLabels(labels)).not.toThrow();
  });
  it('reads edited copy and image layers and falls back safely for unsafe URLs', () => {
    const doc = starterDocument();
    doc.labels['h5.copy.hero.title'] = 'A new *chapter.*';
    doc.labels['h5.image.trunk'] = 'https://assets.example.com/painted-trunk.png';
    expect(homeValue(doc, 'h5.copy.hero.title')).toBe('A new *chapter.*');
    expect(homeValue(doc, 'h5.image.trunk')).toContain('painted-trunk');
    doc.labels['h5.image.trunk'] = 'javascript:alert(1)';
    expect(homeValue(doc, 'h5.image.trunk')).toContain('homev5-trunk.svg');
  });
  it('uses the approved starting picks and never invents a missing product price', () => {
    const heart = resolvePicks(PRODUCTS, homeValue(undefined, 'h5.picks.mood.heart'), 3, 'heart');
    expect(heart.map(p => p.kind === 'product' ? p.product.id : 'popbani')).toEqual(['t-message', 't-marigold', 'sv-divya']);
    const explorer = resolvePicks(PRODUCTS, homeValue(undefined, 'h5.picks.mood.explorer'), 3, 'explorer');
    expect(explorer.some(p => p.kind === 'popbani')).toBe(true);
  });
  it('falls back to actual tagged products and excludes unpublished products', () => {
    const selected = resolvePicks(PRODUCTS, 'missing,missing', 3, 'soother');
    expect(selected.length).toBeGreaterThan(0);
    for (const pick of selected) if (pick.kind === 'product') {
      expect(pick.product.status).toBe('live');
      expect(pick.product.feels).toContain('soother');
    }
  });
  it('wraps keyboard movement through all moods', () => {
    expect(nextMood('thoughtful', 1)).toBe('explorer');
    expect(nextMood('explorer', -1)).toBe('thoughtful');
    expect(nextMood('heart', 1)).toBe('showstopper');
  });
  it('remembers only watched tale IDs for the story UI', () => {
    expect(readSeen()).toEqual([]);
    writeSeen(['tathaastu']);
    expect(readSeen()).toEqual(['tathaastu']);
    localStorage.setItem('baksa-h5-seen-tales', 'invalid json');
    expect(readSeen()).toEqual([]);
  });
  it('validates WhatsApp numbers without implying a backend save', () => {
    expect(validateWhatsApp('9876543210')).toBeNull();
    expect(validateWhatsApp('+91 98765 43210')).toBeNull();
    expect(validateWhatsApp('123')).toMatch(/10-digit/);
  });
});
