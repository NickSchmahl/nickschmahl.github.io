import type { Ereignis, Hinweis } from '../domain/ereignis';

export type Verlaufszeile =
  | { art: 'abschnitt'; abschnitt: number }
  | { art: 'eintrag'; ereignis: Ereignis; hinweis?: string };

/**
 * Neuestes zuerst, mit einer Überschrift je Abschnitt. Der Abschnittswechsel
 * selbst gehört noch zu dem Abschnitt, den er beendet.
 */
export function verlaufszeilen(ereignisse: readonly Ereignis[], hinweise: readonly Hinweis[]): Verlaufszeile[] {
  const texte = new Map<number, string[]>();
  for (const h of hinweise) texte.set(h.seq, [...(texte.get(h.seq) ?? []), h.text]);

  let abschnitt = 1;
  const mitAbschnitt = ereignisse.map((e) => {
    const eigener = abschnitt;
    if (e.typ.toUpperCase() === 'HZ') abschnitt += 1;
    return { e, abschnitt: eigener };
  });

  const zeilen: Verlaufszeile[] = [];
  let letzter: number | undefined;
  for (const { e, abschnitt: a } of mitAbschnitt.reverse()) {
    if (a !== letzter) {
      zeilen.push({ art: 'abschnitt', abschnitt: a });
      letzter = a;
    }
    const hinweis = texte.get(e.seq)?.join(' · ');
    zeilen.push(hinweis ? { art: 'eintrag', ereignis: e, hinweis } : { art: 'eintrag', ereignis: e });
  }
  return zeilen;
}

/** Die Einträge in der Reihenfolge des Verlaufs, ohne Überschriften. */
export function reihenfolge(zeilen: readonly Verlaufszeile[]): number[] {
  return zeilen.flatMap((z) => (z.art === 'eintrag' ? [z.ereignis.seq] : []));
}
