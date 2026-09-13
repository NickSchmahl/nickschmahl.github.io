import type { Katalogeintrag } from '../domain/ereignis';
import { findeEintrag, eintraegeMitPraefix } from '../domain/katalog';
import { wechselrichtung } from '../domain/wechsel';

export interface Puffer {
  /** Führende Ziffern: die Trikotnummer. */
  ziffern: string;
  /** Ein bis drei Buchstaben. */
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
    if (p.code.length >= 3) return p; // Codes sind höchstens dreistellig
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
  /** Der Code steht, sein Ziffernargument ist aber noch nicht vollständig. */
  | { art: 'unfertig'; eintrag: Katalogeintrag; spieler?: number; argument: string }
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
  const unfertig = (): Analyse => {
    const a: Analyse = { art: 'unfertig', eintrag, argument: p.argument };
    if (hatNummer) a.spieler = Number(p.ziffern);
    return a;
  };

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
      if (p.argument === '') return unfertig();
      ergebnis.ein = Number(p.argument);
      break;
    }
    case 'zeit': {
      // Die Sekunden-Zehnerstelle steht schon vor der letzten Ziffer fest und
      // kann deshalb sofort widerlegt werden.
      if (p.argument.length >= 3 && Number(p.argument[2]) > 5) {
        return { art: 'unbekannt', code: eintrag.code };
      }
      if (p.argument.length < 4) return unfertig();
      if (p.argument.length > 4) return { art: 'unbekannt', code: eintrag.code };
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
export function klartext(p: Puffer, aufDemFeld: readonly number[] = []): string {
  const a = analysiere(p);
  switch (a.art) {
    case 'leer':
      return '';
    case 'nummer':
      return a.ziffern;
    case 'unbekannt':
      return teile(p.ziffern === '' ? [] : [`Nr. ${p.ziffern}`], `${a.code} — unbekannt`);
    case 'unfertig': {
      const stuecke: string[] = [];
      if (a.spieler !== undefined) stuecke.push(`Nr. ${a.spieler}`);
      stuecke.push(a.eintrag.bezeichnung);
      stuecke.push(a.eintrag.argument === 'zeit' ? teilUhrzeit(a.argument) : 'Nr. __');
      return stuecke.join(' · ');
    }
    case 'bereit': {
      const stuecke: string[] = [];
      if (a.spieler !== undefined && a.ein !== undefined) {
        // Beim Wechsel entscheidet die Feldbesetzung, wer von beiden hereinkommt.
        const r = wechselrichtung(aufDemFeld, a.spieler, a.ein);
        return r.eindeutig
          ? `Nr. ${r.rein} · ${a.eintrag.bezeichnung} · kommt für Nr. ${r.raus}`
          : `Nr. ${a.spieler} · ${a.eintrag.bezeichnung} · ⇄ Nr. ${a.ein}`;
      }
      if (a.spieler !== undefined) stuecke.push(`Nr. ${a.spieler}`);
      stuecke.push(a.eintrag.bezeichnung);
      if (a.pos !== undefined) stuecke.push(POSITIONEN[a.pos] ?? String(a.pos));
      if (a.zeit !== undefined) stuecke.push(alsUhrzeit(a.zeit));
      return stuecke.join(' · ');
    }
  }
}

/** Die vier Ziffern von mmss, soweit getippt: `12:3_`. */
function teilUhrzeit(ziffern: string): string {
  const stellen = ['_', '_', '_', '_'];
  for (let i = 0; i < ziffern.length && i < 4; i += 1) stellen[i] = ziffern.charAt(i);
  return `${stellen[0]}${stellen[1]}:${stellen[2]}${stellen[3]}`;
}

function teile(vorne: string[], hinten: string): string {
  return [...vorne, hinten].join(' · ');
}

export function alsUhrzeit(sekunden: number): string {
  const m = Math.floor(sekunden / 60);
  const s = sekunden % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
