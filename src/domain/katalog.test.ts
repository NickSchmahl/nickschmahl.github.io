import { describe, it, expect } from 'vitest';
import { KATALOG, findeEintrag, eintraegeMitPraefix } from './katalog';

describe('Katalog', () => {
  it('findet den Code für ein Tor', () => {
    const eintrag = findeEintrag('T');
    expect(eintrag?.bezeichnung).toBe('Tor');
    expect(eintrag?.wirkung).toBe('treffer');
    expect(eintrag?.brauchtSpieler).toBe(true);
    expect(eintrag?.argument).toBe('position');
  });

  it('unterscheidet T von TF', () => {
    expect(findeEintrag('TF')?.bezeichnung).toBe('Technischer Fehler');
    expect(findeEintrag('TF')?.wirkung).toBe('zaehler');
  });

  it('sucht ohne Beachtung der Groß- und Kleinschreibung', () => {
    expect(findeEintrag('tf')?.code).toBe('TF');
  });

  it('liefert für einen unbekannten Code nichts', () => {
    expect(findeEintrag('QQ')).toBeUndefined();
  });

  it('liefert alle Fortsetzungen eines Praefixes, den Treffer eingeschlossen', () => {
    const codes = eintraegeMitPraefix('T').map((e) => e.code);
    expect(codes).toEqual(['T', 'TA', 'TD', 'TF', 'TS']);
  });

  it('liefert bei leerem Präfix den ganzen Katalog', () => {
    expect(eintraegeMitPraefix('')).toHaveLength(KATALOG.length);
  });

  it('kennt keine doppelten Codes', () => {
    const codes = KATALOG.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('vergibt Gegner- und Steuerereignisse ohne Spielerbezug', () => {
    for (const code of ['GT', 'GS', 'GZ', 'HZ', 'AZ', 'U', 'UL', 'US']) {
      expect(findeEintrag(code)?.brauchtSpieler).toBe(false);
    }
  });

  it('kennt die Uhrkorrektur mit Zeitargument', () => {
    expect(findeEintrag('U')?.argument).toBe('zeit');
    expect(findeEintrag('U')?.wirkung).toBe('uhr');
  });

  it('kennt den Wechsel mit Spielerargument', () => {
    expect(findeEintrag('W')?.argument).toBe('spieler');
    expect(findeEintrag('W')?.wirkung).toBe('wechsel');
  });

  it('kennt Feldzugang und Feldabgang ohne Argument', () => {
    expect(findeEintrag('I')?.wirkung).toBe('wechsel');
    expect(findeEintrag('O')?.wirkung).toBe('wechsel');
    expect(findeEintrag('I')?.argument).toBeUndefined();
  });

  it('führt das Starten und Anhalten der Uhr als Ereignis', () => {
    expect(findeEintrag('UL')?.wirkung).toBe('uhr');
    expect(findeEintrag('US')?.wirkung).toBe('uhr');
  });

  it('trennt die Uhrkorrektur von den Schaltereignissen', () => {
    expect(eintraegeMitPraefix('U').map((e) => e.code)).toEqual(['U', 'UL', 'US']);
  });
});
