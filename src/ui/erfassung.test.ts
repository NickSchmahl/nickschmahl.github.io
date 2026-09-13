import { describe, it, expect } from 'vitest';
import type { SpielerStatistik } from '../domain/statistik';
import { strafanzeigen, freimeldung, zahlenText } from './erfassung';

const ZEILE: SpielerStatistik = {
  nummer: 7, name: 'Sieben', torwart: false, einsatzzeit: 750, tore: 4, wuerfe: 6, wurfquote: 4 / 6,
  siebenmeterTore: 0, siebenmeterVersuche: 0, technischeFehler: 0, gegentoreImEinsatz: 0, plusMinus: 2, zaehler: {},
};

describe('Strafanzeige', () => {
  it('zählt die Restzeit einer laufenden Strafe herunter', () => {
    expect(strafanzeigen([{ spieler: 7, endeT: 220 }], 160))
      .toEqual([{ nummer: 7, rest: 60, frei: false }]);
  });

  it('meldet den Spieler frei, sobald die zwei Minuten um sind', () => {
    expect(strafanzeigen([{ spieler: 7, endeT: 220 }], 220))
      .toEqual([{ nummer: 7, rest: 0, frei: true }]);
  });

  it('lässt die Restzeit nicht negativ werden', () => {
    expect(strafanzeigen([{ spieler: 7, endeT: 220 }], 400))
      .toEqual([{ nummer: 7, rest: 0, frei: true }]);
  });
});

describe('Freimeldung', () => {
  it('bleibt leer, solange keine Strafe abgelaufen ist', () => {
    expect(freimeldung(strafanzeigen([{ spieler: 7, endeT: 220 }], 160))).toBe('');
  });

  it('nennt den einzelnen Spieler, der wieder aufs Feld darf', () => {
    expect(freimeldung(strafanzeigen([{ spieler: 7, endeT: 220 }], 300)))
      .toBe('Nr. 7 darf rein');
  });

  it('nennt mehrere freie Spieler in einer Zeile', () => {
    const anzeigen = strafanzeigen([{ spieler: 7, endeT: 220 }, { spieler: 12, endeT: 260 }], 300);
    expect(freimeldung(anzeigen)).toBe('Nr. 7 und Nr. 12 dürfen rein');
  });
});

describe('Kacheltext', () => {
  it('zeigt Feldwürfe, Zeit und Plus/Minus — ohne Siebenmeter unverändert', () => {
    expect(zahlenText(ZEILE)).toBe('4/6 · 12:30 · +2');
  });

  it('hängt die Siebenmeter getrennt an, sobald einer geworfen wurde', () => {
    expect(zahlenText({ ...ZEILE, siebenmeterTore: 1, siebenmeterVersuche: 1 })).toBe('4/6 · 7m 1/1 · 12:30 · +2');
  });

  it('lässt eine reine Siebenmeterwerferin nicht wie 0/0 aussehen', () => {
    expect(zahlenText({ ...ZEILE, tore: 0, wuerfe: 0, wurfquote: null, siebenmeterTore: 2, siebenmeterVersuche: 2, einsatzzeit: 490, plusMinus: 0 }))
      .toBe('0/0 · 7m 2/2 · 08:10 · 0');
  });
});
