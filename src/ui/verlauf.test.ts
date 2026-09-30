import { describe, it, expect } from 'vitest';
import type { Ereignis } from '../domain/ereignis';
import { auswahlNachLoeschen, kurzbeschreibung, naechsterHinweis, reihenfolge, verlaufTaste, verlaufszeilen } from './verlauf';

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

describe('Tasten im Verlauf', () => {
  const reihe = [5, 4, 3, 2, 1];
  const auf = (seq: number, nummer = '') => ({ seq, nummer });

  it('blättert mit den Pfeiltasten und bleibt an den Enden stehen', () => {
    expect(verlaufTaste(auf(3), 'ArrowUp', reihe)).toEqual({ art: 'waehlen', auswahl: auf(4) });
    expect(verlaufTaste(auf(3), 'ArrowDown', reihe)).toEqual({ art: 'waehlen', auswahl: auf(2) });
    expect(verlaufTaste(auf(5), 'ArrowUp', reihe)).toEqual({ art: 'waehlen', auswahl: auf(5) });
    expect(verlaufTaste(auf(1), 'ArrowDown', reihe)).toEqual({ art: 'waehlen', auswahl: auf(1) });
  });

  it('sammelt bis zu drei Ziffern und setzt sie mit der Eingabetaste', () => {
    expect(verlaufTaste(auf(3), '1', reihe)).toEqual({ art: 'waehlen', auswahl: auf(3, '1') });
    expect(verlaufTaste(auf(3, '12'), '3', reihe)).toEqual({ art: 'waehlen', auswahl: auf(3, '123') });
    expect(verlaufTaste(auf(3, '123'), '4', reihe)).toEqual({ art: 'nichts' });
    expect(verlaufTaste(auf(3, '12'), 'Enter', reihe)).toEqual({ art: 'spieler', seq: 3, nummer: 12 });
  });

  it('schließt mit Esc oder mit der Eingabetaste ohne Nummer', () => {
    expect(verlaufTaste(auf(3), 'Escape', reihe)).toEqual({ art: 'schliessen' });
    expect(verlaufTaste(auf(3), 'Enter', reihe)).toEqual({ art: 'schliessen' });
  });

  it('löscht mit Entf, mit ⌫ erst wenn keine Ziffer mehr steht', () => {
    expect(verlaufTaste(auf(3), 'Delete', reihe)).toEqual({ art: 'loeschen', seq: 3 });
    expect(verlaufTaste(auf(3, '12'), 'Backspace', reihe)).toEqual({ art: 'waehlen', auswahl: auf(3, '1') });
    expect(verlaufTaste(auf(3), 'Backspace', reihe)).toEqual({ art: 'loeschen', seq: 3 });
  });

  it('ignoriert andere Tasten', () => {
    expect(verlaufTaste(auf(3), 'x', reihe)).toEqual({ art: 'nichts' });
  });
});

describe('Auswahl nach dem Löschen', () => {
  it('rückt auf die Zeile, die jetzt an derselben Stelle steht', () => {
    // Vorher 5 4 3 2 1, die 3 fällt weg; die Nummern werden neu vergeben: 4 3 2 1.
    expect(auswahlNachLoeschen([5, 4, 3, 2, 1], 3, [4, 3, 2, 1])).toBe(2);
  });

  it('nimmt beim letzten Eintrag den neuen letzten', () => {
    expect(auswahlNachLoeschen([5, 4, 3, 2, 1], 1, [4, 3, 2, 1])).toBe(1);
  });

  it('wählt nichts mehr, wenn die Liste leer ist', () => {
    expect(auswahlNachLoeschen([1], 1, [])).toBeUndefined();
  });
});

describe('Nächster Eintrag zum Prüfen', () => {
  const reihe = [5, 4, 3, 2, 1];
  const auffaellig = new Set([4, 2]);

  it('beginnt oben, wenn nichts gewählt ist', () => {
    expect(naechsterHinweis(reihe, auffaellig, undefined)).toBe(4);
  });

  it('springt zum nächsten darunter und am Ende wieder nach oben', () => {
    expect(naechsterHinweis(reihe, auffaellig, 4)).toBe(2);
    expect(naechsterHinweis(reihe, auffaellig, 2)).toBe(4);
  });

  it('findet nichts ohne Hinweise', () => {
    expect(naechsterHinweis(reihe, new Set(), undefined)).toBeUndefined();
  });
});

describe('Kurzbeschreibung', () => {
  it('nennt Zeit, Nummer und Aktion', () => {
    expect(kurzbeschreibung({ seq: 1, t: 750, wall: '', typ: 'T', spieler: 7 })).toBe('12:30 Nr. 7 Tor');
  });

  it('lässt die Nummer bei Einträgen ohne Spielerin weg', () => {
    expect(kurzbeschreibung({ seq: 1, t: 90, wall: '', typ: 'GT' })).toBe('01:30 Gegentor');
  });

  it('zeigt bei einer Notiz den Text', () => {
    expect(kurzbeschreibung({ seq: 1, t: 90, wall: '', typ: '#', text: 'Abwehr zu flach' })).toBe('01:30 Notiz „Abwehr zu flach"');
  });
});
