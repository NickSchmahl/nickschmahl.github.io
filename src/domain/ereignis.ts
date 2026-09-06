/** Was ein Ereignis im Zustand bewirkt. Der Reduzierer kennt nur diese Fälle. */
export type Wirkung =
  | 'wurf'
  | 'treffer'
  | 'siebenmeter_treffer'
  | 'siebenmeter_fehl'
  | 'gegentor'
  | 'strafe'
  | 'karte'
  | 'wechsel'
  | 'zaehler'
  | 'uhr';

/** Bedeutung des Ziffernarguments hinter dem Code. */
export type Argumentart = 'position' | 'spieler' | 'zeit';

export interface Katalogeintrag {
  code: string;
  bezeichnung: string;
  wirkung: Wirkung;
  brauchtSpieler: boolean;
  argument?: Argumentart;
  /** Nur bei Wirkung 'karte' gesetzt. */
  kartenart?: 'gelb' | 'rot';
}

export interface Ereignis {
  /** Fortlaufend, bestimmt die Reihenfolge. */
  seq: number;
  /** Spielzeit in Sekunden seit Anwurf der ersten Halbzeit. */
  t: number;
  /** Echtzeit als ISO-Zeichenkette, für Nachvollziehbarkeit nach Uhrkorrekturen. */
  wall: string;
  /** Code aus dem Katalog. */
  typ: string;
  spieler?: number;
  /** Wurfposition 1..7. */
  pos?: number;
  /** Einwechselnde Trikotnummer bei 'W'. */
  ein?: number;
  /** Zielspielzeit in Sekunden bei 'U'. */
  zeit?: number;
}

export interface Spieler {
  nummer: number;
  name: string;
  torwart: boolean;
}

export interface Hinweis {
  /** Das Ereignis, auf das sich der Hinweis bezieht. */
  seq: number;
  text: string;
}
