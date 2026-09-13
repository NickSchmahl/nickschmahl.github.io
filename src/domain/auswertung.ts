import type { Ereignis } from './ereignis';
import { PARADEN, findeEintrag } from './katalog';
import { schritt, ZUSTAND_ANFANG } from './reduzierer';
import type { Zustand } from './reduzierer';
import { TECHNISCHE_FEHLER } from './statistik';

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

export interface Teamkennzahlen {
  /** Alle eigenen Tore, also der Spielstand. */
  tore: number;
  feldtore: number;
  feldwuerfe: number;
  /** Feldtore je Feldwurf; null ohne Feldwurf. */
  quote: number | null;
  siebenmeterTore: number;
  siebenmeterVersuche: number;
  technischeFehler: number;
  ballverluste: number;
  paraden: number;
  zeitstrafen: number;
  gegentore: number;
}

function leereKennzahlen(): Teamkennzahlen {
  return {
    tore: 0, feldtore: 0, feldwuerfe: 0, quote: null,
    siebenmeterTore: 0, siebenmeterVersuche: 0,
    technischeFehler: 0, ballverluste: 0, paraden: 0, zeitstrafen: 0, gegentore: 0,
  };
}

function zaehle(k: Teamkennzahlen, e: Ereignis): void {
  const eintrag = findeEintrag(e.typ);
  if (!eintrag) return;
  switch (eintrag.wirkung) {
    case 'treffer': k.tore += 1; k.feldtore += 1; k.feldwuerfe += 1; break;
    case 'wurf': k.feldwuerfe += 1; break;
    case 'siebenmeter_treffer': k.tore += 1; k.siebenmeterTore += 1; k.siebenmeterVersuche += 1; break;
    case 'siebenmeter_fehl': k.siebenmeterVersuche += 1; break;
    case 'gegentor': k.gegentore += 1; break;
    case 'strafe': k.zeitstrafen += 1; break;
    case 'zaehler':
      if (TECHNISCHE_FEHLER.includes(eintrag.code)) k.technischeFehler += 1;
      else if (eintrag.code === 'BV') k.ballverluste += 1;
      else if (PARADEN.includes(eintrag.code)) k.paraden += 1;
      break;
    default: break;
  }
}

function mitQuote(k: Teamkennzahlen): Teamkennzahlen {
  return { ...k, quote: k.feldwuerfe === 0 ? null : k.feldtore / k.feldwuerfe };
}

/** Index 0 ist die erste Halbzeit. Das `HZ`-Ereignis selbst zählt noch zum ablaufenden Abschnitt. */
export function kennzahlenJeAbschnitt(
  ereignisse: readonly Ereignis[],
): { abschnitte: Teamkennzahlen[]; gesamt: Teamkennzahlen } {
  const abschnitte: Teamkennzahlen[] = [];
  const gesamt = leereKennzahlen();
  let z = ZUSTAND_ANFANG;
  for (const e of ereignisse) {
    while (abschnitte.length < z.abschnitt) abschnitte.push(leereKennzahlen());
    zaehle(abschnitte[z.abschnitt - 1]!, e);
    zaehle(gesamt, e);
    z = schritt(z, e);
  }
  return { abschnitte: abschnitte.map(mitQuote), gesamt: mitQuote(gesamt) };
}

export interface Phase {
  von: number;
  bis: number;
  tore: number;
  gegentore: number;
  /** Feldwürfe und Siebenmeter zusammen. */
  wuerfe: number;
  /** Technische Fehler und Ballverluste zusammen. */
  fehler: number;
}

export function phasen(ereignisse: readonly Ereignis[], blockSekunden = 600): Phase[] {
  const ende = endeT(ereignisse);
  const anzahl = Math.max(1, Math.ceil(ende / blockSekunden));
  const liste: Phase[] = Array.from({ length: anzahl }, (_, i) => ({
    von: i * blockSekunden,
    bis: Math.min((i + 1) * blockSekunden, ende),
    tore: 0, gegentore: 0, wuerfe: 0, fehler: 0,
  }));
  for (const e of ereignisse) {
    const phase = liste[Math.min(anzahl - 1, Math.floor(e.t / blockSekunden))]!;
    const eintrag = findeEintrag(e.typ);
    if (!eintrag) continue;
    switch (eintrag.wirkung) {
      case 'treffer': case 'siebenmeter_treffer': phase.tore += 1; phase.wuerfe += 1; break;
      case 'wurf': case 'siebenmeter_fehl': phase.wuerfe += 1; break;
      case 'gegentor': phase.gegentore += 1; break;
      case 'zaehler':
        if (TECHNISCHE_FEHLER.includes(eintrag.code) || eintrag.code === 'BV') phase.fehler += 1;
        break;
      default: break;
    }
  }
  return liste;
}
