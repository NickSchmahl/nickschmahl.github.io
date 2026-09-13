import { describe, it, expect } from 'vitest';
import { statistik, teamstatistik } from './statistik';
import type { Ereignis, Spieler } from './ereignis';

let seq = 0;
function e(typ: string, t: number, rest: Partial<Ereignis> = {}): Ereignis {
  return { seq: ++seq, t, wall: new Date(t * 1000).toISOString(), typ, ...rest };
}

const KADER: Spieler[] = [
  { nummer: 7, name: 'Anna', torwart: false },
  { nummer: 12, name: 'Bea', torwart: true },
  { nummer: 77, name: 'Cem', torwart: false },
];

/** Holt eine Spielerzeile aus dem Ergebnis. */
function von(s: ReturnType<typeof statistik>, nummer: number) {
  const zeile = s.find((x) => x.nummer === nummer);
  if (!zeile) throw new Error(`Nr. ${nummer} fehlt in der Statistik`);
  return zeile;
}

describe('Statistik: Zählungen', () => {
  it('führt jeden Kaderspieler auf, auch ohne Aktion', () => {
    expect(statistik([], KADER).map((s) => s.nummer)).toEqual([7, 12, 77]);
  });

  it('zählt Tore und Würfe und rechnet die Quote', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('T', 10, { spieler: 7 }), e('F', 20, { spieler: 7 }), e('FB', 30, { spieler: 7 })],
      KADER,
    );
    expect(von(s, 7).tore).toBe(1);
    expect(von(s, 7).wuerfe).toBe(3);
    expect(von(s, 7).wurfquote).toBeCloseTo(1 / 3);
  });

  it('lässt die Wurfquote ohne Wurf offen', () => {
    expect(von(statistik([], KADER), 7).wurfquote).toBeNull();
  });

  it('führt Siebenmeter getrennt von den Feldwürfen', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('ST', 10, { spieler: 7 }), e('SF', 20, { spieler: 7 })],
      KADER,
    );
    expect(von(s, 7).siebenmeterTore).toBe(1);
    expect(von(s, 7).siebenmeterVersuche).toBe(2);
    expect(von(s, 7).wuerfe).toBe(0);
  });

  it('fasst die technischen Fehler zusammen', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('TF', 10, { spieler: 7 }), e('TS', 20, { spieler: 7 }), e('TD', 30, { spieler: 7 })],
      KADER,
    );
    expect(von(s, 7).technischeFehler).toBe(3);
  });

  it('hält jeden Code auch einzeln fest', () => {
    const s = statistik([e('I', 0, { spieler: 7 }), e('BG', 10, { spieler: 7 })], KADER);
    expect(von(s, 7).zaehler.BG).toBe(1);
  });

  it('trennt Nr. 7 und Nr. 77 sauber', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('I', 0, { spieler: 77 }), e('T', 10, { spieler: 77 })],
      KADER,
    );
    expect(von(s, 7).tore).toBe(0);
    expect(von(s, 77).tore).toBe(1);
  });

  it('erstellt eine synthetisierte Zeile für Spieler außerhalb des Kaders', () => {
    const s = statistik([e('I', 0, { spieler: 99 }), e('T', 10, { spieler: 99 })], KADER);
    expect(von(s, 99).name).toBe('Nr. 99');
    expect(von(s, 99).tore).toBe(1);
  });
});

