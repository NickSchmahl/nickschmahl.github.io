import { describe, it, expect } from 'vitest';
import { alsDatum, htmlEscapen, prozent } from './html';

describe('HTML-Hilfen', () => {
  it('entschärft Sonderzeichen', () => {
    expect(htmlEscapen(`<b>"Tom" & 'Jerry'</b>`))
      .toBe('&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;');
  });

  it('schreibt das Datum deutsch', () => {
    expect(alsDatum('2026-09-13')).toBe('13.09.2026');
    expect(alsDatum('kaputt')).toBe('kaputt');
  });

  it('rundet Anteile auf ganze Prozent', () => {
    expect(prozent(0.625)).toBe('63 %');
    expect(prozent(null)).toBe('–');
  });
});
