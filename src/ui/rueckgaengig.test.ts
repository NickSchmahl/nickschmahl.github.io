import { describe, it, expect } from 'vitest';
import type { Ereignis } from '../domain/ereignis';
import type { Uhrzustand } from '../domain/uhr';
import { RUECKGAENGIG_GRENZE, istRueckgaengigTaste, korrekturAnwenden, merken, zuruecknehmen } from './rueckgaengig';
import type { Stand } from './rueckgaengig';

const E = (seq: number, t: number, typ: string, rest: Partial<Ereignis> = {}): Ereignis => ({ seq, t, wall: '', typ, ...rest });

const LAEUFT: Uhrzustand = { laeuft: true, basisT: 570, basisWall: 1_000_000, abschnitt: 1 };
const STEHT_600: Uhrzustand = { laeuft: false, basisT: 600, basisWall: 1_030_000, abschnitt: 1 };

const LOG = [E(1, 0, 'UL'), E(2, 570, 'T', { spieler: 7 })];

describe('Merken', () => {
  it('legt den Stand oben auf den Stapel', () => {
    const a: Stand = { ereignisse: LOG, uhr: LAEUFT };
    const b: Stand = { ereignisse: [...LOG, E(3, 600, 'US')], uhr: STEHT_600 };
    expect(merken(merken([], a), b)).toEqual([a, b]);
  });

  it(`hält höchstens ${RUECKGAENGIG_GRENZE} Stände und vergisst die ältesten`, () => {
    let stapel: Stand[] = [];
    for (let i = 0; i < RUECKGAENGIG_GRENZE + 5; i += 1) {
      stapel = merken(stapel, { ereignisse: [E(1, i, 'GT')], uhr: LAEUFT });
    }
    expect(stapel).toHaveLength(RUECKGAENGIG_GRENZE);
    expect(stapel[0]?.ereignisse[0]?.t).toBe(5);
    expect(stapel.at(-1)?.ereignisse[0]?.t).toBe(RUECKGAENGIG_GRENZE + 4);
  });
});

describe('Korrektur im Verlauf', () => {
  it('lässt die Uhr weiterlaufen, wenn kein Uhr-Ereignis betroffen ist', () => {
    const neu = korrekturAnwenden({ ereignisse: LOG, uhr: LAEUFT }, [E(1, 0, 'UL'), E(2, 570, 'T', { spieler: 12 })]);
    expect(neu.uhr).toBe(LAEUFT);
    expect(neu.ereignisse[1]?.spieler).toBe(12);
  });

  it('hält die Uhr an und nimmt Zeit und Abschnitt aus dem Log, wenn ein Uhr-Ereignis betroffen ist', () => {
    const log = [E(1, 0, 'UL'), E(2, 1800, 'HZ'), E(3, 1800, 'UL'), E(4, 1830, 'T', { spieler: 7 })];
    const ohneStart = [E(1, 0, 'UL'), E(2, 1800, 'HZ'), E(3, 1830, 'T', { spieler: 7 })];
    const neu = korrekturAnwenden({ ereignisse: log, uhr: { ...LAEUFT, abschnitt: 2 } }, ohneStart);
    expect(neu.uhr).toMatchObject({ laeuft: false, basisT: 1830, abschnitt: 2 });
  });
});

describe('Rückgängig', () => {
  it('tut nichts mit leerem Stapel', () => {
    expect(zuruecknehmen([], { ereignisse: LOG, uhr: LAEUFT })).toBeUndefined();
  });

  it('holt das Log zurück und lässt eine laufende Uhr weiterlaufen', () => {
    const vorher: Stand = { ereignisse: LOG, uhr: { ...LAEUFT, basisT: 0, basisWall: 430_000 } };
    const aktuell: Stand = { ereignisse: [...LOG, E(3, 650, 'GT')], uhr: LAEUFT };
    const r = zuruecknehmen([vorher], aktuell);
    expect(r?.stand.ereignisse).toBe(LOG);
    expect(r?.stand.uhr).toBe(LAEUFT);
    expect(r?.stapel).toEqual([]);
  });

  it('setzt eine versehentlich angehaltene Uhr fort, als wäre sie nie angehalten worden', () => {
    const vorher: Stand = { ereignisse: LOG, uhr: LAEUFT };
    const aktuell: Stand = { ereignisse: [...LOG, E(3, 600, 'US')], uhr: STEHT_600 };
    expect(zuruecknehmen([vorher], aktuell)?.stand.uhr).toEqual(LAEUFT);
  });

  it('hält eine versehentlich gestartete Uhr wieder an, auf der alten Zeit', () => {
    const vorher: Stand = { ereignisse: [...LOG, E(3, 600, 'US')], uhr: STEHT_600 };
    const aktuell: Stand = { ereignisse: [...vorher.ereignisse, E(4, 600, 'UL')], uhr: { ...STEHT_600, laeuft: true, basisWall: 1_090_000 } };
    expect(zuruecknehmen([vorher], aktuell)?.stand.uhr).toEqual(STEHT_600);
  });

  it('nimmt einen Abschnittswechsel samt Abschnitt zurück', () => {
    const vorher: Stand = { ereignisse: LOG, uhr: LAEUFT };
    const aktuell: Stand = { ereignisse: [...LOG, E(3, 600, 'HZ')], uhr: { ...STEHT_600, abschnitt: 2 } };
    expect(zuruecknehmen([vorher], aktuell)?.stand.uhr).toEqual(LAEUFT);
  });

  it('nimmt nur den obersten Stand vom Stapel', () => {
    const a: Stand = { ereignisse: [], uhr: STEHT_600 };
    const b: Stand = { ereignisse: LOG, uhr: LAEUFT };
    expect(zuruecknehmen([a, b], { ereignisse: [...LOG, E(3, 650, 'GT')], uhr: LAEUFT })?.stapel).toEqual([a]);
  });
});

describe('Rückgängig-Taste', () => {
  const taste = (key: string, mod: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {}) =>
    ({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...mod });

  it('ist Strg+Z oder ⌘+Z', () => {
    expect(istRueckgaengigTaste(taste('z', { ctrlKey: true }))).toBe(true);
    expect(istRueckgaengigTaste(taste('z', { metaKey: true }))).toBe(true);
  });

  it('ist nicht ⌘+⇧+Z, denn das heißt auf dem Mac „Wiederholen“', () => {
    expect(istRueckgaengigTaste(taste('Z', { metaKey: true, shiftKey: true }))).toBe(false);
    expect(istRueckgaengigTaste(taste('Z', { ctrlKey: true, shiftKey: true }))).toBe(false);
  });

  it('ist weder ein einfaches Z noch eine Kombination mit Alt', () => {
    expect(istRueckgaengigTaste(taste('z'))).toBe(false);
    expect(istRueckgaengigTaste(taste('z', { ctrlKey: true, altKey: true }))).toBe(false);
  });
});
