import { describe, it, expect } from 'vitest';
import { alsJsonl, alsCsv, alsMarkdown, dateiname } from './export';
import type { Spiel } from './speicher';
import type { Ereignis } from '../domain/ereignis';
import type { SpielerStatistik } from '../domain/statistik';

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

describe('Export: JSONL', () => {
  it('schreibt eine Zeile je Ereignis', () => {
    expect(alsJsonl(EREIGNISSE).split('\n')).toHaveLength(2);
  });

  it('schreibt gültiges JSON je Zeile', () => {
    const erste = JSON.parse(alsJsonl(EREIGNISSE).split('\n')[0] ?? '');
    expect(erste).toEqual(EREIGNISSE[0]);
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
  it('nennt Gegner und Endstand', () => {
    const md = alsMarkdown(SPIEL, [ZEILE], 28, 26);
    expect(md).toContain('TSV Beispiel');
    expect(md).toContain('28:26');
  });

  it('baut den Dateinamen aus Datum und Gegner', () => {
    expect(dateiname(SPIEL, 'csv')).toBe('spiel-2026-09-06-tsv-beispiel.csv');
  });

  it('ersetzt Sonderzeichen im Gegnernamen', () => {
    const spiel = { ...SPIEL, gegner: 'HSG Groß/Klein e.V.' };
    expect(dateiname(spiel, 'jsonl')).toBe('spiel-2026-09-06-hsg-gross-klein-e-v.jsonl');
  });
});
