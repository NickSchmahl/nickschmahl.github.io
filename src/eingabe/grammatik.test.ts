import { describe, it, expect } from 'vitest';
import {
  LEERER_PUFFER,
  tasteVerarbeiten,
  analysiere,
  vorschlaege,
  klartext,
  positionGefragt,
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

  it('nimmt bis zu drei Buchstaben als Code', () => {
    expect(tippe('7TF')).toEqual({ ziffern: '7', code: 'TF', argument: '' });
    expect(tippe('GTG')).toEqual({ ziffern: '', code: 'GTG', argument: '' });
  });

  it('ignoriert einen vierten Buchstaben', () => {
    expect(tippe('GTGX')).toEqual({ ziffern: '', code: 'GTG', argument: '' });
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

  it('meldet den Wechsel als unfertig, solange die zweite Nummer fehlt', () => {
    expect(analysiere(tippe('7W'))).toMatchObject({ art: 'unfertig', spieler: 7, argument: '' });
  });

  it('rechnet die Uhrkorrektur von mmss in Sekunden um', () => {
    expect(analysiere(tippe('U2003'))).toMatchObject({ art: 'bereit', zeit: 20 * 60 + 3 });
  });

  it('weist eine Uhrkorrektur mit unmöglicher Sekundenzahl zurück', () => {
    expect(analysiere(tippe('U2065'))).toEqual({ art: 'unbekannt', code: 'U' });
  });

  it('meldet die halb getippte Uhrzeit als unfertig', () => {
    expect(analysiere(tippe('U123'))).toMatchObject({ art: 'unfertig', argument: '123' });
  });

  it('weist eine unmögliche Sekunden-Zehnerstelle sofort zurück', () => {
    expect(analysiere(tippe('U127'))).toEqual({ art: 'unbekannt', code: 'U' });
  });

  it('nimmt Gegnerereignisse ohne Nummer an', () => {
    expect(analysiere(tippe('GT'))).toMatchObject({ art: 'bereit' });
    expect(analysiere(tippe('GT'))).not.toHaveProperty('spieler');
  });

  it('weist ein Gegnerereignis mit Nummer zurück', () => {
    expect(analysiere(tippe('7GT'))).toEqual({ art: 'unbekannt', code: 'GT' });
  });

  it('nimmt Gegenstöße beider Seiten an — die eigenen mit Nummer, ohne Argument', () => {
    expect(analysiere(tippe('7TG'))).toMatchObject({ art: 'bereit', spieler: 7, eintrag: { code: 'TG' } });
    expect(analysiere(tippe('7FG'))).toMatchObject({ art: 'bereit', spieler: 7, eintrag: { code: 'FG' } });
    expect(analysiere(tippe('GTG'))).toMatchObject({ art: 'bereit', eintrag: { code: 'GTG' } });
    expect(analysiere(tippe('GFG'))).toMatchObject({ art: 'bereit', eintrag: { code: 'GFG' } });
    expect(analysiere(tippe('7TG7'))).toEqual({ art: 'unbekannt', code: 'TG' });
    expect(analysiere(tippe('GT'))).toMatchObject({ art: 'bereit', eintrag: { code: 'GT', wirkung: 'gegentor' } });
  });

  it('zeigt TG in der Trefferliste nach T', () => {
    expect(vorschlaege(tippe('7T')).map((e) => e.code)).toContain('TG');
  });

  it('kennt den Fehlwurf des Gegners nur ohne Nummer', () => {
    expect(analysiere(tippe('GF'))).toMatchObject({ art: 'bereit', eintrag: { code: 'GF', wirkung: 'gegnerwurf' } });
    expect(analysiere(tippe('7GF'))).toEqual({ art: 'unbekannt', code: 'GF' });
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
    expect(vorschlaege(tippe('7T')).map((e) => e.code)).toEqual(['T', 'TA', 'TD', 'TF', 'TG', 'TS']);
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

describe('Grammatik: Zwischenstand der Eingabe', () => {
  it('zeigt die Uhrkorrektur mit Platzhaltern, bevor eine Ziffer getippt ist', () => {
    expect(klartext(tippe('U'))).toBe('Uhrkorrektur · __:__');
  });

  it('füllt die Uhrzeit Ziffer für Ziffer von links auf', () => {
    expect(klartext(tippe('U1'))).toBe('Uhrkorrektur · 1_:__');
    expect(klartext(tippe('U12'))).toBe('Uhrkorrektur · 12:__');
    expect(klartext(tippe('U123'))).toBe('Uhrkorrektur · 12:3_');
    expect(klartext(tippe('U1234'))).toBe('Uhrkorrektur · 12:34');
  });

  it('zeigt beim Wechsel einen Platzhalter für die fehlende zweite Nummer', () => {
    expect(klartext(tippe('7W'))).toBe('Nr. 7 · Wechsel · Nr. __');
  });
});

describe('Grammatik: Wechselrichtung in der Vorschau', () => {
  it('nennt den Spieler von der Bank als den, der hereinkommt', () => {
    expect(klartext(tippe('7W12'), [12])).toBe('Nr. 7 · Wechsel · kommt für Nr. 12');
  });

  it('liest die erste Nummer als die einwechselnde, wenn sie auf der Bank sitzt', () => {
    expect(klartext(tippe('7W12'), [7])).toBe('Nr. 12 · Wechsel · kommt für Nr. 7');
  });

  it('behauptet ohne eindeutige Feldbesetzung keine Richtung', () => {
    expect(klartext(tippe('7W12'))).toBe('Nr. 7 · Wechsel · ⇄ Nr. 12');
  });
});

describe('Positionshilfe', () => {
  it('fragt nach der Position, solange der Code eine nimmt', () => {
    for (const t of ['7T', '7F', '7FB', '7T2']) expect(positionGefragt(tippe(t))).toBe(true);
  });

  it('schweigt ohne Code und bei Codes ohne Position', () => {
    for (const t of ['', '7', '7TF', '7TG', 'GT', '7T9']) expect(positionGefragt(tippe(t))).toBe(false);
  });
});
