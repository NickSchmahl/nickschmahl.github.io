import { describe, it, expect, beforeEach } from 'vitest';
import {
  kaderSpeichern,
  kaderLaden,
  spielAnlegen,
  ereignisAnhaengen,
  ereignisseErsetzen,
  spielLaden,
  laufendesSpiel,
  spielBeenden,
  datenbankLoeschen,
} from './speicher';
import type { Ereignis, Spieler } from '../domain/ereignis';

const KADER: Spieler[] = [
  { nummer: 7, name: 'Anna', torwart: false },
  { nummer: 12, name: 'Bea', torwart: true },
];

function e(seq: number, typ: string): Ereignis {
  return { seq, t: seq * 10, wall: new Date().toISOString(), typ };
}

beforeEach(async () => {
  await datenbankLoeschen();
});

describe('Speicher: Kader', () => {
  it('gibt ohne gespeicherten Kader eine leere Liste zurück', async () => {
    expect(await kaderLaden()).toEqual([]);
  });

  it('speichert den Kader und liest ihn wieder', async () => {
    await kaderSpeichern(KADER);
    expect(await kaderLaden()).toEqual(KADER);
  });

  it('ersetzt einen bestehenden Kader', async () => {
    await kaderSpeichern(KADER);
    await kaderSpeichern([{ nummer: 1, name: 'Dana', torwart: true }]);
    expect(await kaderLaden()).toHaveLength(1);
  });
});

describe('Speicher: Spiel', () => {
  it('legt ein Spiel an und merkt es als laufend', async () => {
    const spiel = await spielAnlegen('TSV Beispiel', '2026-09-06');
    const laufend = await laufendesSpiel();
    expect(laufend?.id).toBe(spiel.id);
    expect(laufend?.gegner).toBe('TSV Beispiel');
  });

  it('hängt Ereignisse in Reihenfolge an', async () => {
    const spiel = await spielAnlegen('TSV Beispiel', '2026-09-06');
    await ereignisAnhaengen(spiel.id, e(1, 'GT'));
    await ereignisAnhaengen(spiel.id, e(2, 'T'));
    expect((await spielLaden(spiel.id))?.ereignisse.map((x) => x.seq)).toEqual([1, 2]);
  });

  it('ersetzt die Ereignisliste vollständig — für den Korrekturmodus', async () => {
    const spiel = await spielAnlegen('TSV Beispiel', '2026-09-06');
    await ereignisAnhaengen(spiel.id, e(1, 'GT'));
    await ereignisAnhaengen(spiel.id, e(2, 'T'));
    await ereignisseErsetzen(spiel.id, [e(1, 'GT')]);
    expect((await spielLaden(spiel.id))?.ereignisse).toHaveLength(1);
  });

  it('meldet nach dem Beenden kein laufendes Spiel mehr', async () => {
    await spielAnlegen('TSV Beispiel', '2026-09-06');
    await spielBeenden();
    expect(await laufendesSpiel()).toBeUndefined();
  });

  it('behält das beendete Spiel abrufbar', async () => {
    const spiel = await spielAnlegen('TSV Beispiel', '2026-09-06');
    await ereignisAnhaengen(spiel.id, e(1, 'GT'));
    await spielBeenden();
    expect((await spielLaden(spiel.id))?.ereignisse).toHaveLength(1);
  });
});
