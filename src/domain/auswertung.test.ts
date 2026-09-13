import { describe, it, expect } from 'vitest';
import type { Ereignis } from './ereignis';
import { BEISPIEL_EREIGNISSE } from './beispielspiel';
import {
  aufstellungen, endeT, gespielteZeit, halbzeitstand, kennzahlenJeAbschnitt, phasen, schlaglichter, siebenmeterBilanz,
  spielerereignisse, spielerverlauf, ueberUnterzahl, verlauf,
} from './auswertung';

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

describe('Gespielte Zeit', () => {
  it('summiert nur vorwärts laufende Spielzeit — wie die Einsatzzeit', () => {
    // Uhr um 20 Sekunden zurückkorrigiert: die Einsatzzeit wächst nicht rückwärts, der Nenner auch nicht.
    expect(gespielteZeit([e('I', 0, { spieler: 7 }), e('T', 100, { spieler: 7 }), e('U', 80, { zeit: 80 }), e('HZ', 180)]))
      .toBe(200);
    expect(gespielteZeit([])).toBe(0);
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

describe('Aufstellungen', () => {
  it('summiert Dauer und Tore je Feldbesetzung und sortiert nach Dauer', () => {
    const a = aufstellungen(BEISPIEL_EREIGNISSE);
    // 1,7,12 von 0 bis 480 (Zeitstrafe): 2 Tore, 2 Gegentore
    expect(a[0]).toEqual({ nummern: [1, 7, 12], dauer: 480, tore: 2, gegentore: 2 });
    // 1,77 von 660 bis 900: 1 Tor
    expect(a[1]).toEqual({ nummern: [1, 77], dauer: 240, tore: 1, gegentore: 0 });
    // 1,7 in Unterzahl von 480 bis 660: 1 Gegentor
    expect(a[2]).toEqual({ nummern: [1, 7], dauer: 180, tore: 0, gegentore: 1 });
  });

  it('übergeht Spannen mit leerem Feld', () => {
    expect(aufstellungen([e('UL', 0), e('GT', 30), e('I', 60, { spieler: 7 }), e('HZ', 120)]))
      .toEqual([{ nummern: [7], dauer: 60, tore: 0, gegentore: 0 }]);
  });
});

describe('Spielerverlauf', () => {
  it('liefert Feldphasen, Strafphase und Torzeiten', () => {
    const v = spielerverlauf(BEISPIEL_EREIGNISSE, 12, 1800);
    expect(v.phasen).toEqual([
      { von: 0, bis: 480, art: 'feld' },
      { von: 480, bis: 600, art: 'strafe' },
    ]);
    expect(v.tore).toEqual([]);
  });

  it('lässt eine offene Feldphase bis zum Spielende laufen und zählt Siebenmeter als Tor', () => {
    const v = spielerverlauf(BEISPIEL_EREIGNISSE, 7, 1800);
    expect(v.phasen).toEqual([{ von: 0, bis: 660, art: 'feld' }]);
    expect(v.tore).toEqual([60, 300]);
    expect(spielerverlauf(BEISPIEL_EREIGNISSE, 77, 1800).phasen)
      .toEqual([{ von: 660, bis: 1800, art: 'feld' }]);
  });

  it('beendet die Strafphase bei vorzeitiger Rückkehr', () => {
    const v = spielerverlauf([
      e('I', 0, { spieler: 7 }), e('Z', 100, { spieler: 7 }), e('I', 150, { spieler: 7 }), e('HZ', 300),
    ], 7, 300);
    expect(v.phasen).toEqual([
      { von: 0, bis: 100, art: 'feld' },
      { von: 100, bis: 150, art: 'strafe' },
      { von: 150, bis: 300, art: 'feld' },
    ]);
  });
});

describe('Spielerereignisse', () => {
  it('listet die Ereignisse der Spielerin mit dem Stand danach', () => {
    const liste = spielerereignisse(BEISPIEL_EREIGNISSE, 7);
    expect(liste.map((x) => [x.t, x.typ, x.stand])).toEqual([
      [0, 'I', '0:0'],
      [60, 'T', '1:0'],
      [300, 'ST', '2:1'],
      [360, 'SF', '2:1'],
      [660, 'W', '2:3'],
    ]);
    expect(liste[1]?.pos).toBe(2);
    expect(liste.at(-1)?.bezeichnung).toBe('Wechsel: geht für Nr. 77');
  });

  it('beschreibt den Wechsel aus Sicht der hereinkommenden Spielerin', () => {
    expect(spielerereignisse(BEISPIEL_EREIGNISSE, 77)[0]?.bezeichnung).toBe('Wechsel: kommt für Nr. 7');
  });

  it('übernimmt den Hinweis des Reduzierers', () => {
    const liste = spielerereignisse([e('T', 10, { spieler: 9 })], 9);
    expect(liste[0]?.hinweis).toContain('Nr. 9 steht nicht auf dem Feld');
  });
});

describe('Schlaglichter', () => {
  it('findet größten Vorsprung und Rückstand mit Spielzeit und Stand', () => {
    const s = schlaglichter(BEISPIEL_EREIGNISSE);
    expect(s.groessterVorsprung).toEqual({ differenz: 1, t: 60, stand: '1:0' });
    expect(s.groessterRueckstand).toEqual({ differenz: 1, t: 540, stand: '2:3' });
  });

  it('zählt Führungswechsel und Ausgleiche', () => {
    // 1:0, 1:1, 2:1, 2:2, 2:3, 3:3 — einmal wechselt die Führung, dreimal ist es ausgeglichen
    const s = schlaglichter(BEISPIEL_EREIGNISSE);
    expect(s.fuehrungswechsel).toBe(1);
    expect(s.ausgleiche).toBe(3);
  });

  it('kennt die längste Serie beider Seiten und die längste eigene torlose Phase', () => {
    const s = schlaglichter(BEISPIEL_EREIGNISSE);
    expect(s.serieEigen).toEqual({ tore: 1, von: 60, bis: 60 });
    expect(s.serieGegner).toEqual({ tore: 2, von: 420, bis: 540 });
    expect(s.torlosePhase).toEqual({ von: 300, bis: 720 });
  });

  it('nennt je Auszeit den Stand davor und die Tore in den fünf Minuten danach', () => {
    const s = schlaglichter([
      e('I', 0, { spieler: 7 }), e('UL', 0),
      e('GT', 60), e('GT', 120),
      e('AZ', 130),
      e('T', 200, { spieler: 7 }), e('T', 300, { spieler: 7 }), e('GT', 400),
      e('T', 431, { spieler: 7 }), // nach den fünf Minuten
    ]);
    expect(s.auszeiten).toEqual([{ t: 130, stand: '0:2', toreDanach: 2, gegentoreDanach: 1 }]);
  });

  it('lässt ohne Tore alles offen', () => {
    const s = schlaglichter([e('I', 0, { spieler: 7 }), e('UL', 0), e('HZ', 1800)]);
    expect(s.groessterVorsprung).toBeUndefined();
    expect(s.groessterRueckstand).toBeUndefined();
    expect(s.serieEigen).toBeUndefined();
    expect(s.serieGegner).toBeUndefined();
    expect(s.torlosePhase).toBeUndefined();
    expect(s.fuehrungswechsel).toBe(0);
  });
});

describe('Über- und Unterzahl', () => {
  it('rechnet die eigene Zeitstrafe als zwei Minuten Unterzahl mit den Gegentoren darin', () => {
    const u = ueberUnterzahl(BEISPIEL_EREIGNISSE);
    // Strafe 480–600, Gegentor bei 540; die Rückkehr bei 660 liegt schon in Gleichzahl
    expect(u.unterzahl).toEqual({ dauer: 120, situationen: 1, tore: 0, gegentore: 1 });
    expect(u.ueberzahl).toEqual({ dauer: 0, situationen: 0, tore: 0, gegentore: 0 });
  });

  it('nimmt für eine Gegnerstrafe zwei Minuten Überzahl an', () => {
    const u = ueberUnterzahl([
      e('I', 0, { spieler: 7 }), e('UL', 0),
      e('GZ', 100),
      e('T', 150, { spieler: 7 }),
      e('GT', 400),
    ]);
    expect(u.ueberzahl).toEqual({ dauer: 120, situationen: 1, tore: 1, gegentore: 0 });
    expect(u.unterzahl.dauer).toBe(0);
  });

  it('zählt gleichzeitige Strafen beider Seiten als Gleichzahl', () => {
    const u = ueberUnterzahl([
      e('I', 0, { spieler: 7 }), e('I', 0, { spieler: 8 }), e('UL', 0),
      e('Z', 100, { spieler: 7 }), e('GZ', 100),
      e('T', 150, { spieler: 8 }),
      e('HZ', 1800),
    ]);
    expect(u.ueberzahl.dauer).toBe(0);
    expect(u.unterzahl.dauer).toBe(0);
    expect(u.unterzahl.situationen).toBe(0);
  });

  it('zählt eine zweite Strafe während der ersten nicht als neue Situation', () => {
    const u = ueberUnterzahl([
      e('I', 0, { spieler: 7 }), e('I', 0, { spieler: 8 }), e('UL', 0),
      e('Z', 100, { spieler: 7 }), e('Z', 160, { spieler: 8 }),
      e('HZ', 1800),
    ]);
    expect(u.unterzahl.situationen).toBe(1);
    expect(u.unterzahl.dauer).toBe(180);
  });
});

describe('Siebenmeter-Bilanz', () => {
  it('führt eigene Siebenmeter je Werferin und die des Gegners mit Paraden', () => {
    const b = siebenmeterBilanz([
      e('I', 0, { spieler: 1 }), e('I', 0, { spieler: 7 }), e('I', 0, { spieler: 12 }), e('UL', 0),
      e('SH', 50, { spieler: 12 }), e('ST', 60, { spieler: 7 }),
      e('SH', 110, { spieler: 12 }), e('SF', 120, { spieler: 7 }),
      e('SH', 170, { spieler: 7 }), e('ST', 180, { spieler: 12 }),
      e('SV', 300, { spieler: 12 }), e('GS', 305),
      e('SV', 400, { spieler: 7 }), e('PS', 405, { spieler: 1 }),
    ]);
    expect(b.eigen).toEqual({
      tore: 2, versuche: 3,
      werferinnen: [{ nummer: 7, tore: 1, versuche: 2 }, { nummer: 12, tore: 1, versuche: 1 }],
      herausgeholt: [{ nummer: 7, anzahl: 1 }, { nummer: 12, anzahl: 2 }],
    });
    expect(b.gegner).toEqual({
      tore: 1, gehalten: 1,
      verursacht: [{ nummer: 7, anzahl: 1 }, { nummer: 12, anzahl: 1 }],
      gehaltenVon: [{ nummer: 1, anzahl: 1 }],
    });
  });

  it('ist ohne Siebenmeter überall null und leer', () => {
    const b = siebenmeterBilanz(BEISPIEL_EREIGNISSE.filter((x) => !['ST', 'SF'].includes(x.typ)));
    expect(b.eigen).toEqual({ tore: 0, versuche: 0, werferinnen: [], herausgeholt: [] });
    expect(b.gegner).toEqual({ tore: 0, gehalten: 0, verursacht: [], gehaltenVon: [] });
  });
});
