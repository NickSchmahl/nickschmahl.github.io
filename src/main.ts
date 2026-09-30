import './design/tokens.css';
import './stil.css';
import { SCHRIFTEN_CSS } from './design/schriften';
import { alsDatum, htmlEscapen } from './bericht/html';
import { kopfleiste } from './ui/kopf';
import { themaEinrichten } from './ui/thema';
import type { Spieler } from './domain/ereignis';
import { zeigeKader } from './ui/kader';
import { zeigeSpielstart } from './ui/spielstart';
import { starteErfassung } from './ui/tastatur';
import { kaderLaden, laufendesSpiel, spielBeenden } from './persistenz/speicher';

// Die Schriften hängen als eigenes Stylesheet im Kopf; dieselben Regeln bettet der Bericht ein.
const schriften = document.createElement('style');
schriften.id = 'schriften';
schriften.textContent = SCHRIFTEN_CSS;
document.head.appendChild(schriften);
themaEinrichten();

const wurzel = document.querySelector<HTMLDivElement>('#app');
if (!wurzel) throw new Error('#app fehlt in index.html');

function vonVorn(): void {
  void zeigeKader(wurzel!, (kader) => {
    zeigeSpielstart(wurzel!, kader, (spielId) => {
      void starteErfassung(wurzel!, kader, spielId);
    });
  }, auswerten);
}

/** Import einer JSONL-Datei: rechnet den Bericht, ohne etwas zu speichern. */
async function auswerten(datei: File, ersatzKader: readonly Spieler[]): Promise<void> {
  const { ausJsonl } = await import('./persistenz/export');
  const { zeigeAuswertung } = await import('./ui/auswertung');
  const { spiel, kader } = ausJsonl(await datei.text(), { dateiname: datei.name, kader: ersatzKader });
  zeigeAuswertung(wurzel!, spiel, kader, { zumStart: vonVorn });
}

/** Ein abgestürzter Tab oder ein leerer Akku sollen höchstens die letzte Aktion kosten. */
async function start(): Promise<void> {
  const laufend = await laufendesSpiel();
  if (!laufend) return vonVorn();

  wurzel!.innerHTML = `
    <div class="seite">
      ${kopfleiste('Unterbrochenes Spiel')}
      <main class="inhalt">
        <section class="karte">
          <p>Gegen <b>${htmlEscapen(laufend.gegner)}</b> vom ${alsDatum(laufend.datum)}, ${laufend.ereignisse.length} Ereignisse.</p>
          <div class="knopfzeile">
            <button type="button" class="knopf primaer" id="fortsetzen">Fortsetzen</button>
            <button type="button" class="knopf" id="verwerfen">Neues Spiel</button>
          </div>
        </section>
      </main>
    </div>
  `;  const fortsetzenKnopf = wurzel!.querySelector<HTMLButtonElement>('#fortsetzen');
  const verwerfenKnopf = wurzel!.querySelector<HTMLButtonElement>('#verwerfen');
  fortsetzenKnopf?.addEventListener('click', async () => {
    fortsetzenKnopf.disabled = true;
    if (verwerfenKnopf) verwerfenKnopf.disabled = true;
    void starteErfassung(wurzel!, await kaderLaden(), laufend.id);
  });
  verwerfenKnopf?.addEventListener('click', async () => {
    if (fortsetzenKnopf) fortsetzenKnopf.disabled = true;
    verwerfenKnopf.disabled = true;
    await spielBeenden();
    vonVorn();
  });
}

void start();
