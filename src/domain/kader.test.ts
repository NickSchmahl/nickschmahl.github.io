import { describe, it, expect } from 'vitest';
import { normalisiereNummer, pruefeKader, passendeSpieler, startEreignisse, aufstellungsMeldung } from './kader';
import type { Spieler } from './ereignis';

const KADER: Spieler[] = [
  { nummer: 7, name: 'Anna', torwart: false },
  { nummer: 12, name: 'Bea', torwart: true },
  { nummer: 77, name: 'Cem', torwart: false },
];

describe('Trikotnummern normalisieren', () => {
  it('entfernt führende Nullen', () => {
    expect(normalisiereNummer('07')).toBe(7);
  });

  it('nimmt gewöhnliche Nummern unverändert', () => {
    expect(normalisiereNummer('77')).toBe(77);
  });

  it('weist Leerzeichen und leere Eingaben zurück', () => {
    expect(normalisiereNummer('')).toBeUndefined();
    expect(normalisiereNummer('  ')).toBeUndefined();
  });

  it('weist alles zurück, was keine Ziffernfolge ist', () => {
    expect(normalisiereNummer('7a')).toBeUndefined();
    expect(normalisiereNummer('-3')).toBeUndefined();
  });
});

describe('Kader prüfen', () => {
  it('nimmt einen sauberen Kader an', () => {
    const ergebnis = pruefeKader([
      { nummer: '7', name: 'Anna', torwart: false },
      { nummer: '12', name: 'Bea', torwart: true },
    ]);
    expect(ergebnis).toEqual({
      ok: true,
      kader: [
        { nummer: 7, name: 'Anna', torwart: false },
        { nummer: 12, name: 'Bea', torwart: true },
      ],
    });
  });

  it('weist doppelte Nummern ab', () => {
    const ergebnis = pruefeKader([
      { nummer: '7', name: 'Anna', torwart: false },
      { nummer: '07', name: 'Cem', torwart: false },
    ]);
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) expect(ergebnis.fehler[0]).toContain('7');
  });

  it('weist eine Zeile ohne Namen ab', () => {
    const ergebnis = pruefeKader([{ nummer: '7', name: '   ', torwart: false }]);
    expect(ergebnis.ok).toBe(false);
  });

  it('weist eine unlesbare Nummer ab', () => {
    const ergebnis = pruefeKader([{ nummer: 'x', name: 'Anna', torwart: false }]);
    expect(ergebnis.ok).toBe(false);
  });

  it('sortiert nach Trikotnummer', () => {
    const ergebnis = pruefeKader([
      { nummer: '12', name: 'Bea', torwart: true },
      { nummer: '7', name: 'Anna', torwart: false },
    ]);
    if (ergebnis.ok) expect(ergebnis.kader.map((s) => s.nummer)).toEqual([7, 12]);
  });
});

describe('Passende Spieler zu einer Ziffernfolge', () => {
  it('hebt bei 7 sowohl Nr. 7 als auch Nr. 77 hervor', () => {
    expect(passendeSpieler(KADER, '7')).toEqual([7, 77]);
  });

  it('grenzt bei 77 auf Nr. 77 ein', () => {
    expect(passendeSpieler(KADER, '77')).toEqual([77]);
  });

  it('liefert bei leerer Eingabe niemanden', () => {
    expect(passendeSpieler(KADER, '')).toEqual([]);
  });

  it('liefert bei unbekanntem Präfix niemanden', () => {
    expect(passendeSpieler(KADER, '9')).toEqual([]);
  });
});

describe('Startaufstellung', () => {
  it('erzeugt je Spieler ein Ereignis „kommt aufs Feld" zur Spielzeit null', () => {
    const ereignisse = startEreignisse([7, 12], '2026-09-06T18:00:00.000Z');
    expect(ereignisse).toEqual([
      { seq: 1, t: 0, wall: '2026-09-06T18:00:00.000Z', typ: 'I', spieler: 7 },
      { seq: 2, t: 0, wall: '2026-09-06T18:00:00.000Z', typ: 'I', spieler: 12 },
    ]);
  });

  it('erzeugt ohne Aufstellung nichts', () => {
    expect(startEreignisse([], '2026-09-06T18:00:00.000Z')).toEqual([]);
  });
});

describe('Startaufstellung prüfen', () => {
  it('lässt genau sieben zu', () => {
    expect(aufstellungsMeldung(7)).toBeUndefined();
  });

  it('bittet bei zu wenigen und zu vielen um sieben', () => {
    for (const anzahl of [0, 6, 8, 9]) {
      expect(aufstellungsMeldung(anzahl)).toBe('Bitte 7 Spieler:innen aufstellen.');
    }
  });
});
