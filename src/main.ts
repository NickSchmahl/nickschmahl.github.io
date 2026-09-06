import { zeigeKader } from './ui/kader';
import { zeigeSpielstart } from './ui/spielstart';
import { starteErfassung } from './ui/tastatur';
import { kaderLaden, laufendesSpiel, spielBeenden } from './persistenz/speicher';

const wurzel = document.querySelector<HTMLDivElement>('#app');
if (!wurzel) throw new Error('#app fehlt in index.html');

function vonVorn(): void {
  void zeigeKader(wurzel!, (kader) => {
    zeigeSpielstart(wurzel!, kader, (spielId) => {
      void starteErfassung(wurzel!, kader, spielId);
    });
  });
}

/** Ein abgestürzter Tab oder ein leerer Akku sollen höchstens die letzte Aktion kosten. */
async function start(): Promise<void> {
  const laufend = await laufendesSpiel();
  if (!laufend) return vonVorn();

  wurzel!.innerHTML = `
    <h1>Unterbrochenes Spiel</h1>
    <p>Gegen ${laufend.gegner} vom ${laufend.datum}, ${laufend.ereignisse.length} Ereignisse.</p>
    <p><button id="fortsetzen">Fortsetzen</button> <button id="verwerfen">Neues Spiel</button></p>
  `;
  wurzel!.querySelector('#fortsetzen')?.addEventListener('click', async () => {
    void starteErfassung(wurzel!, await kaderLaden(), laufend.id);
  });
  wurzel!.querySelector('#verwerfen')?.addEventListener('click', async () => {
    await spielBeenden();
    vonVorn();
  });
}

void start();
