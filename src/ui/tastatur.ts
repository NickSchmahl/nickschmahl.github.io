import type { Ereignis, Spieler } from '../domain/ereignis';
import { reduziere } from '../domain/reduzierer';
import { statistik, teamstatistik } from '../domain/statistik';
import { passendeSpieler } from '../domain/kader';
import {
  LEERER_PUFFER, analysiere, klartext, tasteVerarbeiten, vorschlaege, zeichenLoeschen,
} from '../eingabe/grammatik';
import type { Puffer } from '../eingabe/grammatik';
import { baueEreignis } from '../eingabe/ereignisbau';
import {
  UHR_ANFANG, abschnittWechseln, anhalten, korrigieren, spielzeit, starten, umschalten,
} from '../domain/uhr';
import type { Uhrzustand } from '../domain/uhr';
import { ereignisseErsetzen, spielBeenden, spielLaden } from '../persistenz/speicher';
import { aktualisiereZeit, zeichneErfassung } from './erfassung';
import type { Ansicht } from './erfassung';

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
  const ansicht = (): Ansicht => {
    const t = spielzeit(uhr, jetzt());
    const zustand = reduziere(ereignisse);
    return {
      kader,
      ereignisse,
      zustand,
      werte: statistik(ereignisse, kader, t),
      team: teamstatistik(ereignisse),
      jetztT: t,
      uhrLaeuft: uhr.laeuft,
      abschnitt: uhr.abschnitt,
      puffer,
      // Ob `7W12` die 7 oder die 12 hereinholt, hängt an der Feldbesetzung.
      klartextZeile: klartext(puffer, zustand.aufDemFeld),
      hervorgehoben: hervorhebung(),
      vorschlaege: vorschlaege(puffer),
    };
  };

  const zeichne = (): void => {
    zeichneErfassung(wurzel, ansicht());

    const exportieren = async (endung: 'jsonl' | 'csv' | 'md'): Promise<void> => {
      const { alsJsonl, alsCsv, alsMarkdown, dateiname } = await import('../persistenz/export');
      const { herunterladen } = await import('./kader');
      const aktuell = { ...spiel, ereignisse };
      const werte = statistik(ereignisse, kader, spielzeit(uhr, jetzt()));
      const z = reduziere(ereignisse);
      const inhalt =
        endung === 'jsonl' ? alsJsonl(aktuell, kader)
        : endung === 'csv' ? alsCsv(werte)
        : alsMarkdown(aktuell, werte, z);
      herunterladen(dateiname(aktuell, endung), inhalt);
    };
    wurzel.querySelector('#export-jsonl')?.addEventListener('click', () => void exportieren('jsonl'));
    wurzel.querySelector('#export-csv')?.addEventListener('click', () => void exportieren('csv'));
    wurzel.querySelector('#export-md')?.addEventListener('click', () => void exportieren('md'));
    wurzel.querySelector('#auswertung')?.addEventListener('click', () => void auswertungOeffnen());
  };

  /** Die Auswertung ist eine Ansicht des Logs; solange sie offen ist, ruht die Tastatur. */
  const auswertungOeffnen = async (): Promise<void> => {
    window.removeEventListener('keydown', beiTaste);
    const { zeigeAuswertung } = await import('./auswertung');
    zeigeAuswertung(wurzel, { ...spiel, ereignisse }, kader, {
      zurueck: () => {
        window.addEventListener('keydown', beiTaste);
        zeichne();
      },
      beenden: async () => {
        await spielBeenden();
        // Neu laden räumt Tastatur, Takt und Zustand auf und landet beim Kader.
        window.location.reload();
      },
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

  let schreibkette: Promise<unknown> = Promise.resolve();
  const sichern = async (): Promise<void> => {
    // Ein einzelner fehlgeschlagener Schreibvorgang darf die Kette nicht dauerhaft
    // vergiften: sonst würde jede spätere Sicherung stillschweigend ausbleiben.
    schreibkette = schreibkette.catch(() => {}).then(() => ereignisseErsetzen(spielId, ereignisse));
    await schreibkette;
  };

  const bestaetigen = async (): Promise<void> => {
    const a = analysiere(puffer);
    const t = spielzeit(uhr, jetzt());
    const roh = baueEreignis(a, naechsteSeq(), t, new Date().toISOString());
    if (!roh) return; // unfertig oder unbekannt: die Eingabetaste bleibt wirkungslos
    // Eine Uhrkorrektur trägt als eigenen Zeitstempel den neu gesetzten Wert,
    // nicht den vor der Korrektur gültigen — sonst verwirft ein späteres Neuladen,
    // Rückgängig oder Schließen der Korrektur die Korrektur wieder, weil Zustand.t
    // (und damit die daraus abgeleitete lokale Uhr) auf den alten Wert zurückfällt.
    const e = roh.typ === 'U' && roh.zeit !== undefined ? { ...roh, t: roh.zeit } : roh;
    ereignisse = [...ereignisse, e];

    // Uhrereignisse wirken zusätzlich auf die Uhr selbst.
    if (e.typ === 'U' && e.zeit !== undefined) uhr = korrigieren(uhr, e.zeit, jetzt());
    if (e.typ === 'HZ') uhr = abschnittWechseln(uhr, jetzt());
    if (e.typ === 'AZ') uhr = anhalten(uhr, jetzt());
    if (e.typ === 'UL') uhr = starten(uhr, jetzt());
    if (e.typ === 'US') uhr = anhalten(uhr, jetzt());

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
        if (pufferHatInhalt()) {
          puffer = LEERER_PUFFER;
          zeichne();
          return;
        }
        window.removeEventListener('keydown', beiTaste);
        void import('./korrektur').then(({ zeigeKorrektur }) => {
          zeigeKorrektur(wurzel, ereignisse, async (neu) => {
            ereignisse = neu;
            const zustand = reduziere(ereignisse);
            uhr = {
              ...uhr, laeuft: false, basisT: zustand.t, abschnitt: zustand.abschnitt,
            };
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
  // Die Uhr wird gerechnet, nicht getickt; dieser Takt schreibt nur die
  // zeitabhängigen Stellen fort — alles neu zu zeichnen würde die
  // Scrollposition im Verlauf bei jeder Sekunde zurücksetzen.
  window.setInterval(() => { if (uhr.laeuft) aktualisiereZeit(wurzel, ansicht()); }, 250);
  zeichne();
}
