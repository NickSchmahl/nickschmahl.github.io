import { describe, it, expect } from 'vitest';
import { alsJsonl, alsCsv, alsMarkdown, ausJsonl, dateiname } from './export';
import type { Spiel } from './speicher';
import type { Ereignis } from '../domain/ereignis';
import type { SpielerStatistik } from '../domain/statistik';
import { ZUSTAND_ANFANG } from '../domain/reduzierer';

const SPIEL: Spiel = { id: 'x', gegner: 'TSV Beispiel', datum: '2026-09-06', ereignisse: [] };

const EREIGNISSE: Ereignis[] = [
  { seq: 1, t: 10, wall: '2026-09-06T18:00:10.000Z', typ: 'T', spieler: 7, pos: 2 },
  { seq: 2, t: 40, wall: '2026-09-06T18:00:40.000Z', typ: 'GT' },
];

const ZEILE: SpielerStatistik = {
  nummer: 7,
  name: 'Anna',
  torwart: false,
  einsatzzeit: 1830,
  tore: 4,
  wuerfe: 8,
  wurfquote: 0.5,
  siebenmeterTore: 1,
  siebenmeterVersuche: 2,
  technischeFehler: 3,
  gegentoreImEinsatz: 12,
  plusMinus: -2,
  zaehler: { T: 4, BG: 2, P: 0 },
};

const KADER = [
  { nummer: 7, name: 'Sieben', torwart: false },
  { nummer: 1, name: 'Eins', torwart: true },
];

describe('Export: JSONL', () => {
  it('schreibt zuerst eine Kopfzeile mit Gegner, Datum und Kader, dann je Ereignis eine Zeile', () => {
    const zeilen = alsJsonl({ ...SPIEL, ereignisse: EREIGNISSE }, KADER).split('\n');
    expect(zeilen).toHaveLength(EREIGNISSE.length + 1);
    expect(JSON.parse(zeilen[0] ?? '')).toEqual({ kopf: 1, gegner: SPIEL.gegner, datum: SPIEL.datum, kader: KADER });
    expect(JSON.parse(zeilen[1] ?? '')).toEqual(EREIGNISSE[0]);
  });

  it('liest die eigene Ausgabe verlustfrei zurück', () => {
    const text = alsJsonl({ ...SPIEL, ereignisse: EREIGNISSE }, KADER);
    const { spiel, kader } = ausJsonl(text, { kader: [] });
    expect(spiel.gegner).toBe(SPIEL.gegner);
    expect(spiel.datum).toBe(SPIEL.datum);
    expect(spiel.ereignisse).toEqual(EREIGNISSE);
    expect(kader).toEqual(KADER);
  });

  it('liest alte Dateien ohne Kopfzeile mit Dateinamen und Ersatzkader', () => {
    const text = EREIGNISSE.map((e) => JSON.stringify(e)).join('\n') + '\n';
    const { spiel, kader } = ausJsonl(text, { dateiname: 'spiel-2026-09-06-hamburg-nord.jsonl', kader: KADER });
    expect(spiel.gegner).toBe('hamburg nord');
    expect(spiel.datum).toBe('2026-09-06');
    expect(spiel.ereignisse).toEqual(EREIGNISSE);
    expect(kader).toEqual(KADER);
  });

  it('sortiert Ereignisse nach seq', () => {
    const text = [EREIGNISSE[1], EREIGNISSE[0]].map((e) => JSON.stringify(e)).join('\n');
    expect(ausJsonl(text, { kader: [] }).spiel.ereignisse.map((e) => e.seq)).toEqual([1, 2]);
  });

  it('nennt die Zeilennummer einer kaputten Zeile', () => {
    const text = `${JSON.stringify(EREIGNISSE[0])}\n{kaputt\n`;
    expect(() => ausJsonl(text, { kader: [] })).toThrow(/Zeile 2/);
  });

  it('fällt ohne passenden Dateinamen auf „unbekannt" zurück', () => {
    const { spiel } = ausJsonl(JSON.stringify(EREIGNISSE[0]), { dateiname: 'irgendwas.jsonl', kader: [] });
    expect(spiel.gegner).toBe('unbekannt');
    expect(spiel.datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('Export: CSV', () => {
  it('beginnt mit der Kopfzeile', () => {
    expect(alsCsv([ZEILE]).split('\n')[0]).toBe(
      'Nummer;Name;Torwart;Einsatzzeit;Tore;Wuerfe;Wurfquote;7m-Tore;7m-Versuche;Technische Fehler;Ballverluste;Ballgewinne;Bloecke;Paraden;Gegentore im Einsatz;Zeitstrafen;Gelbe Karten;Rote Karten;Plus/Minus',
    );
  });

  it('schreibt die Einsatzzeit als mm:ss', () => {
    expect(alsCsv([ZEILE]).split('\n')[1]).toContain(';30:30;');
  });

  it('schreibt die Wurfquote mit deutschem Dezimalkomma', () => {
    expect(alsCsv([ZEILE]).split('\n')[1]).toContain(';0,50;');
  });

  it('lässt die Wurfquote ohne Wurf leer', () => {
    const ohne = { ...ZEILE, wuerfe: 0, tore: 0, wurfquote: null };
    expect(alsCsv([ohne]).split('\n')[1]).toContain(';;');
  });

  it('nimmt fehlende Zähler als null an', () => {
    expect(alsCsv([ZEILE]).split('\n')[1]).toMatch(/;0;2;0;0;/);
  });
});

describe('Export: Markdown und Dateiname', () => {
  const ZUSTAND = { ...ZUSTAND_ANFANG, toreEigen: 28, toreGegner: 26, wuerfeGegner: 50 };

  it('nennt Gegner und Endstand', () => {
    const md = alsMarkdown(SPIEL, [ZEILE], ZUSTAND);
    expect(md).toContain('TSV Beispiel');
    expect(md).toContain('28:26');
  });

  it('hat einen Abschnitt zum Gegner mit Toren, Würfen, Quote und Zeitstrafen', () => {
    const spiel = { ...SPIEL, ereignisse: [...EREIGNISSE, { seq: 3, t: 50, wall: '2026-09-06T18:00:50.000Z', typ: 'GZ' }] };
    const md = alsMarkdown(spiel, [ZEILE], ZUSTAND);
    expect(md).toContain('## Gegner\n\n- Tore: 26\n- Würfe: 50\n- Quote: 52 %\n- Zeitstrafen: 1\n');
  });

  it('lässt die Gegnerquote ohne Wurf offen', () => {
    const md = alsMarkdown(SPIEL, [ZEILE], { ...ZUSTAND, wuerfeGegner: 0, toreGegner: 0 });
    expect(md).toContain('- Quote: –\n');
  });

  it('baut den Dateinamen aus Datum und Gegner', () => {
    expect(dateiname(SPIEL, 'csv')).toBe('spiel-2026-09-06-tsv-beispiel.csv');
  });

  it('ersetzt Sonderzeichen im Gegnernamen', () => {
    const spiel = { ...SPIEL, gegner: 'HSG Groß/Klein e.V.' };
    expect(dateiname(spiel, 'jsonl')).toBe('spiel-2026-09-06-hsg-gross-klein-e-v.jsonl');
  });
});
