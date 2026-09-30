/**
 * Das Zeichen: Torraum (6-Meter-Bogen), gestrichelte 9-Meter-Linie, Tor und
 * Ball. Alle Farben kommen über Inline-Styles aus den Tokens; so kommt das Logo
 * in App und Exportdatei ohne eigenes CSS aus und macht beide Farbmodi mit.
 */
export const LOGO_ZEICHEN =
  '<svg class="logo-zeichen" viewBox="0 0 48 48" width="2.6em" height="2.6em" aria-hidden="true" style="flex:none;overflow:visible">' +
  '<path d="M1 45 A23 23 0 0 1 47 45" style="fill:none;stroke:var(--schrift);stroke-width:2.5;stroke-dasharray:4 3.4;opacity:.5"/>' +
  '<path d="M9 45 A15 15 0 0 1 39 45" style="fill:none;stroke:var(--schrift);stroke-width:4"/>' +
  '<rect x="16" y="43" width="16" height="4" rx="1" style="fill:var(--schrift)"/>' +
  '<circle cx="24" cy="14" r="6" style="fill:var(--akzent)"/>' +
  '</svg>';

/** Zeichen mit Schriftzug; die Größe folgt der Schriftgröße des umgebenden Elements. */
export function logoHtml(): string {
  return '<span class="logo" role="img" aria-label="Handball-Tracker" style="display:inline-flex;align-items:center;gap:.55em;color:var(--schrift);line-height:1">' +
    LOGO_ZEICHEN +
    '<span style="display:flex;flex-direction:column;font-family:var(--familie-zahl);font-weight:700;font-size:1.25em;line-height:.92;text-transform:uppercase;letter-spacing:.03em">' +
    'Handball<span style="font-weight:600;color:var(--akzent)">Tracker</span></span></span>';
}
