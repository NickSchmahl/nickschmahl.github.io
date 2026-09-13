# Auswertung — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Eine Auswertungsseite nach dem Spiel — Verlauf, Halbzeitvergleich, Phasen, Aufstellungen und eine Karte je Spielerin — die als einzelne HTML-Datei gespeichert und aus einer JSONL-Datei wiederhergestellt werden kann.

**Architecture:** `domain/auswertung.ts` rechnet alle Reihen aus dem Ereignis-Log, indem es den Reduzierer mitführt. `bericht/` erzeugt daraus HTML- und SVG-Text ohne DOM-Zugriff — dieselbe Funktion für die Anzeige in der App und für die Exportdatei. `ui/auswertung.ts` setzt den Text ein und verdrahtet Knöpfe; der JSONL-Export bekommt eine Kopfzeile mit Gegner, Datum und Kader, damit der Import ohne Browserzustand auskommt.

**Tech Stack:** Vite, TypeScript, Vitest. Kein Oberflächen-Framework, keine Diagrammbibliothek.

**Spec:** `docs/superpowers/specs/2026-09-13-auswertung-design.md`

## Global Constraints

- Sprache in Code, Bezeichnern, Kommentaren, Oberflächentexten: **Deutsch**.
- `src/domain/**` und `src/eingabe/**` importieren **nichts** aus `src/ui/**`, `src/persistenz/**` oder `src/bericht/**` und greifen nicht auf `document`, `window`, `indexedDB` zu.
- `src/bericht/**` importiert nur aus `src/domain/**` und `src/eingabe/**`; kein DOM-Zugriff — alle Funktionen liefern Text.
- Zeiten in **Sekunden Spielzeit**, ganzzahlig. Zeitstrafe = `STRAFDAUER` (120 s) aus `reduzierer.ts`.
- Prüfungen warnen, blockieren nie — die Auswertung zeigt Hinweise, verwirft aber keine Ereignisse.
- Freitexte (Gegner, Namen) laufen im HTML immer durch `htmlEscapen`.
- Nach jedem Task committen, Commit-Nachrichten auf Deutsch, mit `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Tests: `npm test` (Vitest, Node-Umgebung, fake-indexeddb). Typprüfung: `npx tsc --noEmit`.

## Dateien

| Datei | Verantwortung |
|---|---|
| `src/domain/katalog.ts` | + Konstante `PARADEN` |
| `src/domain/auswertung.ts` (neu) | Verlauf, Halbzeitstand, Kennzahlen je Abschnitt, Phasen, Aufstellungen, Spielerverlauf, Spielerereignisse |
| `src/bericht/html.ts` (neu) | `htmlEscapen`, `alsDatum`, `prozent` |
| `src/bericht/diagramme.ts` (neu) | SVG-Text: Verlaufskurve, Phasenbalken, Einsatzleiste |
| `src/bericht/stil.ts` (neu) | CSS des Berichts und die zwei Variablensätze |
| `src/bericht/auswertung.ts` (neu) | `berichtHtml`, `berichtDatei` |
| `src/persistenz/export.ts` | `alsJsonl` mit Kopfzeile, `ausJsonl`, Endung `html` |
| `src/ui/kader.ts` | `htmlEscapen` re-exportieren; Dateiauswahl „Spiel aus Datei auswerten" |
| `src/ui/auswertung.ts` (neu) | Bildschirm Auswertung |
| `src/ui/erfassung.ts` | Knopf „Auswertung" |
| `src/ui/tastatur.ts` | Knopf verdrahten, Tastatur ab-/anhängen, `alsJsonl` mit Kader |
| `src/main.ts` | Import verdrahten |
| `src/stil.css` | Knopfzeile der Auswertung |

---

### Task 1: Rechnung — Verlauf, Halbzeitstand, Spielende

**Files:**
- Create: `src/domain/auswertung.ts`
- Test: `src/domain/auswertung.test.ts`

**Interfaces:**
- Consumes: `schritt`, `ZUSTAND_ANFANG` aus `reduzierer.ts`; `findeEintrag` aus `katalog.ts`; `BEISPIEL_EREIGNISSE` aus `beispielspiel.ts`.
- Produces:
  ```ts
  export interface Verlaufspunkt { t: number; eigen: number; gegner: number }
  export interface Marke { t: number; art: 'halbzeit' | 'auszeit' | 'strafe'; text: string }
  export interface Verlauf { punkte: Verlaufspunkt[]; marken: Marke[]; endeT: number }
  export function endeT(ereignisse: readonly Ereignis[]): number
  export function verlauf(ereignisse: readonly Ereignis[]): Verlauf
  export function halbzeitstand(ereignisse: readonly Ereignis[]): { eigen: number; gegner: number } | undefined
  ```

- [x] **Step 1: Test schreiben**

```ts
// src/domain/auswertung.test.ts
import { describe, it, expect } from 'vitest';
import type { Ereignis } from './ereignis';
import { BEISPIEL_EREIGNISSE } from './beispielspiel';
import { endeT, halbzeitstand, verlauf } from './auswertung';

let n = 0;
export function e(typ: string, t: number, rest: Partial<Ereignis> = {}): Ereignis {
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
    expect(v.punkte.at(-1)).toEqual({ t: 720, eigen: 4, gegner: 3 });
    // 4 eigene Tore + 3 Gegentore + Anfangspunkt
    expect(v.punkte).toHaveLength(8);
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
    expect(halbzeitstand(BEISPIEL_EREIGNISSE)).toEqual({ eigen: 4, gegner: 3 });
  });

  it('fehlt ohne Abschnittswechsel', () => {
    expect(halbzeitstand([e('T', 60, { spieler: 7 })])).toBeUndefined();
  });
});
```

- [x] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run src/domain/auswertung.test.ts`
Expected: FAIL — `./auswertung` nicht gefunden.

- [x] **Step 3: Implementieren**

```ts
// src/domain/auswertung.ts
import type { Ereignis } from './ereignis';
import { findeEintrag } from './katalog';
import { schritt, ZUSTAND_ANFANG } from './reduzierer';
import type { Zustand } from './reduzierer';

/**
 * Alles hier läuft einmal durch das Log und führt den Reduzierer mit. Was zählt,
 * ist jeweils der Zustand VOR dem Ereignis: die Aufstellung, die ein Tor erlebt
 * hat, der Abschnitt, in dem ein Wurf fiel.
 */

export interface Verlaufspunkt { t: number; eigen: number; gegner: number }
export interface Marke { t: number; art: 'halbzeit' | 'auszeit' | 'strafe'; text: string }
export interface Verlauf { punkte: Verlaufspunkt[]; marken: Marke[]; endeT: number }

const FUENF_MINUTEN = 300;

const stand = (z: Zustand): string => `${z.toreEigen}:${z.toreGegner}`;

/**
 * Ende der Zeitachse: das letzte Ereignis, mindestens aber die doppelte
 * Halbzeitmarke — bei 2 × 25 Minuten Jugendspielzeit endet die Achse so bei 50,
 * nicht bei 60. Aufgerundet auf volle fünf Minuten.
 */
export function endeT(ereignisse: readonly Ereignis[]): number {
  const letzte = ereignisse.at(-1)?.t ?? 0;
  const halbzeit = ereignisse.find((e) => e.typ.toUpperCase() === 'HZ')?.t;
  const ausHalbzeit = halbzeit === undefined ? 0 : Math.round((halbzeit * 2) / FUENF_MINUTEN) * FUENF_MINUTEN;
  const roh = Math.max(letzte, ausHalbzeit, 1);
  return Math.ceil(roh / FUENF_MINUTEN) * FUENF_MINUTEN;
}

export function verlauf(ereignisse: readonly Ereignis[]): Verlauf {
  const punkte: Verlaufspunkt[] = [{ t: 0, eigen: 0, gegner: 0 }];
  const marken: Marke[] = [];
  let z = ZUSTAND_ANFANG;
  let halbzeitGesehen = false;

  for (const e of ereignisse) {
    const neu = schritt(z, e);
    if (neu.toreEigen !== z.toreEigen || neu.toreGegner !== z.toreGegner) {
      punkte.push({ t: e.t, eigen: neu.toreEigen, gegner: neu.toreGegner });
    }
    const typ = e.typ.toUpperCase();
    if (typ === 'HZ' && !halbzeitGesehen) {
      halbzeitGesehen = true;
      marken.push({ t: e.t, art: 'halbzeit', text: `Halbzeit ${stand(z)}` });
    } else if (typ === 'AZ') {
      marken.push({ t: e.t, art: 'auszeit', text: `Auszeit bei ${stand(z)}` });
    } else if (findeEintrag(e.typ)?.wirkung === 'strafe') {
      marken.push({ t: e.t, art: 'strafe', text: `Zeitstrafe Nr. ${e.spieler}` });
    }
    z = neu;
  }
  return { punkte, marken, endeT: endeT(ereignisse) };
}

export function halbzeitstand(ereignisse: readonly Ereignis[]): { eigen: number; gegner: number } | undefined {
  let z = ZUSTAND_ANFANG;
  for (const e of ereignisse) {
    if (e.typ.toUpperCase() === 'HZ') return { eigen: z.toreEigen, gegner: z.toreGegner };
    z = schritt(z, e);
  }
  return undefined;
}
```

- [x] **Step 4: Test laufen lassen — muss grün sein**

Run: `npx vitest run src/domain/auswertung.test.ts`
Expected: PASS (7 Tests).

- [x] **Step 5: Commit**

```bash
git add src/domain/auswertung.ts src/domain/auswertung.test.ts
git commit -m "Auswertung: Verlauf, Halbzeitstand und Spielende aus dem Log"
```

---

### Task 2: Rechnung — Kennzahlen je Abschnitt und Phasen

