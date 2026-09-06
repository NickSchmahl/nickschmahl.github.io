import { zeigeKader } from './ui/kader';
import { zeigeSpielstart } from './ui/spielstart';

const wurzel = document.querySelector<HTMLDivElement>('#app');
if (!wurzel) throw new Error('#app fehlt in index.html');

void zeigeKader(wurzel, (kader) => {
  zeigeSpielstart(wurzel, kader, (spielId) => {
    console.log('Spiel läuft', spielId);
  });
});
