import sairaText400 from '@fontsource/saira/files/saira-latin-400-normal.woff2?inline';
import sairaText600 from '@fontsource/saira/files/saira-latin-600-normal.woff2?inline';
import sairaZahl600 from '@fontsource/saira-condensed/files/saira-condensed-latin-600-normal.woff2?inline';
import sairaZahl700 from '@fontsource/saira-condensed/files/saira-condensed-latin-700-normal.woff2?inline';

/**
 * Die Schriften liegen als data:-URLs im Bundle statt bei einem Schriftdienst:
 * in der Halle gibt es oft kein Netz, und der exportierte Bericht soll bei allen
 * gleich aussehen. Nur der lateinische Zeichensatz; Umlaute und ß sind enthalten.
 */
const schnitt = (familie: string, gewicht: number, url: string): string =>
  `@font-face { font-family: "${familie}"; font-style: normal; font-weight: ${gewicht}; font-display: swap; src: url(${url}) format("woff2"); }`;

export const SCHRIFTEN_CSS = [
  schnitt('Saira', 400, sairaText400),
  schnitt('Saira', 600, sairaText600),
  schnitt('Saira Condensed', 600, sairaZahl600),
  schnitt('Saira Condensed', 700, sairaZahl700),
].join('\n');
