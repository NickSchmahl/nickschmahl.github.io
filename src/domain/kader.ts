import type { Ereignis, Spieler } from './ereignis';

export type Rohzeile = { nummer: string; name: string; torwart: boolean };
export type Kaderpruefung = { ok: true; kader: Spieler[] } | { ok: false; fehler: string[] };

/** Nimmt nur reine Ziffernfolgen an und entfernt führende Nullen, damit 07 und 7 derselbe Spieler sind. */
export function normalisiereNummer(text: string): number | undefined {
  const roh = text.trim();
  if (!/^[0-9]+$/.test(roh)) return undefined;
  return Number(roh);
}

export function pruefeKader(zeilen: readonly Rohzeile[]): Kaderpruefung {
  const fehler: string[] = [];
  const kader: Spieler[] = [];
  const gesehen = new Set<number>();

  zeilen.forEach((zeile, i) => {
    const nummer = normalisiereNummer(zeile.nummer);
    if (nummer === undefined) {
      fehler.push(`Zeile ${i + 1}: „${zeile.nummer}" ist keine Trikotnummer`);
      return;
    }
    if (zeile.name.trim() === '') {
      fehler.push(`Zeile ${i + 1}: Nr. ${nummer} hat keinen Namen`);
      return;
    }
    if (gesehen.has(nummer)) {
      fehler.push(`Nr. ${nummer} ist doppelt vergeben — jede Zuordnung wäre mehrdeutig`);
      return;
    }
    gesehen.add(nummer);
    kader.push({ nummer, name: zeile.name.trim(), torwart: zeile.torwart });
  });

  if (fehler.length > 0) return { ok: false, fehler };
  kader.sort((a, b) => a.nummer - b.nummer);
  return { ok: true, kader };
}

/**
 * Alle Spieler, deren Nummer mit den getippten Ziffern beginnt. Bei „7" sind
 * das Nr. 7 und Nr. 77 — die sichtbare Entsprechung der Regel, dass die Nummer
 * erst mit dem ersten Buchstaben feststeht.
 */
export function passendeSpieler(kader: readonly Spieler[], ziffern: string): number[] {
  if (ziffern === '') return [];
  return kader.filter((s) => String(s.nummer).startsWith(ziffern)).map((s) => s.nummer);
}

/**
 * Die Startaufstellung als Ereignisse. Es sind gewöhnliche Feldzugänge, keine
 * Sonderform — dadurch braucht der Reduzierer keinen Sonderfall „Spielbeginn".
 */
export function startEreignisse(aufstellung: readonly number[], wall: string): Ereignis[] {
  return aufstellung.map((spieler, i) => ({ seq: i + 1, t: 0, wall, typ: 'I', spieler }));
}

const AUFSTELLUNG = 7;

/** Meldung, solange die Startaufstellung nicht genau sieben Spieler:innen hat; sonst `undefined`. */
export function aufstellungsMeldung(anzahl: number): string | undefined {
  return anzahl === AUFSTELLUNG ? undefined : `Bitte ${AUFSTELLUNG} Spieler:innen aufstellen.`;
}
