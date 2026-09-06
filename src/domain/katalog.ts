import type { Katalogeintrag } from './ereignis';

/**
 * Der vollständige Ereigniskatalog. Neue Kategorien werden hier ergänzt, nicht
 * im Reduzierer: der kennt nur die Wirkungen.
 */
export const KATALOG: readonly Katalogeintrag[] = [
  // Wurf und Tor
  { code: 'T', bezeichnung: 'Tor', wirkung: 'treffer', brauchtSpieler: true, argument: 'position' },
  { code: 'F', bezeichnung: 'Fehlwurf', wirkung: 'wurf', brauchtSpieler: true, argument: 'position' },
  { code: 'FB', bezeichnung: 'Fehlwurf, geblockt', wirkung: 'wurf', brauchtSpieler: true, argument: 'position' },
  { code: 'A', bezeichnung: 'Assist', wirkung: 'zaehler', brauchtSpieler: true },

  // Technische Fehler
  { code: 'TF', bezeichnung: 'Technischer Fehler', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'TS', bezeichnung: 'Schrittfehler', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'TD', bezeichnung: 'Doppelfehler', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'TA', bezeichnung: 'Angriffsfoul', wirkung: 'zaehler', brauchtSpieler: true },

  // Siebenmeter
  { code: 'ST', bezeichnung: 'Siebenmeter-Tor', wirkung: 'siebenmeter_treffer', brauchtSpieler: true },
  { code: 'SF', bezeichnung: 'Siebenmeter verworfen', wirkung: 'siebenmeter_fehl', brauchtSpieler: true },
  { code: 'SH', bezeichnung: 'Siebenmeter herausgeholt', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'SV', bezeichnung: 'Siebenmeter verursacht', wirkung: 'zaehler', brauchtSpieler: true },

  // Abwehr und Ballaktionen
  { code: 'B', bezeichnung: 'Block', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'BG', bezeichnung: 'Ballgewinn', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'BV', bezeichnung: 'Ballverlust', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'N', bezeichnung: 'Neutralisierung', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'E', bezeichnung: 'Eins-gegen-eins gewonnen', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'EV', bezeichnung: 'Eins-gegen-eins verloren', wirkung: 'zaehler', brauchtSpieler: true },

  // Torwart
  { code: 'P', bezeichnung: 'Parade', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'PS', bezeichnung: 'Parade bei Siebenmeter', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'PT', bezeichnung: 'Tor durch den Torwart', wirkung: 'treffer', brauchtSpieler: true },

  // Strafen
  { code: 'Z', bezeichnung: 'Zeitstrafe', wirkung: 'strafe', brauchtSpieler: true },
  { code: 'ZG', bezeichnung: 'Verwarnung', wirkung: 'karte', brauchtSpieler: true, kartenart: 'gelb' },
  { code: 'ZR', bezeichnung: 'Disqualifikation', wirkung: 'karte', brauchtSpieler: true, kartenart: 'rot' },
  { code: 'ZH', bezeichnung: 'Zeitstrafe herausgeholt', wirkung: 'zaehler', brauchtSpieler: true },

  // Feldbesetzung
  { code: 'W', bezeichnung: 'Wechsel', wirkung: 'wechsel', brauchtSpieler: true, argument: 'spieler' },
  { code: 'I', bezeichnung: 'Kommt aufs Feld', wirkung: 'wechsel', brauchtSpieler: true },
  { code: 'O', bezeichnung: 'Geht vom Feld', wirkung: 'wechsel', brauchtSpieler: true },

  // Gegner
  { code: 'GT', bezeichnung: 'Gegentor', wirkung: 'gegentor', brauchtSpieler: false },
  { code: 'GS', bezeichnung: 'Gegentor durch Siebenmeter', wirkung: 'gegentor', brauchtSpieler: false },
  { code: 'GZ', bezeichnung: 'Zeitstrafe für den Gegner', wirkung: 'zaehler', brauchtSpieler: false },

  // Spielsteuerung
  { code: 'HZ', bezeichnung: 'Abschnittswechsel', wirkung: 'uhr', brauchtSpieler: false },
  { code: 'AZ', bezeichnung: 'Auszeit', wirkung: 'uhr', brauchtSpieler: false },
  { code: 'U', bezeichnung: 'Uhrkorrektur', wirkung: 'uhr', brauchtSpieler: false, argument: 'zeit' },
  { code: 'UL', bezeichnung: 'Uhr läuft', wirkung: 'uhr', brauchtSpieler: false },
  { code: 'US', bezeichnung: 'Uhr steht', wirkung: 'uhr', brauchtSpieler: false },
];

const NACH_CODE = new Map(KATALOG.map((e) => [e.code, e]));

export function findeEintrag(code: string): Katalogeintrag | undefined {
  return NACH_CODE.get(code.toUpperCase());
}

/**
 * Alle Einträge, deren Code mit dem Präfix beginnt — alphabetisch, damit die
 * Trefferliste in der Oberfläche stabil bleibt. Ein exakter Treffer ist
 * enthalten, denn `T` ist sowohl fertiger Code als auch Präfix von `TF`.
 */
export function eintraegeMitPraefix(praefix: string): Katalogeintrag[] {
  const p = praefix.toUpperCase();
  return KATALOG.filter((e) => e.code.startsWith(p)).sort((a, b) => a.code.localeCompare(b.code));
}
