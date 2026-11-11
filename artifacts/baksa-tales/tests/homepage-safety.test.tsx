import { describe, expect, it } from 'vitest';
import { safeHomepageImage, safeHomepageLink, validateHomepageLabels } from '../src/home-studio/safety';

describe('Homepage v5 editorial safety', () => {
  it('accepts replaceable trusted layers, supplied photos and safe destinations', () => {
    validateHomepageLabels({
      'h5.image.trunk': '/images/baksa/homev5-trunk.svg',
      'h5.image.maker': '/approved/images/t-message.webp',
      'h5.picks.heart': 't-message,t-marigold,sv-divya',
      'h5.link.heart': '/shop?feel=heart',
    });
    expect(safeHomepageImage('https://images.example.com/replacement.png')).toBe(true);
    expect(safeHomepageLink('/corporate#brief')).toBe(true);
  });
  it('rejects active content, credential-bearing hosts and unsafe picks', () => {
    for (const image of ['data:image/svg+xml,<svg/>', 'javascript:alert(1)', '//evil.example/image.png', 'https://user:secret@example.com/image.png']) {
      expect(safeHomepageImage(image)).toBe(false);
      expect(() => validateHomepageLabels({ 'h5.image.trunk': image })).toThrow();
    }
    expect(() => validateHomepageLabels({ 'h5.link.cta': 'javascript:alert(1)' })).toThrow();
    expect(() => validateHomepageLabels({ 'h5.picks.heart': 'a,b,c,d,e' })).toThrow();
    expect(() => validateHomepageLabels({ 'h5.picks.heart': '<iframe>' })).toThrow();
    expect(() => validateHomepageLabels({ 'h5.copy.text': 'x'.repeat(501) })).toThrow();
  });
});
