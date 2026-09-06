import { describe, it, expect } from 'vitest';
import {
  UHR_ANFANG,
  spielzeit,
  starten,
  anhalten,
  umschalten,
  korrigieren,
  abschnittWechseln,
} from './uhr';

const T0 = 1_000_000_000_000;

describe('Uhr', () => {
  it('steht am Anfang bei null', () => {
    expect(spielzeit(UHR_ANFANG, T0)).toBe(0);
  });

  it('läuft nach dem Start mit der Echtzeit mit', () => {
    const u = starten(UHR_ANFANG, T0);
    expect(spielzeit(u, T0 + 30_000)).toBe(30);
  });

  it('friert die Spielzeit beim Anhalten ein', () => {
    const u = anhalten(starten(UHR_ANFANG, T0), T0 + 30_000);
    expect(spielzeit(u, T0 + 90_000)).toBe(30);
  });

  it('läuft nach dem Fortsetzen dort weiter, wo sie angehalten wurde', () => {
    const angehalten = anhalten(starten(UHR_ANFANG, T0), T0 + 30_000);
    const weiter = starten(angehalten, T0 + 90_000);
    expect(spielzeit(weiter, T0 + 100_000)).toBe(40);
  });

  it('schaltet zwischen Laufen und Stehen um', () => {
    const a = umschalten(UHR_ANFANG, T0);
    expect(a.laeuft).toBe(true);
    expect(umschalten(a, T0).laeuft).toBe(false);
  });

  it('ignoriert einen Start, wenn die Uhr schon läuft', () => {
    const u = starten(UHR_ANFANG, T0);
    expect(starten(u, T0 + 30_000)).toEqual(u);
  });

  it('setzt die Spielzeit bei einer Korrektur neu und läuft weiter', () => {
    const u = korrigieren(starten(UHR_ANFANG, T0), 1203, T0 + 30_000);
    expect(spielzeit(u, T0 + 30_000)).toBe(1203);
    expect(spielzeit(u, T0 + 40_000)).toBe(1213);
  });

  it('hält beim Abschnittswechsel an und zählt den Abschnitt hoch', () => {
    const u = abschnittWechseln(starten(UHR_ANFANG, T0), T0 + 1_800_000);
    expect(u.abschnitt).toBe(2);
    expect(u.laeuft).toBe(false);
    expect(spielzeit(u, T0 + 3_000_000)).toBe(1800);
  });
});
