import { describe, it, expect } from 'vitest';
import { SCHRIFTEN_CSS } from './schriften';

describe('Schriften', () => {
  it('bettet vier Schnitte als woff2 ein', () => {
    expect(SCHRIFTEN_CSS.match(/src: url\(data:font\/woff2;base64,/g)).toHaveLength(4);
  });

  it('stellt die Familien bereit, die die Tokens nennen', () => {
    expect(SCHRIFTEN_CSS).toContain('font-family: "Saira";');
    expect(SCHRIFTEN_CSS).toContain('font-family: "Saira Condensed";');
  });
});
