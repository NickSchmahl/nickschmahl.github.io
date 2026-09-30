import type { Ereignis, Spieler } from '../domain/ereignis';
import {
  aufstellungen, gespielteZeit, halbzeitstand, kennzahlenJeAbschnitt, phasen, schlaglichter, siebenmeterBilanz,
  spielerereignisse, spielerverlauf, ueberUnterzahl, verlauf,
} from '../domain/auswertung';
import type { Serie, Teamkennzahlen } from '../domain/auswertung';
import { KATALOG, PARADEN } from '../domain/katalog';
import { reduziere } from '../domain/reduzierer';
import { MINDESTEINSATZ_FUER_NORMIERUNG, leistungsindex, statistik } from '../domain/statistik';
import type { SpielerStatistik } from '../domain/statistik';
import { POSITIONEN, alsUhrzeit } from '../eingabe/grammatik';
import { einsatzleiste, phasenbalken, verlaufskurve } from './diagramme';
import { alsDatum, htmlEscapen, prozent } from './html';
import { BERICHT_CSS, BERICHT_HELL } from './stil';

/** Was der Bericht vom Spiel braucht — `Spiel` aus der Persistenz passt strukturell. */
export interface Spielbericht {
  gegner: string;
  datum: string;
  ereignisse: readonly Ereignis[];
}

/** Codes, deren Zählung bereits in den Kopfwerten der Karte steckt. */
const IN_KOPFWERTEN: readonly string[] = ['T', 'F', 'FB', 'TG', 'FG', 'ST', 'SF', 'I', 'O', 'W', ...PARADEN];

const zahl = (n: number): string => `<td class="zahl">${n}</td>`;
const vorzeichen = (n: number): string => (n > 0 ? `+${n}` : String(n));
const minute = (t: number): string => String(Math.round(t / 60));
/** Spielminute, in der eine Spielzeit liegt: 0–60 s ist die erste. */
const spielminute = (t: number): number => Math.max(1, Math.ceil(t / 60));
const torWort = (n: number): string => (n === 1 ? '1 Tor' : `${n} Tore`);
const dezimal = (x: number): string => (x > 0 ? '+' : '') + x.toFixed(1).replace('.', ',');
const indexText = (w: SpielerStatistik): string => {
  const x = leistungsindex(w);
  return x === null ? '–' : dezimal(x);
};

/** Sätze nur dort, wo das Spiel etwas hergibt: Serien ab drei Toren, torlose Phasen ab fünf Minuten. */
function schlaglichterAbschnitt(ereignisse: readonly Ereignis[]): string {
  const s = schlaglichter(ereignisse);
  if (!s.groessterVorsprung && !s.groessterRueckstand) return '<p class="hinweis">Kein Tor erfasst.</p>';
  const saetze: string[] = [];
  if (s.groessterVorsprung) {
    saetze.push(`Größter Vorsprung: ${torWort(s.groessterVorsprung.differenz)} (${s.groessterVorsprung.stand}, ${spielminute(s.groessterVorsprung.t)}. Minute)`);
  }
  if (s.groessterRueckstand) {
    saetze.push(`Größter Rückstand: ${torWort(s.groessterRueckstand.differenz)} (${s.groessterRueckstand.stand}, ${spielminute(s.groessterRueckstand.t)}. Minute)`);
  }
  saetze.push(`${s.fuehrungswechsel} Führungswechsel, ${s.ausgleiche}-mal ausgeglichen`);
  const serie = (wer: string, x: Serie | undefined): void => {
    if (x && x.tore >= 3) saetze.push(`${wer}: ${x.tore} Tore in Folge (${spielminute(x.von)}.–${spielminute(x.bis)}. Minute)`);
  };
  serie('Längste eigene Serie', s.serieEigen);
  serie('Längste Serie des Gegners', s.serieGegner);
  if (s.torlosePhase && s.torlosePhase.bis - s.torlosePhase.von >= 300) {
    const { von, bis } = s.torlosePhase;
    saetze.push(`Längste Phase ohne eigenes Tor: ${minute(bis - von)} Minuten (${spielminute(von)}.–${spielminute(bis)}. Minute)`);
  }
  for (const az of s.auszeiten) {
    saetze.push(`Auszeit in der ${spielminute(az.t)}. Minute beim ${az.stand} — danach ${az.toreDanach}:${az.gegentoreDanach} in fünf Minuten`);
  }
  return `<ul class="schlaglichter">${saetze.map((x) => `<li>${x}</li>`).join('')}</ul>`;
}

