import type { Ereignis } from './ereignis';
import { findeEintrag } from './katalog';
import { schritt, ZUSTAND_ANFANG } from './reduzierer';
import type { Zustand } from './reduzierer';

/**
 * Alles hier läuft einmal durch das Log und führt den Reduzierer mit. Was zählt,
 * ist jeweils der Zustand VOR dem Ereignis: die Aufstellung, die ein Tor erlebt
 * hat, der Abschnitt, in dem ein Wurf fiel.
 */

export interface Verlaufspunkt { t: number; eigen: number; gegner: number }
export interface Marke { t: number; art: 'halbzeit' | 'auszeit' | 'strafe'; text: string }
export interface Verlauf { punkte: Verlaufspunkt[]; marken: Marke[]; endeT: number }

const FUENF_MINUTEN = 300;

const stand = (z: Zustand): string => `${z.toreEigen}:${z.toreGegner}`;

/**
 * Ende der Zeitachse: das letzte Ereignis, mindestens aber die doppelte
 * Halbzeitmarke — bei 2 × 25 Minuten Jugendspielzeit endet die Achse so bei 50,
 * nicht bei 60. Aufgerundet auf volle fünf Minuten.
 */
export function endeT(ereignisse: readonly Ereignis[]): number {
  const letzte = ereignisse.at(-1)?.t ?? 0;
  const halbzeit = ereignisse.find((e) => e.typ.toUpperCase() === 'HZ')?.t;
  const ausHalbzeit = halbzeit === undefined
    ? 0
    : Math.round((halbzeit * 2) / FUENF_MINUTEN) * FUENF_MINUTEN;
  const roh = Math.max(letzte, ausHalbzeit, 1);
  return Math.ceil(roh / FUENF_MINUTEN) * FUENF_MINUTEN;
}

export function verlauf(ereignisse: readonly Ereignis[]): Verlauf {
  const punkte: Verlaufspunkt[] = [{ t: 0, eigen: 0, gegner: 0 }];
  const marken: Marke[] = [];
  let z = ZUSTAND_ANFANG;
  let halbzeitGesehen = false;

  for (const e of ereignisse) {
    const neu = schritt(z, e);
    if (neu.toreEigen !== z.toreEigen || neu.toreGegner !== z.toreGegner) {
      punkte.push({ t: e.t, eigen: neu.toreEigen, gegner: neu.toreGegner });
    }
    const typ = e.typ.toUpperCase();
    if (typ === 'HZ' && !halbzeitGesehen) {
      halbzeitGesehen = true;
      marken.push({ t: e.t, art: 'halbzeit', text: `Halbzeit ${stand(z)}` });
    } else if (typ === 'AZ') {
      marken.push({ t: e.t, art: 'auszeit', text: `Auszeit bei ${stand(z)}` });
    } else if (findeEintrag(e.typ)?.wirkung === 'strafe') {
      marken.push({ t: e.t, art: 'strafe', text: `Zeitstrafe Nr. ${e.spieler}` });
    }
    z = neu;
  }
  return { punkte, marken, endeT: endeT(ereignisse) };
}

export function halbzeitstand(
  ereignisse: readonly Ereignis[],
): { eigen: number; gegner: number } | undefined {
  let z = ZUSTAND_ANFANG;
  for (const e of ereignisse) {
    if (e.typ.toUpperCase() === 'HZ') return { eigen: z.toreEigen, gegner: z.toreGegner };
    z = schritt(z, e);
  }
  return undefined;
}
