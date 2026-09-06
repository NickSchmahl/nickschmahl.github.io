import type { Ereignis } from '../domain/ereignis';
import { findeEintrag } from '../domain/katalog';
import { ereignisEntfernen, spielerAendern } from '../domain/korrektur';
import { alsUhrzeit } from '../eingabe/grammatik';

/**
 * Zeigt die Ereignisliste zum Korrigieren. Pfeiltasten wählen, Entf löscht,
 * eine getippte Zahl plus Eingabetaste setzt den Spieler neu, Esc schließt.
 */
export function zeigeKorrektur(
  wurzel: HTMLElement,
  ereignisse: readonly Ereignis[],
  fertig: (neu: Ereignis[]) => void,
): void {
  let liste: Ereignis[] = [...ereignisse];
  let auswahl = liste.length - 1;
  let eingabe = '';

  function zeichne(): void {
    wurzel.innerHTML = `
      <h1>Korrektur</h1>
      <p>Pfeiltasten wählen · Entf löscht · Zahl eintippen und Eingabetaste setzt den Spieler · Esc schließt</p>
      <ul style="list-style:none;padding:0">
        ${liste.map((e, i) => {
          const eintrag = findeEintrag(e.typ);
          const wer = e.spieler === undefined ? '' : ` Nr. ${e.spieler}`;
          return `<li style="${i === auswahl ? 'outline:2px solid var(--hervor)' : ''}">
            ${alsUhrzeit(e.t)}${wer} — ${eintrag?.bezeichnung ?? e.typ}
          </li>`;
        }).join('')}
      </ul>
      <p class="puffer">${eingabe ? `neuer Spieler: ${eingabe}` : '&nbsp;'}</p>
    `;
  }

  function beiTaste(ereignis: KeyboardEvent): void {
    ereignis.preventDefault();
    const gewaehlt = liste[auswahl];

    if (ereignis.key === 'Escape') {
      window.removeEventListener('keydown', beiTaste);
      fertig(liste);
      return;
    }
    if (ereignis.key === 'ArrowUp') auswahl = Math.max(0, auswahl - 1);
    else if (ereignis.key === 'ArrowDown') auswahl = Math.min(liste.length - 1, auswahl + 1);
    else if (ereignis.key === 'Delete' && gewaehlt) {
      liste = ereignisEntfernen(liste, gewaehlt.seq);
      auswahl = Math.min(auswahl, liste.length - 1);
    } else if (/^[0-9]$/.test(ereignis.key)) eingabe += ereignis.key;
    else if (ereignis.key === 'Backspace') eingabe = eingabe.slice(0, -1);
    else if (ereignis.key === 'Enter' && gewaehlt && eingabe !== '') {
      liste = spielerAendern(liste, gewaehlt.seq, Number(eingabe));
      eingabe = '';
    }
    zeichne();
  }

  window.addEventListener('keydown', beiTaste);
  zeichne();
}
