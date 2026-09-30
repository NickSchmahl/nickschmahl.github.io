import type { Spieler } from '../domain/ereignis';
import { startEreignisse } from '../domain/kader';
import { spielAnlegen, ereignisAnhaengen } from '../persistenz/speicher';
import { htmlEscapen } from './kader';
import { kopfleiste } from './kopf';

export function zeigeSpielstart(
  wurzel: HTMLElement,
  kader: readonly Spieler[],
  weiter: (spielId: string) => void,
): void {
  const gewaehlt = new Set<number>();
  let gegner = '';
  let datum = new Date().toISOString().slice(0, 10);

  function zeichne(meldung = ''): void {
    wurzel.innerHTML = `
      <div class="seite">
        ${kopfleiste('Spiel starten')}
        <main class="inhalt">
          <section class="karte">
            <div class="formular-zeile">
              <label class="beschriftet">Gegner <input id="gegner" class="feld" placeholder="TSV Beispiel" value="${htmlEscapen(gegner)}" /></label>
              <label class="beschriftet">Datum <input id="datum" class="feld" type="date" value="${htmlEscapen(datum)}" /></label>
            </div>
          </section>
          <section class="karte">
            <h2 class="abschnitt-titel">Startaufstellung <b>${gewaehlt.size} von 7</b></h2>
            <div class="auswahl-kacheln">
              ${kader
                .map(
                  (s) => `<button type="button" class="kachel${gewaehlt.has(s.nummer) ? ' gewaehlt' : ''}" data-nummer="${s.nummer}" aria-pressed="${gewaehlt.has(s.nummer)}">` +
                    `<span class="nr">${s.nummer}</span><span class="name">${htmlEscapen(s.name)}${s.torwart ? '<em>TW</em>' : ''}</span></button>`,
                )
                .join('')}
            </div>
          </section>
          ${meldung ? `<p class="fehler">${meldung}</p>` : ''}
          <div class="knopfzeile"><button type="button" class="knopf primaer" id="los">Erfassung beginnen</button></div>
        </main>
      </div>
    `;
    wurzel.querySelector<HTMLInputElement>('#gegner')?.addEventListener('input', (ereignis) => {
      gegner = (ereignis.target as HTMLInputElement).value;
    });

    wurzel.querySelector<HTMLInputElement>('#datum')?.addEventListener('input', (ereignis) => {
      datum = (ereignis.target as HTMLInputElement).value;
    });

    wurzel.querySelectorAll<HTMLButtonElement>('button[data-nummer]').forEach((knopf) => {
      knopf.addEventListener('click', () => {
        const nummer = Number(knopf.dataset.nummer);
        if (gewaehlt.has(nummer)) gewaehlt.delete(nummer);
        else gewaehlt.add(nummer);
        zeichne();
      });
    });

    wurzel.querySelector('#los')?.addEventListener('click', async () => {
      const gewaehlterGegner = gegner.trim();
      if (gewaehlterGegner === '') return zeichne('Bitte den Gegner eintragen.');
      if (gewaehlt.size === 0) return zeichne('Bitte mindestens einen Spieler aufstellen.');

      const spiel = await spielAnlegen(gewaehlterGegner, datum);
      for (const e of startEreignisse([...gewaehlt].sort((a, b) => a - b), new Date().toISOString())) {
        await ereignisAnhaengen(spiel.id, e);
      }
      weiter(spiel.id);
    });
  }

  zeichne();
}
