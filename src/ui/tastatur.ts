import type { Ereignis, Spieler } from '../domain/ereignis';
import { reduziere } from '../domain/reduzierer';
import { statistik } from '../domain/statistik';
import { passendeSpieler } from '../domain/kader';
import {
  LEERER_PUFFER, analysiere, klartext, tasteVerarbeiten, vorschlaege, zeichenLoeschen,
} from '../eingabe/grammatik';
import type { Puffer } from '../eingabe/grammatik';
import { baueEreignis } from '../eingabe/ereignisbau';
import {
  UHR_ANFANG, abschnittWechseln, anhalten, korrigieren, spielzeit, umschalten,
} from '../domain/uhr';
import type { Uhrzustand } from '../domain/uhr';
import { ereignisseErsetzen, spielLaden } from '../persistenz/speicher';
import { zeichneErfassung } from './erfassung';

export async function starteErfassung(
  wurzel: HTMLElement,
  kader: readonly Spieler[],
  spielId: string,
): Promise<void> {
  const spiel = await spielLaden(spielId);
  if (!spiel) throw new Error(`Spiel ${spielId} ist nicht gespeichert`);

  let ereignisse: Ereignis[] = [...spiel.ereignisse];
  let puffer: Puffer = LEERER_PUFFER;
  const anfangszustand = reduziere(ereignisse);
  let uhr: Uhrzustand = {
    ...UHR_ANFANG, laeuft: false, basisT: anfangszustand.t, abschnitt: anfangszustand.abschnitt,
  };

  const jetzt = () => Date.now();
  const zeichne = (): void => {
    const t = spielzeit(uhr, jetzt());
    const zustand = reduziere(ereignisse);
    zeichneErfassung(wurzel, {
      kader,
      ereignisse,
      zustand,
      werte: statistik(ereignisse, kader, t),
      jetztT: t,
      uhrLaeuft: uhr.laeuft,
      abschnitt: uhr.abschnitt,
      puffer,
      klartextZeile: klartext(puffer),
      hervorgehoben: hervorhebung(),
      vorschlaege: vorschlaege(puffer),
    });
  };

  /**
   * Solange nur Ziffern getippt sind, leuchten alle Spieler, deren Nummer so
   * beginnt — bei „7" also Nr. 7 und Nr. 77. Steht der Code, bleibt genau einer.
   */
  const hervorhebung = (): number[] => {
    const a = analysiere(puffer);
    if (a.art === 'bereit' && a.spieler !== undefined) return [a.spieler];
    return passendeSpieler(kader, puffer.ziffern);
  };

  const sichern = async (): Promise<void> => {
    await ereignisseErsetzen(spielId, ereignisse);
  };

  const bestaetigen = async (): Promise<void> => {
    const a = analysiere(puffer);
    const t = spielzeit(uhr, jetzt());
    const e = baueEreignis(a, naechsteSeq(), t, new Date().toISOString());
    if (!e) return; // unfertig oder unbekannt: die Eingabetaste bleibt wirkungslos
    ereignisse = [...ereignisse, e];

    // Uhrereignisse wirken zusätzlich auf die Uhr selbst.
    if (e.typ === 'U' && e.zeit !== undefined) uhr = korrigieren(uhr, e.zeit, jetzt());
    if (e.typ === 'HZ') uhr = abschnittWechseln(uhr, jetzt());
    if (e.typ === 'AZ') uhr = anhalten(uhr, jetzt());

    puffer = LEERER_PUFFER;
    await sichern();
    zeichne();
  };

  const naechsteSeq = (): number => (ereignisse.at(-1)?.seq ?? 0) + 1;

  /**
   * Das Starten und Anhalten der Uhr ist ein gewöhnliches Ereignis. Nur dadurch
   * überlebt der Uhrzustand ein Neuladen, und nur dadurch kann der Reduzierer
   * eine Aktion bei stehender Uhr überhaupt bemerken.
   */
  const uhrUmschalten = async (): Promise<void> => {
    const laeuftGleich = !uhr.laeuft;
    uhr = umschalten(uhr, jetzt());
    ereignisse = [...ereignisse, {
      seq: naechsteSeq(),
      t: spielzeit(uhr, jetzt()),
      wall: new Date().toISOString(),
      typ: laeuftGleich ? 'UL' : 'US',
    }];
    await sichern();
    zeichne();
  };

  const pufferHatInhalt = (): boolean =>
    puffer.ziffern !== '' || puffer.code !== '' || puffer.argument !== '';

  const zurueck = async (): Promise<void> => {
    ereignisse = ereignisse.slice(0, -1);
    const zustand = reduziere(ereignisse);
    uhr = {
      ...uhr, laeuft: false, basisT: zustand.t, abschnitt: zustand.abschnitt,
    };
    await sichern();
    zeichne();
  };

  const beiTaste = (ereignis: KeyboardEvent): void => {
    if (ereignis.ctrlKey && ereignis.key.toLowerCase() === 'z') {
      ereignis.preventDefault();
      void zurueck();
      return;
    }
    if (ereignis.ctrlKey || ereignis.altKey || ereignis.metaKey) return;

    switch (ereignis.key) {
      case ' ':
        ereignis.preventDefault();
        void uhrUmschalten();
        return;
      case 'Enter':
        ereignis.preventDefault();
        void bestaetigen();
        return;
      case 'Backspace':
        ereignis.preventDefault();
        puffer = zeichenLoeschen(puffer);
        zeichne();
        return;
      case 'Escape':
        ereignis.preventDefault();
        if (puffer !== LEERER_PUFFER) {
          puffer = LEERER_PUFFER;
          zeichne();
          return;
        }
        window.removeEventListener('keydown', beiTaste);
        void import('./korrektur').then(({ zeigeKorrektur }) => {
          zeigeKorrektur(wurzel, ereignisse, async (neu) => {
            ereignisse = neu;
            await sichern();
            window.addEventListener('keydown', beiTaste);
            zeichne();
          });
        });
        return;
      default:
        if (ereignis.key.length !== 1) return;
        puffer = tasteVerarbeiten(puffer, ereignis.key);
        zeichne();
    }
  };

  window.addEventListener('keydown', beiTaste);
  // Die Uhr wird gerechnet, nicht getickt; dieser Takt zeichnet nur neu.
  window.setInterval(() => { if (uhr.laeuft) zeichne(); }, 250);
  zeichne();
}
