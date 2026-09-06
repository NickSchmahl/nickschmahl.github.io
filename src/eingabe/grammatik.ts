import type { Katalogeintrag } from '../domain/ereignis';
import { findeEintrag, eintraegeMitPraefix } from '../domain/katalog';

export interface Puffer {
  /** Führende Ziffern: die Trikotnummer. */
  ziffern: string;
  /** Ein oder zwei Buchstaben. */
  code: string;
  /** Ziffern nach dem Code: Position, einwechselnde Nummer oder Uhrzeit. */
  argument: string;
}

export const LEERER_PUFFER: Puffer = { ziffern: '', code: '', argument: '' };

export const POSITIONEN: Record<number, string> = {
  1: 'Linksaußen',
  2: 'Rückraum links',
  3: 'Rückraum Mitte',
  4: 'Rückraum rechts',
  5: 'Rechtsaußen',
  6: 'Kreis',
  7: 'Gegenstoß',
};

const IST_ZIFFER = /^[0-9]$/;
const IST_BUCHSTABE = /^[A-Za-zÄÖÜäöü]$/;

/**
 * Verarbeitet einen Tastendruck. Die Trikotnummer endet ausschließlich am
 * ersten Buchstaben — nicht nach fester Länge und nicht nach Wartezeit.
 * Nur dadurch sind 7 und 77 nebeneinander eindeutig.
 */
export function tasteVerarbeiten(p: Puffer, taste: string): Puffer {
  if (IST_ZIFFER.test(taste)) {
    if (p.code === '') return { ...p, ziffern: p.ziffern + taste };
    return { ...p, argument: p.argument + taste };
  }
  if (IST_BUCHSTABE.test(taste)) {
    if (p.argument !== '') return p; // nach dem Argument kommt kein Buchstabe mehr
    if (p.code.length >= 2) return p; // Codes sind höchstens zweistellig
    return { ...p, code: p.code + taste.toUpperCase() };
  }
  return p;
}

/** Entfernt das letzte Zeichen, unabhängig davon, in welchem Feld es sich befindet. */
export function zeichenLoeschen(p: Puffer): Puffer {
  if (p.argument !== '') return { ...p, argument: p.argument.slice(0, -1) };
  if (p.code !== '') return { ...p, code: p.code.slice(0, -1) };
  return { ...p, ziffern: p.ziffern.slice(0, -1) };
}

export type Analyse =
  | { art: 'leer' }
  | { art: 'nummer'; ziffern: string }
  | { art: 'unbekannt'; code: string }
  | {
      art: 'bereit';
      eintrag: Katalogeintrag;
      spieler?: number;
      pos?: number;
      ein?: number;
      zeit?: number;
    };

export function analysiere(p: Puffer): Analyse {
  if (p.ziffern === '' && p.code === '') return { art: 'leer' };
  if (p.code === '') return { art: 'nummer', ziffern: p.ziffern };

  const eintrag = findeEintrag(p.code);
  if (!eintrag) return { art: 'unbekannt', code: p.code };

  const hatNummer = p.ziffern !== '';
  if (eintrag.brauchtSpieler !== hatNummer) return { art: 'unbekannt', code: eintrag.code };

  const ergebnis: Analyse = { art: 'bereit', eintrag };
  if (hatNummer) ergebnis.spieler = Number(p.ziffern);

  switch (eintrag.argument) {
    case 'position': {
      if (p.argument === '') break; // Position ist freiwillig
      const pos = Number(p.argument);
      if (!(pos >= 1 && pos <= 7) || p.argument.length !== 1) {
        return { art: 'unbekannt', code: eintrag.code };
      }
      ergebnis.pos = pos;
      break;
    }
    case 'spieler': {
      if (p.argument === '') return { art: 'unbekannt', code: eintrag.code };
      ergebnis.ein = Number(p.argument);
      break;
    }
    case 'zeit': {
      if (p.argument.length !== 4) return { art: 'unbekannt', code: eintrag.code };
      const minuten = Number(p.argument.slice(0, 2));
      const sekunden = Number(p.argument.slice(2));
      if (sekunden > 59) return { art: 'unbekannt', code: eintrag.code };
      ergebnis.zeit = minuten * 60 + sekunden;
      break;
    }
    default:
      if (p.argument !== '') return { art: 'unbekannt', code: eintrag.code };
  }

  return ergebnis;
}

/** Die Codes, die zur bisherigen Buchstabeneingabe passen — für die Trefferliste. */
export function vorschlaege(p: Puffer): Katalogeintrag[] {
  if (p.code === '') return [];
  return eintraegeMitPraefix(p.code);
}

/**
 * Der Puffer im Klartext. Solange nur Ziffern getippt sind, werden sie roh
 * gezeigt: aus einer 7 kann noch eine 77 werden, und eine Zeile, die
 * zwischenzeitlich den falschen Spieler behauptet, wäre schlimmer als gar keine.
 */
export function klartext(p: Puffer): string {
  const a = analysiere(p);
  switch (a.art) {
    case 'leer':
      return '';
    case 'nummer':
      return a.ziffern;
    case 'unbekannt':
      return teile(p.ziffern === '' ? [] : [`Nr. ${p.ziffern}`], `${a.code} — unbekannt`);
    case 'bereit': {
      const stuecke: string[] = [];
      if (a.spieler !== undefined) stuecke.push(`Nr. ${a.spieler}`);
      stuecke.push(a.eintrag.bezeichnung);
      if (a.pos !== undefined) stuecke.push(POSITIONEN[a.pos] ?? String(a.pos));
      if (a.ein !== undefined) stuecke.push(`für Nr. ${a.ein}`);
      if (a.zeit !== undefined) stuecke.push(alsUhrzeit(a.zeit));
      return stuecke.join(' · ');
    }
  }
}

function teile(vorne: string[], hinten: string): string {
  return [...vorne, hinten].join(' · ');
}

export function alsUhrzeit(sekunden: number): string {
  const m = Math.floor(sekunden / 60);
  const s = sekunden % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