**Files:**
- Modify: `src/domain/katalog.ts` (Konstante `PARADEN`)
- Modify: `src/domain/auswertung.ts`
- Test: `src/domain/auswertung.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const PARADEN: readonly string[]  // katalog.ts: ['P', 'PS']
  export interface Teamkennzahlen {
    tore: number; feldtore: number; feldwuerfe: number; quote: number | null;
    siebenmeterTore: number; siebenmeterVersuche: number;
    technischeFehler: number; ballverluste: number; paraden: number;
    zeitstrafen: number; gegentore: number;
  }
  export function kennzahlenJeAbschnitt(ereignisse): { abschnitte: Teamkennzahlen[]; gesamt: Teamkennzahlen }
  export interface Phase { von: number; bis: number; tore: number; gegentore: number; wuerfe: number; fehler: number }
  export function phasen(ereignisse, blockSekunden = 600): Phase[]
  ```

- [x] **Step 1: Tests ergänzen**

```ts
// an src/domain/auswertung.test.ts anhängen; Import erweitern:
// import { endeT, halbzeitstand, verlauf, kennzahlenJeAbschnitt, phasen } from './auswertung';

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
    expect(p[0]).toMatchObject({ tore: 2, gegentore: 3, wuerfe: 5, fehler: 1 });
    expect(p[1]).toMatchObject({ tore: 1, gegentore: 0, wuerfe: 1, fehler: 0 });
  });

  it('legt ein Ereignis genau auf der Grenze in den folgenden Block', () => {
    const p = phasen([e('I', 0, { spieler: 7 }), e('T', 600, { spieler: 7 }), e('HZ', 1200)]);
    expect(p[0]?.tore).toBe(0);
    expect(p[1]?.tore).toBe(1);
  });
});
```

- [x] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run src/domain/auswertung.test.ts`
Expected: FAIL — `kennzahlenJeAbschnitt` ist kein Export.

- [x] **Step 3: Implementieren**

In `src/domain/katalog.ts` nach `KATALOG` ergänzen:

```ts
/** Codes, die als Parade der Torhüterin zählen. */
export const PARADEN: readonly string[] = ['P', 'PS'];
```

In `src/domain/auswertung.ts` Imports erweitern und anhängen:

```ts
import { PARADEN, findeEintrag } from './katalog';
import { TECHNISCHE_FEHLER } from './statistik';

export interface Teamkennzahlen {
  /** Alle eigenen Tore, also der Spielstand. */
  tore: number;
  feldtore: number;
  feldwuerfe: number;
  /** Feldtore je Feldwurf; null ohne Feldwurf. */
  quote: number | null;
  siebenmeterTore: number;
  siebenmeterVersuche: number;
  technischeFehler: number;
  ballverluste: number;
  paraden: number;
  zeitstrafen: number;
  gegentore: number;
}

function leereKennzahlen(): Teamkennzahlen {
  return {
    tore: 0, feldtore: 0, feldwuerfe: 0, quote: null,
    siebenmeterTore: 0, siebenmeterVersuche: 0,
    technischeFehler: 0, ballverluste: 0, paraden: 0, zeitstrafen: 0, gegentore: 0,
  };
}

function zaehle(k: Teamkennzahlen, e: Ereignis): void {
  const eintrag = findeEintrag(e.typ);
  if (!eintrag) return;
  switch (eintrag.wirkung) {
    case 'treffer': k.tore += 1; k.feldtore += 1; k.feldwuerfe += 1; break;
    case 'wurf': k.feldwuerfe += 1; break;
    case 'siebenmeter_treffer': k.tore += 1; k.siebenmeterTore += 1; k.siebenmeterVersuche += 1; break;
    case 'siebenmeter_fehl': k.siebenmeterVersuche += 1; break;
    case 'gegentor': k.gegentore += 1; break;
    case 'strafe': k.zeitstrafen += 1; break;
    case 'zaehler':
      if (TECHNISCHE_FEHLER.includes(eintrag.code)) k.technischeFehler += 1;
      else if (eintrag.code === 'BV') k.ballverluste += 1;
      else if (PARADEN.includes(eintrag.code)) k.paraden += 1;
      break;
    default: break;
  }
}

function mitQuote(k: Teamkennzahlen): Teamkennzahlen {
  return { ...k, quote: k.feldwuerfe === 0 ? null : k.feldtore / k.feldwuerfe };
}

/** Index 0 ist die erste Halbzeit. Das `HZ`-Ereignis selbst zählt noch zum ablaufenden Abschnitt. */
export function kennzahlenJeAbschnitt(
  ereignisse: readonly Ereignis[],
): { abschnitte: Teamkennzahlen[]; gesamt: Teamkennzahlen } {
  const abschnitte: Teamkennzahlen[] = [];
  const gesamt = leereKennzahlen();
  let z = ZUSTAND_ANFANG;
  for (const e of ereignisse) {
    while (abschnitte.length < z.abschnitt) abschnitte.push(leereKennzahlen());
    zaehle(abschnitte[z.abschnitt - 1]!, e);
    zaehle(gesamt, e);
    z = schritt(z, e);
  }
  return { abschnitte: abschnitte.map(mitQuote), gesamt: mitQuote(gesamt) };
}

export interface Phase {
  von: number;
  bis: number;
  tore: number;
  gegentore: number;
  /** Feldwürfe und Siebenmeter zusammen. */
  wuerfe: number;
  /** Technische Fehler und Ballverluste zusammen. */
  fehler: number;
}

export function phasen(ereignisse: readonly Ereignis[], blockSekunden = 600): Phase[] {
  const ende = endeT(ereignisse);
  const anzahl = Math.max(1, Math.ceil(ende / blockSekunden));
  const liste: Phase[] = Array.from({ length: anzahl }, (_, i) => ({
    von: i * blockSekunden,
    bis: Math.min((i + 1) * blockSekunden, ende),
    tore: 0, gegentore: 0, wuerfe: 0, fehler: 0,
  }));
  for (const e of ereignisse) {
    const phase = liste[Math.min(anzahl - 1, Math.floor(e.t / blockSekunden))]!;
    const eintrag = findeEintrag(e.typ);
    if (!eintrag) continue;
    switch (eintrag.wirkung) {
      case 'treffer': case 'siebenmeter_treffer': phase.tore += 1; phase.wuerfe += 1; break;
      case 'wurf': case 'siebenmeter_fehl': phase.wuerfe += 1; break;
      case 'gegentor': phase.gegentore += 1; break;
      case 'zaehler':
        if (TECHNISCHE_FEHLER.includes(eintrag.code) || eintrag.code === 'BV') phase.fehler += 1;
        break;
      default: break;
    }
  }
  return liste;
}
```

Den vorhandenen Import `import { findeEintrag } from './katalog';` durch die erweiterte Zeile ersetzen (nicht doppelt importieren).

- [x] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/domain/auswertung.test.ts`
Expected: PASS (11 Tests).

- [x] **Step 5: Commit**

```bash
git add src/domain/katalog.ts src/domain/auswertung.ts src/domain/auswertung.test.ts
git commit -m "Auswertung: Kennzahlen je Abschnitt und Zehn-Minuten-Phasen"
```

---

### Task 3: Rechnung — Aufstellungen, Spielerverlauf, Spielerereignisse

**Files:**
- Modify: `src/domain/auswertung.ts`
- Test: `src/domain/auswertung.test.ts`

**Interfaces:**
- Consumes: `wechselrichtung` aus `wechsel.ts`.
- Produces:
  ```ts
  export interface Aufstellung { nummern: number[]; dauer: number; tore: number; gegentore: number }
  export function aufstellungen(ereignisse): Aufstellung[]          // absteigend nach Dauer
  export interface Einsatzphase { von: number; bis: number; art: 'feld' | 'strafe' }
  export interface Spielerverlauf { phasen: Einsatzphase[]; tore: number[] }
  export function spielerverlauf(ereignisse, nummer, ende?: number): Spielerverlauf
  export interface Spielerereignis { seq: number; t: number; typ: string; bezeichnung: string; pos?: number; stand: string; hinweis?: string }
  export function spielerereignisse(ereignisse, nummer): Spielerereignis[]
  ```

- [x] **Step 1: Tests ergänzen**

```ts
// Import erweitern: aufstellungen, spielerverlauf, spielerereignisse

describe('Aufstellungen', () => {
  it('summiert Dauer und Tore je Feldbesetzung und sortiert nach Dauer', () => {
    const a = aufstellungen(BEISPIEL_EREIGNISSE);
    // 1,7,12 von 0 bis 480 (Zeitstrafe): 2 Tore, 2 Gegentore
    expect(a[0]).toEqual({ nummern: [1, 7, 12], dauer: 480, tore: 2, gegentore: 2 });
    // 1,7 in Unterzahl von 480 bis 660: 1 Gegentor
    expect(a[1]).toEqual({ nummern: [1, 7], dauer: 180, tore: 0, gegentore: 1 });
    // 1,77 von 660 bis 900: 1 Tor
    expect(a[2]).toEqual({ nummern: [1, 77], dauer: 240, tore: 1, gegentore: 0 });
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
    expect(spielerverlauf(BEISPIEL_EREIGNISSE, 77, 1800).phasen).toEqual([{ von: 660, bis: 1800, art: 'feld' }]);
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
      [300, 'ST', '2:2'],
      [360, 'SF', '2:2'],
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
```

- [x] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run src/domain/auswertung.test.ts`

- [x] **Step 3: Implementieren** (an `auswertung.ts` anhängen, Import `wechselrichtung` aus `./wechsel` ergänzen)

```ts
import { wechselrichtung } from './wechsel';

export interface Aufstellung {
  nummern: number[];
  /** Sekunden Spielzeit, die genau diese Besetzung auf dem Feld stand. */
  dauer: number;
  tore: number;
  gegentore: number;
}

/** Jede Spanne zwischen zwei Ereignissen gehört der Besetzung, die davor auf dem Feld stand. */
export function aufstellungen(ereignisse: readonly Ereignis[]): Aufstellung[] {
  const nachSchluessel = new Map<string, Aufstellung>();
  let z = ZUSTAND_ANFANG;
  let vorherT = 0;
  for (const e of ereignisse) {
    const neu = schritt(z, e);
    if (z.aufDemFeld.length > 0) {
      const schluessel = z.aufDemFeld.join(',');
      const a = nachSchluessel.get(schluessel)
        ?? { nummern: [...z.aufDemFeld], dauer: 0, tore: 0, gegentore: 0 };
      a.dauer += Math.max(0, e.t - vorherT);
      a.tore += neu.toreEigen - z.toreEigen;
      a.gegentore += neu.toreGegner - z.toreGegner;
      nachSchluessel.set(schluessel, a);
    }
    z = neu;
    vorherT = e.t;
  }
  return [...nachSchluessel.values()].sort((a, b) => b.dauer - a.dauer);
}

