import { describe, it, expect } from 'vitest';
import { betrifftUhr, ereignisEntfernen, spielerAendern } from './korrektur';
import type { Ereignis } from './ereignis';

const LOG: Ereignis[] = [
  { seq: 1, t: 0, wall: 'w', typ: 'I', spieler: 7 },
  { seq: 2, t: 10, wall: 'w', typ: 'T', spieler: 7 },
  { seq: 3, t: 20, wall: 'w', typ: 'GT' },
];

describe('Korrektur', () => {
  it('entfernt ein Ereignis aus der Mitte', () => {
    expect(ereignisEntfernen(LOG, 2).map((e) => e.typ)).toEqual(['I', 'GT']);
  });

  it('vergibt die Reihenfolgenummern lückenlos neu', () => {
    expect(ereignisEntfernen(LOG, 2).map((e) => e.seq)).toEqual([1, 2]);
  });

  it('lässt das Log unverändert, wenn die Nummer nicht vorkommt', () => {
    expect(ereignisEntfernen(LOG, 99)).toEqual(LOG);
  });

  it('ändert den Spieler eines Ereignisses', () => {
    const neu = spielerAendern(LOG, 2, 12);
    expect(neu[1]?.spieler).toBe(12);
    expect(neu[0]?.spieler).toBe(7);
  });

  it('rührt das Ausgangs-Log nicht an', () => {
    ereignisEntfernen(LOG, 2);
    spielerAendern(LOG, 2, 12);
    expect(LOG).toHaveLength(3);
    expect(LOG[1]?.spieler).toBe(7);
  });
});

describe('Betrifft eine Korrektur die Uhr?', () => {
  const log: Ereignis[] = [
    { seq: 1, t: 0, wall: '', typ: 'UL' },
    { seq: 2, t: 60, wall: '', typ: 'T', spieler: 7 },
    { seq: 3, t: 90, wall: '', typ: 'AZ' },
  ];

  it('nein, wenn ein Tor gelöscht wird', () => {
    expect(betrifftUhr(log, ereignisEntfernen(log, 2))).toBe(false);
  });

  it('nein, wenn die Spielerin geändert wird', () => {
    expect(betrifftUhr(log, spielerAendern(log, 2, 12))).toBe(false);
  });

  it('ja, wenn eine Auszeit gelöscht wird', () => {
    expect(betrifftUhr(log, ereignisEntfernen(log, 3))).toBe(true);
  });

  it('ja, wenn eine Uhrkorrektur eine andere Zielzeit bekommt', () => {
    const mitKorrektur: Ereignis[] = [...log, { seq: 4, t: 600, wall: '', typ: 'U', zeit: 600 }];
    const andereZeit = mitKorrektur.map((e) => (e.seq === 4 ? { ...e, zeit: 630 } : e));
    expect(betrifftUhr(mitKorrektur, andereZeit)).toBe(true);
  });

  it('ja, wenn ein Uhr-Ereignis dazukommt oder verschwindet', () => {
    expect(betrifftUhr(log, [...log, { seq: 4, t: 120, wall: '', typ: 'UL' }])).toBe(true);
    expect(betrifftUhr([...log, { seq: 4, t: 120, wall: '', typ: 'UL' }], log)).toBe(true);
  });
});
