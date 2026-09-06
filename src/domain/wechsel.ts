export interface Wechselrichtung {
  /** Die Nummer, die das Feld verlässt. */
  raus: number;
  /** Die Nummer, die aufs Feld kommt. */
  rein: number;
  /** Ob sich die Richtung aus der Feldbesetzung eindeutig ergibt. */
  eindeutig: boolean;
}

/**
 * `7W12` legt nicht fest, wer von beiden hereinkommt — das ergibt die
 * Feldbesetzung: wer draußen steht, kommt rein. Nur wenn beide draußen oder
 * beide auf dem Feld stehen, bleibt es bei der Leserichtung „erste Nummer geht
 * raus"; der Reduzierer meldet den Fall dann ohnehin als Hinweis.
 */
export function wechselrichtung(
  aufDemFeld: readonly number[],
  erste: number,
  zweite: number,
): Wechselrichtung {
  const ersteDrauf = aufDemFeld.includes(erste);
  const zweiteDrauf = aufDemFeld.includes(zweite);
  if (ersteDrauf && !zweiteDrauf) return { raus: erste, rein: zweite, eindeutig: true };
  if (zweiteDrauf && !ersteDrauf) return { raus: zweite, rein: erste, eindeutig: true };
  return { raus: erste, rein: zweite, eindeutig: false };
}