export interface Einsatzphase { von: number; bis: number; art: 'feld' | 'strafe' }
export interface Spielerverlauf {
  phasen: Einsatzphase[];
  /** Spielzeiten der eigenen Treffer, Feld und Siebenmeter. */
  tore: number[];
}

export function spielerverlauf(
  ereignisse: readonly Ereignis[],
  nummer: number,
  ende: number = endeT(ereignisse),
): Spielerverlauf {
  const phasen: Einsatzphase[] = [];
  const tore: number[] = [];
  let z = ZUSTAND_ANFANG;
  let feldSeit: number | undefined;
  let strafe: { seit: number; endeT: number } | undefined;

  for (const e of ereignisse) {
    const neu = schritt(z, e);
    const wirkung = findeEintrag(e.typ)?.wirkung;
    if (e.spieler === nummer && (wirkung === 'treffer' || wirkung === 'siebenmeter_treffer')) tore.push(e.t);

    const warDrauf = z.aufDemFeld.includes(nummer);
    const istDrauf = neu.aufDemFeld.includes(nummer);
    if (!warDrauf && istDrauf) feldSeit = e.t;
    if (warDrauf && !istDrauf) {
      phasen.push({ von: feldSeit ?? 0, bis: e.t, art: 'feld' });
      feldSeit = undefined;
    }

    // Die Strafe bleibt im Zustand, bis die Spielerin zurückkehrt; die
    // Strafphase endet aber spätestens nach zwei Minuten.
    const offen = neu.strafen.find((s) => s.spieler === nummer);
    if (strafe && (!offen || offen.endeT !== strafe.endeT)) {
      phasen.push({ von: strafe.seit, bis: Math.min(strafe.endeT, e.t), art: 'strafe' });
      strafe = undefined;
    }
    if (offen && !strafe) strafe = { seit: e.t, endeT: offen.endeT };

    z = neu;
  }
  if (strafe) phasen.push({ von: strafe.seit, bis: Math.min(strafe.endeT, ende), art: 'strafe' });
  if (feldSeit !== undefined) phasen.push({ von: feldSeit, bis: ende, art: 'feld' });
  return { phasen, tore };
}

export interface Spielerereignis {
  seq: number;
  t: number;
  typ: string;
  bezeichnung: string;
  pos?: number;
  /** Spielstand nach dem Ereignis. */
  stand: string;
  hinweis?: string;
}

export function spielerereignisse(ereignisse: readonly Ereignis[], nummer: number): Spielerereignis[] {
  const liste: Spielerereignis[] = [];
  let z = ZUSTAND_ANFANG;
  for (const e of ereignisse) {
    const neu = schritt(z, e);
    if (e.spieler === nummer || e.ein === nummer) {
      let bezeichnung = findeEintrag(e.typ)?.bezeichnung ?? e.typ;
      if (e.typ.toUpperCase() === 'W' && e.spieler !== undefined && e.ein !== undefined) {
        const { rein } = wechselrichtung(z.aufDemFeld, e.spieler, e.ein);
        const andere = e.spieler === nummer ? e.ein : e.spieler;
        bezeichnung = rein === nummer ? `Wechsel: kommt für Nr. ${andere}` : `Wechsel: geht für Nr. ${andere}`;
      }
      const hinweise = neu.hinweise.slice(z.hinweise.length).map((h) => h.text);
      liste.push({
        seq: e.seq, t: e.t, typ: e.typ, bezeichnung,
        ...(e.pos !== undefined ? { pos: e.pos } : {}),
        stand: `${neu.toreEigen}:${neu.toreGegner}`,
        ...(hinweise.length ? { hinweis: hinweise.join('; ') } : {}),
      });
    }
    z = neu;
  }
  return liste;
}
```

- [x] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/domain/auswertung.test.ts`
Expected: PASS (19 Tests).

- [x] **Step 5: Commit**

```bash
git add src/domain/auswertung.ts src/domain/auswertung.test.ts
git commit -m "Auswertung: Aufstellungen, Einsatzphasen und Ereignisliste je Spielerin"
```

---

### Task 4: JSONL mit Kopfzeile und Import

**Files:**
- Modify: `src/persistenz/export.ts`
- Modify: `src/ui/tastatur.ts:58-66` (Aufruf `alsJsonl`)
- Test: `src/persistenz/export.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function alsJsonl(spiel: Spiel, kader: readonly Spieler[]): string
  export interface JsonlErsatz { dateiname?: string; kader: readonly Spieler[] }
  export function ausJsonl(text: string, ersatz: JsonlErsatz): { spiel: Spiel; kader: Spieler[] }
  export function dateiname(spiel: Spiel, endung: 'jsonl' | 'csv' | 'md' | 'html'): string
  ```

- [x] **Step 1: Bestehende JSONL-Tests anpassen und neue schreiben**

In `src/persistenz/export.test.ts` den `describe`-Block zu JSONL ersetzen (Zeilen um 30–40; `SPIEL` und `EREIGNISSE` existieren dort bereits — prüfen, wie sie heißen, und die Namen übernehmen):

