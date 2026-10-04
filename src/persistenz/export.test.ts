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
  gegenstossTore: 1,
  gegenstossWuerfe: 2,
  gegenstossGegentoreImEinsatz: 3,
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
      'Nummer;Name;Torwart;Einsatzzeit;Tore;Wuerfe;Wurfquote;7m-Tore;7m-Versuche;Gegenstoss-Tore;Gegenstoss-Wuerfe;Technische Fehler;Ballverluste;Ballgewinne;Bloecke;Paraden;Paraden Gegenstoss;Gegentore im Einsatz;Zeitstrafen;Gelbe Karten;Rote Karten;Plus/Minus;Leistungsindex',
    );
  });

  it('schreibt die Einsatzzeit als mm:ss', () => {
    expect(alsCsv([ZEILE]).split('\n')[1]).toContain(';30:30;');
  });

  it('schreibt die Gegenstöße hinter die Siebenmeter', () => {
    expect(alsCsv([ZEILE]).split('\n')[1]).toContain(';1;2;1;2;3;');
  });

  it('schreibt die Wurfquote mit deutschem Dezimalkomma', () => {
    expect(alsCsv([ZEILE]).split('\n')[1]).toContain(';0,50;');
  });

  it('lässt die Wurfquote ohne Wurf leer', () => {
    const ohne = { ...ZEILE, wuerfe: 0, tore: 0, wurfquote: null };
    expect(alsCsv([ohne]).split('\n')[1]).toContain(';;');
  });

  it('zählt alle Paradenarten zusammen und die beim Gegenstoß noch einmal getrennt', () => {
    const tw = { ...ZEILE, zaehler: { P: 5, PS: 1, PG: 2 } };
    expect(alsCsv([tw]).split('\n')[1]).toContain(';8;2;12;');
  });

  it('schreibt den Leistungsindex je 60 Minuten ans Ende', () => {
    // 5 Tore − 5 Fehlwürfe − 3 technische Fehler + 2 Ballgewinne = −1 in 30:30
    expect(alsCsv([ZEILE]).split('\n')[1]).toMatch(/;-2;-1,97$/);
  });

  it('lässt den Leistungsindex unter fünf Minuten Einsatz leer', () => {
    expect(alsCsv([{ ...ZEILE, einsatzzeit: 120 }]).split('\n')[1]).toMatch(/;-2;$/);
  });

  it('nimmt fehlende Zähler als null an', () => {
    expect(alsCsv([ZEILE]).split('\n')[1]).toMatch(/;0;2;0;0;/);
  });
});

