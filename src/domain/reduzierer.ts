import type { Ereignis, Hinweis, Wirkung } from './ereignis';
import { PARADEN, findeEintrag } from './katalog';
import { wechselrichtung } from './wechsel';

/** Aktionen, die nur bei laufender Uhr stattfinden können. */
const NUR_IM_SPIEL: readonly Wirkung[] = [
  'wurf', 'treffer', 'siebenmeter_treffer', 'siebenmeter_fehl', 'gegentor', 'gegnerwurf',
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
  /** Alle Wurfversuche des Gegners: Tore, Fehlwürfe (`GF`) und gehaltene Würfe (Paraden). */
  wuerfeGegner: number;
  aufDemFeld: number[];
  disqualifiziert: number[];
  /**
   * Offene Strafen: der Spieler ist wegen einer Zeitstrafe draußen. Der Eintrag
   * bleibt über das Ende der zwei Minuten hinaus bestehen, bis der Spieler
   * wieder aufs Feld kommt — nur so kann die Anzeige „darf rein" stehen
   * bleiben, statt beim nächsten Ereignis zu verschwinden. Ob eine Strafe noch
   * läuft, sagt `endeT > t`.
   */
  strafen: Strafe[];
  hinweise: Hinweis[];
}

export const ZUSTAND_ANFANG: Zustand = {
  t: 0,
  abschnitt: 1,
  uhrLaeuft: false,
  toreEigen: 0,
  toreGegner: 0,
  wuerfeGegner: 0,
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

  let { toreEigen, toreGegner, wuerfeGegner, aufDemFeld, disqualifiziert, abschnitt, uhrLaeuft } = z;
  aufDemFeld = [...aufDemFeld];
  disqualifiziert = [...disqualifiziert];
  let neueStrafen = [...z.strafen];

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
      // Eine Parade setzt einen Wurf des Gegners voraus.
      if (PARADEN.includes(eintrag.code)) wuerfeGegner += 1;
      break;

    case 'gegentor':
      toreGegner += 1;
      wuerfeGegner += 1;
      break;

    case 'gegnerwurf':
      wuerfeGegner += 1;
      break;

    case 'strafe': {
      aufDemFeldPruefen();
      if (e.spieler !== undefined) {
        const bestraft = e.spieler;
        aufDemFeld = aufDemFeld.filter((n) => n !== bestraft);
        neueStrafen = [
          ...neueStrafen.filter((s) => s.spieler !== bestraft),
          { spieler: bestraft, endeT: e.t + STRAFDAUER },
        ];
      }
      break;
    }

    case 'karte': {
      aufDemFeldPruefen();
      if (eintrag.kartenart === 'rot' && e.spieler !== undefined) {
        const raus = e.spieler;
        aufDemFeld = aufDemFeld.filter((n) => n !== raus);
        // Wer disqualifiziert ist, kommt nicht zurück: eine offene Strafe würde
        // ihn sonst später fälschlich als „darf rein" melden.
        neueStrafen = neueStrafen.filter((s) => s.spieler !== raus);
        if (!disqualifiziert.includes(raus)) disqualifiziert.push(raus);
      }
      break;
    }

    case 'wechsel': {
      const code = e.typ.toUpperCase();
      let rein: number | undefined;
      let raus: number | undefined;
      if (code === 'W' && e.spieler !== undefined && e.ein !== undefined) {
        // Welche der beiden Nummern hereinkommt, entscheidet die Feldbesetzung.
        ({ rein, raus } = wechselrichtung(aufDemFeld, e.spieler, e.ein));
      } else if (code === 'W') {
        rein = e.ein;
        raus = e.spieler;
      } else if (code === 'I') {
        rein = e.spieler;
      } else {
        raus = e.spieler;
      }

      if (raus !== undefined) {
        if (!aufDemFeld.includes(raus)) warne(`Nr. ${raus} steht nicht auf dem Feld`);
        aufDemFeld = aufDemFeld.filter((n) => n !== raus);
      }
      if (rein !== undefined) {
        if (aufDemFeld.includes(rein)) {
          warne(`Nr. ${rein} steht bereits auf dem Feld`);
        } else {
          if (disqualifiziert.includes(rein)) warne(`Nr. ${rein} ist disqualifiziert`);
          if (neueStrafen.some((s) => s.spieler === rein && s.endeT > e.t)) {
            warne(`Nr. ${rein} sitzt eine Zeitstrafe ab`);
          }
          aufDemFeld.push(rein);
        }
        // Zurück auf dem Feld heißt: die Strafe ist erledigt.
        neueStrafen = neueStrafen.filter((s) => s.spieler !== rein);
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
    wuerfeGegner,
    aufDemFeld,
    disqualifiziert,
    strafen: neueStrafen,
    hinweise: [...z.hinweise, ...hinweise],
  };
}

export function reduziere(ereignisse: readonly Ereignis[]): Zustand {
  return ereignisse.reduce(schritt, ZUSTAND_ANFANG);
}
