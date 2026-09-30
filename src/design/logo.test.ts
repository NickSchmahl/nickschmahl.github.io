import { describe, it, expect } from 'vitest';
import { LOGO_ZEICHEN, logoHtml } from './logo';

describe('Logo', () => {
  it('liefert Zeichen und Schriftzug mit Namen für Screenreader', () => {
    const html = logoHtml();
    expect(html).toContain('aria-label="Handball-Tracker"');
    expect(html).toContain(LOGO_ZEICHEN);
    expect(html).toContain('Tracker');
  });

  it('färbt ausschließlich über Tokens', () => {
    expect(LOGO_ZEICHEN).not.toMatch(/#[0-9a-f]{3,6}\b/i);
    expect(LOGO_ZEICHEN).toContain('var(--akzent)');
  });
});
