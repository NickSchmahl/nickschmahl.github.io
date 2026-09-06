import { describe, it, expect } from 'vitest';
import { reduziere, STRAFDAUER } from './reduzierer';
import type { Ereignis } from './ereignis';

let seq = 0;
function e(typ: string, t: number, rest: Partial<Ereignis> = {}): Ereignis {
  return { seq: ++seq, t, wall: new Date(t * 1000).toISOString(), typ, ...rest };
}

describe('Zeitstrafen', () => {
  it('nimmt den bestraften Spieler sofort vom Feld', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('Z', 100, { spieler: 7 })]);
    expect(z.aufDemFeld).toEqual([]);
    expect(z.strafen).toEqual([{ spieler: 7, endeT: 100 + STRAFDAUER }]);
  });

  it('lässt die Strafe nach 120 Sekunden Spielzeit auslaufen', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('Z', 100, { spieler: 7 }),
      e('GT', 100 + STRAFDAUER),
    ]);
    expect(z.strafen).toEqual([]);
  });

  it('stellt den Spieler nach Ablauf nicht von selbst zurück aufs Feld', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('Z', 100, { spieler: 7 }),
      e('GT', 400),
    ]);
    expect(z.aufDemFeld).toEqual([]);
  });

  it('verweigert die Einwechslung während einer laufenden Strafe', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('I', 0, { spieler: 8 }),
      e('Z', 100, { spieler: 7 }),
      e('W', 150, { spieler: 8, ein: 7 }),
    ]);
    expect(z.aufDemFeld).toEqual([]);
    expect(z.hinweise.some((h) => h.text.includes('Zeitstrafe absitzt') || h.text.includes('sitzt eine Zeitstrafe ab'))).toBe(true);
  });

  it('lässt die Einwechslung nach Ablauf der Strafe zu', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('I', 0, { spieler: 8 }),
      e('Z', 100, { spieler: 7 }),
      e('W', 100 + STRAFDAUER + 1, { spieler: 8, ein: 7 }),
    ]);
    expect(z.aufDemFeld).toEqual([7]);
  });
});

describe('Karten', () => {
  it('zählt eine Verwarnung, ohne den Spieler vom Feld zu nehmen', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('ZG', 100, { spieler: 7 })]);
    expect(z.aufDemFeld).toEqual([7]);
    expect(z.disqualifiziert).toEqual([]);
  });

  it('nimmt bei einer Disqualifikation dauerhaft vom Feld', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('ZR', 100, { spieler: 7 })]);
    expect(z.aufDemFeld).toEqual([]);
    expect(z.disqualifiziert).toEqual([7]);
  });

  it('lässt einen disqualifizierten Spieler nicht zurück aufs Feld', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('I', 0, { spieler: 8 }),
      e('ZR', 100, { spieler: 7 }),
      e('W', 200, { spieler: 8, ein: 7 }),
    ]);
    expect(z.aufDemFeld).toEqual([]);
    expect(z.hinweise.some((h) => h.text.includes('disqualifiziert'))).toBe(true);
  });

  it('zählt die Zeitstrafe des Gegners, ohne die eigene Aufstellung anzufassen', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('GZ', 100)]);
    expect(z.aufDemFeld).toEqual([7]);
    expect(z.strafen).toEqual([]);
  });
});

describe('Uhrereignisse', () => {
  it('zählt beim Abschnittswechsel den Abschnitt hoch und hält die Uhr an', () => {
    const z = reduziere([e('UL', 0), e('HZ', 1800)]);
    expect(z.abschnitt).toBe(2);
    expect(z.uhrLaeuft).toBe(false);
  });

  it('hält die Uhr bei einer Auszeit an, ohne den Abschnitt zu ändern', () => {
    const z = reduziere([e('UL', 0), e('AZ', 600)]);
    expect(z.uhrLaeuft).toBe(false);
    expect(z.abschnitt).toBe(1);
  });
});
