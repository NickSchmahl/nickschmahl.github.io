import type { Ereignis } from './ereignis';

/** Vergibt die Reihenfolgenummern lückenlos neu; die Zeitstempel bleiben unangetastet. */
function neuNummerieren(ereignisse: readonly Ereignis[]): Ereignis[] {
  return ereignisse.map((e, i) => ({ ...e, seq: i + 1 }));
}

export function ereignisEntfernen(ereignisse: readonly Ereignis[], seq: number): Ereignis[] {
  if (!ereignisse.some((e) => e.seq === seq)) return [...ereignisse];
  return neuNummerieren(ereignisse.filter((e) => e.seq !== seq));
}

export function spielerAendern(ereignisse: readonly Ereignis[], seq: number, spieler: number): Ereignis[] {
  return ereignisse.map((e) => (e.seq === seq ? { ...e, spieler } : { ...e }));
}
