import type { Ereignis, Spieler } from '../domain/ereignis';
import { reduziere } from '../domain/reduzierer';
import { statistik, teamstatistik } from '../domain/statistik';
import { passendeSpieler } from '../domain/kader';
import { ereignisEntfernen, spielerAendern } from '../domain/korrektur';
import {
  LEERER_PUFFER, analysiere, klartext, positionGefragt, tasteVerarbeiten, zeichenLoeschen,
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
import {
  auffaelligeEintraege, auswahlNachLoeschen, kurzbeschreibung, naechsterHinweis, reihenfolge, verlaufTaste,
  verlaufszeilen,
} from './verlauf';
import type { Auswahl } from './verlauf';
import { istRueckgaengigTaste, korrekturAnwenden, merken, zuruecknehmen } from './rueckgaengig';
import type { Stand } from './rueckgaengig';

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
  /** Die im Verlauf gewählte Zeile. Solange sie steht, gehen Ziffern in ihre neue Nummer. */
  let auswahl: Auswahl | undefined;
  /** Rückmeldung in der Eingabezeile; die nächste Taste oder der nächste Klick räumt sie ab. */
  let meldung = '';
  /** Log und Uhr vor jeder Änderung, der jüngste Stand zuletzt. Überlebt kein Neuladen. */
  let stapel: Stand[] = [];
  const anfangszustand = reduziere(ereignisse);
  let uhr: Uhrzustand = {
    ...UHR_ANFANG, laeuft: false, basisT: anfangszustand.t, abschnitt: anfangszustand.abschnitt,
  };

  const jetzt = () => Date.now();
  const stand = (): Stand => ({ ereignisse, uhr });
  /** Die Einträge in der Reihenfolge des Verlaufs, Neuestes zuerst. */
  const reihe = (): number[] => reihenfolge(verlaufszeilen(ereignisse, []));

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
      // In der Notiz und beim Bearbeiten gehören die Tasten nicht der Eingabe.
      vorschlaege: notiz || auswahl ? [] : klickVorschlaege(puffer),
      positionGefragt: !notiz && positionGefragt(puffer),
      auswahl,
      meldung,
    };
  };

  const zeichne = (auswahlZeigen = false): void => {
    zeichneErfassung(wurzel, ansicht());
    if (!auswahlZeigen) return;
    // Beim Blättern bleibt die gewählte Zeile samt Bearbeitung im sichtbaren Teil der Liste.
    wurzel.querySelector('.verlauf-zeile.gewaehlt')?.scrollIntoView({ block: 'nearest' });
    wurzel.querySelector('.bearbeiten')?.scrollIntoView({ block: 'nearest' });
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

  /** Ersetzt das Log nach einer Korrektur im Verlauf; die Uhr hält nur an, wenn es sie betrifft. */
  const logKorrigieren = (neu: Ereignis[]): void => {
    stapel = merken(stapel, stand());
    ({ ereignisse, uhr } = korrekturAnwenden(stand(), neu));
  };

  const rueckgaengig = async (): Promise<void> => {
    const r = zuruecknehmen(stapel, stand());
    if (!r) return;
    ({ ereignisse, uhr } = r.stand);
    stapel = r.stapel;
    auswahl = undefined;
    meldung = 'Rückgängig gemacht';
    await sichern();
    zeichne();
  };

  const loeschen = async (seq: number): Promise<void> => {
    const e = ereignisse.find((x) => x.seq === seq);
    if (!e) return;
    const reiheVorher = reihe();
    logKorrigieren(ereignisEntfernen(ereignisse, seq));
    // Auswahl und Meldung sofort, nicht erst nach dem Speichern: Das Löschen
    // vergibt die Nummern neu, ein schnelles zweites Entf träfe sonst einen anderen Eintrag.
    const naechste = auswahlNachLoeschen(reiheVorher, seq, reihe());
    auswahl = naechste === undefined ? undefined : { seq: naechste, nummer: '' };
    meldung = `Gelöscht: ${kurzbeschreibung(e)} · Strg+Z stellt wieder her`;
    zeichne(true);
    await sichern();
  };

  const spielerSetzen = async (seq: number, nummer: number): Promise<void> => {
    const e = ereignisse.find((x) => x.seq === seq);
    const aendern = e !== undefined && e.spieler !== undefined && e.spieler !== nummer;
    if (aendern) logKorrigieren(spielerAendern(ereignisse, seq, nummer));
    auswahl = { seq, nummer: '' };
    zeichne(true);
    if (aendern) await sichern();
  };

  /** Springt zum nächsten Eintrag mit Hinweis, unterhalb der aktuellen Auswahl. */
  const naechsterPruefpunkt = (): void => {
    const auffaellig = auffaelligeEintraege(reduziere(ereignisse).hinweise);
    const seq = naechsterHinweis(reihe(), auffaellig, auswahl?.seq);
    if (seq === undefined) return;
    auswahl = { seq, nummer: '' };
    zeichne(true);
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
    stapel = merken(stapel, stand());
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
    // Gemerkt wird die Uhr vor dem Umschalten, sonst holte Strg+Z den falschen Zustand zurück.
    stapel = merken(stapel, stand());
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

  const notizSpeichern = async (t: number, text: string): Promise<void> => {
    stapel = merken(stapel, stand());
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

  /** Tasten, während eine Zeile im Verlauf gewählt ist. */
  const beiVerlaufstaste = (ereignis: KeyboardEvent, aktuell: Auswahl): void => {
    const schritt = verlaufTaste(aktuell, ereignis.key, reihe(), {
      mitSpielerin: ereignisse.find((e) => e.seq === aktuell.seq)?.spieler !== undefined,
      wiederholt: ereignis.repeat,
    });
    if (schritt.art === 'nichts') return;
    ereignis.preventDefault();
    switch (schritt.art) {
      case 'waehlen':
        auswahl = schritt.auswahl;
        zeichne(true);
        return;
      case 'schliessen':
        auswahl = undefined;
        zeichne();
        return;
      case 'loeschen':
        void loeschen(schritt.seq);
        return;
      case 'spieler':
        void spielerSetzen(schritt.seq, schritt.nummer);
        return;
    }
  };

  const beiTaste = (ereignis: KeyboardEvent): void => {
    if (notiz) {
      beiNotiztaste(ereignis, notiz);
      return;
    }
    if (istRueckgaengigTaste(ereignis)) {
      ereignis.preventDefault();
      void rueckgaengig();
      return;
    }
    if (ereignis.ctrlKey || ereignis.altKey || ereignis.metaKey) return;
    meldung = '';

    // Die Uhr lässt sich immer schalten, auch beim Bearbeiten: das Spiel wartet nicht.
    if (ereignis.key === ' ') {
      ereignis.preventDefault();
      void uhrUmschalten();
      return;
    }
    if (auswahl) {
      beiVerlaufstaste(ereignis, auswahl);
      return;
    }

    switch (ereignis.key) {
      case 'Enter':
        ereignis.preventDefault();
        void bestaetigen();
        return;
      case 'Backspace':
        ereignis.preventDefault();
        puffer = zeichenLoeschen(puffer);
        zeichne();
        return;
      case 'Escape': {
        ereignis.preventDefault();
        if (pufferHatInhalt()) {
          puffer = LEERER_PUFFER;
          zeichne();
          return;
        }
        // Esc bei leerer Eingabe springt in den Verlauf, auf den neuesten Eintrag.
        const neueste = reihe()[0];
        if (neueste === undefined) return;
        auswahl = { seq: neueste, nummer: '' };
        zeichne(true);
        return;
      }
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
    meldung = '';
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
        auswahl = undefined;
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
      case 'zeile': {
        if (notiz) return;
        const seq = Number(ziel.dataset.seq);
        auswahl = auswahl?.seq === seq ? undefined : { seq, nummer: '' };
        zeichne();
        return;
      }
      case 'spieler-setzen':
        if (auswahl) void spielerSetzen(auswahl.seq, Number(ziel.dataset.nr));
        return;
      case 'loeschen':
        // Der zweite Klick eines Doppelklicks träfe den Löschen-Knopf des nachgerückten Eintrags.
        if (auswahl && ereignis.detail <= 1) void loeschen(auswahl.seq);
        return;
      case 'schliessen':
        auswahl = undefined;
        zeichne();
        return;
      case 'pruefen':
        if (!notiz) naechsterPruefpunkt();
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