function siebenmeterAbschnitt(ereignisse: readonly Ereignis[], nameVon: (n: number) => string): string {
  const b = siebenmeterBilanz(ereignisse);
  const gegnerVersuche = b.gegner.tore + b.gegner.gehalten;
  if (b.eigen.versuche + gegnerVersuche + b.eigen.herausgeholt.length + b.gegner.verursacht.length === 0) {
    return '<p class="hinweis">Keine Siebenmeter erfasst.</p>';
  }
  const quote = (tore: number, versuche: number): string => prozent(versuche === 0 ? null : tore / versuche);
  const liste = (titel: string, eintraege: { nummer: number; anzahl: number }[]): string =>
    eintraege.length ? `<p class="zaehler">${titel}: ${eintraege.map((x) => `${nameVon(x.nummer)} ${x.anzahl}×`).join(', ')}</p>` : '';
  const werferinnen = b.eigen.werferinnen.length
    ? `<p class="zaehler">Geworfen von: ${b.eigen.werferinnen.map((w) => `${nameVon(w.nummer)} ${w.tore}/${w.versuche}`).join(', ')}</p>`
    : '';
  return `<table>
    <thead><tr><th></th><th class="zahl">Eigen</th><th class="zahl">Gegner</th></tr></thead>
    <tbody>
      <tr><td>Tore/Versuche</td><td class="zahl">${b.eigen.tore}/${b.eigen.versuche}</td><td class="zahl">${b.gegner.tore}/${gegnerVersuche}</td></tr>
      <tr><td>Quote</td><td class="zahl">${quote(b.eigen.tore, b.eigen.versuche)}</td><td class="zahl">${quote(b.gegner.tore, gegnerVersuche)}</td></tr>
    </tbody>
  </table>
  ${werferinnen}
  ${liste('Herausgeholt', b.eigen.herausgeholt)}
  ${liste('Verursacht', b.gegner.verursacht)}
  ${liste('Gehalten von', b.gegner.gehaltenVon)}
  <p class="hinweis">Versuche des Gegners = Tore und gehaltene Siebenmeter; verworfene ohne Parade werden nicht erfasst.</p>`;
}

function ueberUnterzahlAbschnitt(ereignisse: readonly Ereignis[]): string {
  const u = ueberUnterzahl(ereignisse);
  if (u.ueberzahl.situationen + u.unterzahl.situationen === 0) return '<p class="hinweis">Keine Zeitstrafen erfasst.</p>';
  const zeile = (name: string, l: typeof u.ueberzahl): string =>
    `<tr><td>${name}</td><td class="zahl">${alsUhrzeit(l.dauer)}</td>${zahl(l.situationen)}${zahl(l.tore)}${zahl(l.gegentore)}</tr>`;
  return `<table>
    <thead><tr><th></th><th class="zahl">Dauer</th><th class="zahl">Situationen</th><th class="zahl">Tore</th><th class="zahl">Gegentore</th></tr></thead>
    <tbody>${zeile('Überzahl', u.ueberzahl)}${zeile('Unterzahl', u.unterzahl)}</tbody>
  </table>
  <p class="hinweis">Zeitstrafen des Gegners (GZ) mit zwei Minuten angenommen. Sitzen beide Seiten gleich viele ab, zählt das als Gleichzahl.</p>`;
}

function bilanzAbschnitt(werte: readonly SpielerStatistik[], nameVon: (n: number) => string): string {
  const eingesetzt = werte.filter((w) => w.einsatzzeit > 0);
  if (eingesetzt.length === 0) return '<p class="hinweis">Keine Einsatzzeit erfasst.</p>';
  const zeilen = eingesetzt.map((w) => {
    const je60 = w.einsatzzeit >= MINDESTEINSATZ_FUER_NORMIERUNG ? dezimal((w.plusMinus / w.einsatzzeit) * 3600) : '–';
    return `<tr><td>${nameVon(w.nummer)}</td><td class="zahl">${alsUhrzeit(w.einsatzzeit)}</td>` +
      `${zahl(w.plusMinus + w.gegentoreImEinsatz)}${zahl(w.gegentoreImEinsatz)}` +
      `<td class="zahl">${vorzeichen(w.plusMinus)}</td><td class="zahl">${je60}</td><td class="zahl">${indexText(w)}</td></tr>`;
  }).join('');
  return `<table>
    <thead><tr><th></th><th class="zahl">Einsatz</th><th class="zahl">Tore für</th><th class="zahl">Gegentore</th><th class="zahl">+/−</th><th class="zahl">+/− je 60 min</th><th class="zahl">Leistungsindex</th></tr></thead>
    <tbody>${zeilen}</tbody>
  </table>
  <p class="hinweis">Tore für und gegen, während die Spielerin auf dem Feld stand. Je 60 Minuten erst ab fünf Minuten Einsatz. Leistungsindex je 60 Minuten: Tore − Fehlwürfe − technische Fehler − Ballverluste − 7m verursacht + Ballgewinne + 7m herausgeholt, jeweils mit Siebenmetern.</p>`;
}

