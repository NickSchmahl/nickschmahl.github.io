import { describe, it, expect } from 'vitest';
import { analysiere, LEERER_PUFFER } from './grammatik';
import { klickVorschlaege, nummerWaehlen, vorschlagWaehlen } from './klick';

const codes = (p: Parameters<typeof klickVorschlaege>[0]): string[] => klickVorschlaege(p).map((e) => e.code);

describe('Vorschläge für die Maus', () => {
  it('bietet ohne Eingabe die Einträge des Gegners und der Uhr an', () => {
    expect(codes(LEERER_PUFFER)).toEqual(['GT', 'GF', 'GTG', 'AZ', 'HZ']);
  });

  it('bietet nach einer Nummer die häufigsten Aktionen einer Spielerin an', () => {
    expect(codes({ ziffern: '7', code: '', argument: '' })).toEqual(['T', 'F', 'TF', 'BG', 'A', 'ST', 'Z', 'W']);
  });

  it('filtert nach dem getippten Code und nach der Nummer', () => {
    expect(codes({ ziffern: '7', code: 'T', argument: '' })).toEqual(['T', 'TA', 'TD', 'TF', 'TG', 'TS']);
    expect(codes({ ziffern: '', code: 'G', argument: '' })).toEqual(['GF', 'GFG', 'GS', 'GT', 'GTG', 'GZ']);
    expect(codes({ ziffern: '7', code: 'G', argument: '' })).toEqual([]);
  });

  it('bietet nichts mehr an, sobald ein Argument getippt wird', () => {
    expect(codes({ ziffern: '7', code: 'T', argument: '2' })).toEqual([]);
  });
});

describe('Klicks in die Eingabe', () => {
  it('ersetzt mit einem Vorschlag den Code und behält die Nummer', () => {
    expect(vorschlagWaehlen({ ziffern: '7', code: 'T', argument: '' }, 'TF')).toEqual({ ziffern: '7', code: 'TF', argument: '' });
  });

  it('macht ein Tor mit einem Klick buchungsbereit, einen Wechsel nicht', () => {
    expect(analysiere(vorschlagWaehlen(nummerWaehlen(7), 'T')).art).toBe('bereit');
    expect(analysiere(vorschlagWaehlen(nummerWaehlen(7), 'W')).art).toBe('unfertig');
  });

  it('setzt mit einer Kachel nur deren Nummer', () => {
    expect(nummerWaehlen(12)).toEqual({ ziffern: '12', code: '', argument: '' });
  });
});
