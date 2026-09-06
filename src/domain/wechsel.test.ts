import { describe, it, expect } from 'vitest';
import { wechselrichtung } from './wechsel';

describe('Wechselrichtung', () => {
  it('wechselt die zweite Nummer ein, wenn die erste auf dem Feld steht', () => {
    expect(wechselrichtung([7], 7, 12)).toEqual({ raus: 7, rein: 12, eindeutig: true });
  });

  it('wechselt die erste Nummer ein, wenn die zweite auf dem Feld steht', () => {
    expect(wechselrichtung([12], 7, 12)).toEqual({ raus: 12, rein: 7, eindeutig: true });
  });

  it('liest bei zwei Spielern auf dem Feld die erste Nummer als die ausgewechselte', () => {
    expect(wechselrichtung([7, 12], 7, 12)).toEqual({ raus: 7, rein: 12, eindeutig: false });
  });

  it('liest bei zwei Spielern auf der Bank die erste Nummer als die ausgewechselte', () => {
    expect(wechselrichtung([], 7, 12)).toEqual({ raus: 7, rein: 12, eindeutig: false });
  });
});
