import { describe, it, expect } from 'vitest';
import type { SpielerStatistik } from '../domain/statistik';
import { kennzahlen, meldungenHtml, strafanzeigen, gegenstossZeile, gegnerZeile, verlaufText } from './erfassung';
import { ZUSTAND_ANFANG } from '../domain/reduzierer';

const ZEILE: SpielerStatistik = {
  nummer: 7, name: 'Sieben', torwart: false, einsatzzeit: 750, tore: 4, wuerfe: 6, wurfquote: 4 / 6,
  siebenmeterTore: 0, siebenmeterVersuche: 0, gegenstossTore: 0, gegenstossWuerfe: 0, gegenstossGegentoreImEinsatz: 0,
  technischeFehler: 0, gegentoreImEinsatz: 0, plusMinus: 2, zaehler: {},
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

describe('Meldungen im Kopf', () => {
  it('zeigt laufende Strafen mit Restzeit und abgelaufene als „darf rein"', () => {
    const html = meldungenHtml(strafanzeigen([{ spieler: 7, endeT: 220 }, { spieler: 12, endeT: 100 }], 160));
    expect(html).toBe('<span class="pille schlecht">Nr. 7 · 01:00</span><span class="pille gut">Nr. 12 darf rein</span>');
  });

  it('bleibt ohne Strafen leer', () => {
    expect(meldungenHtml([])).toBe('');
  });
});

describe('Kennzahlen der Kachel', () => {
  it('zeigt Tore, Siebenmeter, Zeit und Plus/Minus', () => {
    expect(kennzahlen(ZEILE)).toEqual([
      { titel: 'Tore', wert: '4/6' },
      { titel: '7m', wert: '–' },
      { titel: 'Zeit', wert: '12:30' },
      { titel: '+/−', wert: '+2' },
    ]);
  });

  it('zeigt die Siebenmeter, sobald einer geworfen wurde', () => {
    expect(kennzahlen({ ...ZEILE, siebenmeterTore: 1, siebenmeterVersuche: 2 })[1]).toEqual({ titel: '7m', wert: '1/2' });
  });

  it('zeigt bei der Torhüterin Paraden und Gegentore statt Würfen', () => {
    expect(kennzahlen({ ...ZEILE, torwart: true, zaehler: { P: 3, PG: 1 }, gegentoreImEinsatz: 9, plusMinus: -1 })).toEqual([
      { titel: 'Paraden', wert: '4' },
      { titel: 'Gegentore', wert: '9' },
      { titel: 'Zeit', wert: '12:30' },
      { titel: '+/−', wert: '-1' },
    ]);
  });

  it('bleibt ohne Statistik leer', () => {
    expect(kennzahlen(undefined)).toEqual([]);
  });
});

describe('Gegnerzeile im Kopf', () => {
  it('nennt Würfe und Quote des Gegners', () => {
    expect(gegnerZeile({ ...ZUSTAND_ANFANG, toreGegner: 11, wuerfeGegner: 23 })).toBe('Würfe Gegner 23 · 48 %');
  });

  it('lässt die Quote ohne Gegnerwurf weg', () => {
    expect(gegnerZeile(ZUSTAND_ANFANG)).toBe('Würfe Gegner 0');
  });
});

describe('Gegenstoßzeile im Kopf', () => {
  it('nennt Tore je Würfe beider Seiten', () => {
    expect(gegenstossZeile({ gegenstossTore: 4, gegenstossWuerfe: 5, gegnerGegenstossTore: 2, gegnerGegenstossWuerfe: 3 }))
      .toBe('Gegenstoß 4/5 · Gegner 2/3');
  });
});

describe('Text einer Verlaufszeile', () => {
  it('zeigt bei einer Notiz den entschärften Text', () => {
    expect(verlaufText({ seq: 1, t: 0, wall: '', typ: '#', text: 'Gegner <5:1>' })).toBe('Gegner &lt;5:1&gt;');
  });

  it('nennt die Aktion ohne Nummer, die steht in eigener Spalte', () => {
    expect(verlaufText({ seq: 1, t: 0, wall: '', typ: 'T', spieler: 7 })).toBe('Tor');
  });

  it('hängt die Wurfposition an', () => {
    expect(verlaufText({ seq: 1, t: 0, wall: '', typ: 'T', spieler: 7, pos: 2 })).toBe('Tor <small>· Rückraum links</small>');
  });

  it('nennt beim Wechsel die zweite Nummer ohne Richtung', () => {
    expect(verlaufText({ seq: 1, t: 0, wall: '', typ: 'W', spieler: 7, ein: 12 })).toBe('Wechsel ⇄ Nr. 12');
  });

  it('zeigt bei der Uhrkorrektur die neue Zeit', () => {
    expect(verlaufText({ seq: 1, t: 900, wall: '', typ: 'U', zeit: 900 })).toBe('Uhrkorrektur <small>· 15:00</small>');
  });
});
