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
    expect(z.strafen.every((s) => s.endeT <= z.t)).toBe(true);
  });

  it('stellt den Spieler nach Ablauf nicht von selbst zurück aufs Feld', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('Z', 100, { spieler: 7 }),
      e('GT', 400),
    ]);
    expect(z.aufDemFeld).toEqual([]);
  });

  it('warnt bei einer Einwechslung während einer laufenden Strafe, lässt sie aber zu', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('I', 0, { spieler: 8 }),
      e('Z', 100, { spieler: 7 }),
      e('W', 150, { spieler: 8, ein: 7 }),
    ]);
    expect(z.aufDemFeld).toEqual([7]);
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

  it('warnt bei einer Einwechslung eines disqualifizierten Spielers, lässt sie aber zu', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('I', 0, { spieler: 8 }),
      e('ZR', 100, { spieler: 7 }),
      e('W', 200, { spieler: 8, ein: 7 }),
    ]);
    expect(z.aufDemFeld).toEqual([7]);
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

describe('Wechsel in beide Leserichtungen', () => {
  it('holt den Spieler zurück, dessen Nummer vor dem W steht, wenn er draußen ist', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('I', 0, { spieler: 8 }),
      e('Z', 100, { spieler: 7 }),
      e('W', 100 + STRAFDAUER + 1, { spieler: 7, ein: 8 }),
    ]);
    expect(z.aufDemFeld).toEqual([7]);
  });

  it('hält die abgelaufene Strafe fest, bis der Spieler wieder aufs Feld kommt', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('Z', 100, { spieler: 7 }),
      e('GT', 400),
    ]);
    expect(z.strafen).toEqual([{ spieler: 7, endeT: 100 + STRAFDAUER }]);
  });

  it('löscht die Strafe, sobald der Spieler wieder aufs Feld kommt', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('Z', 100, { spieler: 7 }),
      e('I', 150, { spieler: 7 }),
    ]);
    expect(z.strafen).toEqual([]);
  });

  it('löscht die Strafe eines disqualifizierten Spielers', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('Z', 100, { spieler: 7 }),
      e('ZR', 150, { spieler: 7 }),
    ]);
    expect(z.strafen).toEqual([]);
  });
});
