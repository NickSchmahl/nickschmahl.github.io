import { logoHtml } from '../design/logo';
import { themaKnopfHtml } from './thema';

/**
 * Die Kopfleiste aller Bildschirme außer der Erfassung: Logo, Titel, rechts
 * eigene Knöpfe und der Farbmodus. `titel` ist fester Text, kein Freitext.
 */
export function kopfleiste(titel: string, knoepfe = ''): string {
  return `<header class="kopfleiste">${logoHtml()}<h1>${titel}</h1>` +
    `<div class="kopfleiste-knoepfe">${knoepfe}${themaKnopfHtml()}</div></header>`;
}
