import { describe, it, expect } from 'vitest';
import { baueEreignis } from './ereignisbau';
import { analysiere, tasteVerarbeiten, LEERER_PUFFER } from './grammatik';

const WALL = '2026-09-06T18:00:00.000Z';
function analyseVon(text: string) {
  return analysiere([...text].reduce(tasteVerarbeiten, LEERER_PUFFER));
}

describe('Ereignis bauen', () => {
  it('baut ein Tor mit Spieler', () => {
    expect(baueEreignis(analyseVon('7T'), 5, 120, WALL)).toEqual({
      seq: 5, t: 120, wall: WALL, typ: 'T', spieler: 7,
    });
  });

  it('nimmt die Wurfposition mit auf', () => {
    expect(baueEreignis(analyseVon('7T2'), 5, 120, WALL)).toMatchObject({ typ: 'T', spieler: 7, pos: 2 });
  });

  it('lässt die Wurfposition weg, wenn sie nicht getippt wurde', () => {
    expect(baueEreignis(analyseVon('7T'), 5, 120, WALL)).not.toHaveProperty('pos');
  });

  it('baut den Wechsel mit einwechselnder Nummer', () => {
    expect(baueEreignis(analyseVon('7W12'), 5, 120, WALL)).toMatchObject({ typ: 'W', spieler: 7, ein: 12 });
  });

  it('baut die Uhrkorrektur mit Zielzeit in Sekunden', () => {
    expect(baueEreignis(analyseVon('U2003'), 5, 120, WALL)).toMatchObject({ typ: 'U', zeit: 1203 });
  });

  it('baut ein Gegnerereignis ohne Spieler', () => {
    expect(baueEreignis(analyseVon('GT'), 5, 120, WALL)).toEqual({ seq: 5, t: 120, wall: WALL, typ: 'GT' });
  });

  it('baut nichts aus einer unfertigen Eingabe', () => {
    expect(baueEreignis(analyseVon('7'), 5, 120, WALL)).toBeUndefined();
    expect(baueEreignis(analyseVon('7QQ'), 5, 120, WALL)).toBeUndefined();
    expect(baueEreignis(analyseVon(''), 5, 120, WALL)).toBeUndefined();
  });
});
