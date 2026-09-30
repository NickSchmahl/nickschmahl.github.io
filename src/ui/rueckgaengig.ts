import type { Ereignis } from '../domain/ereignis';
import { betrifftUhr } from '../domain/korrektur';
import { reduziere } from '../domain/reduzierer';
import type { Uhrzustand } from '../domain/uhr';

/** So viele Änderungen lassen sich mit Strg+Z zurücknehmen. */
export const RUECKGAENGIG_GRENZE = 100;

/**
 * Log und Uhr zu einem Zeitpunkt. Beides wird zusammen gemerkt: Nimmt Strg+Z
 * ein Anhalten zurück, muss die Uhr so weiterlaufen, als wäre nichts gewesen,
 * und das weiß nur der Uhrzustand von vorher, nicht das Log.
 */
export interface Stand {
  ereignisse: Ereignis[];
  uhr: Uhrzustand;
}

/** Legt den Stand vor einer Änderung oben auf den Stapel; der älteste fällt bei Überlauf weg. */
export function merken(stapel: readonly Stand[], stand: Stand): Stand[] {
  return [...stapel, stand].slice(-RUECKGAENGIG_GRENZE);
}

/**
 * Eine Korrektur im Verlauf (Löschen, Spielerin ändern). Die Uhr läuft weiter,
 * außer die Korrektur trifft ein Uhr-Ereignis: dann steht sie und übernimmt
 * Zeit und Abschnitt aus dem Log.
 */
export function korrekturAnwenden(stand: Stand, neu: Ereignis[]): Stand {
  if (!betrifftUhr(stand.ereignisse, neu)) return { ereignisse: neu, uhr: stand.uhr };
  const zustand = reduziere(neu);
  return { ereignisse: neu, uhr: { ...stand.uhr, laeuft: false, basisT: zustand.t, abschnitt: zustand.abschnitt } };
}

/**
 * Nimmt die letzte Änderung zurück. Das Log kommt immer vom Stapel, die Uhr nur,
 * wenn die Änderung sie betraf; sonst läuft sie einfach weiter.
 */
export function zuruecknehmen(
  stapel: readonly Stand[],
  aktuell: Stand,
): { stand: Stand; stapel: Stand[] } | undefined {
  const vorher = stapel.at(-1);
  if (!vorher) return undefined;
  const uhr = betrifftUhr(aktuell.ereignisse, vorher.ereignisse) ? vorher.uhr : aktuell.uhr;
  return { stand: { ereignisse: vorher.ereignisse, uhr }, stapel: stapel.slice(0, -1) };
}

type Tastendruck = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

/** Strg+Z unter Windows und Linux, ⌘+Z auf dem Mac. ⌘+⇧+Z heißt dort „Wiederholen“ und zählt nicht. */
export function istRueckgaengigTaste(t: Tastendruck): boolean {
  return (t.ctrlKey || t.metaKey) && !t.shiftKey && !t.altKey && t.key.toLowerCase() === 'z';
}