```ts
import { alsJsonl, alsCsv, alsMarkdown, ausJsonl, dateiname } from './export';

const KADER = [
  { nummer: 7, name: 'Sieben', torwart: false },
  { nummer: 1, name: 'Eins', torwart: true },
];

describe('JSONL', () => {
  it('schreibt zuerst eine Kopfzeile mit Gegner, Datum und Kader, dann je Ereignis eine Zeile', () => {
    const zeilen = alsJsonl({ ...SPIEL, ereignisse: EREIGNISSE }, KADER).split('\n');
    expect(zeilen).toHaveLength(EREIGNISSE.length + 1);
    expect(JSON.parse(zeilen[0] ?? '')).toEqual({ kopf: 1, gegner: SPIEL.gegner, datum: SPIEL.datum, kader: KADER });
    expect(JSON.parse(zeilen[1] ?? '')).toEqual(EREIGNISSE[0]);
  });

  it('liest die eigene Ausgabe verlustfrei zurück', () => {
    const text = alsJsonl({ ...SPIEL, ereignisse: EREIGNISSE }, KADER);
    const { spiel, kader } = ausJsonl(text, { kader: [] });
    expect(spiel.gegner).toBe(SPIEL.gegner);
    expect(spiel.datum).toBe(SPIEL.datum);
    expect(spiel.ereignisse).toEqual(EREIGNISSE);
    expect(kader).toEqual(KADER);
  });

  it('liest alte Dateien ohne Kopfzeile mit Dateinamen und Ersatzkader', () => {
    const text = EREIGNISSE.map((e) => JSON.stringify(e)).join('\n') + '\n';
    const { spiel, kader } = ausJsonl(text, { dateiname: 'spiel-2026-09-06-hamburg-nord.jsonl', kader: KADER });
    expect(spiel.gegner).toBe('hamburg nord');
    expect(spiel.datum).toBe('2026-09-06');
    expect(spiel.ereignisse).toEqual(EREIGNISSE);
    expect(kader).toEqual(KADER);
  });

  it('sortiert Ereignisse nach seq', () => {
    const text = [EREIGNISSE[1], EREIGNISSE[0]].map((e) => JSON.stringify(e)).join('\n');
    expect(ausJsonl(text, { kader: [] }).spiel.ereignisse.map((e) => e.seq)).toEqual([1, 2]);
  });

  it('nennt die Zeilennummer einer kaputten Zeile', () => {
    const text = `${JSON.stringify(EREIGNISSE[0])}\n{kaputt\n`;
    expect(() => ausJsonl(text, { kader: [] })).toThrow(/Zeile 2/);
  });

  it('fällt ohne passenden Dateinamen auf „unbekannt" zurück', () => {
    const { spiel } = ausJsonl(JSON.stringify(EREIGNISSE[0]), { dateiname: 'irgendwas.jsonl', kader: [] });
    expect(spiel.gegner).toBe('unbekannt');
    expect(spiel.datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

Voraussetzung: `EREIGNISSE` in der Testdatei muss mindestens zwei Ereignisse mit `seq` 1 und 2 enthalten — falls nicht, dort ergänzen.

- [x] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run src/persistenz/export.test.ts`

- [x] **Step 3: Implementieren**

`src/persistenz/export.ts` — Import und `alsJsonl` ersetzen, `ausJsonl` ergänzen, `dateiname`-Signatur erweitern:

```ts
import type { Ereignis, Spieler } from '../domain/ereignis';

interface JsonlKopf { kopf: 1; gegner: string; datum: string; kader: Spieler[] }

/**
 * Erste Zeile ist der Kopf mit Gegner, Datum und Kader — sonst wären in der
 * Datei nur Nummern. Der Schlüssel `kopf` kommt in keinem Ereignis vor.
 */
export function alsJsonl(spiel: Spiel, kader: readonly Spieler[]): string {
  const kopf: JsonlKopf = { kopf: 1, gegner: spiel.gegner, datum: spiel.datum, kader: [...kader] };
  return [JSON.stringify(kopf), ...spiel.ereignisse.map((e) => JSON.stringify(e))].join('\n');
}

export interface JsonlErsatz {
  /** Für Dateien ohne Kopfzeile: `spiel-JJJJ-MM-TT-<gegner>.jsonl` liefert Datum und Gegner. */
  dateiname?: string;
  /** Für Dateien ohne Kopfzeile: der Kader, der die Nummern auflöst. */
  kader: readonly Spieler[];
}

function ausDateiname(name: string | undefined): { gegner: string; datum: string } {
  const treffer = name?.match(/^spiel-(\d{4}-\d{2}-\d{2})-(.+)\.jsonl$/i);
  if (!treffer) return { gegner: 'unbekannt', datum: new Date().toISOString().slice(0, 10) };
  return { datum: treffer[1]!, gegner: treffer[2]!.replace(/-/g, ' ') };
}

export function ausJsonl(text: string, ersatz: JsonlErsatz): { spiel: Spiel; kader: Spieler[] } {
  const zeilen = text.split('\n');
  let kopf: JsonlKopf | undefined;
  const ereignisse: Ereignis[] = [];

  zeilen.forEach((zeile, i) => {
    if (zeile.trim() === '') return;
    let wert: unknown;
    try {
      wert = JSON.parse(zeile);
    } catch {
      throw new Error(`Zeile ${i + 1} ist kein gültiges JSON`);
    }
    if (typeof wert !== 'object' || wert === null) throw new Error(`Zeile ${i + 1} ist kein Objekt`);
    if ('kopf' in wert) kopf = wert as JsonlKopf;
    else ereignisse.push(wert as Ereignis);
  });
  ereignisse.sort((a, b) => a.seq - b.seq);

  const { gegner, datum } = kopf ?? ausDateiname(ersatz.dateiname);
  const kader = kopf?.kader ?? [...ersatz.kader];
  return { spiel: { id: `import-${datum}-${gegner}`, gegner, datum, ereignisse }, kader };
}
```

und

```ts
export function dateiname(spiel: Spiel, endung: 'jsonl' | 'csv' | 'md' | 'html'): string {
```

`src/ui/tastatur.ts`, in `exportieren`: `alsJsonl(ereignisse)` → `alsJsonl(aktuell, kader)`.

- [x] **Step 4: Tests und Typprüfung**

Run: `npx vitest run src/persistenz/export.test.ts && npx tsc --noEmit`
Expected: PASS, keine Typfehler.

- [x] **Step 5: Commit**

```bash
git add src/persistenz/export.ts src/persistenz/export.test.ts src/ui/tastatur.ts
git commit -m "JSONL-Export mit Kopfzeile und Import aus Datei"
```

---

### Task 5: HTML-Hilfen und Diagramme

**Files:**
- Create: `src/bericht/html.ts`
- Create: `src/bericht/diagramme.ts`
- Modify: `src/ui/kader.ts` (htmlEscapen re-exportieren)
- Test: `src/bericht/diagramme.test.ts`, `src/bericht/html.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // html.ts
  export function htmlEscapen(text: string): string
  export function alsDatum(iso: string): string        // '2026-09-13' → '13.09.2026'
  export function prozent(anteil: number | null): string // 0.625 → '63 %', null → '–'
  // diagramme.ts
  export function verlaufskurve(v: Verlauf): string
  export function phasenbalken(p: readonly Phase[]): string
  export function einsatzleiste(sv: Spielerverlauf, endeT: number, halbzeitT?: number): string
  ```

- [x] **Step 1: Tests schreiben**

```ts
// src/bericht/html.test.ts
import { describe, it, expect } from 'vitest';
import { alsDatum, htmlEscapen, prozent } from './html';

describe('HTML-Hilfen', () => {
  it('entschärft Sonderzeichen', () => {
    expect(htmlEscapen(`<b>"Tom" & 'Jerry'</b>`)).toBe('&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;');
  });
  it('schreibt das Datum deutsch', () => {
    expect(alsDatum('2026-09-13')).toBe('13.09.2026');
    expect(alsDatum('kaputt')).toBe('kaputt');
  });
  it('rundet Anteile auf ganze Prozent', () => {
    expect(prozent(0.625)).toBe('63 %');
    expect(prozent(null)).toBe('–');
  });
});
```

```ts
// src/bericht/diagramme.test.ts
import { describe, it, expect } from 'vitest';
import { einsatzleiste, phasenbalken, verlaufskurve } from './diagramme';

describe('Verlaufskurve', () => {
  const v = {
    punkte: [{ t: 0, eigen: 0, gegner: 0 }, { t: 60, eigen: 1, gegner: 0 }, { t: 120, eigen: 1, gegner: 1 }],
    marken: [
      { t: 100, art: 'auszeit' as const, text: 'Auszeit bei 1:0' },
      { t: 110, art: 'strafe' as const, text: 'Zeitstrafe Nr. 7' },
      { t: 1800, art: 'halbzeit' as const, text: 'Halbzeit 1:1' },
    ],
    endeT: 3600,
  };
  const svg = verlaufskurve(v);

  it('ist ein SVG mit Titel und Treppenlinie', () => {
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<title>Verlauf der Tordifferenz</title>');
    expect(svg).toContain('class="vk-linie"');
  });
  it('zeichnet jede Marke mit ihrer Klasse und Beschreibung', () => {
    expect(svg).toContain('class="vk-auszeit"');
    expect(svg).toContain('class="vk-strafe"');
    expect(svg).toContain('class="vk-halbzeit"');
    expect(svg).toContain('<title>Auszeit bei 1:0</title>');
  });
  it('beschriftet die Zeitachse alle zehn Minuten', () => {
    expect(svg.match(/class="vk-achse-text"/g)).toHaveLength(7); // 0,10,…,60
  });
});

describe('Phasenbalken', () => {
  it('zeichnet je Block zwei Balken und eine Beschriftung', () => {
    const svg = phasenbalken([
      { von: 0, bis: 600, tore: 3, gegentore: 2, wuerfe: 6, fehler: 1 },
      { von: 600, bis: 1200, tore: 0, gegentore: 4, wuerfe: 3, fehler: 3 },
    ]);
    expect(svg.match(/class="pb-tore"/g)).toHaveLength(2);
    expect(svg.match(/class="pb-gegentore"/g)).toHaveLength(2);
    expect(svg).toContain('>0–10<');
    expect(svg).toContain('>10–20<');
  });
});

describe('Einsatzleiste', () => {
  it('zeichnet Feld- und Strafphasen, Tore und die Halbzeit', () => {
    const svg = einsatzleiste(
      { phasen: [{ von: 0, bis: 480, art: 'feld' }, { von: 480, bis: 600, art: 'strafe' }], tore: [60, 300] },
      1800, 900,
    );
    expect(svg.match(/class="el-feld"/g)).toHaveLength(1);
    expect(svg.match(/class="el-strafe"/g)).toHaveLength(1);
    expect(svg.match(/class="el-tor"/g)).toHaveLength(2);
    expect(svg).toContain('class="el-halbzeit"');
  });
  it('kommt ohne Halbzeit aus', () => {
    expect(einsatzleiste({ phasen: [], tore: [] }, 600)).not.toContain('el-halbzeit');
  });
});
```

- [x] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `npx vitest run src/bericht`

- [x] **Step 3: Implementieren**

```ts
// src/bericht/html.ts
/**
 * Entschärft einen Text für die Einbettung in HTML, damit Namen oder Gegner mit
 * `"`, `<`, `>` etc. weder aus einem Attribut ausbrechen noch Markup einschleusen.
 */
export function htmlEscapen(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `JJJJ-MM-TT` → `TT.MM.JJJJ`; alles andere unverändert. */
export function alsDatum(iso: string): string {
  const t = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return t ? `${t[3]}.${t[2]}.${t[1]}` : iso;
}

export function prozent(anteil: number | null): string {
  return anteil === null ? '–' : `${Math.round(anteil * 100)} %`;
}
```

In `src/ui/kader.ts` die lokale `htmlEscapen`-Definition samt Kommentar entfernen und ersetzen durch:

```ts
import { htmlEscapen } from '../bericht/html';
export { htmlEscapen };
```

```ts
// src/bericht/diagramme.ts
import type { Phase, Spielerverlauf, Verlauf } from '../domain/auswertung';

/**
 * Alle Diagramme sind reiner SVG-Text mit `viewBox`, skalieren über die Breite
 * und färben ausschließlich über CSS-Klassen — so brauchen App und Exportdatei
 * nur verschiedene Variablensätze, keine zweite SVG-Fassung.
 */

const BREITE = 720;
const minuten = (t: number): string => String(Math.round(t / 60));
const runde = (x: number): string => String(Math.round(x * 10) / 10);

export function verlaufskurve(v: Verlauf): string {
  const hoehe = 220;
  const links = 36; const rechts = 12; const oben = 22; const unten = 30;
  const plotB = BREITE - links - rechts;
  const plotH = hoehe - oben - unten;
  const mitte = oben + plotH / 2;
  const diffs = v.punkte.map((p) => p.eigen - p.gegner);
  const maxAbw = Math.max(3, ...diffs.map(Math.abs));
  const x = (t: number): number => links + (t / v.endeT) * plotB;
  const y = (d: number): number => mitte - (d / maxAbw) * (plotH / 2);

  // Treppe: nach jedem Tor springt die Differenz senkrecht, dazwischen läuft sie waagerecht.
  let pfad = `M${runde(x(0))},${runde(y(0))}`;
  for (const p of v.punkte.slice(1)) pfad += ` H${runde(x(p.t))} V${runde(y(p.eigen - p.gegner))}`;
  pfad += ` H${runde(x(v.endeT))}`;
  const flaeche = `${pfad} V${runde(mitte)} H${runde(x(0))} Z`;

  const achse: string[] = [];
  for (let t = 0; t <= v.endeT; t += 600) {
    achse.push(`<line class="vk-raster" x1="${runde(x(t))}" y1="${oben}" x2="${runde(x(t))}" y2="${oben + plotH}"/>`);
    achse.push(`<text class="vk-achse-text" x="${runde(x(t))}" y="${hoehe - 10}" text-anchor="middle">${minuten(t)}</text>`);
  }
  const yText = (d: number): string =>
    `<text class="vk-achse-text" x="${links - 6}" y="${runde(y(d) + 4)}" text-anchor="end">${d > 0 ? '+' : ''}${d}</text>`;

  const marken = v.marken.map((m) => {
    const mx = runde(x(m.t));
    const titel = `<title>${m.text}</title>`;
    if (m.art === 'halbzeit') {
      return `<g class="vk-halbzeit">${titel}<line x1="${mx}" y1="${oben}" x2="${mx}" y2="${oben + plotH}"/>` +
        `<text x="${mx}" y="${oben - 8}" text-anchor="middle">HZ</text></g>`;
    }
    if (m.art === 'auszeit') {
      const by = oben + plotH;
      return `<polygon class="vk-auszeit" points="${mx},${by - 8} ${Number(mx) - 5},${by} ${Number(mx) + 5},${by}">${titel}</polygon>`;
    }
    return `<line class="vk-strafe" x1="${mx}" y1="${oben}" x2="${mx}" y2="${oben + 10}">${titel}</line>`;
  });

  return `<svg viewBox="0 0 ${BREITE} ${hoehe}" width="100%" role="img" class="diagramm verlaufskurve">` +
    `<title>Verlauf der Tordifferenz</title>` +
    `<defs>` +
    `<clipPath id="vk-oben"><rect x="0" y="0" width="${BREITE}" height="${runde(mitte)}"/></clipPath>` +
    `<clipPath id="vk-unten"><rect x="0" y="${runde(mitte)}" width="${BREITE}" height="${hoehe}"/></clipPath>` +
    `</defs>` +
    achse.join('') +
    `<path class="vk-plus" d="${flaeche}" clip-path="url(#vk-oben)"/>` +
    `<path class="vk-minus" d="${flaeche}" clip-path="url(#vk-unten)"/>` +
    `<line class="vk-null" x1="${links}" y1="${runde(mitte)}" x2="${BREITE - rechts}" y2="${runde(mitte)}"/>` +
    yText(maxAbw) + yText(0) + yText(-maxAbw) +
    `<path class="vk-linie" d="${pfad}"/>` +
    marken.join('') +
    `</svg>`;
}

export function phasenbalken(p: readonly Phase[]): string {
  const hoehe = 180;
  const oben = 22; const unten = 26; const seite = 12;
  const plotH = hoehe - oben - unten;
  const gruppe = (BREITE - 2 * seite) / Math.max(1, p.length);
  const balken = Math.min(40, gruppe * 0.3);
  const max = Math.max(1, ...p.map((x) => Math.max(x.tore, x.gegentore)));
  const h = (wert: number): number => (wert / max) * plotH;
  const grund = oben + plotH;

  const teile = p.map((phase, i) => {
    const mitteX = seite + gruppe * (i + 0.5);
    const xt = mitteX - balken - 2;
    const xg = mitteX + 2;
    return `<rect class="pb-tore" x="${runde(xt)}" y="${runde(grund - h(phase.tore))}" width="${runde(balken)}" height="${runde(h(phase.tore))}"><title>${phase.tore} Tore</title></rect>` +
      `<text class="pb-wert" x="${runde(xt + balken / 2)}" y="${runde(grund - h(phase.tore) - 4)}" text-anchor="middle">${phase.tore}</text>` +
      `<rect class="pb-gegentore" x="${runde(xg)}" y="${runde(grund - h(phase.gegentore))}" width="${runde(balken)}" height="${runde(h(phase.gegentore))}"><title>${phase.gegentore} Gegentore</title></rect>` +
      `<text class="pb-wert" x="${runde(xg + balken / 2)}" y="${runde(grund - h(phase.gegentore) - 4)}" text-anchor="middle">${phase.gegentore}</text>` +
      `<text class="pb-achse-text" x="${runde(mitteX)}" y="${hoehe - 8}" text-anchor="middle">${minuten(phase.von)}–${minuten(phase.bis)}</text>`;
  });

  return `<svg viewBox="0 0 ${BREITE} ${hoehe}" width="100%" role="img" class="diagramm phasenbalken">` +
    `<title>Tore und Gegentore je Zehn-Minuten-Block</title>` +
    `<line class="pb-grund" x1="${seite}" y1="${grund}" x2="${BREITE - seite}" y2="${grund}"/>` +
    teile.join('') +
    `</svg>`;
}

export function einsatzleiste(sv: Spielerverlauf, endeT: number, halbzeitT?: number): string {
  const hoehe = 26;
  const oben = 9; const leisteH = 12;
  const x = (t: number): number => (t / Math.max(1, endeT)) * BREITE;

  const phasen = sv.phasen.map((p) =>
    `<rect class="el-${p.art}" x="${runde(x(p.von))}" y="${oben}" width="${runde(Math.max(1, x(p.bis) - x(p.von)))}" height="${leisteH}"/>`);
  const tore = sv.tore.map((t) =>
    `<circle class="el-tor" cx="${runde(x(t))}" cy="${oben - 4}" r="3"><title>Tor in Minute ${minuten(t)}</title></circle>`);
  const halbzeit = halbzeitT === undefined ? '' :
    `<line class="el-halbzeit" x1="${runde(x(halbzeitT))}" y1="0" x2="${runde(x(halbzeitT))}" y2="${hoehe}"/>`;

  return `<svg viewBox="0 0 ${BREITE} ${hoehe}" width="100%" role="img" class="diagramm einsatzleiste" preserveAspectRatio="none">` +
    `<title>Einsatzzeiten</title>` +
    `<rect class="el-grund" x="0" y="${oben}" width="${BREITE}" height="${leisteH}"/>` +
    phasen.join('') + halbzeit + tore.join('') +
    `</svg>`;
}
```

- [x] **Step 4: Tests, Typprüfung, Gesamtlauf**

Run: `npx vitest run && npx tsc --noEmit`
Expected: alle grün; die Kader-Tests laufen weiter, weil `htmlEscapen` re-exportiert wird.

- [x] **Step 5: Commit**

```bash
git add src/bericht/html.ts src/bericht/html.test.ts src/bericht/diagramme.ts src/bericht/diagramme.test.ts src/ui/kader.ts
git commit -m "Bericht: HTML-Hilfen und SVG-Diagramme für Verlauf, Phasen und Einsatzzeiten"
```

---

### Task 6: Bericht — Stil und HTML

**Files:**
- Create: `src/bericht/stil.ts`
- Create: `src/bericht/auswertung.ts`
- Test: `src/bericht/auswertung.test.ts`

**Interfaces:**
- Consumes: alles aus `domain/auswertung.ts`, `statistik()` aus `domain/statistik.ts`, `reduziere` aus `domain/reduzierer.ts`, `KATALOG`, `PARADEN`, `findeEintrag` aus `domain/katalog.ts`, `alsUhrzeit`, `POSITIONEN` aus `eingabe/grammatik.ts`, Diagramme und Hilfen aus Task 5.
- Produces:
  ```ts
  // stil.ts
  export const BERICHT_CSS: string       // Regeln, alle unter `.bericht`
  export const BERICHT_DUNKEL: string    // `.bericht { --b-…: … }`
  export const BERICHT_HELL: string
  // auswertung.ts
  export interface Spielbericht { gegner: string; datum: string; ereignisse: readonly Ereignis[] }
  export function berichtHtml(spiel: Spielbericht, kader: readonly Spieler[]): string
  export function berichtDatei(spiel: Spielbericht, kader: readonly Spieler[], erstelltAm?: Date): string
  ```

- [x] **Step 1: Test schreiben**

```ts
// src/bericht/auswertung.test.ts
import { describe, it, expect } from 'vitest';
import { BEISPIEL_EREIGNISSE, BEISPIEL_KADER } from '../domain/beispielspiel';
import { berichtDatei, berichtHtml } from './auswertung';

const SPIEL = { gegner: 'TSV <Beispiel> & Co', datum: '2026-09-13', ereignisse: BEISPIEL_EREIGNISSE };

describe('Bericht', () => {
  const html = berichtHtml(SPIEL, BEISPIEL_KADER);

  it('nennt Gegner, Datum, Endstand und Halbzeitstand — mit entschärftem Gegnernamen', () => {
    expect(html).toContain('Spiel gegen TSV &lt;Beispiel&gt; &amp; Co');
    expect(html).not.toContain('<Beispiel>');
    expect(html).toContain('13.09.2026');
    expect(html).toContain('class="endstand">4:3<');
    expect(html).toContain('Halbzeit 4:3');
  });

  it('enthält alle vier Abschnitte der Mannschaft', () => {
    for (const titel of ['Verlauf', 'Kennzahlen', 'Phasen', 'Aufstellungen']) expect(html).toContain(`<h2>${titel}</h2>`);
    expect(html).toContain('class="diagramm verlaufskurve"');
    expect(html).toContain('class="diagramm phasenbalken"');
  });

  it('hat je Spielerin eine Karte mit Einsatzleiste und Ereignisliste', () => {
    for (const s of BEISPIEL_KADER) expect(html).toContain(`id="nr-${s.nummer}"`);
    expect(html.match(/class="diagramm einsatzleiste"/g)).toHaveLength(BEISPIEL_KADER.length);
    expect(html).toContain('<summary>5 Ereignisse</summary>'); // Nr. 7: I, T, ST, SF, W
    expect(html).toContain('Rückraum links');                   // Position am Tor der Nr. 7
  });

  it('zeigt bei der Torhüterin Paraden und Fangquote statt Würfen', () => {
    const karte = html.slice(html.indexOf('id="nr-1"'), html.indexOf('id="nr-7"'));
    expect(karte).toContain('<dt>Paraden</dt><dd>1</dd>');
    expect(karte).toContain('<dt>Fangquote</dt><dd>25 %</dd>'); // 1 Parade, 3 Gegentore
    expect(karte).not.toContain('<dt>Tore</dt>');
  });

  it('zeigt die Aufstellung mit der längsten Einsatzzeit zuerst', () => {
    const abschnitt = html.slice(html.indexOf('<h2>Aufstellungen</h2>'), html.indexOf('<h2>Spielerinnen</h2>'));
    expect(abschnitt.indexOf('08:00')).toBeLessThan(abschnitt.indexOf('04:00'));
  });

  it('listet die Zähler ungleich null je Spielerin', () => {
    const karte = html.slice(html.indexOf('id="nr-12"'), html.indexOf('id="nr-77"'));
    expect(karte).toContain('1× Technischer Fehler');
    expect(karte).toContain('1× Zeitstrafe');
    expect(karte).not.toContain('Assist');
  });

  it('meldet die Zahl der Prüfhinweise', () => {
    expect(html).toContain('Keine Auffälligkeiten');
  });
});

describe('Berichtsdatei', () => {
  it('ist ein vollständiges HTML-Dokument mit eingebettetem Stil', () => {
    const datei = berichtDatei(SPIEL, BEISPIEL_KADER, new Date('2026-09-13T18:00:00Z'));
    expect(datei.startsWith('<!doctype html>')).toBe(true);
    expect(datei).toContain('<meta charset="utf-8">');
    expect(datei).toContain('<title>Spiel gegen TSV &lt;Beispiel&gt; &amp; Co · 13.09.2026</title>');
    expect(datei).toContain('<style>');
    expect(datei).toContain('--b-grund: #ffffff');
    expect(datei).toContain('Erstellt mit Handball-Tracker am 13.09.2026');
  });
});
```

- [x] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx vitest run src/bericht/auswertung.test.ts`

- [x] **Step 3: Stil implementieren**

```ts
// src/bericht/stil.ts
/**
 * Der Bericht bringt sein CSS als Text mit, damit die Exportdatei ohne die App
 * auskommt. Farben hängen ausschließlich an `--b-*`-Variablen; die App setzt den
 * dunklen Satz, die Datei den hellen.
 */
export const BERICHT_DUNKEL = `.bericht {
  --b-grund: #0d1b2a; --b-flaeche: #1b263b; --b-rand: #2e4057;
  --b-schrift: #e0e6ed; --b-gedaempft: #8fa3bf;
  --b-gut: #2ec4a6; --b-schlecht: #e5484d; --b-hervor: #f2c744;
  --b-gut-flaeche: rgba(46,196,166,.25); --b-schlecht-flaeche: rgba(229,72,77,.25);
}`;

export const BERICHT_HELL = `.bericht {
  --b-grund: #ffffff; --b-flaeche: #f3f5f8; --b-rand: #d5dbe3;
  --b-schrift: #14202e; --b-gedaempft: #5b6b80;
  --b-gut: #158f76; --b-schlecht: #c8353a; --b-hervor: #b8860b;
  --b-gut-flaeche: rgba(21,143,118,.18); --b-schlecht-flaeche: rgba(200,53,58,.18);
}`;

export const BERICHT_CSS = `
.bericht { background: var(--b-grund); color: var(--b-schrift); font: 15px/1.45 system-ui, sans-serif; max-width: 60rem; margin: 0 auto; padding: 1rem 1.25rem 2rem; }
.bericht h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
.bericht h2 { font-size: 1.15rem; margin: 2rem 0 .5rem; padding-bottom: .25rem; border-bottom: 1px solid var(--b-rand); }
.bericht h3 { font-size: 1.05rem; margin: 0; display: flex; align-items: baseline; gap: .5rem; }
.bericht .kopf { display: flex; flex-wrap: wrap; align-items: baseline; gap: 1rem 2rem; }
.bericht .kopf .endstand { font-size: 2.4rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.bericht .kopf .halbzeit, .bericht .kopf .datum { color: var(--b-gedaempft); }
.bericht .pruefung summary { cursor: pointer; }
.bericht .pruefung.auffaellig summary { color: var(--b-schlecht); }
.bericht .pruefung ul { margin: .25rem 0; padding-left: 1.25rem; font-size: .9rem; }
.bericht table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
.bericht th, .bericht td { text-align: left; padding: .3rem .5rem; border-bottom: 1px solid var(--b-rand); }
.bericht th.zahl, .bericht td.zahl { text-align: right; }
.bericht thead th { color: var(--b-gedaempft); font-weight: 600; }
.bericht .hinweis { color: var(--b-gedaempft); font-size: .9rem; }
.bericht .diagramm { display: block; margin: .5rem 0; }
.bericht .spielerin { background: var(--b-flaeche); border: 1px solid var(--b-rand); border-radius: 8px; padding: .75rem 1rem; margin: .75rem 0; }
.bericht .spielerin .nr { font-size: 1.4rem; font-weight: 700; min-width: 2.2rem; }
.bericht .spielerin .rolle { color: var(--b-gedaempft); font-size: .85rem; }
.bericht .werte { display: flex; flex-wrap: wrap; gap: .25rem 1.5rem; margin: .5rem 0 0; }
.bericht .werte div { display: flex; gap: .4rem; align-items: baseline; }
.bericht .werte dt { color: var(--b-gedaempft); font-size: .85rem; }
.bericht .werte dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
.bericht .zaehler { margin: .35rem 0 0; color: var(--b-gedaempft); font-size: .9rem; }
.bericht .plusminus.plus { color: var(--b-gut); }
.bericht .plusminus.minus { color: var(--b-schlecht); }
.bericht .spielerin details { margin-top: .5rem; }
.bericht .spielerin summary { cursor: pointer; color: var(--b-gedaempft); }
.bericht .warnung { color: var(--b-schlecht); }
.bericht .fuss { margin-top: 3rem; color: var(--b-gedaempft); font-size: .85rem; }

.bericht .vk-raster { stroke: var(--b-rand); stroke-width: 1; }
.bericht .vk-null { stroke: var(--b-gedaempft); stroke-width: 1.5; }
.bericht .vk-linie { fill: none; stroke: var(--b-schrift); stroke-width: 2.5; stroke-linejoin: round; }
.bericht .vk-plus { fill: var(--b-gut-flaeche); }
.bericht .vk-minus { fill: var(--b-schlecht-flaeche); }
.bericht .vk-achse-text { fill: var(--b-gedaempft); font-size: 12px; }
.bericht .vk-halbzeit line { stroke: var(--b-gedaempft); stroke-dasharray: 4 4; }
.bericht .vk-halbzeit text { fill: var(--b-gedaempft); font-size: 12px; }
.bericht .vk-auszeit { fill: var(--b-hervor); }
.bericht .vk-strafe { stroke: var(--b-schlecht); stroke-width: 3; }
.bericht .pb-grund { stroke: var(--b-gedaempft); }
.bericht .pb-tore { fill: var(--b-gut); }
.bericht .pb-gegentore { fill: var(--b-schlecht); }
.bericht .pb-wert { fill: var(--b-schrift); font-size: 12px; }
.bericht .pb-achse-text { fill: var(--b-gedaempft); font-size: 12px; }
.bericht .el-grund { fill: var(--b-rand); }
.bericht .el-feld { fill: var(--b-gut); }
.bericht .el-strafe { fill: var(--b-schlecht); }
.bericht .el-tor { fill: var(--b-hervor); }
.bericht .el-halbzeit { stroke: var(--b-gedaempft); stroke-dasharray: 3 3; }
`;
```

- [x] **Step 4: Bericht implementieren**

```ts
// src/bericht/auswertung.ts
import type { Ereignis, Spieler } from '../domain/ereignis';
import {
  aufstellungen, halbzeitstand, kennzahlenJeAbschnitt, phasen, spielerereignisse, spielerverlauf, verlauf,
} from '../domain/auswertung';
import type { Teamkennzahlen } from '../domain/auswertung';
import { KATALOG, PARADEN } from '../domain/katalog';
import { reduziere } from '../domain/reduzierer';
import { statistik } from '../domain/statistik';
import type { SpielerStatistik } from '../domain/statistik';
import { POSITIONEN, alsUhrzeit } from '../eingabe/grammatik';
import { einsatzleiste, phasenbalken, verlaufskurve } from './diagramme';
import { alsDatum, htmlEscapen, prozent } from './html';
import { BERICHT_CSS, BERICHT_HELL } from './stil';

/** Was der Bericht vom Spiel braucht — `Spiel` aus der Persistenz passt strukturell. */
export interface Spielbericht {
  gegner: string;
  datum: string;
  ereignisse: readonly Ereignis[];
}

/** Codes, deren Zählung bereits in den Kopfwerten der Karte steckt. */
const IN_KOPFWERTEN: readonly string[] = ['T', 'F', 'FB', 'ST', 'SF', 'PT', 'I', 'O', 'W', ...PARADEN];

const zahl = (n: number): string => `<td class="zahl">${n}</td>`;
const vorzeichen = (n: number): string => (n > 0 ? `+${n}` : String(n));

function kopf(spiel: Spielbericht, endstand: string, hinweise: { t: number; text: string }[]): string {
  const hz = halbzeitstand(spiel.ereignisse);
  const pruefung = hinweise.length === 0
    ? `<details class="pruefung"><summary>Keine Auffälligkeiten in der Erfassung</summary></details>`
    : `<details class="pruefung auffaellig"><summary>${hinweise.length} Punkte zum Prüfen</summary><ul>` +
      hinweise.map((h) => `<li>${alsUhrzeit(h.t)} — ${htmlEscapen(h.text)}</li>`).join('') +
      `</ul></details>`;
  return `<header>
    <h1>Spiel gegen ${htmlEscapen(spiel.gegner)}</h1>
    <div class="kopf">
      <span class="endstand">${endstand}</span>
      ${hz ? `<span class="halbzeit">Halbzeit ${hz.eigen}:${hz.gegner}</span>` : ''}
      <span class="datum">${alsDatum(spiel.datum)}</span>
    </div>
    ${pruefung}
  </header>`;
}

function kennzahlenTabelle(abschnitte: Teamkennzahlen[], gesamt: Teamkennzahlen): string {
  const spalten = [...abschnitte.map((_, i) => (i < 2 ? `HZ${i + 1}` : `${i + 1}. Abschnitt`)), 'Gesamt'];
  const werte = [...abschnitte, gesamt];
  const zeile = (name: string, f: (k: Teamkennzahlen) => string): string =>
    `<tr><td>${name}</td>${werte.map((k) => `<td class="zahl">${f(k)}</td>`).join('')}</tr>`;
  return `<table>
    <thead><tr><th></th>${spalten.map((s) => `<th class="zahl">${s}</th>`).join('')}</tr></thead>
    <tbody>
      ${zeile('Tore', (k) => String(k.tore))}
      ${zeile('Feldwürfe (Tore/Würfe)', (k) => `${k.feldtore}/${k.feldwuerfe}`)}
      ${zeile('Wurfquote', (k) => prozent(k.quote))}
      ${zeile('Siebenmeter (Tore/Versuche)', (k) => `${k.siebenmeterTore}/${k.siebenmeterVersuche}`)}
      ${zeile('Technische Fehler', (k) => String(k.technischeFehler))}
      ${zeile('Ballverluste', (k) => String(k.ballverluste))}
      ${zeile('Paraden', (k) => String(k.paraden))}
      ${zeile('Zeitstrafen', (k) => String(k.zeitstrafen))}
      ${zeile('Gegentore', (k) => String(k.gegentore))}
    </tbody>
  </table>`;
}

function phasenAbschnitt(ereignisse: readonly Ereignis[]): string {
  const p = phasen(ereignisse);
  const min = (t: number): string => String(Math.round(t / 60));
  return phasenbalken(p) + `<table>
    <thead><tr><th>Minuten</th><th class="zahl">Tore</th><th class="zahl">Gegentore</th><th class="zahl">Würfe</th><th class="zahl">Fehler</th></tr></thead>
    <tbody>${p.map((x) =>
      `<tr><td>${min(x.von)}–${min(x.bis)}</td>${zahl(x.tore)}${zahl(x.gegentore)}${zahl(x.wuerfe)}${zahl(x.fehler)}</tr>`).join('')}
    </tbody>
  </table>
  <p class="hinweis">Fehler = technische Fehler und Ballverluste. Würfe einschließlich Siebenmeter.</p>`;
}

function aufstellungenAbschnitt(ereignisse: readonly Ereignis[], nameVon: (n: number) => string): string {
  const liste = aufstellungen(ereignisse).slice(0, 3);
  const wechselErfasst = ereignisse.some((e) => e.t > 0 && ['W', 'I', 'O'].includes(e.typ.toUpperCase()));
  if (liste.length === 0) return `<p class="hinweis">Keine Aufstellung erfasst.</p>`;
  return `<table>
    <thead><tr><th>Besetzung</th><th class="zahl">Dauer</th><th class="zahl">Tore</th><th class="zahl">Gegentore</th></tr></thead>
    <tbody>${liste.map((a) =>
      `<tr><td>${a.nummern.map(nameVon).join(', ')}</td><td class="zahl">${alsUhrzeit(a.dauer)}</td>${zahl(a.tore)}${zahl(a.gegentore)}</tr>`).join('')}
    </tbody>
  </table>` + (wechselErfasst ? '' : `<p class="hinweis">Keine Wechsel erfasst — gezeigt wird nur die Startaufstellung.</p>`);
}

function zaehlerZeile(w: SpielerStatistik): string {
  const teile = KATALOG
    .filter((k) => !IN_KOPFWERTEN.includes(k.code) && (w.zaehler[k.code] ?? 0) > 0)
    .map((k) => `${w.zaehler[k.code]}× ${htmlEscapen(k.bezeichnung)}`);
  return teile.length ? `<p class="zaehler">${teile.join(' · ')}</p>` : '';
}

function spielerinKarte(
  s: Spieler,
  w: SpielerStatistik,
  ereignisse: readonly Ereignis[],
  endeT: number,
  gespielt: number,
  halbzeitT: number | undefined,
): string {
  const liste = spielerereignisse(ereignisse, s.nummer);
  const nichtEingesetzt = w.einsatzzeit === 0 && liste.length === 0;
  const anteil = gespielt > 0 ? ` <small>${prozent(w.einsatzzeit / gespielt)}</small>` : '';
  const paraden = PARADEN.reduce((summe, code) => summe + (w.zaehler[code] ?? 0), 0);
  const fangquote = paraden + w.gegentoreImEinsatz === 0 ? null : paraden / (paraden + w.gegentoreImEinsatz);

  const wert = (dt: string, dd: string): string => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
  const werte = s.torwart
    ? wert('Paraden', String(paraden)) + wert('Gegentore im Einsatz', String(w.gegentoreImEinsatz)) + wert('Fangquote', prozent(fangquote))
    : wert('Tore', `${w.tore}/${w.wuerfe} <small>${prozent(w.wurfquote)}</small>`) +
      (w.siebenmeterVersuche > 0 ? wert('Siebenmeter', `${w.siebenmeterTore}/${w.siebenmeterVersuche}`) : '');
  const plusminus = `<span class="plusminus ${w.plusMinus > 0 ? 'plus' : w.plusMinus < 0 ? 'minus' : ''}">${vorzeichen(w.plusMinus)}</span>`;

  const ereignisZeilen = liste.map((x) => {
    const position = x.pos !== undefined ? ` · ${POSITIONEN[x.pos] ?? x.pos}` : '';
    const warnung = x.hinweis ? ` <span class="warnung">⚠ ${htmlEscapen(x.hinweis)}</span>` : '';
    return `<tr><td>${alsUhrzeit(x.t)}</td><td>${htmlEscapen(x.bezeichnung)}${position}${warnung}</td><td class="zahl">${x.stand}</td></tr>`;
  }).join('');

  return `<section class="spielerin" id="nr-${s.nummer}">
    <h3><span class="nr">${s.nummer}</span> ${htmlEscapen(s.name)}${s.torwart ? ' <span class="rolle">Torhüterin</span>' : ''}</h3>
    ${nichtEingesetzt ? `<p class="hinweis">Nicht eingesetzt.</p>` : `
    <dl class="werte">
      ${wert('Einsatz', `${alsUhrzeit(w.einsatzzeit)}${anteil}`)}
      ${werte}
      ${wert('+/−', plusminus)}
    </dl>
    ${zaehlerZeile(w)}
    ${einsatzleiste(spielerverlauf(ereignisse, s.nummer, endeT), endeT, halbzeitT)}
    <details><summary>${liste.length} ${liste.length === 1 ? 'Ereignis' : 'Ereignisse'}</summary>
      <table><tbody>${ereignisZeilen}</tbody></table>
    </details>`}
  </section>`;
}

export function berichtHtml(spiel: Spielbericht, kader: readonly Spieler[]): string {
  const { ereignisse } = spiel;
  const zustand = reduziere(ereignisse);
  const v = verlauf(ereignisse);
  const gespielt = ereignisse.at(-1)?.t ?? 0;
  const werte = statistik(ereignisse, kader, gespielt);
  const werteVon = new Map(werte.map((w) => [w.nummer, w]));
  const nameVon = (n: number): string => {
    const s = kader.find((k) => k.nummer === n);
    return s ? `${n} ${htmlEscapen(s.name)}${s.torwart ? ' (TW)' : ''}` : `Nr. ${n}`;
  };
  const tVon = new Map(ereignisse.map((e) => [e.seq, e.t]));
  const hinweise = zustand.hinweise.map((h) => ({ t: tVon.get(h.seq) ?? 0, text: h.text }));
  const halbzeitT = v.marken.find((m) => m.art === 'halbzeit')?.t;
  const { abschnitte, gesamt } = kennzahlenJeAbschnitt(ereignisse);
  const sortiert = [...kader].sort((a, b) => a.nummer - b.nummer);

  return `<article class="bericht">
    ${kopf(spiel, `${zustand.toreEigen}:${zustand.toreGegner}`, hinweise)}
    <h2>Verlauf</h2>
    ${verlaufskurve(v)}
    <p class="hinweis">Tordifferenz über die Spielzeit. Gestrichelt: Halbzeit. Dreieck: Auszeit. Roter Strich oben: eigene Zeitstrafe.</p>
    <h2>Kennzahlen</h2>
    ${kennzahlenTabelle(abschnitte, gesamt)}
    <h2>Phasen</h2>
    ${phasenAbschnitt(ereignisse)}
    <h2>Aufstellungen</h2>
    ${aufstellungenAbschnitt(ereignisse, nameVon)}
    <h2>Spielerinnen</h2>
    ${sortiert.map((s) => spielerinKarte(
      s,
      werteVon.get(s.nummer) ?? statistik([], [s])[0]!,
      ereignisse, v.endeT, gespielt, halbzeitT,
    )).join('')}
  </article>`;
}

export function berichtDatei(spiel: Spielbericht, kader: readonly Spieler[], erstelltAm: Date = new Date()): string {
  const titel = `Spiel gegen ${htmlEscapen(spiel.gegner)} · ${alsDatum(spiel.datum)}`;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titel}</title>
<style>
body { margin: 0; background: #ffffff; }
${BERICHT_HELL}
${BERICHT_CSS}
</style>
</head>
<body>
${berichtHtml(spiel, kader)}
<p class="fuss bericht">Erstellt mit Handball-Tracker am ${alsDatum(erstelltAm.toISOString().slice(0, 10))}</p>
</body>
</html>
`;
}
```

Hinweis: `.fuss` bekommt zusätzlich die Klasse `bericht`, damit die Farbvariablen greifen; der Innenabstand des `.bericht`-Blocks ist dafür in Ordnung.

- [x] **Step 5: Tests, Typprüfung**

Run: `npx vitest run && npx tsc --noEmit`
Expected: alle grün. Falls die Fangquote-Erwartung nicht stimmt: `gegentoreImEinsatz` der Nr. 1 im Beispielspiel nachrechnen (drei Gegentore, Nr. 1 durchgehend auf dem Feld → 3) und den Test anpassen, nicht die Rechnung.

- [x] **Step 6: Commit**

```bash
git add src/bericht/stil.ts src/bericht/auswertung.ts src/bericht/auswertung.test.ts
git commit -m "Bericht: Auswertungsseite als HTML mit eingebettetem Stil"
```

---

### Task 7: Bildschirm Auswertung und Verdrahtung

**Files:**
- Create: `src/ui/auswertung.ts`
- Modify: `src/ui/erfassung.ts:139-143` (Knopf)
- Modify: `src/ui/tastatur.ts` (Knopf verdrahten)
- Modify: `src/ui/kader.ts` (Dateiauswahl)
- Modify: `src/main.ts`
- Modify: `src/stil.css`

**Interfaces:**
- Produces:
  ```ts
  export interface AuswertungOptionen {
    zurueck?: () => void;                 // „Zurück zur Erfassung"
    beenden?: () => Promise<void> | void; // „Spiel beenden"
    zumStart?: () => void;                // „Zum Start" nach Import
  }
  export function zeigeAuswertung(wurzel: HTMLElement, spiel: Spiel, kader: readonly Spieler[], optionen: AuswertungOptionen): void
  // kader.ts
  export async function zeigeKader(wurzel, weiter, auswerten?: (datei: File, ersatzKader: readonly Spieler[]) => Promise<void>): Promise<void>
  ```

- [x] **Step 1: Bildschirm schreiben**

```ts
// src/ui/auswertung.ts
import type { Spieler } from '../domain/ereignis';
import { berichtDatei, berichtHtml } from '../bericht/auswertung';
import { BERICHT_CSS, BERICHT_DUNKEL } from '../bericht/stil';
import { alsJsonl, dateiname } from '../persistenz/export';
import type { Spiel } from '../persistenz/speicher';
import { herunterladen } from './kader';

export interface AuswertungOptionen {
  /** Zurück zur Erfassung — nur, wenn die Auswertung aus ihr geöffnet wurde. */
  zurueck?: () => void;
  /** Spiel abschließen; danach führt der Aufrufer weiter. */
  beenden?: () => Promise<void> | void;
  /** Nach einem Import: zurück zum Start. */
  zumStart?: () => void;
}

/** Das Berichts-CSS kommt als Text mit und wird einmal in den Kopf gehängt. */
function stilEinhaengen(): void {
  if (document.getElementById('bericht-stil')) return;
  const stil = document.createElement('style');
  stil.id = 'bericht-stil';
  stil.textContent = `${BERICHT_DUNKEL}\n${BERICHT_CSS}`;
  document.head.appendChild(stil);
}

export function zeigeAuswertung(
  wurzel: HTMLElement,
  spiel: Spiel,
  kader: readonly Spieler[],
  optionen: AuswertungOptionen,
): void {
  stilEinhaengen();
  wurzel.innerHTML = `
    <div class="auswertung-knoepfe">
      <button id="html-speichern">Als HTML speichern</button>
      <button id="jsonl-speichern">Ereignisse (JSONL)</button>
      ${optionen.zurueck ? '<button id="zurueck">Zurück zur Erfassung</button>' : ''}
      ${optionen.beenden ? '<button id="beenden">Spiel beenden</button>' : ''}
      ${optionen.zumStart ? '<button id="zum-start">Zum Start</button>' : ''}
    </div>
    ${berichtHtml(spiel, kader)}
  `;
  wurzel.querySelector('#html-speichern')?.addEventListener('click', () => {
    herunterladen(dateiname(spiel, 'html'), berichtDatei(spiel, kader));
  });
  wurzel.querySelector('#jsonl-speichern')?.addEventListener('click', () => {
    herunterladen(dateiname(spiel, 'jsonl'), alsJsonl(spiel, kader));
  });
  wurzel.querySelector('#zurueck')?.addEventListener('click', () => optionen.zurueck?.());
  wurzel.querySelector<HTMLButtonElement>('#beenden')?.addEventListener('click', async (ev) => {
    const knopf = ev.currentTarget as HTMLButtonElement;
    if (!window.confirm('Spiel beenden? Die Erfassung ist danach abgeschlossen.')) return;
    knopf.disabled = true;
    await optionen.beenden?.();
  });
  wurzel.querySelector('#zum-start')?.addEventListener('click', () => optionen.zumStart?.());
  window.scrollTo(0, 0);
}
```

- [x] **Step 2: Knopf in der Erfassung**

In `src/ui/erfassung.ts` die Knopfzeile ergänzen:

```html
      <p>
        <button id="export-jsonl">Ereignisse (JSONL)</button>
        <button id="export-csv">Statistik (CSV)</button>
        <button id="export-md">Zusammenfassung (Markdown)</button>
        <button id="auswertung">Auswertung</button>
      </p>
```

In `src/ui/tastatur.ts` innerhalb von `zeichne()` nach den Export-Listenern:

```ts
    wurzel.querySelector('#auswertung')?.addEventListener('click', () => {
      window.removeEventListener('keydown', beiTaste);
      void import('./auswertung').then(({ zeigeAuswertung }) => {
        zeigeAuswertung(wurzel, { ...spiel, ereignisse }, kader, {
          zurueck: () => {
            window.addEventListener('keydown', beiTaste);
            zeichne();
          },
          beenden: async () => {
            const { spielBeenden } = await import('../persistenz/speicher');
            await spielBeenden();
            // Neu laden räumt Tastatur, Takt und Zustand auf und landet beim Kader.
            window.location.reload();
          },
        });
      });
    });
```

`beiTaste` ist eine `const`-Funktion, die weiter unten definiert wird; `zeichne` wird erst nach der Definition aufgerufen, daher ist der Zugriff zur Laufzeit gültig. Falls TypeScript „used before declaration" meldet: den Listener-Block in eine Funktion `auswertungVerdrahten()` auslagern, die nach `beiTaste` definiert und aus `zeichne()` aufgerufen wird.

- [x] **Step 3: Dateiauswahl in der Kadermaske**

In `src/ui/kader.ts`:

Signatur:
```ts
export async function zeigeKader(
  wurzel: HTMLElement,
  weiter: (kader: Spieler[]) => void,
  auswerten?: (datei: File, ersatzKader: readonly Spieler[]) => Promise<void>,
): Promise<void> {
```

Markup nach dem `<p>` mit den Knöpfen (nur wenn `auswerten` gesetzt):

```ts
      ${auswerten ? `
      <h2>Auswertung</h2>
      <p><label>Spiel aus Datei auswerten <input id="spiel-einlesen" type="file" accept=".jsonl" /></label></p>` : ''}
```

Listener am Ende von `zeichne()`:

```ts
    wurzel.querySelector<HTMLInputElement>('#spiel-einlesen')?.addEventListener('change', async (ereignis) => {
      const datei = (ereignis.target as HTMLInputElement).files?.[0];
      if (!datei || !auswerten) return;
      const geprueft = pruefeKader(zeilen);
      const ersatz = geprueft.ok ? geprueft.kader : await kaderLaden();
      try {
        await auswerten(datei, ersatz);
      } catch (fehler) {
        zeichne([`Datei konnte nicht gelesen werden: ${fehler instanceof Error ? fehler.message : String(fehler)}`]);
      }
    });
```

- [x] **Step 4: main.ts verdrahten**

```ts
function vonVorn(): void {
  void zeigeKader(wurzel!, (kader) => {
    zeigeSpielstart(wurzel!, kader, (spielId) => {
      void starteErfassung(wurzel!, kader, spielId);
    });
  }, auswerten);
}

/** Import einer JSONL-Datei: rechnet den Bericht, ohne etwas zu speichern. */
async function auswerten(datei: File, ersatzKader: readonly Spieler[]): Promise<void> {
  const { ausJsonl } = await import('./persistenz/export');
  const { zeigeAuswertung } = await import('./ui/auswertung');
  const { spiel, kader } = ausJsonl(await datei.text(), { dateiname: datei.name, kader: ersatzKader });
  zeigeAuswertung(wurzel!, spiel, kader, { zumStart: vonVorn });
}
```

Import `import type { Spieler } from './domain/ereignis';` ergänzen.

- [x] **Step 5: Stil**

An `src/stil.css` anhängen:

```css
.auswertung-knoepfe { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1rem; }
```

- [x] **Step 6: Typprüfung und Tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: keine Fehler, alle Tests grün.

- [x] **Step 7: Commit**

```bash
git add src/ui/auswertung.ts src/ui/erfassung.ts src/ui/tastatur.ts src/ui/kader.ts src/main.ts src/stil.css
git commit -m "Bildschirm Auswertung mit HTML-Export und Import aus JSONL"
```

---

### Task 8: Durchklicken in der App

**Files:** keine Codeänderung geplant; Fehler werden als Folge-Fixes committet.

- [x] **Step 1: Dev-Server starten** (`.claude/launch.json`, Konfiguration `handball-dev`, Port 5183) und im Browser öffnen.

- [x] **Step 2: Import ohne Kopfzeile** — auf dem Kaderbildschirm `spiele/spiel-2026-09-06-hamburg-nord.jsonl` über „Spiel aus Datei auswerten" laden. Erwartet: Bericht „Spiel gegen hamburg nord", 06.09.2026, Namen aus dem gespeicherten Kader; Verlaufskurve mit Halbzeitmarke; Knöpfe „Als HTML speichern", „Ereignisse (JSONL)", „Zum Start".

- [x] **Step 3: Konsole prüfen** — keine Fehler.

- [x] **Step 4: HTML speichern** — Datei herunterladen und im Browser öffnen: heller Hintergrund, alle Abschnitte, `<details>` klappen auf.

- [x] **Step 5: Aus der Erfassung heraus** — neues Spiel starten, einige Ereignisse tippen (`7T⏎`, `GT⏎`, Leertaste, `HZ⏎`), Knopf „Auswertung": Bericht dunkel, „Zurück zur Erfassung" bringt die Erfassung mit funktionierender Tastatur zurück; nochmal „Auswertung", „Spiel beenden" → Bestätigung → Kaderbildschirm.

- [x] **Step 6: Screenshots** als Nachweis; Fixes einzeln committen.

---

## Self-Review

**Spec-Abdeckung:** 1 Kopf (Task 6 `kopf`), 2 Verlauf (1, 5, 6), 3 Kennzahlen (2, 6), 4 Phasen (2, 5, 6), 10 Aufstellungen (3, 6), 13 Prüfliste (6 `kopf`), 14 Kopf je Spielerin (6), 15 Einsatzleiste (3, 5, 6), 16 Ereignisliste (3, 6), 19 Zähler (6 `zaehlerZeile`), 20 Bildschirm (7), 21 Import (4, 7), 24 Kopfzeile (4). Hell/dunkel (6 `stil.ts`, 7 `stilEinhaengen`). Alte JSONL (4 `ausDateiname`). Escaping (5, 6).

**Typkonsistenz:** `Spielbericht` in `bericht/auswertung.ts` ist strukturell kompatibel zu `Spiel`; `zeigeAuswertung` nimmt `Spiel`, gibt es an `berichtHtml` weiter. `PARADEN` liegt in `katalog.ts`, wird in `domain/auswertung.ts` und `bericht/auswertung.ts` benutzt. `alsJsonl(spiel, kader)` in Task 4 und 7 gleich.
