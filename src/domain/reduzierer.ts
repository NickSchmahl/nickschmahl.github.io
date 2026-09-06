import type { Ereignis, Hinweis, Wirkung } from './ereignis';
import { findeEintrag } from './katalog';

/** Aktionen, die nur bei laufender Uhr stattfinden können. */
const NUR_IM_SPIEL: readonly Wirkung[] = [
  'wurf', 'treffer', 'siebenmeter_treffer', 'siebenmeter_fehl', 'gegentor',
];

export interface Strafe {
  spieler: number;
  /** Spielzeit, zu der die Strafe abgelaufen ist. */
  endeT: number;
}

export interface Zustand {
  /** Spielzeit des zuletzt verarbeiteten Ereignisses. */
  t: number;
  abschnitt: number;
  uhrLaeuft: boolean;
  toreEigen: number;
  toreGegner: number;
  aufDemFeld: number[];
  disqualifiziert: number[];
  strafen: Strafe[];
  hinweise: Hinweis[];
}

export const ZUSTAND_ANFANG: Zustand = {
  t: 0,
  abschnitt: 1,
  uhrLaeuft: false,
  toreEigen: 0,
  toreGegner: 0,
  aufDemFeld: [],
  disqualifiziert: [],
  strafen: [],
  hinweise: [],
};

export const STRAFDAUER = 120;

/**
 * Verarbeitet ein Ereignis. Prüfungen erzeugen Hinweise, verwerfen aber nie:
 * live darf nichts hängen bleiben, nur weil ein Wechsel übersehen wurde.
 */
export function schritt(z: Zustand, e: Ereignis): Zustand {
  const eintrag = findeEintrag(e.typ);
  const hinweise: Hinweis[] = [];
  const warne = (text: string) => hinweise.push({ seq: e.seq, text });

  if (!eintrag) {
    return { ...z, t: e.t, hinweise: [...z.hinweise, { seq: e.seq, text: `Code ${e.typ} ist unbekannt` }] };
  }

  if (NUR_IM_SPIEL.includes(eintrag.wirkung) && !z.uhrLaeuft) warne('Die Uhr steht');

  // Abgelaufene Zeitstrafen fallen weg, bevor irgendetwas anderes geprüft wird.
  const strafen = z.strafen.filter((s) => s.endeT > e.t);

  let { toreEigen, toreGegner, aufDemFeld, disqualifiziert, abschnitt, uhrLaeuft } = z;
  aufDemFeld = [...aufDemFeld];
  disqualifiziert = [...disqualifiziert];
  let neueStrafen = [...strafen];

  const aufDemFeldPruefen = () => {
    if (e.spieler !== undefined && !aufDemFeld.includes(e.spieler)) {
      warne(`Nr. ${e.spieler} steht nicht auf dem Feld`);
    }
  };

  switch (eintrag.wirkung) {
    case 'treffer':
    case 'siebenmeter_treffer':
      aufDemFeldPruefen();
      toreEigen += 1;
      break;

    case 'wurf':
    case 'siebenmeter_fehl':
    case 'zaehler':
      aufDemFeldPruefen();
      break;

    case 'gegentor':
      toreGegner += 1;
      break;

    case 'strafe': {
      aufDemFeldPruefen();
      if (e.spieler !== undefined) {
        aufDemFeld = aufDemFeld.filter((n) => n !== e.spieler);
        neueStrafen = [...neueStrafen, { spieler: e.spieler, endeT: e.t + STRAFDAUER }];
      }
      break;
    }

    case 'karte': {
      aufDemFeldPruefen();
      if (eintrag.kartenart === 'rot' && e.spieler !== undefined) {
        aufDemFeld = aufDemFeld.filter((n) => n !== e.spieler);
        if (!disqualifiziert.includes(e.spieler)) disqualifiziert.push(e.spieler);
      }
      break;
    }

    case 'wechsel': {
      const rein = e.typ.toUpperCase() === 'W' ? e.ein : e.typ.toUpperCase() === 'I' ? e.spieler : undefined;
      const raus = e.typ.toUpperCase() === 'W' || e.typ.toUpperCase() === 'O' ? e.spieler : undefined;

      if (raus !== undefined) {
        if (!aufDemFeld.includes(raus)) warne(`Nr. ${raus} steht nicht auf dem Feld`);
        aufDemFeld = aufDemFeld.filter((n) => n !== raus);
      }
      if (rein !== undefined) {
        if (aufDemFeld.includes(rein)) warne(`Nr. ${rein} steht bereits auf dem Feld`);
        else if (disqualifiziert.includes(rein)) warne(`Nr. ${rein} ist disqualifiziert`);
        else if (neueStrafen.some((s) => s.spieler === rein)) warne(`Nr. ${rein} sitzt eine Zeitstrafe ab`);
        else aufDemFeld.push(rein);
      }
      if (aufDemFeld.length > 7) warne('Es stehen mehr als sieben Spieler auf dem Feld');
      break;
    }

    case 'uhr': {
      const code = e.typ.toUpperCase();
      if (code === 'HZ') {
        abschnitt += 1;
        uhrLaeuft = false;
      } else if (code === 'AZ' || code === 'US') {
        uhrLaeuft = false;
      } else if (code === 'UL') {
        uhrLaeuft = true;
      }
      break;
    }
  }

  aufDemFeld.sort((a, b) => a - b);

  return {
    t: e.t,
    abschnitt,
    uhrLaeuft,
    toreEigen,
    toreGegner,
    aufDemFeld,
    disqualifiziert,
    strafen: neueStrafen,
    hinweise: [...z.hinweise, ...hinweise],
  };
}

export function reduziere(ereignisse: readonly Ereignis[]): Zustand {
  return ereignisse.reduce(schritt, ZUSTAND_ANFANG);
}
