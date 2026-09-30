import type { Ereignis } from './ereignis';
import { findeEintrag } from './katalog';

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

/** Die Uhr-Ereignisse als vergleichbare Kette: Reihenfolge, Art, Zeit und Zielzeit. */
function uhrkette(ereignisse: readonly Ereignis[]): string {
  return ereignisse
    .filter((e) => findeEintrag(e.typ)?.wirkung === 'uhr')
    .map((e) => `${e.typ.toUpperCase()}@${e.t}:${e.zeit ?? ''}`)
    .join('|');
}

/**
 * Ob eine Änderung am Log die Uhr betrifft. Nur dann muss die Uhr aus dem Log
 * neu bestimmt werden; jede andere Korrektur lässt sie weiterlaufen. Verglichen
 * wird nach Inhalt, nicht nach `seq`, denn das Löschen vergibt die Nummern neu.
 */
export function betrifftUhr(vorher: readonly Ereignis[], nachher: readonly Ereignis[]): boolean {
  return uhrkette(vorher) !== uhrkette(nachher);
}
