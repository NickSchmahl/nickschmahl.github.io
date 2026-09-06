import { zeigeKader } from './ui/kader';
import { zeigeSpielstart } from './ui/spielstart';

const wurzel = document.querySelector<HTMLDivElement>('#app');
if (!wurzel) throw new Error('#app fehlt in index.html');

void zeigeKader(wurzel, (kader) => {
  zeigeSpielstart(wurzel, kader, async (spielId) => {
    const { spielLaden } = await import('./persistenz/speicher');
    const { reduziere } = await import('./domain/reduzierer');
    const { statistik } = await import('./domain/statistik');
    const { zeichneErfassung } = await import('./ui/erfassung');
    const { LEERER_PUFFER } = await import('./eingabe/grammatik');

    const spiel = await spielLaden(spielId);
    if (!spiel) return;
    const zustand = reduziere(spiel.ereignisse);
    zeichneErfassung(wurzel, {
      kader,
      ereignisse: spiel.ereignisse,
      zustand,
      werte: statistik(spiel.ereignisse, kader, 0),
      jetztT: 0,
      uhrLaeuft: false,
      abschnitt: 1,
      puffer: LEERER_PUFFER,
      klartextZeile: '',
      hervorgehoben: [],
      vorschlaege: [],
    });
  });
});