describe('Export: Markdown und Dateiname', () => {
  const ZUSTAND = { ...ZUSTAND_ANFANG, toreEigen: 28, toreGegner: 26, wuerfeGegner: 50 };

  it('listet Notizen im Verlauf und in einem eigenen Abschnitt', () => {
    const spiel = { ...SPIEL, ereignisse: [...EREIGNISSE, { seq: 3, t: 1421, wall: '', typ: '#', text: 'Gegner stellt auf 5:1 um' }] };
    const md = alsMarkdown(spiel, [ZEILE], ZUSTAND);
    expect(md).toContain('- 23:41 — Notiz: Gegner stellt auf 5:1 um\n');
    expect(md).toContain('## Notizen\n\n- 23:41 Gegner stellt auf 5:1 um\n');
  });

  it('lässt den Abschnitt Notizen ohne Notiz weg', () => {
    expect(alsMarkdown({ ...SPIEL, ereignisse: EREIGNISSE }, [ZEILE], ZUSTAND)).not.toContain('## Notizen');
  });

  it('nennt Gegner und Endstand', () => {
    const md = alsMarkdown(SPIEL, [ZEILE], ZUSTAND);
    expect(md).toContain('TSV Beispiel');
    expect(md).toContain('28:26');
  });

  it('hat einen Abschnitt zum Gegner mit Tabelle je Halbzeit nach Wurfart und den Zeitstrafen', () => {
    const wall = '2026-09-06T18:01:00.000Z';
    const typen: [string, number, number?][] = [
      ['I', 0, 1], ['UL', 0], ['GT', 60], ['GF', 70], ['P', 80, 1], ['GS', 90], ['PS', 100, 1],
      ['GTG', 110], ['GFG', 120], ['PG', 130, 1], ['HZ', 1800], ['GT', 1900], ['GZ', 1950],
    ];
    const ereignisse = typen.map(([typ, t, spieler], i) => ({ seq: i + 1, t, wall, typ, ...(spieler ? { spieler } : {}) }));
    const md = alsMarkdown({ ...SPIEL, ereignisse }, [ZEILE], ZUSTAND);
    expect(md).toContain([
      '## Gegner',
      '',
      '| | HZ1 | HZ2 | Gesamt |',
      '|---|---:|---:|---:|',
      '| Tore | 3 | 1 | 4 |',
      '| Würfe | 8 | 1 | 9 |',
      '| Wurfquote | 38 % | 100 % | 44 % |',
      '| Feld (Tore/Würfe) | 1/3 (33 %) | 1/1 (100 %) | 2/4 (50 %) |',
      '| Siebenmeter (Tore/Würfe) | 1/2 (50 %) | 0/0 (–) | 1/2 (50 %) |',
      '| Gegenstoß (Tore/Würfe) | 1/3 (33 %) | 0/0 (–) | 1/3 (33 %) |',
      '',
      'Daneben, Pfosten oder geblockt zählt nur, wenn GF eingegeben wurde.',
      '',
      '- Zeitstrafen: 1',
      '',
    ].join('\n'));
  });

  it('nennt die Gegenstöße beider Seiten im Kopf', () => {
    const wall = '2026-09-06T18:01:00.000Z';
    const spiel = { ...SPIEL, ereignisse: [
      ...EREIGNISSE,
      { seq: 3, t: 50, wall, typ: 'TG', spieler: 7 }, { seq: 4, t: 60, wall, typ: 'FG', spieler: 7 },
      { seq: 5, t: 70, wall, typ: 'GTG' }, { seq: 6, t: 80, wall, typ: 'GFG' }, { seq: 7, t: 90, wall, typ: 'GFG' },
    ] };
    const md = alsMarkdown(spiel, [ZEILE], ZUSTAND);
    expect(md).toContain('Endstand **28:26** · Gegenstöße: 1/2 · Gegner 1/3\n');
  });

  it('meldet beim Gegner, wenn keine Würfe erfasst wurden, und nennt trotzdem die Zeitstrafen', () => {
    const md = alsMarkdown(SPIEL, [ZEILE], { ...ZUSTAND, wuerfeGegner: 0, toreGegner: 0 });
    expect(md).toContain('## Gegner\n\nKeine Würfe des Gegners erfasst.\n\n- Zeitstrafen: 0\n');
  });

  it('führt den Leistungsindex als letzte Spalte der Spielertabelle', () => {
    const md = alsMarkdown(SPIEL, [ZEILE, { ...ZEILE, nummer: 9, einsatzzeit: 120 }], ZUSTAND);
    expect(md).toContain('| +/− | Leistungsindex |');
    expect(md).toContain('| -2 | -2,0 |');
    expect(md).toContain('| -2 | – |');
  });

  it('baut den Dateinamen aus Datum und Gegner', () => {
    expect(dateiname(SPIEL, 'csv')).toBe('spiel-2026-09-06-tsv-beispiel.csv');
  });

  it('ersetzt Sonderzeichen im Gegnernamen', () => {
    const spiel = { ...SPIEL, gegner: 'HSG Groß/Klein e.V.' };
    expect(dateiname(spiel, 'jsonl')).toBe('spiel-2026-09-06-hsg-gross-klein-e-v.jsonl');
  });
});
