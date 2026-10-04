import type { Ereignis } from './ereignis';
import { PARADEN, findeEintrag } from './katalog';
import { schritt, STRAFDAUER, ZUSTAND_ANFANG } from './reduzierer';
import type { Zustand } from './reduzierer';
import { TECHNISCHE_FEHLER } from './statistik';
import { wechselrichtung } from './wechsel';

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

/**
 * Summe der zwischen den Ereignissen verstrichenen Spielzeit. Eine Uhrkorrektur
 * rückwärts zählt nicht negativ — dieselbe Rechnung wie bei der Einsatzzeit, damit
 * ein durchgehender Einsatz genau 100 % ergibt.
 */
export function gespielteZeit(ereignisse: readonly Ereignis[]): number {
  let summe = 0;
  let vorherT = 0;
  for (const e of ereignisse) {
    summe += Math.max(0, e.t - vorherT);
    vorherT = e.t;
  }
  return summe;
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

export interface Torbilanz {
  tore: number;
  /** Einschließlich der Tore. */
  wuerfe: number;
}

/** Würfe des Gegners: Tore, Paraden und Fehlwürfe ohne Parade (`GF`, `GFG`). */
export interface Gegnerkennzahlen extends Torbilanz {
  /** `GT`, `GF`, `P`. */
  feld: Torbilanz;
  /** `GS`, `PS`. */
  siebenmeter: Torbilanz;
  /** `GTG`, `GFG`, `PG`. */
  gegenstoss: Torbilanz;
}

/** Wurfart und Ausgang je Code; ein Code fehlt, wenn er kein Wurf des Gegners ist. */
const GEGNERWURF: Readonly<Record<string, { art: 'feld' | 'siebenmeter' | 'gegenstoss'; tor: boolean }>> = {
  GT: { art: 'feld', tor: true },
  GF: { art: 'feld', tor: false },
  P: { art: 'feld', tor: false },
  GS: { art: 'siebenmeter', tor: true },
  PS: { art: 'siebenmeter', tor: false },
  GTG: { art: 'gegenstoss', tor: true },
  GFG: { art: 'gegenstoss', tor: false },
  PG: { art: 'gegenstoss', tor: false },
};

function leereGegnerkennzahlen(): Gegnerkennzahlen {
  return {
    tore: 0, wuerfe: 0,
    feld: { tore: 0, wuerfe: 0 }, siebenmeter: { tore: 0, wuerfe: 0 }, gegenstoss: { tore: 0, wuerfe: 0 },
  };
}

function zaehleGegner(k: Gegnerkennzahlen, e: Ereignis): void {
  const wurf = GEGNERWURF[e.typ.toUpperCase()];
  if (!wurf) return;
  for (const b of [k, k[wurf.art]]) {
    b.wuerfe += 1;
    if (wurf.tor) b.tore += 1;
  }
}

/** Wie `kennzahlenJeAbschnitt`, aber für die Würfe des Gegners. */
export function gegnerJeAbschnitt(
  ereignisse: readonly Ereignis[],
): { abschnitte: Gegnerkennzahlen[]; gesamt: Gegnerkennzahlen } {
  const abschnitte: Gegnerkennzahlen[] = [];
  const gesamt = leereGegnerkennzahlen();
  let z = ZUSTAND_ANFANG;
  for (const e of ereignisse) {
    while (abschnitte.length < z.abschnitt) abschnitte.push(leereGegnerkennzahlen());
    zaehleGegner(abschnitte[z.abschnitt - 1]!, e);
    zaehleGegner(gesamt, e);
    z = schritt(z, e);
  }
  return { abschnitte, gesamt };
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

export interface Aufstellung {
  nummern: number[];
  /** Sekunden Spielzeit, die genau diese Besetzung auf dem Feld stand. */
  dauer: number;
  tore: number;
  gegentore: number;
}

/** Jede Spanne zwischen zwei Ereignissen gehört der Besetzung, die davor auf dem Feld stand. */
export function aufstellungen(ereignisse: readonly Ereignis[]): Aufstellung[] {
  const nachSchluessel = new Map<string, Aufstellung>();
  let z = ZUSTAND_ANFANG;
  let vorherT = 0;
  for (const e of ereignisse) {
    const neu = schritt(z, e);
    if (z.aufDemFeld.length > 0) {
      const schluessel = z.aufDemFeld.join(',');
      const a = nachSchluessel.get(schluessel)
        ?? { nummern: [...z.aufDemFeld], dauer: 0, tore: 0, gegentore: 0 };
      a.dauer += Math.max(0, e.t - vorherT);
      a.tore += neu.toreEigen - z.toreEigen;
      a.gegentore += neu.toreGegner - z.toreGegner;
      nachSchluessel.set(schluessel, a);
    }
    z = neu;
    vorherT = e.t;
  }
  return [...nachSchluessel.values()].sort((a, b) => b.dauer - a.dauer);
}

export interface Einsatzphase { von: number; bis: number; art: 'feld' | 'strafe' }
export interface Spielerverlauf {
  phasen: Einsatzphase[];
  /** Spielzeiten der eigenen Treffer, Feld und Siebenmeter. */
  tore: number[];
}

export function spielerverlauf(
  ereignisse: readonly Ereignis[],
  nummer: number,
  ende: number = endeT(ereignisse),
): Spielerverlauf {
  const phasen: Einsatzphase[] = [];
  const tore: number[] = [];
  let z = ZUSTAND_ANFANG;
  let feldSeit: number | undefined;
  let strafe: { seit: number; endeT: number } | undefined;

  for (const e of ereignisse) {
    const neu = schritt(z, e);
    const wirkung = findeEintrag(e.typ)?.wirkung;
    if (e.spieler === nummer && (wirkung === 'treffer' || wirkung === 'siebenmeter_treffer')) tore.push(e.t);

    const warDrauf = z.aufDemFeld.includes(nummer);
    const istDrauf = neu.aufDemFeld.includes(nummer);
    if (!warDrauf && istDrauf) feldSeit = e.t;
    if (warDrauf && !istDrauf) {
      phasen.push({ von: feldSeit ?? 0, bis: e.t, art: 'feld' });
      feldSeit = undefined;
    }

    // Die Strafe bleibt im Zustand, bis die Spielerin zurückkehrt; die
    // Strafphase endet aber spätestens nach zwei Minuten.
    const offen = neu.strafen.find((s) => s.spieler === nummer);
    if (strafe && (!offen || offen.endeT !== strafe.endeT)) {
      phasen.push({ von: strafe.seit, bis: Math.min(strafe.endeT, e.t), art: 'strafe' });
      strafe = undefined;
    }
    if (offen && !strafe) strafe = { seit: e.t, endeT: offen.endeT };

    z = neu;
  }
  if (strafe) phasen.push({ von: strafe.seit, bis: Math.min(strafe.endeT, ende), art: 'strafe' });
  if (feldSeit !== undefined) phasen.push({ von: feldSeit, bis: ende, art: 'feld' });
  return { phasen, tore };
}

export interface Spielerereignis {
  seq: number;
  t: number;
  typ: string;
  bezeichnung: string;
  pos?: number;
  /** Spielstand nach dem Ereignis. */
  stand: string;
  hinweis?: string;
}

export function spielerereignisse(ereignisse: readonly Ereignis[], nummer: number): Spielerereignis[] {
  const liste: Spielerereignis[] = [];
  let z = ZUSTAND_ANFANG;
  for (const e of ereignisse) {
    const neu = schritt(z, e);
    if (e.spieler === nummer || e.ein === nummer) {
      let bezeichnung = findeEintrag(e.typ)?.bezeichnung ?? e.typ;
      if (e.typ.toUpperCase() === 'W' && e.spieler !== undefined && e.ein !== undefined) {
        const { rein } = wechselrichtung(z.aufDemFeld, e.spieler, e.ein);
        const andere = e.spieler === nummer ? e.ein : e.spieler;
        bezeichnung = rein === nummer ? `Wechsel: kommt für Nr. ${andere}` : `Wechsel: geht für Nr. ${andere}`;
      }
      const hinweise = neu.hinweise.slice(z.hinweise.length).map((h) => h.text);
      liste.push({
        seq: e.seq, t: e.t, typ: e.typ, bezeichnung,
        ...(e.pos !== undefined ? { pos: e.pos } : {}),
        stand: `${neu.toreEigen}:${neu.toreGegner}`,
        ...(hinweise.length ? { hinweis: hinweise.join('; ') } : {}),
      });
    }
    z = neu;
  }
  return liste;
}

export interface Standmoment { differenz: number; t: number; stand: string }
export interface Serie { tore: number; von: number; bis: number }
export interface Auszeitwirkung { t: number; stand: string; toreDanach: number; gegentoreDanach: number }
export interface Schlaglichter {
  /** Fehlt, solange die Mannschaft nie geführt hat. */
  groessterVorsprung?: Standmoment;
  /** Differenz als positive Zahl; fehlt, solange sie nie zurücklag. */
  groessterRueckstand?: Standmoment;
  fuehrungswechsel: number;
  ausgleiche: number;
  serieEigen?: Serie;
  serieGegner?: Serie;
  /** Längste Spanne ohne eigenes Tor, vom Anwurf bzw. letzten Tor bis zum nächsten bzw. letzten Ereignis. */
  torlosePhase?: { von: number; bis: number };
  auszeiten: Auszeitwirkung[];
}

/** Rohdaten für die erzeugten Sätze; formuliert wird im Bericht. */
export function schlaglichter(ereignisse: readonly Ereignis[]): Schlaglichter {
  const s: Schlaglichter = { fuehrungswechsel: 0, ausgleiche: 0, auszeiten: [] };
  let z = ZUSTAND_ANFANG;
  let fuehrung: 'eigen' | 'gegner' | undefined;
  let laufEigen: Serie | undefined;
  let laufGegner: Serie | undefined;
  let letztesEigenesTor = 0;
  let torloseDauer = -1;
  const laengsterLauf = (bisher: Serie | undefined, lauf: Serie): Serie =>
    bisher && bisher.tore >= lauf.tore ? bisher : lauf;
  const torlosBis = (t: number) => {
    if (t - letztesEigenesTor > torloseDauer) {
      torloseDauer = t - letztesEigenesTor;
      s.torlosePhase = { von: letztesEigenesTor, bis: t };
    }
  };

  for (const e of ereignisse) {
    const neu = schritt(z, e);
    const eigenesTor = neu.toreEigen > z.toreEigen;
    const gegentor = neu.toreGegner > z.toreGegner;

    if (e.typ.toUpperCase() === 'AZ') {
      s.auszeiten.push({ t: e.t, stand: stand(z), toreDanach: 0, gegentoreDanach: 0 });
    }
    for (const az of s.auszeiten) {
      if (e.t > az.t && e.t <= az.t + FUENF_MINUTEN) {
        if (eigenesTor) az.toreDanach += 1;
        if (gegentor) az.gegentoreDanach += 1;
      }
    }

    if (eigenesTor) {
      torlosBis(e.t);
      letztesEigenesTor = e.t;
      laufEigen = laufEigen ? { ...laufEigen, tore: laufEigen.tore + 1, bis: e.t } : { tore: 1, von: e.t, bis: e.t };
      s.serieEigen = laengsterLauf(s.serieEigen, laufEigen);
      laufGegner = undefined;
    }
    if (gegentor) {
      laufGegner = laufGegner ? { ...laufGegner, tore: laufGegner.tore + 1, bis: e.t } : { tore: 1, von: e.t, bis: e.t };
      s.serieGegner = laengsterLauf(s.serieGegner, laufGegner);
      laufEigen = undefined;
    }

    if (eigenesTor || gegentor) {
      const differenz = neu.toreEigen - neu.toreGegner;
      const moment = { differenz: Math.abs(differenz), t: e.t, stand: stand(neu) };
      if (differenz > 0 && differenz > (s.groessterVorsprung?.differenz ?? 0)) s.groessterVorsprung = moment;
      if (differenz < 0 && -differenz > (s.groessterRueckstand?.differenz ?? 0)) s.groessterRueckstand = moment;
      if (differenz === 0) {
        s.ausgleiche += 1;
      } else {
        const jetzt = differenz > 0 ? 'eigen' : 'gegner';
        if (fuehrung && fuehrung !== jetzt) s.fuehrungswechsel += 1;
        fuehrung = jetzt;
      }
    }
    z = neu;
  }
  if (s.serieEigen) torlosBis(ereignisse.at(-1)?.t ?? 0);
  return s;
}

export interface Zahllage { dauer: number; situationen: number; tore: number; gegentore: number }
export interface UeberUnterzahl { ueberzahl: Zahllage; unterzahl: Zahllage }

const leereLage = (): Zahllage => ({ dauer: 0, situationen: 0, tore: 0, gegentore: 0 });

/**
 * Eigene Strafen kommen aus dem Zustand, Gegnerstrafen (`GZ`) werden hier mit
 * `STRAFDAUER` mitgeführt. Jede Spanne zwischen zwei Ereignissen wird an den
 * Strafenden geteilt; sitzen beide Seiten gleich viele ab, ist das Gleichzahl.
 */
export function ueberUnterzahl(ereignisse: readonly Ereignis[]): UeberUnterzahl {
  const ergebnis: UeberUnterzahl = { ueberzahl: leereLage(), unterzahl: leereLage() };
  const gegnerStrafen: number[] = [];
  let z = ZUSTAND_ANFANG;
  let vorherT = 0;
  let lageZuvor: keyof UeberUnterzahl | undefined;

  const lageBei = (t: number): keyof UeberUnterzahl | undefined => {
    const eigene = z.strafen.filter((s) => s.endeT > t).length;
    const gegner = gegnerStrafen.filter((ende) => ende > t).length;
    return eigene > gegner ? 'unterzahl' : gegner > eigene ? 'ueberzahl' : undefined;
  };
  const betrete = (lage: keyof UeberUnterzahl | undefined) => {
    if (lage && lage !== lageZuvor) ergebnis[lage].situationen += 1;
    lageZuvor = lage;
  };

  for (const e of ereignisse) {
    const grenzen = [...z.strafen.map((s) => s.endeT), ...gegnerStrafen]
      .filter((t) => t > vorherT && t < e.t)
      .sort((a, b) => a - b);
    let von = vorherT;
    for (const bis of [...grenzen, e.t]) {
      if (bis <= von) continue;
      const lage = lageBei(von);
      betrete(lage);
      if (lage) ergebnis[lage].dauer += bis - von;
      von = bis;
    }

    const neu = schritt(z, e);
    // Ein Tor zählt zur Lage, die unmittelbar davor galt; eine neue Situation
    // beginnt aber erst mit einer Spanne, die tatsächlich Zeit hat.
    const lage = lageBei(e.t);
    if (lage) {
      if (neu.toreEigen > z.toreEigen) ergebnis[lage].tore += 1;
      if (neu.toreGegner > z.toreGegner) ergebnis[lage].gegentore += 1;
    }
    if (e.typ.toUpperCase() === 'GZ') gegnerStrafen.push(e.t + STRAFDAUER);
    z = neu;
    vorherT = Math.max(vorherT, e.t);
  }
  return ergebnis;
}

export interface Siebenmeterbilanz {
  eigen: {
    tore: number;
    versuche: number;
    werferinnen: { nummer: number; tore: number; versuche: number }[];
    herausgeholt: { nummer: number; anzahl: number }[];
  };
  gegner: {
    tore: number;
    /** Paraden bei Siebenmeter; verworfene ohne Parade werden nicht erfasst. */
    gehalten: number;
    verursacht: { nummer: number; anzahl: number }[];
    gehaltenVon: { nummer: number; anzahl: number }[];
  };
}

export function siebenmeterBilanz(ereignisse: readonly Ereignis[]): Siebenmeterbilanz {
  const werferinnen = new Map<number, { nummer: number; tore: number; versuche: number }>();
  const zaehler = (): Map<number, number> => new Map();
  const herausgeholt = zaehler();
  const verursacht = zaehler();
  const gehaltenVon = zaehler();
  const b: Siebenmeterbilanz = {
    eigen: { tore: 0, versuche: 0, werferinnen: [], herausgeholt: [] },
    gegner: { tore: 0, gehalten: 0, verursacht: [], gehaltenVon: [] },
  };
  const hoch = (m: Map<number, number>, nummer: number | undefined) => {
    if (nummer !== undefined) m.set(nummer, (m.get(nummer) ?? 0) + 1);
  };

  for (const e of ereignisse) {
    const eintrag = findeEintrag(e.typ);
    if (!eintrag) continue;
    if (eintrag.wirkung === 'siebenmeter_treffer' || eintrag.wirkung === 'siebenmeter_fehl') {
      const tor = eintrag.wirkung === 'siebenmeter_treffer';
      b.eigen.versuche += 1;
      if (tor) b.eigen.tore += 1;
      if (e.spieler !== undefined) {
        const w = werferinnen.get(e.spieler) ?? { nummer: e.spieler, tore: 0, versuche: 0 };
        w.versuche += 1;
        if (tor) w.tore += 1;
        werferinnen.set(e.spieler, w);
      }
    } else if (eintrag.code === 'SH') {
      hoch(herausgeholt, e.spieler);
    } else if (eintrag.code === 'SV') {
      hoch(verursacht, e.spieler);
    } else if (eintrag.code === 'GS') {
      b.gegner.tore += 1;
    } else if (eintrag.code === 'PS') {
      b.gegner.gehalten += 1;
      hoch(gehaltenVon, e.spieler);
    }
  }

  const alsListe = (m: Map<number, number>) =>
    [...m].map(([nummer, anzahl]) => ({ nummer, anzahl })).sort((a, b) => a.nummer - b.nummer);
  b.eigen.werferinnen = [...werferinnen.values()].sort((a, b) => a.nummer - b.nummer);
  b.eigen.herausgeholt = alsListe(herausgeholt);
  b.gegner.verursacht = alsListe(verursacht);
  b.gegner.gehaltenVon = alsListe(gehaltenVon);
  return b;
}
