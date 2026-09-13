import type { Ereignis, Spieler } from '../domain/ereignis';
import type { Zustand } from '../domain/reduzierer';
import type { SpielerStatistik } from '../domain/statistik';
import { findeEintrag } from '../domain/katalog';
import { alsUhrzeit } from '../eingabe/grammatik';
import type { Spiel } from './speicher';

interface JsonlKopf { kopf: 1; gegner: string; datum: string; kader: Spieler[] }

/**
 * Erste Zeile ist der Kopf mit Gegner, Datum und Kader — sonst wären in der
 * Datei nur Nummern. Der Schlüssel `kopf` kommt in keinem Ereignis vor.
 */
export function alsJsonl(spiel: Spiel, kader: readonly Spieler[]): string {
  const kopf: JsonlKopf = { kopf: 1, gegner: spiel.gegner, datum: spiel.datum, kader: [...kader] };
  return [JSON.stringify(kopf), ...spiel.ereignisse.map((e) => JSON.stringify(e))].join('\n');
}

export interface JsonlErsatz {
  /** Für Dateien ohne Kopfzeile: `spiel-JJJJ-MM-TT-<gegner>.jsonl` liefert Datum und Gegner. */
  dateiname?: string;
  /** Für Dateien ohne Kopfzeile: der Kader, der die Nummern auflöst. */
  kader: readonly Spieler[];
}

function ausDateiname(name: string | undefined): { gegner: string; datum: string } {
  const treffer = name?.match(/^spiel-(\d{4}-\d{2}-\d{2})-(.+)\.jsonl$/i);
  if (!treffer) return { gegner: 'unbekannt', datum: new Date().toISOString().slice(0, 10) };
  return { datum: treffer[1]!, gegner: treffer[2]!.replace(/-/g, ' ') };
}

export function ausJsonl(text: string, ersatz: JsonlErsatz): { spiel: Spiel; kader: Spieler[] } {
  let kopf: JsonlKopf | undefined;
  const ereignisse: Ereignis[] = [];

  text.split('\n').forEach((zeile, i) => {
    if (zeile.trim() === '') return;
    let wert: unknown;
    try {
      wert = JSON.parse(zeile);
    } catch {
      throw new Error(`Zeile ${i + 1} ist kein gültiges JSON`);
    }
    if (typeof wert !== 'object' || wert === null) throw new Error(`Zeile ${i + 1} ist kein Objekt`);
    if ('kopf' in wert) kopf = wert as JsonlKopf;
    else ereignisse.push(wert as Ereignis);
  });
  ereignisse.sort((a, b) => a.seq - b.seq);

  const { gegner, datum } = kopf ?? ausDateiname(ersatz.dateiname);
  const kader = kopf?.kader ?? [...ersatz.kader];
  return { spiel: { id: `import-${datum}-${gegner}`, gegner, datum, ereignisse }, kader };
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

export function alsMarkdown(spiel: Spiel, zeilen: readonly SpielerStatistik[], z: Zustand): string {
  const kopf = `# Spiel gegen ${spiel.gegner}\n\n${spiel.datum} · Endstand **${z.toreEigen}:${z.toreGegner}**\n`;

  const gegnerQuote = z.wuerfeGegner === 0 ? '–' : `${Math.round((z.toreGegner / z.wuerfeGegner) * 100)} %`;
  const gegnerStrafen = spiel.ereignisse.filter((e) => e.typ.toUpperCase() === 'GZ').length;
  const gegner = `- Tore: ${z.toreGegner}\n- Würfe: ${z.wuerfeGegner}\n- Quote: ${gegnerQuote}\n- Zeitstrafen: ${gegnerStrafen}\n`;

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

  return `${kopf}\n## Spieler\n\n${tabelle}\n\n## Gegner\n\n${gegner}\n## Verlauf\n\n${verlauf}\n`;
}

export function dateiname(spiel: Spiel, endung: 'jsonl' | 'csv' | 'md' | 'html'): string {
  const gegner = spiel.gegner
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `spiel-${spiel.datum}-${gegner}.${endung}`;
}
