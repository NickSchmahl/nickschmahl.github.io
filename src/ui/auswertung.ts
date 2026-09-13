import type { Spieler } from '../domain/ereignis';
import { berichtDatei, berichtHtml } from '../bericht/auswertung';
import { BERICHT_CSS, BERICHT_DUNKEL } from '../bericht/stil';
import { alsJsonl, dateiname } from '../persistenz/export';
import type { Spiel } from '../persistenz/speicher';
import { herunterladen } from './kader';

export interface AuswertungOptionen {
  /** Zurück zur Erfassung — nur, wenn die Auswertung aus ihr geöffnet wurde. */
  zurueck?: () => void;
  /** Spiel abschließen; danach führt der Aufrufer weiter. */
  beenden?: () => Promise<void> | void;
  /** Nach einem Import: zurück zum Start. */
  zumStart?: () => void;
}

/** Das Berichts-CSS kommt als Text mit und wird einmal in den Kopf gehängt. */
function stilEinhaengen(): void {
  if (document.getElementById('bericht-stil')) return;
  const stil = document.createElement('style');
  stil.id = 'bericht-stil';
  stil.textContent = `${BERICHT_DUNKEL}\n${BERICHT_CSS}`;
  document.head.appendChild(stil);
}

export function zeigeAuswertung(
  wurzel: HTMLElement,
  spiel: Spiel,
  kader: readonly Spieler[],
  optionen: AuswertungOptionen,
): void {
  stilEinhaengen();
  wurzel.innerHTML = `
    <div class="auswertung-knoepfe">
      <button id="html-speichern">Als HTML speichern</button>
      <button id="jsonl-speichern">Ereignisse (JSONL)</button>
      ${optionen.zurueck ? '<button id="zurueck">Zurück zur Erfassung</button>' : ''}
      ${optionen.beenden ? '<button id="beenden">Spiel beenden</button>' : ''}
      ${optionen.zumStart ? '<button id="zum-start">Zum Start</button>' : ''}
    </div>
    ${berichtHtml(spiel, kader)}
  `;
  wurzel.querySelector('#html-speichern')?.addEventListener('click', () => {
    herunterladen(dateiname(spiel, 'html'), berichtDatei(spiel, kader));
  });
  wurzel.querySelector('#jsonl-speichern')?.addEventListener('click', () => {
    herunterladen(dateiname(spiel, 'jsonl'), alsJsonl(spiel, kader));
  });
  wurzel.querySelector('#zurueck')?.addEventListener('click', () => optionen.zurueck?.());
  wurzel.querySelector<HTMLButtonElement>('#beenden')?.addEventListener('click', async (ev) => {
    const knopf = ev.currentTarget as HTMLButtonElement;
    if (!window.confirm('Spiel beenden? Die Erfassung ist danach abgeschlossen.')) return;
    knopf.disabled = true;
    await optionen.beenden?.();
  });
  wurzel.querySelector('#zum-start')?.addEventListener('click', () => optionen.zumStart?.());
  window.scrollTo(0, 0);
}
