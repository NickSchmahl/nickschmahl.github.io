import type { Spieler } from '../domain/ereignis';
import { pruefeKader } from '../domain/kader';
import type { Rohzeile } from '../domain/kader';
import { kaderLaden, kaderSpeichern } from '../persistenz/speicher';

/**
 * Entschärft einen Text für die Einbettung in `innerHTML`-Template-Strings, damit
 * Namen oder Fehlermeldungen mit `"`, `<`, `>` etc. nicht aus einem Attribut
 * ausbrechen oder Markup einschleusen können (z. B. über getippte Namen oder
 * einen JSON-Import via `#einlesen`).
 */
export function htmlEscapen(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Zeigt die Kadermaske. Ruft `weiter` mit dem geprüften Kader auf, sobald gespeichert wurde. */
export async function zeigeKader(wurzel: HTMLElement, weiter: (kader: Spieler[]) => void): Promise<void> {
  let zeilen: Rohzeile[] = (await kaderLaden()).map((s) => ({
    nummer: String(s.nummer),
    name: s.name,
    torwart: s.torwart,
  }));
  if (zeilen.length === 0) zeilen = [{ nummer: '', name: '', torwart: false }];

  function zeichne(fehler: string[] = []): void {
    wurzel.innerHTML = `
      <h1>Kader</h1>
      <table>
        <thead><tr><th>Nr.</th><th>Name</th><th>Torwart</th><th></th></tr></thead>
        <tbody>
          ${zeilen
            .map(
              (z, i) => `
            <tr>
              <td><input data-feld="nummer" data-i="${i}" size="4" value="${htmlEscapen(z.nummer)}" inputmode="numeric" /></td>
              <td><input data-feld="name" data-i="${i}" value="${htmlEscapen(z.name)}" /></td>
              <td><input data-feld="torwart" data-i="${i}" type="checkbox" ${z.torwart ? 'checked' : ''} /></td>
              <td><button data-loeschen="${i}">Entfernen</button></td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
      <p>
        <button id="zeile-dazu">Spieler hinzufügen</button>
        <button id="speichern">Kader speichern und weiter</button>
        <button id="ausgeben">Als JSON sichern</button>
        <input id="einlesen" type="file" accept="application/json" />
      </p>
      ${fehler.length ? `<ul class="fehler">${fehler.map((f) => `<li>${htmlEscapen(f)}</li>`).join('')}</ul>` : ''}
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
