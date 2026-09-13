import type { Phase, Spielerverlauf, Verlauf } from '../domain/auswertung';

/**
 * Alle Diagramme sind reiner SVG-Text mit `viewBox`, skalieren über die Breite
 * und färben ausschließlich über CSS-Klassen — so brauchen App und Exportdatei
 * nur verschiedene Variablensätze, keine zweite SVG-Fassung.
 */

const BREITE = 720;
const minuten = (t: number): string => String(Math.round(t / 60));
const runde = (x: number): string => String(Math.round(x * 10) / 10);

export function verlaufskurve(v: Verlauf): string {
  const hoehe = 220;
  const links = 36;
  const rechts = 12;
  const oben = 22;
  const unten = 30;
  const plotB = BREITE - links - rechts;
  const plotH = hoehe - oben - unten;
  const mitte = oben + plotH / 2;
  const diffs = v.punkte.map((p) => p.eigen - p.gegner);
  const maxAbw = Math.max(3, ...diffs.map(Math.abs));
  const x = (t: number): number => links + (t / v.endeT) * plotB;
  const y = (d: number): number => mitte - (d / maxAbw) * (plotH / 2);

  // Treppe: nach jedem Tor springt die Differenz senkrecht, dazwischen läuft sie waagerecht.
  let pfad = `M${runde(x(0))},${runde(y(0))}`;
  for (const p of v.punkte.slice(1)) pfad += ` H${runde(x(p.t))} V${runde(y(p.eigen - p.gegner))}`;
  pfad += ` H${runde(x(v.endeT))}`;
  const flaeche = `${pfad} V${runde(mitte)} H${runde(x(0))} Z`;

  const achse: string[] = [];
  for (let t = 0; t <= v.endeT; t += 600) {
    const ax = runde(x(t));
    achse.push(`<line class="vk-raster" x1="${ax}" y1="${oben}" x2="${ax}" y2="${oben + plotH}"/>`);
    achse.push(`<text class="vk-achse-text" x="${ax}" y="${hoehe - 10}" text-anchor="middle">${minuten(t)}</text>`);
  }
  const yText = (d: number): string =>
    `<text class="vk-achse-text" x="${links - 6}" y="${runde(y(d) + 4)}" text-anchor="end">${d > 0 ? '+' : ''}${d}</text>`;

  const marken = v.marken.map((m) => {
    const mx = x(m.t);
    const titel = `<title>${m.text}</title>`;
    if (m.art === 'halbzeit') {
      return `<g class="vk-halbzeit">${titel}` +
        `<line x1="${runde(mx)}" y1="${oben}" x2="${runde(mx)}" y2="${oben + plotH}"/>` +
        `<text x="${runde(mx)}" y="${oben - 8}" text-anchor="middle">HZ</text></g>`;
    }
    if (m.art === 'auszeit') {
      const by = oben + plotH;
      return `<polygon class="vk-auszeit" points="${runde(mx)},${by - 8} ${runde(mx - 5)},${by} ${runde(mx + 5)},${by}">${titel}</polygon>`;
    }
    return `<line class="vk-strafe" x1="${runde(mx)}" y1="${oben}" x2="${runde(mx)}" y2="${oben + 10}">${titel}</line>`;
  });

  return `<svg viewBox="0 0 ${BREITE} ${hoehe}" width="100%" role="img" class="diagramm verlaufskurve">` +
    `<title>Verlauf der Tordifferenz</title>` +
    `<defs>` +
    `<clipPath id="vk-oben"><rect x="0" y="0" width="${BREITE}" height="${runde(mitte)}"/></clipPath>` +
    `<clipPath id="vk-unten"><rect x="0" y="${runde(mitte)}" width="${BREITE}" height="${hoehe}"/></clipPath>` +
    `</defs>` +
    achse.join('') +
    `<path class="vk-plus" d="${flaeche}" clip-path="url(#vk-oben)"/>` +
    `<path class="vk-minus" d="${flaeche}" clip-path="url(#vk-unten)"/>` +
    `<line class="vk-null" x1="${links}" y1="${runde(mitte)}" x2="${BREITE - rechts}" y2="${runde(mitte)}"/>` +
    yText(maxAbw) + yText(0) + yText(-maxAbw) +
    `<path class="vk-linie" d="${pfad}"/>` +
    marken.join('') +
    `</svg>`;
}

