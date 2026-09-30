import type { Ereignis, Spieler } from '../domain/ereignis';
import { reduziere } from '../domain/reduzierer';
import { statistik, teamstatistik } from '../domain/statistik';
import { passendeSpieler } from '../domain/kader';
import {
  LEERER_PUFFER, analysiere, klartext, tasteVerarbeiten, zeichenLoeschen,
} from '../eingabe/grammatik';
import type { Puffer } from '../eingabe/grammatik';
import { klickVorschlaege, nummerWaehlen, vorschlagWaehlen } from '../eingabe/klick';
import { baueEreignis } from '../eingabe/ereignisbau';
import { baueNotiz, notizTaste, notizZeile } from '../eingabe/notiz';
import type { Notizentwurf } from '../eingabe/notiz';
import {
  UHR_ANFANG, abschnittWechseln, anhalten, korrigieren, spielzeit, starten, umschalten,
} from '../domain/uhr';
import type { Uhrzustand } from '../domain/uhr';
import { ereignisseErsetzen, spielBeenden, spielLaden } from '../persistenz/speicher';
import { aktualisiereZeit, zeichneErfassung } from './erfassung';
import type { Ansicht } from './erfassung';

type Endung = 'jsonl' | 'csv' | 'md';

export async function starteErfassung(
  wurzel: HTMLElement,
  kader: readonly Spieler[],
  spielId: string,
): Promise<void> {
  const spiel = await spielLaden(spielId);
  if (!spiel) throw new Error(`Spiel ${spielId} ist nicht gespeichert`);

  let ereignisse: Ereignis[] = [...spiel.ereignisse];
  let puffer: Puffer = LEERER_PUFFER;
  /** Offenes Notizfeld; solange es steht, ist jede Taste Text. */
  let notiz: Notizentwurf | undefined;
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
      klartextZeile: notiz ? notizZeile(notiz) : klartext(puffer, zustand.aufDemFeld),
      hervorgehoben: hervorhebung(),
      // In der Notiz ist jede Taste Text; Vorschläge wären dort irreführend.
      vorschlaege: notiz ? [] : klickVorschlaege(puffer),
    };
  };

  const zeichne = (): void => {
    zeichneErfassung(wurzel, ansicht());
  };

  const exportieren = async (endung: Endung): Promise<void> => {
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

  /** Tastatur und Maus gehören der Erfassung nur, solange sie zu sehen ist. */
  const anhaengen = (): void => {
    window.addEventListener('keydown', beiTaste);
    wurzel.addEventListener('click', beiKlick);
  };
  const abhaengen = (): void => {
    window.removeEventListener('keydown', beiTaste);
    wurzel.removeEventListener('click', beiKlick);
  };

  /** Die Auswertung ist eine Ansicht des Logs; solange sie offen ist, ruhen Tastatur und Maus. */
  const auswertungOeffnen = async (): Promise<void> => {
    abhaengen();
    const { zeigeAuswertung } = await import('./auswertung');
    zeigeAuswertung(wurzel, { ...spiel, ereignisse }, kader, {
      zurueck: () => {
        anhaengen();
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

  const notizSpeichern = async (t: number, text: string): Promise<void> => {
    ereignisse = [...ereignisse, baueNotiz(t, text, naechsteSeq(), new Date().toISOString())];
    await sichern();
    zeichne();
  };

  /** Im Notizfeld ist auch die Leertaste Text — die Uhr läuft einfach weiter. */
  const beiNotiztaste = (ereignis: KeyboardEvent, entwurf: Notizentwurf): void => {
    if (ereignis.ctrlKey || ereignis.metaKey) return;
    ereignis.preventDefault();
    const s = notizTaste(entwurf, ereignis.key);
    notiz = s.art === 'weiter' ? s.entwurf : undefined;
    if (s.art === 'speichern') void notizSpeichern(s.t, s.text);
    else zeichne();
  };

  const beiTaste = (ereignis: KeyboardEvent): void => {
    if (notiz) {
      beiNotiztaste(ereignis, notiz);
      return;
    }
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
        abhaengen();
        void import('./korrektur').then(({ zeigeKorrektur }) => {
          zeigeKorrektur(wurzel, ereignisse, async (neu) => {
            ereignisse = neu;
            const zustand = reduziere(ereignisse);
            uhr = {
              ...uhr, laeuft: false, basisT: zustand.t, abschnitt: zustand.abschnitt,
            };
            await sichern();
            anhaengen();
            zeichne();
          });
        });
        return;
      case '#':
        // Nur bei leerem Puffer, sonst ginge ein halb getippter Code verloren.
        if (pufferHatInhalt()) return;
        ereignis.preventDefault();
        notiz = { t: spielzeit(uhr, jetzt()), text: '' };
        zeichne();
        return;
      default:
        if (ereignis.key.length !== 1) return;
        puffer = tasteVerarbeiten(puffer, ereignis.key);
        zeichne();
    }
  };

  /** Mausbedienung: jedes klickbare Element der Erfassung trägt ein `data-aktion`. */
  const beiKlick = (ereignis: MouseEvent): void => {
    const ziel = (ereignis.target as Element | null)?.closest<HTMLElement>('[data-aktion]');
    if (!ziel) return;
    switch (ziel.dataset.aktion) {
      case 'uhr':
        void uhrUmschalten();
        return;
      case 'auswertung':
        void auswertungOeffnen();
        return;
      case 'export':
        ziel.closest('details')?.removeAttribute('open');
        void exportieren(ziel.dataset.endung as Endung);
        return;
      case 'nummer':
        if (notiz) return;
        puffer = nummerWaehlen(Number(ziel.dataset.nr));
        zeichne();
        return;
      case 'vorschlag':
        if (notiz) return;
        puffer = vorschlagWaehlen(puffer, ziel.dataset.code ?? '');
        // Ist der Eintrag damit vollständig, bucht der Klick sofort; sonst fehlt noch ein Argument.
        if (analysiere(puffer).art === 'bereit') void bestaetigen();
        else zeichne();
        return;
    }
  };

  anhaengen();
  // Die Uhr wird gerechnet, nicht getickt; dieser Takt schreibt nur die
  // zeitabhängigen Stellen fort — alles neu zu zeichnen würde die
  // Scrollposition im Verlauf bei jeder Sekunde zurücksetzen.
  window.setInterval(() => { if (uhr.laeuft) aktualisiereZeit(wurzel, ansicht()); }, 250);
  zeichne();
}
