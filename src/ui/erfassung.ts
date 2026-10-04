import type { Ereignis, Katalogeintrag, Spieler } from '../domain/ereignis';
import { PARADEN, findeEintrag } from '../domain/katalog';
import type { Strafe, Zustand } from '../domain/reduzierer';
import type { SpielerStatistik, Teamstatistik } from '../domain/statistik';
import type { Puffer } from '../eingabe/grammatik';
import { POSITIONEN, POSITIONEN_KURZ, alsUhrzeit } from '../eingabe/grammatik';
import { NOTIZ_CODE } from '../eingabe/notiz';
import { htmlEscapen } from '../bericht/html';
import { logoHtml } from '../design/logo';
import { themaKnopfHtml } from './thema';
import { auffaelligeEintraege, verlaufszeilen } from './verlauf';
import type { Auswahl, Verlaufszeile } from './verlauf';

export interface Ansicht {
  kader: readonly Spieler[];
  ereignisse: readonly Ereignis[];
  zustand: Zustand;
  werte: readonly SpielerStatistik[];
  team: Teamstatistik;
  jetztT: number;
  uhrLaeuft: boolean;
  abschnitt: number;
  puffer: Puffer;
  klartextZeile: string;
  /** Trikotnummern, die zur bisherigen Ziffernfolge passen. */
  hervorgehoben: readonly number[];
  vorschlaege: readonly Katalogeintrag[];
  /** Der getippte Code nimmt eine Wurfposition; die Tastenhilfe zeigt dann die Ziffern. */
  positionGefragt: boolean;
  /** Die im Verlauf gewählte Zeile, sonst undefined. */
  auswahl: Auswahl | undefined;
  /** Rückmeldung in der Eingabezeile, z. B. nach dem Löschen. */
  meldung: string;
}

export interface Strafanzeige {
  nummer: number;
  /** Restsekunden der Strafe; 0, sobald sie abgelaufen ist. */
  rest: number;
  /** Die zwei Minuten sind um, der Spieler darf zurück aufs Feld. */
  frei: boolean;
}

/**
 * Eine offene Strafe bleibt im Zustand, bis der Spieler zurückkehrt. Ob sie
 * noch läuft, entscheidet erst die aktuelle Spielzeit — deshalb wird sie hier
 * gerechnet und nicht im Reduzierer.
 */
export function strafanzeigen(strafen: readonly Strafe[], jetztT: number): Strafanzeige[] {
  return strafen.map((s) => {
    const rest = Math.max(0, s.endeT - jetztT);
    return { nummer: s.spieler, rest, frei: rest === 0 };
  });
}

/** Die Zeile unter der Eingabe. Steht ein Wurfcode, ersetzen die Positionsziffern die übliche Hilfe. */
export function tastenhilfe(auswahl: boolean, positionGefragt: boolean): string {
  if (auswahl) {
    return '<span><kbd>↑</kbd><kbd>↓</kbd> wählen</span><span>Zahl <kbd>⏎</kbd> Spielerin setzen</span><span><kbd>⌫</kbd> löschen</span><span><kbd>Esc</kbd> zurück zur Eingabe</span><span><kbd>Leertaste</kbd> Uhr</span>';
  }
  if (positionGefragt) {
    const positionen = Object.entries(POSITIONEN_KURZ).map(([ziffer, kurz]) => `<span><kbd>${ziffer}</kbd> ${kurz}</span>`);
    return `<span>Position:</span>${positionen.join('')}<span><kbd>⏎</kbd> buchen</span>`;
  }
  return '<span><kbd>⏎</kbd> buchen</span><span><kbd>Leertaste</kbd> Uhr</span><span><kbd>#</kbd> Notiz</span><span><kbd>Esc</kbd> Verlauf bearbeiten</span><span><kbd>Strg</kbd>/<kbd>⌘</kbd>+<kbd>Z</kbd> rückgängig</span>';
}

/** Die Pillen im Kopf: laufende Strafen mit Restzeit, abgelaufene als „darf rein". */
export function meldungenHtml(anzeigen: readonly Strafanzeige[]): string {
  return anzeigen
    .map((s) => (s.frei
      ? `<span class="pille gut">Nr. ${s.nummer} darf rein</span>`
      : `<span class="pille schlecht">Nr. ${s.nummer} · ${alsUhrzeit(s.rest)}</span>`))
    .join('');
}

function kachelKlassen(a: Ansicht, s: Spieler, anzeige: Strafanzeige | undefined): string {
  return [
    'kachel',
    s.torwart ? 'torwart' : '',
    a.hervorgehoben.includes(s.nummer) ? 'hervor' : '',
    anzeige && !anzeige.frei ? 'bestraft' : '',
    anzeige?.frei ? 'frei' : '',
  ].filter(Boolean).join(' ');
}

