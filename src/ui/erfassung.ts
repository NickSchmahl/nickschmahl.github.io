import type { Ereignis, Katalogeintrag, Spieler } from '../domain/ereignis';
import type { Zustand } from '../domain/reduzierer';
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

export function zeichneErfassung(wurzel: HTMLElement, a: Ansicht): void {
  const werteVon = new Map(a.werte.map((w) => [w.nummer, w]));
  const strafeVon = new Map(a.zustand.strafen.map((s) => [s.spieler, s.endeT]));

  const kachel = (s: Spieler): string => {
    const w = werteVon.get(s.nummer);
    const restsekunden = strafeVon.has(s.nummer) ? Math.max(0, (strafeVon.get(s.nummer) ?? 0) - a.jetztT) : undefined;
    const klassen = [
      'kachel',
      a.hervorgehoben.includes(s.nummer) ? 'hervor' : '',
      restsekunden !== undefined ? 'bestraft' : '',
    ].filter(Boolean).join(' ');
    const zahlen = w
      ? `${w.tore}/${w.wuerfe} · ${alsUhrzeit(w.einsatzzeit)} · ${w.plusMinus > 0 ? '+' : ''}${w.plusMinus}`
      : '';
    return `<div class="${klassen}">
      <div class="nr">${s.nummer}${restsekunden !== undefined ? ` <small>${alsUhrzeit(restsekunden)}</small>` : ''}</div>
      <div>${s.name}</div>
      <div class="zahlen">${zahlen}</div>
    </div>`;
  };

  const aufDemFeld = a.kader.filter((s) => a.zustand.aufDemFeld.includes(s.nummer));
  const bank = a.kader.filter((s) => !a.zustand.aufDemFeld.includes(s.nummer));

  const hinweisZu = new Map(a.zustand.hinweise.map((h) => [h.seq, h.text]));
  const feed = [...a.ereignisse].reverse().slice(0, 12).map((e) => {
    const eintrag = findeEintrag(e.typ);
    const wer = e.spieler === undefined ? '' : ` Nr. ${e.spieler}`;
    const warnung = hinweisZu.get(e.seq);
    return `<li>${alsUhrzeit(e.t)}${wer} — ${eintrag?.bezeichnung ?? e.typ}` +
      `${warnung ? ` <span class="warnung">⚠ ${warnung}</span>` : ''}</li>`;
  }).join('');

  const treffer = a.vorschlaege
    .map((e) => `<span><span class="code">${e.code}</span> ${e.bezeichnung}</span>`)
    .join('');

  const unbekannt = a.klartextZeile.endsWith('— unbekannt');

  wurzel.innerHTML = `
    <div class="erfassung">
      <div class="kopf">
        <div class="uhr ${a.uhrLaeuft ? '' : 'steht'}">${alsUhrzeit(a.jetztT)}</div>
        <div class="stand">${a.zustand.toreEigen}:${a.zustand.toreGegner}</div>
        <div>${a.abschnitt}. Abschnitt${a.uhrLaeuft ? '' : ' · Uhr steht'}</div>
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
    </div>
  `;
}
