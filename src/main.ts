import { zeigeKader } from './ui/kader';

const wurzel = document.querySelector<HTMLDivElement>('#app');
if (!wurzel) throw new Error('#app fehlt in index.html');

void zeigeKader(wurzel, (kader) => {
  console.log('Kader steht', kader);
});
