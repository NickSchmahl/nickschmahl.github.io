import { describe, it, expect } from 'vitest';
import { htmlEscapen } from './kader';

describe('HTML escapen', () => {
  it('entschärft eingeschleustes Markup', () => {
    expect(htmlEscapen('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('entschärft Anführungszeichen mitten im Namen', () => {
    expect(htmlEscapen('Ann"a')).toBe('Ann&quot;a');
  });

  it('entschärft kaufmännisches Und', () => {
    expect(htmlEscapen('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('entschärft einfache Anführungszeichen', () => {
    expect(htmlEscapen("O'Brien")).toBe('O&#39;Brien');
  });

  it('lässt unauffällige Namen unverändert', () => {
    expect(htmlEscapen('Anna')).toBe('Anna');
  });
});