function strafText(anzeige: Strafanzeige | undefined): string {
  if (!anzeige) return '';
  return anzeige.frei ? 'frei' : alsUhrzeit(anzeige.rest);
}

export interface Kennzahl {
  titel: string;
  wert: string;
}

/** Die vier Werte unter der Kachel; die Torhüterin zeigt Paraden und Gegentore statt Würfen. */
export function kennzahlen(w: SpielerStatistik | undefined): Kennzahl[] {
  if (!w) return [];
  const zeit = { titel: 'Zeit', wert: alsUhrzeit(w.einsatzzeit) };
  const plusMinus = { titel: '+/−', wert: `${w.plusMinus > 0 ? '+' : ''}${w.plusMinus}` };
  if (w.torwart) {
    const paraden = PARADEN.reduce((summe, code) => summe + (w.zaehler[code] ?? 0), 0);
    return [
      { titel: 'Paraden', wert: String(paraden) },
      { titel: 'Gegentore', wert: String(w.gegentoreImEinsatz) },
      zeit,
      plusMinus,
    ];
  }
  return [
    { titel: 'Tore', wert: `${w.tore}/${w.wuerfe}` },
    { titel: '7m', wert: w.siebenmeterVersuche > 0 ? `${w.siebenmeterTore}/${w.siebenmeterVersuche}` : '–' },
    zeit,
    plusMinus,
  ];
}

function kennzahlenHtml(w: SpielerStatistik | undefined): string {
  return kennzahlen(w).map((k) => `<span class="kennzahl"><small>${k.titel}</small>${k.wert}</span>`).join('');
}

/** Die Zeile unter dem Spielstand; die Quote fehlt, solange der Gegner nicht geworfen hat. */
export function gegnerZeile(z: Zustand): string {
  if (z.wuerfeGegner === 0) return 'Würfe Gegner 0';
  return `Würfe Gegner ${z.wuerfeGegner} · ${Math.round((z.toreGegner / z.wuerfeGegner) * 100)} %`;
}

export function gegenstossZeile(t: Teamstatistik): string {
  return `Gegenstoß ${t.gegenstossTore}/${t.gegenstossWuerfe} · Gegner ${t.gegnerGegenstossTore}/${t.gegnerGegenstossWuerfe}`;
}

/** Der Text einer Verlaufszeile ohne Zeit und Nummer, die stehen in eigenen Spalten. */
export function verlaufText(e: Ereignis): string {
  if (e.typ === NOTIZ_CODE) return htmlEscapen(e.text ?? '');
  const bezeichnung = findeEintrag(e.typ)?.bezeichnung ?? e.typ;
  // Beim Wechsel ohne Richtung: wer hereinkommt, entscheidet erst die Feldbesetzung.
  if (e.ein !== undefined) return `${bezeichnung} ⇄ Nr. ${e.ein}`;
  if (e.pos !== undefined) return `${bezeichnung} <small>· ${POSITIONEN[e.pos] ?? e.pos}</small>`;
  if (e.zeit !== undefined) return `${bezeichnung} <small>· ${alsUhrzeit(e.zeit)}</small>`;
  return bezeichnung;
}

function zeileHtml(z: Verlaufszeile, auswahl: Auswahl | undefined): string {
  if (z.art === 'abschnitt') return `<li class="verlauf-abschnitt">${z.abschnitt}. Abschnitt</li>`;
  const e = z.ereignis;
  const wirkung = findeEintrag(e.typ)?.wirkung;
  const klassen = [
    'verlauf-zeile',
    wirkung === 'treffer' || wirkung === 'siebenmeter_treffer' ? 'tor' : '',
    wirkung === 'gegentor' ? 'gegentor' : '',
    wirkung === 'notiz' ? 'notiz' : '',
    auswahl?.seq === e.seq ? 'gewaehlt' : '',
  ].filter(Boolean).join(' ');
  const wer = e.spieler !== undefined
    ? `<span class="wer">${e.spieler}</span>`
    : `<span class="wer team">${wirkung === 'notiz' ? '✎' : '·'}</span>`;
  const hinweis = z.hinweis ? `<span class="hinweis">⚠ ${htmlEscapen(z.hinweis)}</span>` : '';
  return `<li class="${klassen}" data-aktion="zeile" data-seq="${e.seq}"><time>${alsUhrzeit(e.t)}</time>${wer}<span class="was">${verlaufText(e)}</span>${hinweis}</li>`;
}

