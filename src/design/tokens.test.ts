import { describe, it, expect } from 'vitest';
import tokens from './tokens.css?raw';

/** Der Inhalt des ersten Blocks, der mit dem Selektor beginnt. */
function block(selektor: string): string {
  const anfang = tokens.indexOf(selektor);
  if (anfang < 0) throw new Error(`Selektor fehlt: ${selektor}`);
  const auf = tokens.indexOf('{', anfang);
  return tokens.slice(auf + 1, tokens.indexOf('}', auf));
}

const namen = (text: string): string[] => [...text.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]!).sort();

describe('Design-Tokens', () => {
  it('definiert jede Farbe hell, dunkel (System und Schalter) und für den Druck', () => {
    const farben = namen(block(':root {')).filter((n) => !n.startsWith('--familie') && n !== '--radius');
    expect(farben).toContain('--akzent');
    expect(namen(block(':root:not([data-theme="light"])'))).toEqual(farben);
    expect(namen(block(':root[data-theme="dark"]'))).toEqual(farben);
    expect(namen(block(':root:is('))).toEqual(farben);
  });

  it('druckt auf weißem Papier', () => {
    expect(block(':root:is(')).toMatch(/--grund:\s*#ffffff;/);
  });

  it('nennt die eingebetteten Schriftfamilien', () => {
    expect(tokens).toContain('--familie-zahl: "Saira Condensed"');
    expect(tokens).toContain('--familie-text: "Saira"');
  });
});
