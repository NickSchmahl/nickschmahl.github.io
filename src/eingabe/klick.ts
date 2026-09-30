import type { Katalogeintrag } from '../domain/ereignis';
import { findeEintrag } from '../domain/katalog';
import { vorschlaege } from './grammatik';
import type { Puffer } from './grammatik';

/** Ohne getippten Code: die häufigsten Aktionen einer Spielerin … */
export const HAEUFIG_MIT_NUMMER: readonly string[] = ['T', 'F', 'TF', 'BG', 'A', 'ST', 'Z', 'W'];
/** … und ohne Nummer die des Gegners und der Uhr. */
export const HAEUFIG_OHNE_NUMMER: readonly string[] = ['GT', 'GF', 'GTG', 'AZ', 'HZ'];

/**
 * Die anklickbaren Vorschläge unter der Eingabezeile. Angeboten wird nur, was
 * zur Eingabe passt: mit Nummer nur Aktionen einer Spielerin, ohne Nummer nur
 * Einträge ohne Spielerin, und nichts mehr, sobald ein Argument getippt wird.
 */
export function klickVorschlaege(p: Puffer): Katalogeintrag[] {
  if (p.argument !== '') return [];
  const mitNummer = p.ziffern !== '';
  if (p.code === '') {
    return (mitNummer ? HAEUFIG_MIT_NUMMER : HAEUFIG_OHNE_NUMMER).flatMap((code) => findeEintrag(code) ?? []);
  }
  return vorschlaege(p).filter((e) => e.brauchtSpieler === mitNummer);
}

/** Ein angeklickter Vorschlag ersetzt den getippten Code; die Nummer bleibt. */
export function vorschlagWaehlen(p: Puffer, code: string): Puffer {
  return { ziffern: p.ziffern, code, argument: '' };
}

/** Ein Klick auf eine Kachel setzt deren Nummer und verwirft den Rest der Eingabe. */
export function nummerWaehlen(nummer: number): Puffer {
  return { ziffern: String(nummer), code: '', argument: '' };
}