/** Unter der gewählten Zeile: Nummern zum Umsetzen, Löschen, Fertig. */
function bearbeitenHtml(e: Ereignis, auswahl: Auswahl, a: Ansicht): string {
  const mitSpielerin = e.spieler !== undefined;
  const nummern = a.kader.map((s) => {
    const klassen = [
      'nummer',
      s.nummer === e.spieler ? 'aktuell' : '',
      a.zustand.aufDemFeld.includes(s.nummer) ? 'auf-dem-feld' : '',
    ].filter(Boolean).join(' ');
    return `<button type="button" class="${klassen}" data-aktion="spieler-setzen" data-nr="${s.nummer}" title="${htmlEscapen(s.name)}">${s.nummer}</button>`;
  }).join('');
  const getippt = auswahl.nummer === '' ? 'oder Nummer tippen' : `neue Nr. <b>${auswahl.nummer}</b> ⏎`;
  return `<li class="bearbeiten">
      ${mitSpielerin ? `<span class="bearbeiten-titel">Spielerin ändern</span><div class="nummernwahl">${nummern}</div>` : ''}
      <div class="knopfzeile">
        <button type="button" class="knopf gefahr klein" data-aktion="loeschen">Löschen</button>
        <button type="button" class="knopf klein" data-aktion="schliessen">Fertig</button>
        ${mitSpielerin ? `<span class="getippt">${getippt}</span>` : ''}
      </div>
    </li>`;
}

function verlaufHtml(a: Ansicht): string {
  const zeilen = verlaufszeilen(a.ereignisse, a.zustand.hinweise);
  const auffaellig = auffaelligeEintraege(a.zustand.hinweise).size;
  const pruefen = auffaellig === 0
    ? ''
    : `<button type="button" class="pille warnung" data-aktion="pruefen" title="Zum nächsten auffälligen Eintrag">${auffaellig} prüfen</button>`;
  const html = zeilen.map((z) => {
    const zeile = zeileHtml(z, a.auswahl);
    return z.art === 'eintrag' && a.auswahl?.seq === z.ereignis.seq
      ? zeile + bearbeitenHtml(z.ereignis, a.auswahl, a)
      : zeile;
  }).join('');
  return `<aside class="verlauf">
      <div class="verlauf-kopf"><h2>Verlauf</h2><span class="anzahl">${a.ereignisse.length} Einträge</span>${pruefen}</div>
      <ol class="verlauf-liste">${html}</ol>
    </aside>`;
}

