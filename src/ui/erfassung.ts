import type { Ereignis, Katalogeintrag, Spieler } from '../domain/ereignis';
import type { Strafe, Zustand } from '../domain/reduzierer';
import type { SpielerStatistik } from '../domain/statistik';
import type { Puffer } from '../eingabe/grammatik';
import { alsUhrzeit } from '../eingabe/grammatik';
import { findeEintrag } from '../domain/katalog';

export interface Ansicht {
  kader: readonly Spieler[];
  ereignisse: readonly Ereignis[];
  zustand: Zustand;
  werte: readonly SpielerStatistik[];
  jetztT: number;
  uhrLaeuft: boolean;
  abschnitt: number;
  puffer: Puffer;
  klartextZeile: string;
  /** Trikotnummern, die zur bisherigen Ziffernfolge passen. */
  hervorgehoben: readonly number[];
  vorschlaege: readonly Katalogeintrag[];
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

/** Die Zeile im Kopf: wer gerade aufs Feld zurückdarf. Leer, wenn niemand. */
export function freimeldung(anzeigen: readonly Strafanzeige[]): string {
  const frei = anzeigen.filter((a) => a.frei).map((a) => `Nr. ${a.nummer}`);
  if (frei.length === 0) return '';
  if (frei.length === 1) return `${frei[0]} darf rein`;
  return `${frei.slice(0, -1).join(', ')} und ${frei.at(-1)} dürfen rein`;
}

function kachelKlassen(a: Ansicht, nummer: number, anzeige: Strafanzeige | undefined): string {
  return [
    'kachel',
    a.hervorgehoben.includes(nummer) ? 'hervor' : '',
    anzeige && !anzeige.frei ? 'bestraft' : '',
    anzeige?.frei ? 'frei' : '',
  ].filter(Boolean).join(' ');
}

function strafText(anzeige: Strafanzeige | undefined): string {
  if (!anzeige) return '';
  return anzeige.frei ? 'frei' : alsUhrzeit(anzeige.rest);
}

function zahlenText(w: SpielerStatistik | undefined): string {
  if (!w) return '';
  return `${w.tore}/${w.wuerfe} · ${alsUhrzeit(w.einsatzzeit)} · ${w.plusMinus > 0 ? '+' : ''}${w.plusMinus}`;
}

/** Beschreibt einen Wechsel im Verlauf, ohne eine Richtung zu behaupten. */
function ereignisText(e: Ereignis): string {
  const eintrag = findeEintrag(e.typ);
  const bezeichnung = eintrag?.bezeichnung ?? e.typ;
  if (e.spieler !== undefined && e.ein !== undefined) {
    return ` Nr. ${e.spieler} ⇄ Nr. ${e.ein} — ${bezeichnung}`;
  }
  return `${e.spieler === undefined ? '' : ` Nr. ${e.spieler}`} — ${bezeichnung}`;
}

export function zeichneErfassung(wurzel: HTMLElement, a: Ansicht): void {
  const werteVon = new Map(a.werte.map((w) => [w.nummer, w]));
  const anzeigen = strafanzeigen(a.zustand.strafen, a.jetztT);
  const anzeigeVon = new Map(anzeigen.map((s) => [s.nummer, s]));

  const kachel = (s: Spieler): string => {
    const anzeige = anzeigeVon.get(s.nummer);
    return `<div class="${kachelKlassen(a, s.nummer, anzeige)}" data-nr="${s.nummer}">
      <div class="nr">${s.nummer} <small class="strafe">${strafText(anzeige)}</small></div>
      <div>${s.name}</div>
      <div class="zahlen">${zahlenText(werteVon.get(s.nummer))}</div>
    </div>`;
  };

  const aufDemFeld = a.kader.filter((s) => a.zustand.aufDemFeld.includes(s.nummer));
  const bank = a.kader.filter((s) => !a.zustand.aufDemFeld.includes(s.nummer));

  const hinweisZu = new Map(a.zustand.hinweise.map((h) => [h.seq, h.text]));
  const feed = [...a.ereignisse].reverse().slice(0, 12).map((e) => {
    const warnung = hinweisZu.get(e.seq);
    return `<li>${alsUhrzeit(e.t)}${ereignisText(e)}` +
      `${warnung ? ` <span class="warnung">⚠ ${warnung}</span>` : ''}</li>`;
  }).join('');

  const treffer = a.vorschlaege
    .map((e) => `<span><span class="code">${e.code}</span> ${e.bezeichnung}</span>`)
    .join('');

  const unbekannt = a.klartextZeile.endsWith('— unbekannt');
  const meldung = freimeldung(anzeigen);

  wurzel.innerHTML = `
    <div class="erfassung">
      <div class="kopf">
        <div class="uhr ${a.uhrLaeuft ? '' : 'steht'}" id="uhrzeit">${alsUhrzeit(a.jetztT)}</div>
        <div class="stand">${a.zustand.toreEigen}:${a.zustand.toreGegner}</div>
        <div>${a.abschnitt}. Abschnitt${a.uhrLaeuft ? '' : ' · Uhr steht'}</div>
        <div class="freimeldung" id="freimeldung">${meldung ? `● ${meldung}` : ''}</div>
      </div>

      <div>
        <div class="plaetze">${aufDemFeld.map(kachel).join('')}</div>
        <h3>Bank</h3>
        <div class="plaetze bank">${bank.map(kachel).join('')}</div>
      </div>

      <div class="eingabe">
        <div class="puffer ${unbekannt ? 'unbekannt' : ''}">${a.klartextZeile || '&nbsp;'}</div>
        <div class="treffer">${treffer}</div>
      </div>

      <ul class="feed">${feed}</ul>

      ${a.zustand.hinweise.length === 0 ? '' : `
        <details class="pruefliste">
          <summary>${a.zustand.hinweise.length} Punkte zum Prüfen</summary>
          <ul>${a.zustand.hinweise.map((h) => `<li class="warnung">${h.text}</li>`).join('')}</ul>
        </details>`}

      <p>
        <button id="export-jsonl">Ereignisse (JSONL)</button>
        <button id="export-csv">Statistik (CSV)</button>
        <button id="export-md">Zusammenfassung (Markdown)</button>
      </p>
    </div>
  `;
}

/**
 * Der Sekundentakt schreibt nur die Stellen fort, die von der Spielzeit
 * abhängen. Würde er wie eine Eingabe alles neu zeichnen, verlöre der Verlauf
 * bei jedem Tick seine Scrollposition und die Prüfliste ihren aufgeklappten
 * Zustand.
 */
export function aktualisiereZeit(wurzel: HTMLElement, a: Ansicht): void {
  const uhr = wurzel.querySelector('#uhrzeit');
  if (!uhr) return; // noch nichts gezeichnet
  uhr.textContent = alsUhrzeit(a.jetztT);
  uhr.classList.toggle('steht', !a.uhrLaeuft);

  const meldung = freimeldung(strafanzeigen(a.zustand.strafen, a.jetztT));
  const zeile = wurzel.querySelector('#freimeldung');
  if (zeile) zeile.textContent = meldung ? `● ${meldung}` : '';

  const anzeigeVon = new Map(
    strafanzeigen(a.zustand.strafen, a.jetztT).map((s) => [s.nummer, s]),
  );
  const werteVon = new Map(a.werte.map((w) => [w.nummer, w]));

  for (const kachel of wurzel.querySelectorAll<HTMLElement>('.kachel[data-nr]')) {
    const nummer = Number(kachel.dataset.nr);
    const anzeige = anzeigeVon.get(nummer);
    kachel.className = kachelKlassen(a, nummer, anzeige);
    const strafe = kachel.querySelector('.strafe');
    if (strafe) strafe.textContent = strafText(anzeige);
    const zahlen = kachel.querySelector('.zahlen');
    if (zahlen) zahlen.textContent = zahlenText(werteVon.get(nummer));
  }
}
