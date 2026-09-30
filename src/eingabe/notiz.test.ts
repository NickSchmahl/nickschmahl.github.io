import { describe, it, expect } from 'vitest';
import { NOTIZ_CODE, baueNotiz, notizTaste, notizZeile, notizen } from './notiz';
import { reduziere } from '../domain/reduzierer';
import { findeEintrag, eintraegeMitPraefix } from '../domain/katalog';
import type { Ereignis } from '../domain/ereignis';

const ENTWURF = { t: 1421, text: '' };

describe('Notizentwurf', () => {
  it('nimmt Buchstaben, Ziffern, Leerzeichen und Satzzeichen wörtlich auf', () => {
    let s = notizTaste(ENTWURF, 'G');
    for (const taste of ['e', 'g', 'n', 'e', 'r', ' ', '5', ':', '1']) {
      if (s.art !== 'weiter') throw new Error('unerwartet');
      s = notizTaste(s.entwurf, taste);
    }
    expect(s).toEqual({ art: 'weiter', entwurf: { t: 1421, text: 'Gegner 5:1' } });
  });

  it('löscht mit Backspace das letzte Zeichen', () => {
    expect(notizTaste({ t: 5, text: 'ab' }, 'Backspace')).toEqual({ art: 'weiter', entwurf: { t: 5, text: 'a' } });
  });

  it('speichert mit Enter den getrimmten Text', () => {
    expect(notizTaste({ t: 5, text: '  Abwehr 6:0  ' }, 'Enter')).toEqual({ art: 'speichern', t: 5, text: 'Abwehr 6:0' });
  });

  it('bricht mit Enter ab, wenn nichts dasteht', () => {
    expect(notizTaste({ t: 5, text: '   ' }, 'Enter')).toEqual({ art: 'abbrechen' });
  });

  it('bricht mit Esc ab', () => {
    expect(notizTaste({ t: 5, text: 'x' }, 'Escape')).toEqual({ art: 'abbrechen' });
  });

  it('ignoriert Sondertasten wie Pfeile', () => {
    expect(notizTaste({ t: 5, text: 'x' }, 'ArrowLeft')).toEqual({ art: 'weiter', entwurf: { t: 5, text: 'x' } });
  });

  it('zeigt Zeitpunkt und Text mit Schreibmarke', () => {
    expect(notizZeile({ t: 1421, text: 'Kempa' })).toBe('📝 23:41 Kempa▏');
  });
});

describe('Notiz als Ereignis', () => {
  it('trägt den Zeitpunkt des Öffnens und den Text', () => {
    expect(baueNotiz(1421, 'Kempa', 9, 'W')).toEqual({ seq: 9, t: 1421, wall: 'W', typ: NOTIZ_CODE, text: 'Kempa' });
  });

  it('steht im Katalog, ist aber nicht tippbar', () => {
    expect(findeEintrag(NOTIZ_CODE)?.wirkung).toBe('notiz');
    expect(eintraegeMitPraefix('N').map((e) => e.code)).not.toContain(NOTIZ_CODE);
  });

  it('lässt den Spielstand unberührt und erzeugt keinen Hinweis', () => {
    const ohne: Ereignis[] = [{ seq: 1, t: 0, wall: '', typ: 'UL' }, { seq: 2, t: 10, wall: '', typ: 'GT' }];
    const mit = [...ohne, baueNotiz(20, 'Gegner stellt um', 3, '')];
    const z = reduziere(mit);
    expect({ ...z, t: 10 }).toEqual(reduziere(ohne));
    expect(z.hinweise).toEqual([]);
  });

  it('filtert die Notizen aus dem Log', () => {
    const log: Ereignis[] = [{ seq: 1, t: 0, wall: '', typ: 'UL' }, baueNotiz(20, 'a', 2, ''), baueNotiz(30, 'b', 3, '')];
    expect(notizen(log)).toEqual([{ t: 20, text: 'a' }, { t: 30, text: 'b' }]);
  });
});
