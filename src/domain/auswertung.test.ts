import { describe, it, expect } from 'vitest';
import type { Ereignis } from './ereignis';
import { BEISPIEL_EREIGNISSE } from './beispielspiel';
import { endeT, halbzeitstand, kennzahlenJeAbschnitt, phasen, verlauf } from './auswertung';

let n = 0;
function e(typ: string, t: number, rest: Partial<Ereignis> = {}): Ereignis {
  return { seq: ++n, t, wall: '2026-09-13T15:00:00.000Z', typ, ...rest };
}

describe('Spielende', () => {
  it('rundet auf volle fünf Minuten auf', () => {
    expect(endeT([e('I', 0, { spieler: 7 }), e('T', 610, { spieler: 7 })])).toBe(900);
  });

  it('reicht mindestens bis zur doppelten Halbzeitmarke, auf fünf Minuten gerundet', () => {
    expect(endeT([e('I', 0, { spieler: 7 }), e('HZ', 1805)])).toBe(3600);
  });

  it('ist bei einem leeren Log fünf Minuten', () => {
    expect(endeT([])).toBe(300);
  });
});

describe('Verlauf', () => {
  it('beginnt bei 0:0 und setzt nach jedem Tor einen Punkt', () => {
    const v = verlauf(BEISPIEL_EREIGNISSE);
    expect(v.punkte[0]).toEqual({ t: 0, eigen: 0, gegner: 0 });
    expect(v.punkte.at(-1)).toEqual({ t: 720, eigen: 3, gegner: 3 });
    // 3 eigene Tore + 3 Gegentore + Anfangspunkt
    expect(v.punkte).toHaveLength(7);
  });

  it('markiert Halbzeit, Auszeit und eigene Zeitstrafen', () => {
    const v = verlauf([
      e('I', 0, { spieler: 7 }), e('UL', 0),
      e('T', 60, { spieler: 7 }),
      e('AZ', 100),
      e('Z', 200, { spieler: 7 }),
      e('HZ', 1800),
      e('HZ', 3600),
    ]);
    expect(v.marken).toEqual([
      { t: 100, art: 'auszeit', text: 'Auszeit bei 1:0' },
      { t: 200, art: 'strafe', text: 'Zeitstrafe Nr. 7' },
      { t: 1800, art: 'halbzeit', text: 'Halbzeit 1:0' },
    ]);
    expect(v.endeT).toBe(3600);
  });
});

describe('Halbzeitstand', () => {
  it('ist der Stand beim ersten Abschnittswechsel', () => {
    expect(halbzeitstand(BEISPIEL_EREIGNISSE)).toEqual({ eigen: 3, gegner: 3 });
  });

  it('fehlt ohne Abschnittswechsel', () => {
    expect(halbzeitstand([e('T', 60, { spieler: 7 })])).toBeUndefined();
  });
});

describe('Kennzahlen je Abschnitt', () => {
  it('ordnet dem Abschnitt zu, der vor dem Ereignis galt', () => {
    const { abschnitte, gesamt } = kennzahlenJeAbschnitt([
      e('I', 0, { spieler: 7 }), e('I', 0, { spieler: 1 }), e('UL', 0),
      e('T', 60, { spieler: 7, pos: 2 }),
      e('F', 90, { spieler: 7 }),
      e('ST', 120, { spieler: 7 }),
      e('SF', 130, { spieler: 7 }),
      e('TF', 140, { spieler: 7 }),
      e('BV', 150, { spieler: 7 }),
      e('P', 160, { spieler: 1 }),
      e('GT', 170),
      e('HZ', 1800),
      e('Z', 1900, { spieler: 7 }),
      e('T', 2000, { spieler: 7 }),
      e('HZ', 3600),
    ]);
    expect(abschnitte).toHaveLength(2);
    expect(abschnitte[0]).toEqual({
      tore: 2, feldtore: 1, feldwuerfe: 2, quote: 0.5,
      siebenmeterTore: 1, siebenmeterVersuche: 2,
      technischeFehler: 1, ballverluste: 1, paraden: 1, zeitstrafen: 0, gegentore: 1,
    });
    expect(abschnitte[1]).toMatchObject({ tore: 1, feldtore: 1, feldwuerfe: 1, quote: 1, zeitstrafen: 1 });
    expect(gesamt).toMatchObject({ tore: 3, feldtore: 2, feldwuerfe: 3, gegentore: 1, zeitstrafen: 1 });
  });

  it('lässt die Quote ohne Feldwurf offen', () => {
    const { gesamt } = kennzahlenJeAbschnitt([e('GT', 10)]);
    expect(gesamt.quote).toBeNull();
  });
});

describe('Phasen', () => {
  it('teilt die Spielzeit in Zehn-Minuten-Blöcke bis zum Spielende', () => {
    const p = phasen(BEISPIEL_EREIGNISSE);
    // Spielende 1800 (HZ bei 900 → 2 × 900), also drei Blöcke
    expect(p.map((x) => [x.von, x.bis])).toEqual([[0, 600], [600, 1200], [1200, 1800]]);
    expect(p[0]).toMatchObject({ tore: 2, gegentore: 3, wuerfe: 4, fehler: 1 });
    expect(p[1]).toMatchObject({ tore: 1, gegentore: 0, wuerfe: 1, fehler: 0 });
  });

  it('legt ein Ereignis genau auf der Grenze in den folgenden Block', () => {
    const p = phasen([e('I', 0, { spieler: 7 }), e('T', 600, { spieler: 7 }), e('HZ', 1200)]);
    expect(p[0]?.tore).toBe(0);
    expect(p[1]?.tore).toBe(1);
  });
});