describe('Statistik: Einsatzzeit', () => {
  it('zählt nur die Zeit auf dem Feld', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('O', 300, { spieler: 7 }), e('GT', 600)],
      KADER,
      900,
    );
    expect(von(s, 7).einsatzzeit).toBe(300);
  });

  it('rechnet bis zum angegebenen Zeitpunkt weiter, wenn der Spieler noch steht', () => {
    const s = statistik([e('I', 0, { spieler: 7 })], KADER, 600);
    expect(von(s, 7).einsatzzeit).toBe(600);
  });

  it('zählt keine Zeit, solange die Uhr steht — die Spielzeit rückt dann nicht vor', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('AZ', 300), e('GT', 300)],
      KADER,
      300,
    );
    expect(von(s, 7).einsatzzeit).toBe(300);
  });

  it('rechnet einen Uhrsprung nach vorn der Einsatzzeit zu', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('U', 100, { zeit: 400 }), e('GT', 400)],
      KADER,
      400,
    );
    expect(von(s, 7).einsatzzeit).toBe(400);
  });

  it('zählt bei einem Uhrsprung zurück keine negative Zeit', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('GT', 400), e('U', 100, { zeit: 100 }), e('GT', 100)],
      KADER,
      100,
    );
    expect(von(s, 7).einsatzzeit).toBe(400);
  });

  it('rechnet die Strafzeit nicht als Einsatzzeit', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('Z', 100, { spieler: 7 })],
      KADER,
      400,
    );
    expect(von(s, 7).einsatzzeit).toBe(100);
  });
});

describe('Statistik: Plus/Minus und Torwartquote', () => {
  it('schreibt ein eigenes Tor allen auf dem Feld gut', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('I', 0, { spieler: 12 }), e('T', 100, { spieler: 7 })],
      KADER,
    );
    expect(von(s, 7).plusMinus).toBe(1);
    expect(von(s, 12).plusMinus).toBe(1);
    expect(von(s, 77).plusMinus).toBe(0);
  });

  it('schreibt ein Gegentor allen auf dem Feld an', () => {
    const s = statistik([e('I', 0, { spieler: 12 }), e('GT', 100)], KADER);
    expect(von(s, 12).plusMinus).toBe(-1);
  });

  it('zählt Gegentore während der Einsatzzeit für die Torwartquote', () => {
    const s = statistik(
      [e('I', 0, { spieler: 12 }), e('GT', 100), e('O', 200, { spieler: 12 }), e('GT', 300)],
      KADER,
    );
    expect(von(s, 12).gegentoreImEinsatz).toBe(1);
    expect(von(s, 12).zaehler.P ?? 0).toBe(0);
  });
});

describe('Statistik: Gegenstöße', () => {
  it('zählt TG als Tor, Wurf und Gegenstoß', () => {
    const s = statistik([e('I', 0, { spieler: 7 }), e('TG', 10, { spieler: 7 }), e('FG', 20, { spieler: 7 })], KADER);
    expect(von(s, 7)).toMatchObject({ tore: 1, wuerfe: 2, gegenstossTore: 1, gegenstossWuerfe: 2 });
  });

  it('behandelt die Wurfposition 7 wie den Gegenstoß-Code', () => {
    const s = statistik([
      e('I', 0, { spieler: 7 }), e('T', 10, { spieler: 7, pos: 7 }), e('F', 20, { spieler: 7, pos: 7 }), e('FB', 30, { spieler: 7, pos: 7 }),
    ], KADER);
    expect(von(s, 7)).toMatchObject({ tore: 1, wuerfe: 3, gegenstossTore: 1, gegenstossWuerfe: 3 });
  });

  it('zählt einen Wurf ohne Position nicht als Gegenstoß', () => {
    const s = statistik([e('I', 0, { spieler: 7 }), e('F', 10, { spieler: 7 }), e('T', 20, { spieler: 7, pos: 2 })], KADER);
    expect(von(s, 7)).toMatchObject({ gegenstossTore: 0, gegenstossWuerfe: 0 });
  });

  it('rechnet die Gegenstöße beider Mannschaften', () => {
    const t = teamstatistik([
      e('I', 0, { spieler: 7 }),
      e('TG', 10, { spieler: 7 }), e('T', 20, { spieler: 7, pos: 7 }), e('FG', 30, { spieler: 7 }), e('T', 40, { spieler: 7 }),
      e('GTG', 50), e('GFG', 60), e('GT', 70),
    ]);
    expect(t).toEqual({ gegenstossTore: 2, gegenstossWuerfe: 3, gegnerGegenstossTore: 1, gegnerGegenstossWuerfe: 2 });
  });
});