function kopf(spiel: Spielbericht, endstand: string, hinweise: { t: number; text: string }[]): string {
  const hz = halbzeitstand(spiel.ereignisse);
  const pruefung = hinweise.length === 0
    ? '<details class="pruefung"><summary>Keine Auffälligkeiten in der Erfassung</summary></details>'
    : `<details class="pruefung auffaellig"><summary>${hinweise.length} Punkte zum Prüfen</summary><ul>` +
      hinweise.map((h) => `<li>${alsUhrzeit(h.t)} — ${htmlEscapen(h.text)}</li>`).join('') +
      '</ul></details>';
  return `<header>
    <h1>Spiel gegen ${htmlEscapen(spiel.gegner)}</h1>
    <div class="kopf">
      <span class="endstand">${endstand}</span>
      ${hz ? `<span class="halbzeit">Halbzeit ${hz.eigen}:${hz.gegner}</span>` : ''}
      <span class="datum">${alsDatum(spiel.datum)}</span>
    </div>
    ${pruefung}
  </header>`;
}

function kennzahlenTabelle(abschnitte: Teamkennzahlen[], gesamt: Teamkennzahlen): string {
  const spalten = [...abschnitte.map((_, i) => (i < 2 ? `HZ${i + 1}` : `${i + 1}. Abschnitt`)), 'Gesamt'];
  const werte = [...abschnitte, gesamt];
  const zeile = (name: string, f: (k: Teamkennzahlen) => string): string =>
    `<tr><td>${name}</td>${werte.map((k) => `<td class="zahl">${f(k)}</td>`).join('')}</tr>`;
  return `<table>
    <thead><tr><th></th>${spalten.map((s) => `<th class="zahl">${s}</th>`).join('')}</tr></thead>
    <tbody>
      ${zeile('Tore', (k) => String(k.tore))}
      ${zeile('Feldwürfe (Tore/Würfe)', (k) => `${k.feldtore}/${k.feldwuerfe}`)}
      ${zeile('Wurfquote', (k) => prozent(k.quote))}
      ${zeile('Siebenmeter (Tore/Versuche)', (k) => `${k.siebenmeterTore}/${k.siebenmeterVersuche}`)}
      ${zeile('Technische Fehler', (k) => String(k.technischeFehler))}
      ${zeile('Ballverluste', (k) => String(k.ballverluste))}
      ${zeile('Paraden', (k) => String(k.paraden))}
      ${zeile('Zeitstrafen', (k) => String(k.zeitstrafen))}
      ${zeile('Gegentore', (k) => String(k.gegentore))}
    </tbody>
  </table>`;
}

function phasenAbschnitt(ereignisse: readonly Ereignis[]): string {
  const p = phasen(ereignisse);
  return `${phasenbalken(p)}<table>
    <thead><tr><th>Minuten</th><th class="zahl">Tore</th><th class="zahl">Gegentore</th><th class="zahl">Würfe</th><th class="zahl">Fehler</th></tr></thead>
    <tbody>${p.map((x) =>
      `<tr><td>${minute(x.von)}–${minute(x.bis)}</td>${zahl(x.tore)}${zahl(x.gegentore)}${zahl(x.wuerfe)}${zahl(x.fehler)}</tr>`).join('')}
    </tbody>
  </table>
  <p class="hinweis">Fehler = technische Fehler und Ballverluste. Würfe einschließlich Siebenmeter.</p>`;
}

