import type { Spieler } from '../domain/ereignis';
import { pruefeKader } from '../domain/kader';
import type { Rohzeile } from '../domain/kader';
import { kaderLaden, kaderSpeichern } from '../persistenz/speicher';
import { htmlEscapen } from '../bericht/html';
import { kopfleiste } from './kopf';

export { htmlEscapen };

/** Zeigt die Kadermaske. Ruft `weiter` mit dem geprüften Kader auf, sobald gespeichert wurde. */
export async function zeigeKader(
  wurzel: HTMLElement,
  weiter: (kader: Spieler[]) => void,
  auswerten?: (datei: File, ersatzKader: readonly Spieler[]) => Promise<void>,
): Promise<void> {
  let zeilen: Rohzeile[] = (await kaderLaden()).map((s) => ({
    nummer: String(s.nummer),
    name: s.name,
    torwart: s.torwart,
  }));
  if (zeilen.length === 0) zeilen = [{ nummer: '', name: '', torwart: false }];

  function zeichne(fehler: string[] = []): void {
    wurzel.innerHTML = `
      <div class="seite">
        ${kopfleiste('Kader')}
        <main class="inhalt">
          <section class="karte">
            <h2 class="abschnitt-titel">Spielerinnen</h2>
            <table class="tabelle">
              <thead><tr><th>Nr.</th><th>Name</th><th>Torhüterin</th><th></th></tr></thead>
              <tbody>
                ${zeilen
                  .map(
                    (z, i) => `
                <tr>
                  <td><input class="feld" data-feld="nummer" data-i="${i}" size="4" value="${htmlEscapen(z.nummer)}" inputmode="numeric" /></td>
                  <td><input class="feld" data-feld="name" data-i="${i}" value="${htmlEscapen(z.name)}" /></td>
                  <td><input data-feld="torwart" data-i="${i}" type="checkbox" ${z.torwart ? 'checked' : ''} /></td>
                  <td><button type="button" class="knopf gefahr klein" data-loeschen="${i}">Entfernen</button></td>
                </tr>`,
                  )
                  .join('')}
              </tbody>
            </table>
            <div class="knopfzeile">
              <button type="button" class="knopf" id="zeile-dazu">Spielerin hinzufügen</button>
              <button type="button" class="knopf primaer" id="speichern">Kader speichern und weiter</button>
            </div>
          </section>
          ${fehler.length ? `<ul class="fehler">${fehler.map((f) => `<li>${htmlEscapen(f)}</li>`).join('')}</ul>` : ''}
          <section class="karte">
            <h2 class="abschnitt-titel">Dateien</h2>
            <div class="knopfzeile">
              <button type="button" class="knopf" id="ausgeben">Kader als JSON sichern</button>
              <label class="knopf datei">Kader aus JSON laden<input id="einlesen" type="file" accept="application/json" /></label>
              ${auswerten ? '<label class="knopf datei">Spiel aus Datei auswerten<input id="spiel-einlesen" type="file" accept=".jsonl" /></label>' : ''}
            </div>
          </section>
        </main>
      </div>
    `;
    wurzel.querySelectorAll<HTMLInputElement>('input[data-feld]').forEach((feld) => {
      feld.addEventListener('input', () => {
        const i = Number(feld.dataset.i);
        const zeile = zeilen[i];
        if (!zeile) return;
        if (feld.dataset.feld === 'torwart') zeile.torwart = feld.checked;
        else if (feld.dataset.feld === 'nummer') zeile.nummer = feld.value;
        else zeile.name = feld.value;
      });
    });

    wurzel.querySelectorAll<HTMLButtonElement>('button[data-loeschen]').forEach((knopf) => {
      knopf.addEventListener('click', () => {
        zeilen.splice(Number(knopf.dataset.loeschen), 1);
        zeichne();
      });
    });

    wurzel.querySelector('#zeile-dazu')?.addEventListener('click', () => {
      zeilen.push({ nummer: '', name: '', torwart: false });
      zeichne();
    });

    wurzel.querySelector('#speichern')?.addEventListener('click', async () => {
      const ergebnis = pruefeKader(zeilen);
      if (!ergebnis.ok) {
        zeichne(ergebnis.fehler);
        return;
      }
      await kaderSpeichern(ergebnis.kader);
      weiter(ergebnis.kader);
    });

    wurzel.querySelector('#ausgeben')?.addEventListener('click', () => {
      const ergebnis = pruefeKader(zeilen);
      if (!ergebnis.ok) {
        zeichne(ergebnis.fehler);
        return;
      }
      herunterladen('kader.json', JSON.stringify(ergebnis.kader, null, 2));
    });

    wurzel.querySelector<HTMLInputElement>('#einlesen')?.addEventListener('change', async (ereignis) => {
      const datei = (ereignis.target as HTMLInputElement).files?.[0];
      if (!datei) return;
      const gelesen = JSON.parse(await datei.text()) as Spieler[];
      zeilen = gelesen.map((s) => ({ nummer: String(s.nummer), name: s.name, torwart: s.torwart }));
      zeichne();
    });

    wurzel.querySelector<HTMLInputElement>('#spiel-einlesen')?.addEventListener('change', async (ereignis) => {
      const datei = (ereignis.target as HTMLInputElement).files?.[0];
      if (!datei || !auswerten) return;
      // Für alte Dateien ohne Kopfzeile löst der angezeigte Kader die Nummern auf.
      const geprueft = pruefeKader(zeilen);
      const ersatz = geprueft.ok ? geprueft.kader : await kaderLaden();
      try {
        await auswerten(datei, ersatz);
      } catch (fehler) {
        zeichne([`Datei konnte nicht gelesen werden: ${fehler instanceof Error ? fehler.message : String(fehler)}`]);
      }
    });
  }

  zeichne();
}

export function herunterladen(name: string, inhalt: string): void {
  const url = URL.createObjectURL(new Blob([inhalt], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
