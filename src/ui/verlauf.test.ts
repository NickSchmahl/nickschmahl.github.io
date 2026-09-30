import { describe, it, expect } from 'vitest';
import type { Ereignis } from '../domain/ereignis';
import { reihenfolge, verlaufszeilen } from './verlauf';

const E = (seq: number, typ: string, rest: Partial<Ereignis> = {}): Ereignis => ({ seq, t: seq * 60, wall: '', typ, ...rest });

describe('Verlaufszeilen', () => {
  it('zeigt Neuestes zuerst, mit einer Überschrift je Abschnitt', () => {
    const zeilen = verlaufszeilen([E(1, 'T', { spieler: 7 }), E(2, 'HZ'), E(3, 'GT')], []);
    expect(zeilen.map((z) => (z.art === 'abschnitt' ? `A${z.abschnitt}` : z.ereignis.seq))).toEqual(['A2', 3, 'A1', 2, 1]);
  });

  it('hängt Hinweise an ihren Eintrag', () => {
    const zeilen = verlaufszeilen([E(1, 'T', { spieler: 7 })], [
      { seq: 1, text: 'Die Uhr steht' },
      { seq: 1, text: 'Nr. 7 steht nicht auf dem Feld' },
    ]);
    expect(zeilen[1]).toEqual({ art: 'eintrag', ereignis: E(1, 'T', { spieler: 7 }), hinweis: 'Die Uhr steht · Nr. 7 steht nicht auf dem Feld' });
  });

  it('bleibt ohne Ereignisse leer', () => {
    expect(verlaufszeilen([], [])).toEqual([]);
  });

  it('liefert die Reihenfolge der Einträge ohne Überschriften', () => {
    expect(reihenfolge(verlaufszeilen([E(1, 'T'), E(2, 'HZ'), E(3, 'GT')], []))).toEqual([3, 2, 1]);
  });
});