export function phasenbalken(p: readonly Phase[]): string {
  const hoehe = 180;
  const oben = 22;
  const unten = 26;
  const seite = 12;
  const plotH = hoehe - oben - unten;
  const gruppe = (BREITE - 2 * seite) / Math.max(1, p.length);
  const balken = Math.min(40, gruppe * 0.3);
  const max = Math.max(1, ...p.map((x) => Math.max(x.tore, x.gegentore)));
  const h = (wert: number): number => (wert / max) * plotH;
  const grund = oben + plotH;

  const teile = p.map((phase, i) => {
    const mitteX = seite + gruppe * (i + 0.5);
    const xt = mitteX - balken - 2;
    const xg = mitteX + 2;
    const balkenMitText = (klasse: string, bx: number, wert: number, titel: string): string =>
      `<rect class="${klasse}" x="${runde(bx)}" y="${runde(grund - h(wert))}" width="${runde(balken)}" height="${runde(h(wert))}"><title>${titel}</title></rect>` +
      `<text class="pb-wert" x="${runde(bx + balken / 2)}" y="${runde(grund - h(wert) - 4)}" text-anchor="middle">${wert}</text>`;
    return balkenMitText('pb-tore', xt, phase.tore, `${phase.tore} Tore`) +
      balkenMitText('pb-gegentore', xg, phase.gegentore, `${phase.gegentore} Gegentore`) +
      `<text class="pb-achse-text" x="${runde(mitteX)}" y="${hoehe - 8}" text-anchor="middle">${minuten(phase.von)}–${minuten(phase.bis)}</text>`;
  });

  return `<svg viewBox="0 0 ${BREITE} ${hoehe}" width="100%" role="img" class="diagramm phasenbalken">` +
    `<title>Tore und Gegentore je Zehn-Minuten-Block</title>` +
    `<line class="pb-grund" x1="${seite}" y1="${grund}" x2="${BREITE - seite}" y2="${grund}"/>` +
    teile.join('') +
    `</svg>`;
}

export function einsatzleiste(sv: Spielerverlauf, endeT: number, halbzeitT?: number): string {
  const hoehe = 26;
  const oben = 9;
  const leisteH = 12;
  const x = (t: number): number => (t / Math.max(1, endeT)) * BREITE;

  const phasen = sv.phasen.map((p) =>
    `<rect class="el-${p.art}" x="${runde(x(p.von))}" y="${oben}" width="${runde(Math.max(1, x(p.bis) - x(p.von)))}" height="${leisteH}"/>`);
  const tore = sv.tore.map((t) =>
    `<circle class="el-tor" cx="${runde(x(t))}" cy="${oben - 4}" r="3"><title>Tor in Minute ${minuten(t)}</title></circle>`);
  const halbzeit = halbzeitT === undefined ? '' :
    `<line class="el-halbzeit" x1="${runde(x(halbzeitT))}" y1="0" x2="${runde(x(halbzeitT))}" y2="${hoehe}"/>`;

  return `<svg viewBox="0 0 ${BREITE} ${hoehe}" width="100%" role="img" class="diagramm einsatzleiste" preserveAspectRatio="none">` +
    `<title>Einsatzzeiten</title>` +
    `<rect class="el-grund" x="0" y="${oben}" width="${BREITE}" height="${leisteH}"/>` +
    phasen.join('') + halbzeit + tore.join('') +
    `</svg>`;
}
