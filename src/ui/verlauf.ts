import type { Ereignis, Hinweis } from '../domain/ereignis';
import { findeEintrag } from '../domain/katalog';
import { alsUhrzeit } from '../eingabe/grammatik';
import { NOTIZ_CODE } from '../eingabe/notiz';

export type Verlaufszeile =
  | { art: 'abschnitt'; abschnitt: number }
  | { art: 'eintrag'; ereignis: Ereignis; hinweis?: string };

/**
 * Neuestes zuerst, mit einer Überschrift je Abschnitt. Der Abschnittswechsel
 * selbst gehört noch zu dem Abschnitt, den er beendet.
 */
export function verlaufszeilen(ereignisse: readonly Ereignis[], hinweise: readonly Hinweis[]): Verlaufszeile[] {
  const texte = new Map<number, string[]>();
  for (const h of hinweise) texte.set(h.seq, [...(texte.get(h.seq) ?? []), h.text]);

  let abschnitt = 1;
  const mitAbschnitt = ereignisse.map((e) => {
    const eigener = abschnitt;
    if (e.typ.toUpperCase() === 'HZ') abschnitt += 1;
    return { e, abschnitt: eigener };
  });

  const zeilen: Verlaufszeile[] = [];
  let letzter: number | undefined;
  for (const { e, abschnitt: a } of mitAbschnitt.reverse()) {
    if (a !== letzter) {
      zeilen.push({ art: 'abschnitt', abschnitt: a });
      letzter = a;
    }
    const hinweis = texte.get(e.seq)?.join(' · ');
    zeilen.push(hinweis ? { art: 'eintrag', ereignis: e, hinweis } : { art: 'eintrag', ereignis: e });
  }
  return zeilen;
}

/** Die Einträge in der Reihenfolge des Verlaufs, ohne Überschriften. */
export function reihenfolge(zeilen: readonly Verlaufszeile[]): number[] {
  return zeilen.flatMap((z) => (z.art === 'eintrag' ? [z.ereignis.seq] : []));
}

/** Die gewählte Zeile und die dazu getippten Ziffern der neuen Nummer. */
export interface Auswahl {
  seq: number;
  nummer: string;
}

export type Verlaufsschritt =
  | { art: 'waehlen'; auswahl: Auswahl }
  | { art: 'schliessen' }
  | { art: 'loeschen'; seq: number }
  | { art: 'spieler'; seq: number; nummer: number }
  | { art: 'nichts' };

/**
 * Ein Tastendruck, während eine Zeile gewählt ist. `reihe` ist die Reihenfolge
 * der Anzeige, Neuestes zuerst. `⌫` löscht erst, wenn keine Ziffer mehr steht:
 * auf dem Mac gibt es keine eigene Entf-Taste.
 */
export function verlaufTaste(auswahl: Auswahl, taste: string, reihe: readonly number[]): Verlaufsschritt {
  const stelle = reihe.indexOf(auswahl.seq);
  const zu = (i: number): Verlaufsschritt =>
    ({ art: 'waehlen', auswahl: { seq: reihe[i] ?? auswahl.seq, nummer: '' } });
  switch (taste) {
    case 'ArrowUp':
      return zu(Math.max(0, stelle - 1));
    case 'ArrowDown':
      return zu(Math.min(reihe.length - 1, stelle + 1));
    case 'Delete':
      return { art: 'loeschen', seq: auswahl.seq };
    case 'Backspace':
      return auswahl.nummer === ''
        ? { art: 'loeschen', seq: auswahl.seq }
        : { art: 'waehlen', auswahl: { ...auswahl, nummer: auswahl.nummer.slice(0, -1) } };
    case 'Enter':
      return auswahl.nummer === ''
        ? { art: 'schliessen' }
        : { art: 'spieler', seq: auswahl.seq, nummer: Number(auswahl.nummer) };
    case 'Escape':
      return { art: 'schliessen' };
    default:
      if (/^[0-9]$/.test(taste) && auswahl.nummer.length < 3) {
        return { art: 'waehlen', auswahl: { ...auswahl, nummer: auswahl.nummer + taste } };
      }
      return { art: 'nichts' };
  }
}

/**
 * Nach dem Löschen rückt die Auswahl auf die Zeile, die jetzt an derselben
 * Stelle steht. Über die Stelle, nicht über die Nummer: das Löschen vergibt die
 * Nummern neu.
 */
export function auswahlNachLoeschen(
  reiheVorher: readonly number[],
  geloescht: number,
  reiheNachher: readonly number[],
): number | undefined {
  if (reiheNachher.length === 0) return undefined;
  const stelle = Math.max(0, reiheVorher.indexOf(geloescht));
  return reiheNachher[Math.min(stelle, reiheNachher.length - 1)];
}

/** Der nächste auffällige Eintrag unterhalb der aktuellen Auswahl; am Ende geht es oben weiter. */
export function naechsterHinweis(
  reihe: readonly number[],
  auffaellig: ReadonlySet<number>,
  aktuell: number | undefined,
): number | undefined {
  const start = aktuell === undefined ? -1 : reihe.indexOf(aktuell);
  for (let k = 1; k <= reihe.length; k += 1) {
    const seq = reihe[(start + k) % reihe.length];
    if (seq !== undefined && auffaellig.has(seq)) return seq;
  }
  return undefined;
}

/** Ein Eintrag als schlichter Text für Rückmeldungen, z. B. „12:30 Nr. 7 Tor". */
export function kurzbeschreibung(e: Ereignis): string {
  const was = e.typ === NOTIZ_CODE ? `Notiz „${e.text ?? ''}"` : (findeEintrag(e.typ)?.bezeichnung ?? e.typ);
  return [alsUhrzeit(e.t), e.spieler !== undefined ? `Nr. ${e.spieler}` : '', was].filter(Boolean).join(' ');
}
