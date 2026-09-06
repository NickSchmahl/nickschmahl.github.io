import { describe, it, expect } from 'vitest';
import {
  LEERER_PUFFER,
  tasteVerarbeiten,
  analysiere,
  vorschlaege,
  klartext,
} from './grammatik';
import type { Puffer } from './grammatik';

/** Hilfsfunktion: tippt eine ganze Zeichenkette in den Puffer. */
function tippe(text: string): Puffer {
  return [...text].reduce(tasteVerarbeiten, LEERER_PUFFER);
}

describe('Grammatik: Puffer', () => {
  it('sammelt führende Ziffern als Trikotnummer', () => {
    expect(tippe('77')).toEqual({ ziffern: '77', code: '', argument: '' });
  });

  it('beendet die Nummer beim ersten Buchstaben', () => {
    expect(tippe('77T')).toEqual({ ziffern: '77', code: 'T', argument: '' });
  });

  it('nimmt bis zu zwei Buchstaben als Code', () => {
    expect(tippe('7TF')).toEqual({ ziffern: '7', code: 'TF', argument: '' });
  });

  it('ignoriert einen dritten Buchstaben', () => {
    expect(tippe('7TFX')).toEqual({ ziffern: '7', code: 'TF', argument: '' });
  });

  it('sammelt Ziffern nach dem Code als Argument', () => {
    expect(tippe('7W12')).toEqual({ ziffern: '7', code: 'W', argument: '12' });
  });

  it('nimmt Buchstaben ohne Nummer als Code an', () => {
    expect(tippe('GT')).toEqual({ ziffern: '', code: 'GT', argument: '' });
  });
});

describe('Grammatik: Analyse', () => {
  it('meldet den leeren Puffer', () => {
    expect(analysiere(LEERER_PUFFER)).toEqual({ art: 'leer' });
  });

  it('löst eine reine Ziffernfolge nicht zu einem Spieler auf', () => {
    expect(analysiere(tippe('7'))).toEqual({ art: 'nummer', ziffern: '7' });
  });

  it('unterscheidet Nr. 7 von Nr. 77', () => {
    const a = analysiere(tippe('7T'));
    const b = analysiere(tippe('77T'));
    expect(a).toMatchObject({ art: 'bereit', spieler: 7 });
    expect(b).toMatchObject({ art: 'bereit', spieler: 77 });
  });

  it('löst T gegen TF auf', () => {
    expect(analysiere(tippe('7T'))).toMatchObject({ art: 'bereit' });
    expect(analysiere(tippe('7T'))).toHaveProperty('eintrag.code', 'T');
    expect(analysiere(tippe('7TF'))).toHaveProperty('eintrag.code', 'TF');
  });

  it('nimmt die Wurfposition als Ziffernargument', () => {
    expect(analysiere(tippe('7T2'))).toMatchObject({ art: 'bereit', spieler: 7, pos: 2 });
  });

  it('lässt die Wurfposition weg, ohne den Wurf ungültig zu machen', () => {
    const a = analysiere(tippe('7T'));
    expect(a).toMatchObject({ art: 'bereit', spieler: 7 });
    expect(a).not.toHaveProperty('pos');
  });

  it('weist eine Wurfposition außerhalb von 1 bis 7 zurück', () => {
    expect(analysiere(tippe('7T9'))).toEqual({ art: 'unbekannt', code: 'T' });
  });

  it('liest die einwechselnde Nummer beim Wechsel', () => {
    expect(analysiere(tippe('7W12'))).toMatchObject({ art: 'bereit', spieler: 7, ein: 12 });
  });

  it('verlangt beim Wechsel eine einwechselnde Nummer', () => {
    expect(analysiere(tippe('7W'))).toEqual({ art: 'unbekannt', code: 'W' });
  });

  it('rechnet die Uhrkorrektur von mmss in Sekunden um', () => {
    expect(analysiere(tippe('U2003'))).toMatchObject({ art: 'bereit', zeit: 20 * 60 + 3 });
  });

  it('weist eine Uhrkorrektur mit unmöglicher Sekundenzahl zurück', () => {
    expect(analysiere(tippe('U2065'))).toEqual({ art: 'unbekannt', code: 'U' });
  });

  it('nimmt Gegnerereignisse ohne Nummer an', () => {
    expect(analysiere(tippe('GT'))).toMatchObject({ art: 'bereit' });
    expect(analysiere(tippe('GT'))).not.toHaveProperty('spieler');
  });

  it('weist ein Gegnerereignis mit Nummer zurück', () => {
    expect(analysiere(tippe('7GT'))).toEqual({ art: 'unbekannt', code: 'GT' });
  });

  it('weist ein Spielerereignis ohne Nummer zurück', () => {
    expect(analysiere(tippe('T'))).toEqual({ art: 'unbekannt', code: 'T' });
  });

  it('meldet einen unbekannten Code', () => {
    expect(analysiere(tippe('7QQ'))).toEqual({ art: 'unbekannt', code: 'QQ' });
  });
});

describe('Grammatik: Rückmeldung', () => {
  it('schlägt nach T alle Fortsetzungen vor', () => {
    expect(vorschlaege(tippe('7T')).map((e) => e.code)).toEqual(['T', 'TA', 'TD', 'TF', 'TS']);
  });

  it('schlägt bei reiner Nummer nichts vor', () => {
    expect(vorschlaege(tippe('7'))).toEqual([]);
  });

  it('zeigt reine Ziffern roh, ohne Spielernamen zu behaupten', () => {
    expect(klartext(tippe('7'))).toBe('7');
  });

  it('zeigt Nummer und Bezeichnung, sobald der Code steht', () => {
    expect(klartext(tippe('7TF'))).toBe('Nr. 7 · Technischer Fehler');
  });

  it('zeigt die Wurfposition mit an', () => {
    expect(klartext(tippe('7T2'))).toBe('Nr. 7 · Tor · Rückraum links');
  });

  it('benennt einen unbekannten Code als solchen', () => {
    expect(klartext(tippe('7QQ'))).toBe('Nr. 7 · QQ — unbekannt');
  });
});
