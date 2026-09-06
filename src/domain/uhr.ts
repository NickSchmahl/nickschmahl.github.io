/**
 * Die Spielzeit wird nicht getickt, sondern gerechnet: aus einem Stützpunkt
 * (Spielzeit plus zugehörige Echtzeit) und der seither vergangenen Echtzeit.
 * Dadurch kann die Anzeige beliebig oft neu zeichnen, ohne dass sich Fehler
 * aufsummieren.
 */
export interface Uhrzustand {
  laeuft: boolean;
  /** Spielzeit am Stützpunkt, in Sekunden. */
  basisT: number;
  /** Echtzeit am Stützpunkt, in Millisekunden. */
  basisWall: number;
  /** 1 = erste Halbzeit, 2 = zweite Halbzeit, danach Verlängerungen. */
  abschnitt: number;
}

export const UHR_ANFANG: Uhrzustand = { laeuft: false, basisT: 0, basisWall: 0, abschnitt: 1 };

export function spielzeit(u: Uhrzustand, wallJetzt: number): number {
  if (!u.laeuft) return u.basisT;
  return u.basisT + Math.floor((wallJetzt - u.basisWall) / 1000);
}

export function starten(u: Uhrzustand, wallJetzt: number): Uhrzustand {
  if (u.laeuft) return u;
  return { ...u, laeuft: true, basisT: u.basisT, basisWall: wallJetzt };
}

export function anhalten(u: Uhrzustand, wallJetzt: number): Uhrzustand {
  if (!u.laeuft) return u;
  return { ...u, laeuft: false, basisT: spielzeit(u, wallJetzt), basisWall: wallJetzt };
}

export function umschalten(u: Uhrzustand, wallJetzt: number): Uhrzustand {
  return u.laeuft ? anhalten(u, wallJetzt) : starten(u, wallJetzt);
}

/** Setzt die Spielzeit auf den an der Hallenuhr abgelesenen Wert. */
export function korrigieren(u: Uhrzustand, zielT: number, wallJetzt: number): Uhrzustand {
  return { ...u, basisT: zielT, basisWall: wallJetzt };
}

/** Halbzeit oder Spielende: hält an und zählt den Abschnitt hoch. */
export function abschnittWechseln(u: Uhrzustand, wallJetzt: number): Uhrzustand {
  const gestoppt = anhalten(u, wallJetzt);
  return { ...gestoppt, abschnitt: gestoppt.abschnitt + 1 };
}
