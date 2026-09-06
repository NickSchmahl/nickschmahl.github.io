import type { Spieler } from '../domain/ereignis';
import { startEreignisse } from '../domain/kader';
import { spielAnlegen, ereignisAnhaengen } from '../persistenz/speicher';
import { htmlEscapen } from './kader';

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
      <h1>Spiel starten</h1>
      <p>
        <label>Gegner <input id="gegner" placeholder="TSV Beispiel" value="${htmlEscapen(gegner)}" /></label>
        <label>Datum <input id="datum" type="date" value="${htmlEscapen(datum)}" /></label>
      </p>
      <h2>Startaufstellung <small>(${gewaehlt.size} von 7)</small></h2>
      <ul style="list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:.5rem">
        ${kader
          .map(
            (s) => `<li><button data-nummer="${s.nummer}" style="${
              gewaehlt.has(s.nummer) ? 'outline:2px solid var(--hervor)' : ''
            }">${s.nummer} ${s.name}${s.torwart ? ' (TW)' : ''}</button></li>`,
          )
          .join('')}
      </ul>
      <p><button id="los">Erfassung beginnen</button></p>
      ${meldung ? `<p class="fehler">${meldung}</p>` : ''}
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
