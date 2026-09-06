import { describe, it, expect } from 'vitest';
import { strafanzeigen, freimeldung } from './erfassung';

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
