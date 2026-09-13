import { describe, it, expect } from 'vitest';
import { reduziere, ZUSTAND_ANFANG } from './reduzierer';
import type { Ereignis } from './ereignis';

let seq = 0;
/** Baut ein Ereignis; die Reihenfolge ergibt sich aus der Aufrufreihenfolge. */
function e(typ: string, t: number, rest: Partial<Ereignis> = {}): Ereignis {
  return { seq: ++seq, t, wall: new Date(t * 1000).toISOString(), typ, ...rest };
}

describe('Reduzierer: Spielstand', () => {
  it('beginnt bei null zu null', () => {
    expect(reduziere([])).toEqual(ZUSTAND_ANFANG);
  });

  it('zählt eigene Tore', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('UL', 0), e('T', 10, { spieler: 7 })]);
    expect(z.toreEigen).toBe(1);
  });

  it('merkt sich, ob die Uhr läuft', () => {
    expect(reduziere([e('UL', 0)]).uhrLaeuft).toBe(true);
    expect(reduziere([e('UL', 0), e('US', 30)]).uhrLaeuft).toBe(false);
  });

  it('warnt bei einem Wurf, während die Uhr steht', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('T', 10, { spieler: 7 })]);
    expect(z.toreEigen).toBe(1);
    expect(z.hinweise.some((h) => h.text === 'Die Uhr steht')).toBe(true);
  });

  it('warnt nicht bei einem Wechsel, während die Uhr steht', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('W', 10, { spieler: 7, ein: 12 })]);
    expect(z.hinweise).toEqual([]);
  });

  it('zählt Siebenmeter-Tore mit, verworfene nicht', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('ST', 10, { spieler: 7 }),
      e('SF', 20, { spieler: 7 }),
    ]);
    expect(z.toreEigen).toBe(1);
  });

  it('zählt Gegentore', () => {
    const z = reduziere([e('GT', 10), e('GS', 20)]);
    expect(z.toreGegner).toBe(2);
  });

  it('zählt jeden Gegentor als Gegnerwurf, einen Fehlwurf des Gegners aber nicht als Tor', () => {
    const z = reduziere([e('UL', 0), e('GT', 10), e('GF', 20)]);
    expect(z.toreGegner).toBe(1);
    expect(z.wuerfeGegner).toBe(2);
  });

  it('zählt eine Parade als Gegnerwurf', () => {
    const z = reduziere([e('I', 0, { spieler: 12 }), e('UL', 0), e('P', 10, { spieler: 12 }), e('PS', 20, { spieler: 12 })]);
    expect(z.wuerfeGegner).toBe(2);
    expect(z.toreGegner).toBe(0);
  });

  it('warnt bei einem Fehlwurf des Gegners, während die Uhr steht', () => {
    const z = reduziere([e('GF', 10)]);
    expect(z.hinweise.some((h) => h.text === 'Die Uhr steht')).toBe(true);
  });

  it('führt die Spielzeit des letzten Ereignisses mit', () => {
    expect(reduziere([e('GT', 10), e('GT', 45)]).t).toBe(45);
  });
});

describe('Reduzierer: Feldbesetzung', () => {
  it('stellt Spieler mit I aufs Feld', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('I', 0, { spieler: 12 })]);
    expect(z.aufDemFeld).toEqual([7, 12]);
  });

  it('nimmt Spieler mit O vom Feld', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('O', 5, { spieler: 7 })]);
    expect(z.aufDemFeld).toEqual([]);
  });

  it('tauscht mit W aus und ein', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('W', 60, { spieler: 7, ein: 12 })]);
    expect(z.aufDemFeld).toEqual([12]);
  });

  it('hält die Feldliste sortiert', () => {
    const z = reduziere([e('I', 0, { spieler: 12 }), e('I', 0, { spieler: 7 })]);
    expect(z.aufDemFeld).toEqual([7, 12]);
  });
});

describe('Reduzierer: Hinweise statt Blockaden', () => {
  it('zählt ein Tor auch dann, wenn der Spieler nicht auf dem Feld steht', () => {
    const z = reduziere([e('T', 10, { spieler: 7 })]);
    expect(z.toreEigen).toBe(1);
    expect(z.hinweise.some((h) => h.text.includes('nicht auf dem Feld'))).toBe(true);
  });

  it('warnt bei mehr als sieben Spielern auf dem Feld', () => {
    const acht = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => e('I', 0, { spieler: n }));
    const z = reduziere(acht);
    expect(z.aufDemFeld).toHaveLength(8);
    expect(z.hinweise.some((h) => h.text.includes('mehr als sieben'))).toBe(true);
  });

  it('warnt, wenn ein Spieler doppelt aufs Feld gestellt wird', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('I', 5, { spieler: 7 })]);
    expect(z.aufDemFeld).toEqual([7]);
    expect(z.hinweise.some((h) => h.text.includes('steht bereits'))).toBe(true);
  });

  it('warnt bei einem unbekannten Ereigniscode, ohne den Rest zu verlieren', () => {
    const z = reduziere([e('QQ', 10, { spieler: 7 }), e('GT', 20)]);
    expect(z.toreGegner).toBe(1);
    expect(z.hinweise.some((h) => h.text.includes('unbekannt'))).toBe(true);
  });
});