export function zeichneErfassung(wurzel: HTMLElement, a: Ansicht): void {
  const werteVon = new Map(a.werte.map((w) => [w.nummer, w]));
  const anzeigen = strafanzeigen(a.zustand.strafen, a.jetztT);
  const anzeigeVon = new Map(anzeigen.map((s) => [s.nummer, s]));

  const kachel = (s: Spieler): string => {
    const anzeige = anzeigeVon.get(s.nummer);
    return `<button type="button" class="${kachelKlassen(a, s, anzeige)}" data-aktion="nummer" data-nr="${s.nummer}">` +
      `<span class="nr">${s.nummer}</span>` +
      `<span class="name"><span>${htmlEscapen(s.name)}</span>${s.torwart ? '<em>TW</em>' : ''}</span>` +
      `<span class="kennzahlen">${kennzahlenHtml(werteVon.get(s.nummer))}</span>` +
      `<span class="strafe">${strafText(anzeige)}</span></button>`;
  };

  const aufDemFeld = a.kader.filter((s) => a.zustand.aufDemFeld.includes(s.nummer));
  const bank = a.kader.filter((s) => !a.zustand.aufDemFeld.includes(s.nummer));
  const freiePlaetze = '<div class="frei-platz">Platz frei</div>'.repeat(Math.max(0, 7 - aufDemFeld.length));
  const treffer = a.vorschlaege
    .map((e) => `<button type="button" class="vorschlag" data-aktion="vorschlag" data-code="${e.code}"><code>${e.code}</code>${e.bezeichnung}</button>`)
    .join('');
  const unbekannt = a.klartextZeile.endsWith('— unbekannt');

  const mitMeldung = a.meldung !== '' && a.klartextZeile === '';
  const hilfe = tastenhilfe(a.auswahl !== undefined, a.positionGefragt);

  // Das Neuzeichnen ersetzt die Liste; ohne das hier spränge der Verlauf bei jeder Taste nach oben.
  const scroll = wurzel.querySelector('.verlauf-liste')?.scrollTop ?? 0;

  wurzel.innerHTML = `
    <div class="erfassung">
      <header class="erfassung-kopf">
        ${logoHtml()}
        <button type="button" class="uhr${a.uhrLaeuft ? '' : ' steht'}" data-aktion="uhr" id="uhrzeit" title="Uhr starten oder anhalten (Leertaste)">
          <span class="zeit">${alsUhrzeit(a.jetztT)}</span><small class="uhr-status">${a.uhrLaeuft ? 'läuft' : 'Uhr steht'}</small>
        </button>
        <div class="stand"><span>${a.zustand.toreEigen}</span><span class="trenner">:</span><span class="gegner-tore">${a.zustand.toreGegner}</span></div>
        <div class="spielinfo">
          <b>${a.abschnitt}. Abschnitt</b>
          <span>${gegnerZeile(a.zustand)}</span>
          <span>${gegenstossZeile(a.team)}</span>
        </div>
        <div class="meldungen" id="meldungen">${meldungenHtml(anzeigen)}</div>
        <nav class="kopf-knoepfe">
          <button type="button" class="knopf" data-aktion="auswertung">Auswertung</button>
          <details class="menue">
            <summary class="knopf">Export</summary>
            <div class="menue-inhalt">
              <button type="button" class="knopf" data-aktion="export" data-endung="jsonl">Ereignisse (JSONL)</button>
              <button type="button" class="knopf" data-aktion="export" data-endung="csv">Statistik (CSV)</button>
              <button type="button" class="knopf" data-aktion="export" data-endung="md">Zusammenfassung (Markdown)</button>
            </div>
          </details>
          ${themaKnopfHtml()}
        </nav>
      </header>

      <main class="spielflaeche">
        <section class="bereich">
          <h2 class="abschnitt-titel">Auf dem Feld <b>${aufDemFeld.length}/7</b></h2>
          <div class="kacheln auf-feld">${aufDemFeld.map(kachel).join('')}${freiePlaetze}</div>
        </section>
        <section class="bereich">
          <h2 class="abschnitt-titel">Bank</h2>
          <div class="kacheln bank">${bank.map(kachel).join('')}</div>
        </section>
      </main>

      <div class="eingabe">
        <div class="zeile${mitMeldung ? ' mit-meldung' : ''}"><span class="prompt">›</span><span class="puffer${unbekannt ? ' unbekannt' : ''}">${htmlEscapen(a.klartextZeile)}</span>${mitMeldung ? `<span class="meldung">${htmlEscapen(a.meldung)}</span>` : ''}</div>
        <div class="treffer">${treffer}</div>
        <div class="tastenhilfe">${hilfe}</div>
      </div>

      ${verlaufHtml(a)}
    </div>
  `;

  const liste = wurzel.querySelector('.verlauf-liste');
  if (liste) liste.scrollTop = scroll;
}

/**
 * Der Sekundentakt schreibt nur die Stellen fort, die von der Spielzeit
 * abhängen. Würde er wie eine Eingabe alles neu zeichnen, verlöre der Verlauf
 * bei jedem Tick seine Scrollposition.
 */
export function aktualisiereZeit(wurzel: HTMLElement, a: Ansicht): void {
  const uhr = wurzel.querySelector<HTMLElement>('#uhrzeit');
  if (!uhr) return; // noch nichts gezeichnet
  const zeit = uhr.querySelector('.zeit');
  if (zeit) zeit.textContent = alsUhrzeit(a.jetztT);
  uhr.classList.toggle('steht', !a.uhrLaeuft);
  const status = uhr.querySelector('.uhr-status');
  if (status) status.textContent = a.uhrLaeuft ? 'läuft' : 'Uhr steht';

  const anzeigen = strafanzeigen(a.zustand.strafen, a.jetztT);
  const meldungen = wurzel.querySelector('#meldungen');
  if (meldungen) meldungen.innerHTML = meldungenHtml(anzeigen);

  const anzeigeVon = new Map(anzeigen.map((s) => [s.nummer, s]));
  const werteVon = new Map(a.werte.map((w) => [w.nummer, w]));
  const spielerVon = new Map(a.kader.map((s) => [s.nummer, s]));
  for (const kachel of wurzel.querySelectorAll<HTMLElement>('.kachel[data-nr]')) {
    const s = spielerVon.get(Number(kachel.dataset.nr));
    if (!s) continue;
    const anzeige = anzeigeVon.get(s.nummer);
    kachel.className = kachelKlassen(a, s, anzeige);
    const strafe = kachel.querySelector('.strafe');
    if (strafe) strafe.textContent = strafText(anzeige);
    const zahlen = kachel.querySelector('.kennzahlen');
    if (zahlen) zahlen.innerHTML = kennzahlenHtml(werteVon.get(s.nummer));
  }
}