function aufstellungenAbschnitt(ereignisse: readonly Ereignis[], nameVon: (n: number) => string): string {
  const liste = aufstellungen(ereignisse).slice(0, 3);
  if (liste.length === 0) return '<p class="hinweis">Keine Aufstellung erfasst.</p>';
  const wechselErfasst = ereignisse.some((e) => e.t > 0 && ['W', 'I', 'O'].includes(e.typ.toUpperCase()));
  return `<table>
    <thead><tr><th>Besetzung</th><th class="zahl">Dauer</th><th class="zahl">Tore</th><th class="zahl">Gegentore</th></tr></thead>
    <tbody>${liste.map((a) =>
      `<tr><td>${a.nummern.map(nameVon).join(', ')}</td><td class="zahl">${alsUhrzeit(a.dauer)}</td>${zahl(a.tore)}${zahl(a.gegentore)}</tr>`).join('')}
    </tbody>
  </table>${wechselErfasst ? '' : '<p class="hinweis">Keine Wechsel erfasst — gezeigt wird nur die Startaufstellung.</p>'}`;
}

function zaehlerZeile(w: SpielerStatistik): string {
  const teile = KATALOG
    .filter((k) => !IN_KOPFWERTEN.includes(k.code) && (w.zaehler[k.code] ?? 0) > 0)
    .map((k) => `${w.zaehler[k.code]}× ${htmlEscapen(k.bezeichnung)}`);
  return teile.length ? `<p class="zaehler">${teile.join(' · ')}</p>` : '';
}

function spielerinKarte(
  s: Spieler,
  w: SpielerStatistik,
  ereignisse: readonly Ereignis[],
  endeT: number,
  letzteT: number,
  gespielt: number,
  halbzeitT: number | undefined,
): string {
  const liste = spielerereignisse(ereignisse, s.nummer);
  const titel = `<h3><span class="nr">${s.nummer}</span> ${htmlEscapen(s.name)}` +
    `${s.torwart ? ' <span class="rolle">Torhüterin</span>' : ''}</h3>`;
  if (w.einsatzzeit === 0 && liste.length === 0) {
    return `<section class="spielerin" id="nr-${s.nummer}">${titel}<p class="hinweis">Nicht eingesetzt.</p></section>`;
  }

  const anteil = gespielt > 0 ? ` <small>${prozent(w.einsatzzeit / gespielt)}</small>` : '';
  const paraden = PARADEN.reduce((summe, code) => summe + (w.zaehler[code] ?? 0), 0);
  const fangquote = paraden + w.gegentoreImEinsatz === 0 ? null : paraden / (paraden + w.gegentoreImEinsatz);

  const wert = (dt: string, dd: string): string => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
  const wurfwerte =
    wert('Tore', `${w.tore}/${w.wuerfe} <small>${prozent(w.wurfquote)}</small>`) +
    (w.siebenmeterVersuche > 0 ? wert('Siebenmeter', `${w.siebenmeterTore}/${w.siebenmeterVersuche}`) : '');
  // Die Torhüterin zeigt ihre Wurfwerte nur, wenn sie tatsächlich geworfen hat.
  // Die Parade beim Gegenstoß ist die wertvollste; ihre Quote erscheint, sobald ein Gegenstoß auf die Torhüterin kam.
  const gegenstossGehalten = w.zaehler.PG ?? 0;
  const gegenstossWuerfe = gegenstossGehalten + w.gegenstossGegentoreImEinsatz;
  const werte = s.torwart
    ? wert('Paraden', String(paraden)) +
      wert('Gegentore im Einsatz', String(w.gegentoreImEinsatz)) +
      wert('Fangquote', prozent(fangquote)) +
      (gegenstossWuerfe > 0
        ? wert('Gegenstoß gehalten', `${gegenstossGehalten}/${gegenstossWuerfe} <small>${prozent(gegenstossGehalten / gegenstossWuerfe)}</small>`)
        : '') +
      (w.wuerfe + w.siebenmeterVersuche > 0 ? wurfwerte : '')
    : wurfwerte;
  const plusminusKlasse = w.plusMinus > 0 ? 'plus' : w.plusMinus < 0 ? 'minus' : '';
  const plusminus = `<span class="plusminus ${plusminusKlasse}">${vorzeichen(w.plusMinus)}</span>`;

  const ereignisZeilen = liste.map((x) => {
    const position = x.pos !== undefined ? ` · ${POSITIONEN[x.pos] ?? x.pos}` : '';
    const warnung = x.hinweis ? ` <span class="warnung">⚠ ${htmlEscapen(x.hinweis)}</span>` : '';
    return `<tr><td>${alsUhrzeit(x.t)}</td><td>${htmlEscapen(x.bezeichnung)}${position}${warnung}</td><td class="zahl">${x.stand}</td></tr>`;
  }).join('');

  return `<section class="spielerin" id="nr-${s.nummer}">
    ${titel}
    <dl class="werte">
      ${wert('Einsatz', `${alsUhrzeit(w.einsatzzeit)}${anteil}`)}
      ${werte}
      ${wert('+/−', plusminus)}
      ${wert('Leistungsindex', indexText(w))}
    </dl>
    ${zaehlerZeile(w)}
    ${einsatzleiste(spielerverlauf(ereignisse, s.nummer, letzteT), endeT, halbzeitT)}
    <details><summary>${liste.length} ${liste.length === 1 ? 'Ereignis' : 'Ereignisse'}</summary>
      <table><tbody>${ereignisZeilen}</tbody></table>
    </details>
  </section>`;
}

