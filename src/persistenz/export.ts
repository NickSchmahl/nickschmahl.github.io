import type { Ereignis } from '../domain/ereignis';
import type { SpielerStatistik } from '../domain/statistik';
import { findeEintrag } from '../domain/katalog';
import { alsUhrzeit } from '../eingabe/grammatik';
import type { Spiel } from './speicher';

export function alsJsonl(ereignisse: readonly Ereignis[]): string {
  return ereignisse.map((e) => JSON.stringify(e)).join('\n');
}

const CSV_KOPF = [
  'Nummer', 'Name', 'Torwart', 'Einsatzzeit', 'Tore', 'Wuerfe', 'Wurfquote',
  '7m-Tore', '7m-Versuche', 'Technische Fehler', 'Ballverluste', 'Ballgewinne',
  'Bloecke', 'Paraden', 'Gegentore im Einsatz', 'Zeitstrafen', 'Gelbe Karten',
  'Rote Karten', 'Plus/Minus',
];

/** Semikolon als Trennzeichen und Komma als Dezimaltrenner — so öffnet Excel die Datei auf Anhieb richtig. */
export function alsCsv(zeilen: readonly SpielerStatistik[]): string {
  const quote = (q: number | null) => (q === null ? '' : q.toFixed(2).replace('.', ','));
  const z = (zeile: SpielerStatistik, code: string) => zeile.zaehler[code] ?? 0;

  const daten = zeilen.map((zeile) =>
    [
      zeile.nummer,
      zeile.name,
      zeile.torwart ? 'ja' : 'nein',
      alsUhrzeit(zeile.einsatzzeit),
      zeile.tore,
      zeile.wuerfe,
      quote(zeile.wurfquote),
      zeile.siebenmeterTore,
      zeile.siebenmeterVersuche,
      zeile.technischeFehler,
      z(zeile, 'BV'),
      z(zeile, 'BG'),
      z(zeile, 'B'),
      z(zeile, 'P') + z(zeile, 'PS'),
      zeile.gegentoreImEinsatz,
      z(zeile, 'Z'),
      z(zeile, 'ZG'),
      z(zeile, 'ZR'),
      zeile.plusMinus,
    ].join(';'),
  );

  return [CSV_KOPF.join(';'), ...daten].join('\n');
}

export function alsMarkdown(
  spiel: Spiel,
  zeilen: readonly SpielerStatistik[],
  toreEigen: number,
  toreGegner: number,
): string {
  const kopf = `# Spiel gegen ${spiel.gegner}\n\n${spiel.datum} · Endstand **${toreEigen}:${toreGegner}**\n`;

  const tabelle = [
    '| Nr. | Name | Zeit | Tore | Würfe | Quote | 7m | Techn. F. | +/− |',
    '|---:|---|---:|---:|---:|---:|---:|---:|---:|',
    ...zeilen.map((z) =>
      `| ${z.nummer} | ${z.name} | ${alsUhrzeit(z.einsatzzeit)} | ${z.tore} | ${z.wuerfe} | ` +
      `${z.wurfquote === null ? '–' : `${Math.round(z.wurfquote * 100)} %`} | ` +
      `${z.siebenmeterTore}/${z.siebenmeterVersuche} | ${z.technischeFehler} | ` +
      `${z.plusMinus > 0 ? '+' : ''}${z.plusMinus} |`,
    ),
  ].join('\n');

  const verlauf = spiel.ereignisse
    .map((e) => {
      const eintrag = findeEintrag(e.typ);
      const wer = e.spieler === undefined ? '' : ` Nr. ${e.spieler}`;
      return `- ${alsUhrzeit(e.t)}${wer} — ${eintrag?.bezeichnung ?? e.typ}`;
    })
    .join('\n');

  return `${kopf}\n## Spieler\n\n${tabelle}\n\n## Verlauf\n\n${verlauf}\n`;
}

export function dateiname(spiel: Spiel, endung: 'jsonl' | 'csv' | 'md'): string {
  const gegner = spiel.gegner
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `spiel-${spiel.datum}-${gegner}.${endung}`;
}
