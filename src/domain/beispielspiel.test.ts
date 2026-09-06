import { describe, it, expect } from 'vitest';
import { BEISPIEL_EREIGNISSE, BEISPIEL_KADER } from './beispielspiel';
import { reduziere } from './reduzierer';
import { statistik } from './statistik';

describe('Beispielspiel', () => {
  const zustand = reduziere(BEISPIEL_EREIGNISSE);
  const werte = statistik(BEISPIEL_EREIGNISSE, BEISPIEL_KADER, 900);
  const von = (nummer: number) => {
    const z = werte.find((w) => w.nummer === nummer);
    if (!z) throw new Error(`Nr. ${nummer} fehlt`);
    return z;
  };

  it('kommt auf den erwarteten Endstand', () => {
    expect(`${zustand.toreEigen}:${zustand.toreGegner}`).toBe('3:3');
  });

  it('hat am Ende die erwartete Aufstellung', () => {
    expect(zustand.aufDemFeld).toEqual([1, 77]);
  });

  it('hat keine laufende Zeitstrafe mehr', () => {
    expect(zustand.strafen).toEqual([]);
  });

  it('rechnet die Werte für Nr. 7', () => {
    const s = von(7);
    expect(s.tore).toBe(1);
    expect(s.wuerfe).toBe(1);
    expect(s.siebenmeterTore).toBe(1);
    expect(s.siebenmeterVersuche).toBe(2);
    expect(s.einsatzzeit).toBe(660);
    expect(s.plusMinus).toBe(-1);
  });

  it('rechnet die Werte für Nr. 12, dessen Strafzeit nicht zählt', () => {
    const s = von(12);
    expect(s.technischeFehler).toBe(1);
    expect(s.wuerfe).toBe(1);
    expect(s.tore).toBe(0);
    expect(s.wurfquote).toBe(0);
    expect(s.einsatzzeit).toBe(480);
    expect(s.zaehler.Z).toBe(1);
  });

  it('rechnet die Werte für Nr. 77, der erst spät kommt', () => {
    const s = von(77);
    expect(s.einsatzzeit).toBe(240);
    expect(s.tore).toBe(1);
    expect(s.plusMinus).toBe(1);
  });

  it('rechnet die Torwartwerte', () => {
    const s = von(1);
    expect(s.einsatzzeit).toBe(900);
    expect(s.gegentoreImEinsatz).toBe(3);
    expect(s.zaehler.P).toBe(1);
  });

  it('erzeugt keine Hinweise — das Beispielspiel ist widerspruchsfrei', () => {
    expect(zustand.hinweise).toEqual([]);
  });
});