export function berichtHtml(spiel: Spielbericht, kader: readonly Spieler[]): string {
  const { ereignisse } = spiel;
  const zustand = reduziere(ereignisse);
  const v = verlauf(ereignisse);
  const letzteT = ereignisse.at(-1)?.t ?? 0;
  const gespielt = gespielteZeit(ereignisse);
  const werte = statistik(ereignisse, kader, letzteT);
  const werteVon = new Map(werte.map((w) => [w.nummer, w]));
  const nameVon = (n: number): string => {
    const s = kader.find((k) => k.nummer === n);
    return s ? `${n} ${htmlEscapen(s.name)}${s.torwart ? ' (TW)' : ''}` : `Nr. ${n}`;
  };
  const tVon = new Map(ereignisse.map((e) => [e.seq, e.t]));
  const hinweise = zustand.hinweise.map((h) => ({ t: tVon.get(h.seq) ?? 0, text: h.text }));
  const halbzeitT = v.marken.find((m) => m.art === 'halbzeit')?.t;
  const { abschnitte, gesamt } = kennzahlenJeAbschnitt(ereignisse);
  // Nummern, die nur im Log stehen (Import ohne Kader), bekommen trotzdem eine Karte.
  const bekannt = new Set(kader.map((s) => s.nummer));
  const sortiert: Spieler[] = [
    ...kader,
    ...werte.filter((w) => !bekannt.has(w.nummer)).map((w) => ({ nummer: w.nummer, name: w.name, torwart: false })),
  ].sort((a, b) => a.nummer - b.nummer);

  return `<article class="bericht">
    ${kopf(spiel, `${zustand.toreEigen}:${zustand.toreGegner}`, hinweise)}
    <h2>Verlauf</h2>
    ${verlaufskurve(v)}
    <p class="hinweis">Tordifferenz über die Spielzeit. Gestrichelt: Halbzeit. Dreieck: Auszeit. Roter Strich oben: eigene Zeitstrafe.</p>
    <h2>Schlaglichter</h2>
    ${schlaglichterAbschnitt(ereignisse)}
    <h2>Kennzahlen</h2>
    ${kennzahlenTabelle(abschnitte, gesamt)}
    <h2>Siebenmeter</h2>
    ${siebenmeterAbschnitt(ereignisse, nameVon)}
    <h2>Über- und Unterzahl</h2>
    ${ueberUnterzahlAbschnitt(ereignisse)}
    <h2>Phasen</h2>
    ${phasenAbschnitt(ereignisse)}
    <h2>Aufstellungen</h2>
    ${aufstellungenAbschnitt(ereignisse, nameVon)}
    <h2>Bilanz auf dem Feld</h2>
    ${bilanzAbschnitt(werte, nameVon)}
    <h2>Spielerinnen</h2>
    ${sortiert.map((s) => spielerinKarte(
      s,
      werteVon.get(s.nummer) ?? statistik([], [s])[0]!,
      ereignisse, v.endeT, letzteT, gespielt, halbzeitT,
    )).join('')}
  </article>`;
}

export function berichtDatei(
  spiel: Spielbericht,
  kader: readonly Spieler[],
  erstelltAm: Date = new Date(),
): string {
  const titel = `Spiel gegen ${htmlEscapen(spiel.gegner)} · ${alsDatum(spiel.datum)}`;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titel}</title>
<style>
body { margin: 0; background: #ffffff; }
${BERICHT_HELL}
${BERICHT_CSS}
</style>
</head>
<body>
${berichtHtml(spiel, kader)}
<p class="fuss bericht">Erstellt mit Handball-Tracker am ${alsDatum(erstelltAm.toISOString().slice(0, 10))}</p>
</body>
</html>
`;
}
