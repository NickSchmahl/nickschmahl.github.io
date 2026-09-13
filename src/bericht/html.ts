/**
 * Entschärft einen Text für die Einbettung in HTML, damit Namen oder Gegner mit
 * `"`, `<`, `>` etc. weder aus einem Attribut ausbrechen noch Markup einschleusen.
 */
export function htmlEscapen(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `JJJJ-MM-TT` → `TT.MM.JJJJ`; alles andere unverändert. */
export function alsDatum(iso: string): string {
  const t = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return t ? `${t[3]}.${t[2]}.${t[1]}` : iso;
}

export function prozent(anteil: number | null): string {
  return anteil === null ? '–' : `${Math.round(anteil * 100)} %`;
}
