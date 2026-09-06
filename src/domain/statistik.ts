import type { Ereignis, Spieler } from './ereignis';
import { findeEintrag } from './katalog';
import { schritt, ZUSTAND_ANFANG } from './reduzierer';

/** Codes, die in der Spalte „technische Fehler" zusammengefasst werden. */
export const TECHNISCHE_FEHLER: readonly string[] = ['TF', 'TS', 'TD', 'TA'];

export interface SpielerStatistik {
  nummer: number;
  name: string;
  torwart: boolean;
  /** Sekunden Spielzeit auf dem Feld. */
  einsatzzeit: number;
  tore: number;
  /** Feldwürfe einschließlich der Treffer, ohne Siebenmeter. */
  wuerfe: number;
  /** null, solange kein Wurf vorliegt. */
  wurfquote: number | null;
  siebenmeterTore: number;
  siebenmeterVersuche: number;
  technischeFehler: number;
  /** Gegentore, die fielen, während der Spieler auf dem Feld stand. */
  gegentoreImEinsatz: number;
  plusMinus: number;
  /** Rohzählung je Katalogcode — wächst mit dem Katalog, ohne diesen Typ zu ändern. */
  zaehler: Record<string, number>;
}

function leereZeile(s: Spieler): SpielerStatistik {
  return {
    nummer: s.nummer,
    name: s.name,
    torwart: s.torwart,
    einsatzzeit: 0,
    tore: 0,
    wuerfe: 0,
    wurfquote: null,
    siebenmeterTore: 0,
    siebenmeterVersuche: 0,
    technischeFehler: 0,
    gegentoreImEinsatz: 0,
    plusMinus: 0,
    zaehler: {},
  };
}

/**
 * Rechnet die Kennzahlen aus dem Ereignis-Log. `bisT` ist die Spielzeit, bis zu
 * der die Einsatzzeit der aktuell auf dem Feld stehenden Spieler weiterläuft —
 * für die Live-Anzeige die aktuelle Spielzeit, für den Export die Endzeit.
 */
export function statistik(
  ereignisse: readonly Ereignis[],
  kader: readonly Spieler[],
  bisT?: number,
): SpielerStatistik[] {
  const zeilen = new Map<number, SpielerStatistik>();
  for (const s of kader) zeilen.set(s.nummer, leereZeile(s));

  /** Spieler, die im Log auftauchen, aber nicht im Kader stehen, gehen nicht verloren. */
  const zeile = (nummer: number): SpielerStatistik => {
    let z = zeilen.get(nummer);
    if (!z) {
      z = leereZeile({ nummer, name: `Nr. ${nummer}`, torwart: false });
      zeilen.set(nummer, z);
    }
    return z;
  };

  let zustand = ZUSTAND_ANFANG;
  let vorherT = 0;

  for (const ereignis of ereignisse) {
    // Einsatzzeit für die Spanne VOR diesem Ereignis, mit der damaligen Aufstellung.
    const dauer = Math.max(0, ereignis.t - vorherT);
    for (const nummer of zustand.aufDemFeld) zeile(nummer).einsatzzeit += dauer;

    const eintrag = findeEintrag(ereignis.typ);
    if (eintrag) {
      if (ereignis.spieler !== undefined) {
        const z = zeile(ereignis.spieler);
        z.zaehler[eintrag.code] = (z.zaehler[eintrag.code] ?? 0) + 1;

        switch (eintrag.wirkung) {
          case 'treffer':
            z.tore += 1;
            z.wuerfe += 1;
            break;
          case 'wurf':
            z.wuerfe += 1;
            break;
          case 'siebenmeter_treffer':
            z.siebenmeterTore += 1;
            z.siebenmeterVersuche += 1;
            break;
          case 'siebenmeter_fehl':
            z.siebenmeterVersuche += 1;
            break;
          default:
            break;
        }
        if (TECHNISCHE_FEHLER.includes(eintrag.code)) z.technischeFehler += 1;
      }

      // Plus/Minus mit der Aufstellung, die zum Zeitpunkt des Tores galt.
      if (eintrag.wirkung === 'treffer' || eintrag.wirkung === 'siebenmeter_treffer') {
        for (const nummer of zustand.aufDemFeld) zeile(nummer).plusMinus += 1;
      }
      if (eintrag.wirkung === 'gegentor') {
        for (const nummer of zustand.aufDemFeld) {
          const z = zeile(nummer);
          z.plusMinus -= 1;
          z.gegentoreImEinsatz += 1;
        }
      }
    }

    zustand = schritt(zustand, ereignis);
    vorherT = ereignis.t;
  }

  if (bisT !== undefined) {
    const dauer = Math.max(0, bisT - vorherT);
    for (const nummer of zustand.aufDemFeld) zeile(nummer).einsatzzeit += dauer;
  }

  for (const z of zeilen.values()) {
    z.wurfquote = z.wuerfe === 0 ? null : z.tore / z.wuerfe;
  }

  return [...zeilen.values()].sort((a, b) => a.nummer - b.nummer);
}
