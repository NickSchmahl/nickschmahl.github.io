# Handball-Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine lokale Browser-Anwendung, mit der eine Person ein Handballspiel live über die Tastatur erfasst und anschließend als Statistik und Rohdaten exportiert.

**Architecture:** Ereignis-Log als einzige Wahrheit. Jede Eingabe erzeugt eine Ereigniszeile; Spielstand, Feldbesetzung, Zeitstrafen und alle Kennzahlen werden aus dem Log berechnet (`reduce`). Die Schicht `src/domain/` kennt weder DOM noch Speicher und ist vollständig ohne Oberfläche testbar; das ist die einzige strikt eingehaltene Schichtgrenze.

**Tech Stack:** Vite, TypeScript, Vitest, IndexedDB. Kein Oberflächen-Framework — die Anzeige ist ein statisches Layout, dessen Textknoten aktualisiert werden.

**Spec:** `docs/superpowers/specs/2026-09-05-handball-tracker-design.md`

## Global Constraints

- Sprache im gesamten Code, in Bezeichnern, Kommentaren und Oberflächentexten: **Deutsch**. Ereigniscodes sind die Großbuchstaben-Codes aus dem Katalog (`T`, `TF`, `ST`, …).
- `src/domain/**` und `src/eingabe/**` dürfen **weder** `document`, `window`, `indexedDB` **noch** Module aus `src/ui/**` oder `src/persistenz/**` importieren.
- Alle Zeitangaben in **Sekunden Spielzeit**, ganzzahlig. Zeitstrafe = **120** Sekunden Spielzeit.
- Trikotnummern sind `number`, ohne führende Nullen, innerhalb eines Kaders eindeutig.
- Prüfungen **warnen, blockieren nie**: ein unplausibles Ereignis wird gespeichert und mit einem Hinweis markiert.
- Wurfpositionen sind die Ziffern **1–7**: 1 Linksaußen, 2 Rückraum links, 3 Rückraum Mitte, 4 Rückraum rechts, 5 Rechtsaußen, 6 Kreis, 7 Gegenstoß.
- Kein Server, keine Netzwerkaufrufe zur Laufzeit.
- Nach jedem Task wird committet. Commit-Nachrichten auf Deutsch.

## Dateien

| Datei | Verantwortung |
|---|---|
| `src/domain/ereignis.ts` | Typen `Wirkung`, `Ereignis`, `Spieler`, `Hinweis` |
| `src/domain/katalog.ts` | Der Ereigniskatalog als Datentabelle plus Nachschlagefunktionen |
| `src/domain/uhr.ts` | Spielzeitberechnung aus Uhrereignissen und Echtzeit |
| `src/domain/reduzierer.ts` | `reduziere(ereignisse)` → `Zustand` |
| `src/domain/statistik.ts` | `Zustand` und Ereignisse → Kennzahlen je Spieler |
| `src/eingabe/grammatik.ts` | Tastenpuffer → Analyse → Ereignisentwurf |
| `src/persistenz/speicher.ts` | IndexedDB: Kader, laufendes Spiel, Ereignisse |
| `src/persistenz/export.ts` | JSONL, CSV, Markdown |
| `src/ui/kader.ts` | Kadermaske |
| `src/ui/spielstart.ts` | Gegner, Datum, Startaufstellung |
| `src/ui/erfassung.ts` | Erfassungsbildschirm: Layout und Aktualisierung |
| `src/ui/tastatur.ts` | Tastaturanbindung und Rückmeldung während der Eingabe |
| `src/ui/korrektur.ts` | Korrekturmodus |
| `src/main.ts` | Bildschirmwechsel, Verdrahtung |

`src/domain/uhr.ts` und `src/ui/tastatur.ts` sind Verfeinerungen gegenüber dem
Verzeichnisbaum der Spezifikation: die Uhr braucht Echtzeit und ist damit ein
eigener Belang, und die Tastaturanbindung wird groß genug, um sie vom Layout zu
trennen.

---

### Task 1: Projektgerüst

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `.gitignore`
- Test: `src/domain/gerüst.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `npm test` (Vitest), `npm run dev` (Vite), `npm run build`

- [ ] **Step 1: Projekt anlegen**

```bash
npm init -y
npm install --save-dev vite typescript vitest @types/node fake-indexeddb
```

- [ ] **Step 2: `package.json` auf diese Skripte setzen**

```json
{
  "name": "handball-tracker",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Die Abhängigkeiten aus Schritt 1 bleiben unverändert stehen.

- [ ] **Step 3: `tsconfig.json` anlegen**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM"],
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

`noUncheckedIndexedAccess` ist bewusst an: der Reduzierer greift viel über
Indizes zu, und unbemerkte `undefined` sind dort die teuersten Fehler.

- [ ] **Step 4: `vite.config.ts` anlegen**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 5: `index.html` und `src/main.ts` anlegen**

`index.html`:

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Handball-Tracker</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts`:

```ts
const app = document.querySelector<HTMLDivElement>('#app');
if (app) app.textContent = 'Handball-Tracker';
```

- [ ] **Step 6: `.gitignore` anlegen**

```
node_modules/
dist/
```

- [ ] **Step 7: Rauchtest schreiben**

`src/domain/gerüst.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('Projektgerüst', () => {
  it('führt Tests aus', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 8: Tests laufen lassen**

Run: `npm test`
Expected: PASS, 1 Test.

- [ ] **Step 9: Typprüfung laufen lassen**

Run: `npm run build`
Expected: kein Fehler, `dist/` entsteht.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Projektgerüst mit Vite, TypeScript und Vitest"
```

---

### Task 2: Ereignistypen und Katalog

**Files:**
- Create: `src/domain/ereignis.ts`, `src/domain/katalog.ts`
- Test: `src/domain/katalog.test.ts`
- Delete: `src/domain/gerüst.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `type Wirkung = 'wurf' | 'treffer' | 'siebenmeter_treffer' | 'siebenmeter_fehl' | 'gegentor' | 'strafe' | 'karte' | 'wechsel' | 'zaehler' | 'uhr'`
  - `type Argumentart = 'position' | 'spieler' | 'zeit'`
  - `interface Katalogeintrag { code: string; bezeichnung: string; wirkung: Wirkung; brauchtSpieler: boolean; argument?: Argumentart; kartenart?: 'gelb' | 'rot' }`
  - `interface Ereignis { seq: number; t: number; wall: string; typ: string; spieler?: number; pos?: number; ein?: number; zeit?: number }`
  - `interface Spieler { nummer: number; name: string; torwart: boolean }`
  - `interface Hinweis { seq: number; text: string }`
  - `const KATALOG: readonly Katalogeintrag[]`
  - `function findeEintrag(code: string): Katalogeintrag | undefined`
  - `function eintraegeMitPraefix(praefix: string): Katalogeintrag[]`

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/domain/katalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { KATALOG, findeEintrag, eintraegeMitPraefix } from './katalog';

describe('Katalog', () => {
  it('findet den Code für ein Tor', () => {
    const eintrag = findeEintrag('T');
    expect(eintrag?.bezeichnung).toBe('Tor');
    expect(eintrag?.wirkung).toBe('treffer');
    expect(eintrag?.brauchtSpieler).toBe(true);
    expect(eintrag?.argument).toBe('position');
  });

  it('unterscheidet T von TF', () => {
    expect(findeEintrag('TF')?.bezeichnung).toBe('Technischer Fehler');
    expect(findeEintrag('TF')?.wirkung).toBe('zaehler');
  });

  it('sucht ohne Beachtung der Groß- und Kleinschreibung', () => {
    expect(findeEintrag('tf')?.code).toBe('TF');
  });

  it('liefert für einen unbekannten Code nichts', () => {
    expect(findeEintrag('QQ')).toBeUndefined();
  });

  it('liefert alle Fortsetzungen eines Praefixes, den Treffer eingeschlossen', () => {
    const codes = eintraegeMitPraefix('T').map((e) => e.code);
    expect(codes).toEqual(['T', 'TA', 'TD', 'TF', 'TS']);
  });

  it('liefert bei leerem Präfix den ganzen Katalog', () => {
    expect(eintraegeMitPraefix('')).toHaveLength(KATALOG.length);
  });

  it('kennt keine doppelten Codes', () => {
    const codes = KATALOG.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('vergibt Gegner- und Steuerereignisse ohne Spielerbezug', () => {
    for (const code of ['GT', 'GS', 'GZ', 'HZ', 'AZ', 'U', 'UL', 'US']) {
      expect(findeEintrag(code)?.brauchtSpieler).toBe(false);
    }
  });

  it('kennt die Uhrkorrektur mit Zeitargument', () => {
    expect(findeEintrag('U')?.argument).toBe('zeit');
    expect(findeEintrag('U')?.wirkung).toBe('uhr');
  });

  it('kennt den Wechsel mit Spielerargument', () => {
    expect(findeEintrag('W')?.argument).toBe('spieler');
    expect(findeEintrag('W')?.wirkung).toBe('wechsel');
  });

  it('kennt Feldzugang und Feldabgang ohne Argument', () => {
    expect(findeEintrag('I')?.wirkung).toBe('wechsel');
    expect(findeEintrag('O')?.wirkung).toBe('wechsel');
    expect(findeEintrag('I')?.argument).toBeUndefined();
  });

  it('führt das Starten und Anhalten der Uhr als Ereignis', () => {
    expect(findeEintrag('UL')?.wirkung).toBe('uhr');
    expect(findeEintrag('US')?.wirkung).toBe('uhr');
  });

  it('trennt die Uhrkorrektur von den Schaltereignissen', () => {
    expect(eintraegeMitPraefix('U').map((e) => e.code)).toEqual(['U', 'UL', 'US']);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./katalog"`.

- [ ] **Step 3: `src/domain/ereignis.ts` schreiben**

```ts
/** Was ein Ereignis im Zustand bewirkt. Der Reduzierer kennt nur diese Fälle. */
export type Wirkung =
  | 'wurf'
  | 'treffer'
  | 'siebenmeter_treffer'
  | 'siebenmeter_fehl'
  | 'gegentor'
  | 'strafe'
  | 'karte'
  | 'wechsel'
  | 'zaehler'
  | 'uhr';

/** Bedeutung des Ziffernarguments hinter dem Code. */
export type Argumentart = 'position' | 'spieler' | 'zeit';

export interface Katalogeintrag {
  code: string;
  bezeichnung: string;
  wirkung: Wirkung;
  brauchtSpieler: boolean;
  argument?: Argumentart;
  /** Nur bei Wirkung 'karte' gesetzt. */
  kartenart?: 'gelb' | 'rot';
}

export interface Ereignis {
  /** Fortlaufend, bestimmt die Reihenfolge. */
  seq: number;
  /** Spielzeit in Sekunden seit Anwurf der ersten Halbzeit. */
  t: number;
  /** Echtzeit als ISO-Zeichenkette, für Nachvollziehbarkeit nach Uhrkorrekturen. */
  wall: string;
  /** Code aus dem Katalog. */
  typ: string;
  spieler?: number;
  /** Wurfposition 1..7. */
  pos?: number;
  /** Einwechselnde Trikotnummer bei 'W'. */
  ein?: number;
  /** Zielspielzeit in Sekunden bei 'U'. */
  zeit?: number;
}

export interface Spieler {
  nummer: number;
  name: string;
  torwart: boolean;
}

export interface Hinweis {
  /** Das Ereignis, auf das sich der Hinweis bezieht. */
  seq: number;
  text: string;
}
```

- [ ] **Step 4: `src/domain/katalog.ts` schreiben**

```ts
import type { Katalogeintrag } from './ereignis';

/**
 * Der vollständige Ereigniskatalog. Neue Kategorien werden hier ergänzt, nicht
 * im Reduzierer: der kennt nur die Wirkungen.
 */
export const KATALOG: readonly Katalogeintrag[] = [
  // Wurf und Tor
  { code: 'T', bezeichnung: 'Tor', wirkung: 'treffer', brauchtSpieler: true, argument: 'position' },
  { code: 'F', bezeichnung: 'Fehlwurf', wirkung: 'wurf', brauchtSpieler: true, argument: 'position' },
  { code: 'FB', bezeichnung: 'Fehlwurf, geblockt', wirkung: 'wurf', brauchtSpieler: true, argument: 'position' },
  { code: 'A', bezeichnung: 'Assist', wirkung: 'zaehler', brauchtSpieler: true },

  // Technische Fehler
  { code: 'TF', bezeichnung: 'Technischer Fehler', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'TS', bezeichnung: 'Schrittfehler', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'TD', bezeichnung: 'Doppelfehler', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'TA', bezeichnung: 'Angriffsfoul', wirkung: 'zaehler', brauchtSpieler: true },

  // Siebenmeter
  { code: 'ST', bezeichnung: 'Siebenmeter-Tor', wirkung: 'siebenmeter_treffer', brauchtSpieler: true },
  { code: 'SF', bezeichnung: 'Siebenmeter verworfen', wirkung: 'siebenmeter_fehl', brauchtSpieler: true },
  { code: 'SH', bezeichnung: 'Siebenmeter herausgeholt', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'SV', bezeichnung: 'Siebenmeter verursacht', wirkung: 'zaehler', brauchtSpieler: true },

  // Abwehr und Ballaktionen
  { code: 'B', bezeichnung: 'Block', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'BG', bezeichnung: 'Ballgewinn', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'BV', bezeichnung: 'Ballverlust', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'N', bezeichnung: 'Neutralisierung', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'E', bezeichnung: 'Eins-gegen-eins gewonnen', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'EV', bezeichnung: 'Eins-gegen-eins verloren', wirkung: 'zaehler', brauchtSpieler: true },

  // Torwart
  { code: 'P', bezeichnung: 'Parade', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'PS', bezeichnung: 'Parade bei Siebenmeter', wirkung: 'zaehler', brauchtSpieler: true },
  { code: 'PT', bezeichnung: 'Tor durch den Torwart', wirkung: 'treffer', brauchtSpieler: true },

  // Strafen
  { code: 'Z', bezeichnung: 'Zeitstrafe', wirkung: 'strafe', brauchtSpieler: true },
  { code: 'ZG', bezeichnung: 'Verwarnung', wirkung: 'karte', brauchtSpieler: true, kartenart: 'gelb' },
  { code: 'ZR', bezeichnung: 'Disqualifikation', wirkung: 'karte', brauchtSpieler: true, kartenart: 'rot' },
  { code: 'ZH', bezeichnung: 'Zeitstrafe herausgeholt', wirkung: 'zaehler', brauchtSpieler: true },

  // Feldbesetzung
  { code: 'W', bezeichnung: 'Wechsel', wirkung: 'wechsel', brauchtSpieler: true, argument: 'spieler' },
  { code: 'I', bezeichnung: 'Kommt aufs Feld', wirkung: 'wechsel', brauchtSpieler: true },
  { code: 'O', bezeichnung: 'Geht vom Feld', wirkung: 'wechsel', brauchtSpieler: true },

  // Gegner
  { code: 'GT', bezeichnung: 'Gegentor', wirkung: 'gegentor', brauchtSpieler: false },
  { code: 'GS', bezeichnung: 'Gegentor durch Siebenmeter', wirkung: 'gegentor', brauchtSpieler: false },
  { code: 'GZ', bezeichnung: 'Zeitstrafe für den Gegner', wirkung: 'zaehler', brauchtSpieler: false },

  // Spielsteuerung
  { code: 'HZ', bezeichnung: 'Abschnittswechsel', wirkung: 'uhr', brauchtSpieler: false },
  { code: 'AZ', bezeichnung: 'Auszeit', wirkung: 'uhr', brauchtSpieler: false },
  { code: 'U', bezeichnung: 'Uhrkorrektur', wirkung: 'uhr', brauchtSpieler: false, argument: 'zeit' },
  { code: 'UL', bezeichnung: 'Uhr läuft', wirkung: 'uhr', brauchtSpieler: false },
  { code: 'US', bezeichnung: 'Uhr steht', wirkung: 'uhr', brauchtSpieler: false },
];

const NACH_CODE = new Map(KATALOG.map((e) => [e.code, e]));

export function findeEintrag(code: string): Katalogeintrag | undefined {
  return NACH_CODE.get(code.toUpperCase());
}

/**
 * Alle Einträge, deren Code mit dem Präfix beginnt — alphabetisch, damit die
 * Trefferliste in der Oberfläche stabil bleibt. Ein exakter Treffer ist
 * enthalten, denn `T` ist sowohl fertiger Code als auch Präfix von `TF`.
 */
export function eintraegeMitPraefix(praefix: string): Katalogeintrag[] {
  const p = praefix.toUpperCase();
  return KATALOG.filter((e) => e.code.startsWith(p)).sort((a, b) => a.code.localeCompare(b.code));
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npm test`
Expected: PASS, 12 Tests.

- [ ] **Step 6: Rauchtest aus Task 1 löschen**

```bash
rm src/domain/gerüst.test.ts
```

- [ ] **Step 7: Tests erneut laufen lassen**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Ereignistypen und Katalog"
```

---

### Task 3: Eingabegrammatik

**Files:**
- Create: `src/eingabe/grammatik.ts`
- Test: `src/eingabe/grammatik.test.ts`

**Interfaces:**
- Consumes: `Katalogeintrag`, `findeEintrag`, `eintraegeMitPraefix` aus Task 2
- Produces:
  - `interface Puffer { ziffern: string; code: string; argument: string }`
  - `const LEERER_PUFFER: Puffer`
  - `function tasteVerarbeiten(p: Puffer, taste: string): Puffer`
  - `type Analyse = { art: 'leer' } | { art: 'nummer'; ziffern: string } | { art: 'unbekannt'; code: string } | { art: 'bereit'; eintrag: Katalogeintrag; spieler?: number; pos?: number; ein?: number; zeit?: number }`
  - `function analysiere(p: Puffer): Analyse`
  - `function vorschlaege(p: Puffer): Katalogeintrag[]`
  - `function klartext(p: Puffer): string`

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/eingabe/grammatik.test.ts`:

```ts
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
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./grammatik"`.

- [ ] **Step 3: `src/eingabe/grammatik.ts` schreiben**

```ts
import type { Katalogeintrag } from '../domain/ereignis';
import { findeEintrag, eintraegeMitPraefix } from '../domain/katalog';

export interface Puffer {
  /** Führende Ziffern: die Trikotnummer. */
  ziffern: string;
  /** Ein oder zwei Buchstaben. */
  code: string;
  /** Ziffern nach dem Code: Position, einwechselnde Nummer oder Uhrzeit. */
  argument: string;
}

export const LEERER_PUFFER: Puffer = { ziffern: '', code: '', argument: '' };

export const POSITIONEN: Record<number, string> = {
  1: 'Linksaußen',
  2: 'Rückraum links',
  3: 'Rückraum Mitte',
  4: 'Rückraum rechts',
  5: 'Rechtsaußen',
  6: 'Kreis',
  7: 'Gegenstoß',
};

const IST_ZIFFER = /^[0-9]$/;
const IST_BUCHSTABE = /^[A-Za-zÄÖÜäöü]$/;

/**
 * Verarbeitet einen Tastendruck. Die Trikotnummer endet ausschließlich am
 * ersten Buchstaben — nicht nach fester Länge und nicht nach Wartezeit.
 * Nur dadurch sind 7 und 77 nebeneinander eindeutig.
 */
export function tasteVerarbeiten(p: Puffer, taste: string): Puffer {
  if (IST_ZIFFER.test(taste)) {
    if (p.code === '') return { ...p, ziffern: p.ziffern + taste };
    return { ...p, argument: p.argument + taste };
  }
  if (IST_BUCHSTABE.test(taste)) {
    if (p.argument !== '') return p; // nach dem Argument kommt kein Buchstabe mehr
    if (p.code.length >= 2) return p; // Codes sind höchstens zweistellig
    return { ...p, code: p.code + taste.toUpperCase() };
  }
  return p;
}

/** Entfernt das letzte Zeichen, unabhängig davon, in welchem Feld es steht. */
export function zeichenLoeschen(p: Puffer): Puffer {
  if (p.argument !== '') return { ...p, argument: p.argument.slice(0, -1) };
  if (p.code !== '') return { ...p, code: p.code.slice(0, -1) };
  return { ...p, ziffern: p.ziffern.slice(0, -1) };
}

export type Analyse =
  | { art: 'leer' }
  | { art: 'nummer'; ziffern: string }
  | { art: 'unbekannt'; code: string }
  | {
      art: 'bereit';
      eintrag: Katalogeintrag;
      spieler?: number;
      pos?: number;
      ein?: number;
      zeit?: number;
    };

export function analysiere(p: Puffer): Analyse {
  if (p.ziffern === '' && p.code === '') return { art: 'leer' };
  if (p.code === '') return { art: 'nummer', ziffern: p.ziffern };

  const eintrag = findeEintrag(p.code);
  if (!eintrag) return { art: 'unbekannt', code: p.code };

  const hatNummer = p.ziffern !== '';
  if (eintrag.brauchtSpieler !== hatNummer) return { art: 'unbekannt', code: eintrag.code };

  const ergebnis: Analyse = { art: 'bereit', eintrag };
  if (hatNummer) ergebnis.spieler = Number(p.ziffern);

  switch (eintrag.argument) {
    case 'position': {
      if (p.argument === '') break; // Position ist freiwillig
      const pos = Number(p.argument);
      if (!(pos >= 1 && pos <= 7) || p.argument.length !== 1) {
        return { art: 'unbekannt', code: eintrag.code };
      }
      ergebnis.pos = pos;
      break;
    }
    case 'spieler': {
      if (p.argument === '') return { art: 'unbekannt', code: eintrag.code };
      ergebnis.ein = Number(p.argument);
      break;
    }
    case 'zeit': {
      if (p.argument.length !== 4) return { art: 'unbekannt', code: eintrag.code };
      const minuten = Number(p.argument.slice(0, 2));
      const sekunden = Number(p.argument.slice(2));
      if (sekunden > 59) return { art: 'unbekannt', code: eintrag.code };
      ergebnis.zeit = minuten * 60 + sekunden;
      break;
    }
    default:
      if (p.argument !== '') return { art: 'unbekannt', code: eintrag.code };
  }

  return ergebnis;
}

/** Die Codes, die zur bisherigen Buchstabeneingabe passen — für die Trefferliste. */
export function vorschlaege(p: Puffer): Katalogeintrag[] {
  if (p.code === '') return [];
  return eintraegeMitPraefix(p.code);
}

/**
 * Der Puffer im Klartext. Solange nur Ziffern getippt sind, werden sie roh
 * gezeigt: aus einer 7 kann noch eine 77 werden, und eine Zeile, die
 * zwischenzeitlich den falschen Spieler behauptet, wäre schlimmer als gar keine.
 */
export function klartext(p: Puffer): string {
  const a = analysiere(p);
  switch (a.art) {
    case 'leer':
      return '';
    case 'nummer':
      return a.ziffern;
    case 'unbekannt':
      return teile(p.ziffern === '' ? [] : [`Nr. ${p.ziffern}`], `${a.code} — unbekannt`);
    case 'bereit': {
      const stuecke: string[] = [];
      if (a.spieler !== undefined) stuecke.push(`Nr. ${a.spieler}`);
      stuecke.push(a.eintrag.bezeichnung);
      if (a.pos !== undefined) stuecke.push(POSITIONEN[a.pos] ?? String(a.pos));
      if (a.ein !== undefined) stuecke.push(`für Nr. ${a.ein}`);
      if (a.zeit !== undefined) stuecke.push(alsUhrzeit(a.zeit));
      return stuecke.join(' · ');
    }
  }
}

function teile(vorne: string[], hinten: string): string {
  return [...vorne, hinten].join(' · ');
}

export function alsUhrzeit(sekunden: number): string {
  const m = Math.floor(sekunden / 60);
  const s = sekunden % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test`
Expected: PASS, alle Grammatik- und Katalogtests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Eingabegrammatik mit eindeutiger Trikotnummernauflösung"
```

---

### Task 4: Uhr

**Files:**
- Create: `src/domain/uhr.ts`
- Test: `src/domain/uhr.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `interface Uhrzustand { laeuft: boolean; basisT: number; basisWall: number; abschnitt: number }`
  - `const UHR_ANFANG: Uhrzustand`
  - `function spielzeit(u: Uhrzustand, wallJetzt: number): number`
  - `function starten(u: Uhrzustand, wallJetzt: number): Uhrzustand`
  - `function anhalten(u: Uhrzustand, wallJetzt: number): Uhrzustand`
  - `function umschalten(u: Uhrzustand, wallJetzt: number): Uhrzustand`
  - `function korrigieren(u: Uhrzustand, zielT: number, wallJetzt: number): Uhrzustand`
  - `function abschnittWechseln(u: Uhrzustand, wallJetzt: number): Uhrzustand`

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/domain/uhr.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  UHR_ANFANG,
  spielzeit,
  starten,
  anhalten,
  umschalten,
  korrigieren,
  abschnittWechseln,
} from './uhr';

const T0 = 1_000_000_000_000;

describe('Uhr', () => {
  it('steht am Anfang bei null', () => {
    expect(spielzeit(UHR_ANFANG, T0)).toBe(0);
  });

  it('läuft nach dem Start mit der Echtzeit mit', () => {
    const u = starten(UHR_ANFANG, T0);
    expect(spielzeit(u, T0 + 30_000)).toBe(30);
  });

  it('friert die Spielzeit beim Anhalten ein', () => {
    const u = anhalten(starten(UHR_ANFANG, T0), T0 + 30_000);
    expect(spielzeit(u, T0 + 90_000)).toBe(30);
  });

  it('läuft nach dem Fortsetzen dort weiter, wo sie angehalten wurde', () => {
    const angehalten = anhalten(starten(UHR_ANFANG, T0), T0 + 30_000);
    const weiter = starten(angehalten, T0 + 90_000);
    expect(spielzeit(weiter, T0 + 100_000)).toBe(40);
  });

  it('schaltet zwischen Laufen und Stehen um', () => {
    const a = umschalten(UHR_ANFANG, T0);
    expect(a.laeuft).toBe(true);
    expect(umschalten(a, T0).laeuft).toBe(false);
  });

  it('ignoriert einen Start, wenn die Uhr schon läuft', () => {
    const u = starten(UHR_ANFANG, T0);
    expect(starten(u, T0 + 30_000)).toEqual(u);
  });

  it('setzt die Spielzeit bei einer Korrektur neu und läuft weiter', () => {
    const u = korrigieren(starten(UHR_ANFANG, T0), 1203, T0 + 30_000);
    expect(spielzeit(u, T0 + 30_000)).toBe(1203);
    expect(spielzeit(u, T0 + 40_000)).toBe(1213);
  });

  it('hält beim Abschnittswechsel an und zählt den Abschnitt hoch', () => {
    const u = abschnittWechseln(starten(UHR_ANFANG, T0), T0 + 1_800_000);
    expect(u.abschnitt).toBe(2);
    expect(u.laeuft).toBe(false);
    expect(spielzeit(u, T0 + 3_000_000)).toBe(1800);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test src/domain/uhr.test.ts`
Expected: FAIL — `Failed to resolve import "./uhr"`.

- [ ] **Step 3: `src/domain/uhr.ts` schreiben**

```ts
/**
 * Die Spielzeit wird nicht getickt, sondern gerechnet: aus einem Stützpunkt
 * (Spielzeit plus zugehörige Echtzeit) und der seither vergangenen Echtzeit.
 * Dadurch kann die Anzeige beliebig oft neu zeichnen, ohne dass sich Fehler
 * aufsummieren.
 */
export interface Uhrzustand {
  laeuft: boolean;
  /** Spielzeit am Stützpunkt, in Sekunden. */
  basisT: number;
  /** Echtzeit am Stützpunkt, in Millisekunden. */
  basisWall: number;
  /** 1 = erste Halbzeit, 2 = zweite Halbzeit, danach Verlängerungen. */
  abschnitt: number;
}

export const UHR_ANFANG: Uhrzustand = { laeuft: false, basisT: 0, basisWall: 0, abschnitt: 1 };

export function spielzeit(u: Uhrzustand, wallJetzt: number): number {
  if (!u.laeuft) return u.basisT;
  return u.basisT + Math.floor((wallJetzt - u.basisWall) / 1000);
}

export function starten(u: Uhrzustand, wallJetzt: number): Uhrzustand {
  if (u.laeuft) return u;
  return { ...u, laeuft: true, basisT: u.basisT, basisWall: wallJetzt };
}

export function anhalten(u: Uhrzustand, wallJetzt: number): Uhrzustand {
  if (!u.laeuft) return u;
  return { ...u, laeuft: false, basisT: spielzeit(u, wallJetzt), basisWall: wallJetzt };
}

export function umschalten(u: Uhrzustand, wallJetzt: number): Uhrzustand {
  return u.laeuft ? anhalten(u, wallJetzt) : starten(u, wallJetzt);
}

/** Setzt die Spielzeit auf den an der Hallenuhr abgelesenen Wert. */
export function korrigieren(u: Uhrzustand, zielT: number, wallJetzt: number): Uhrzustand {
  return { ...u, basisT: zielT, basisWall: wallJetzt };
}

/** Halbzeit oder Spielende: hält an und zählt den Abschnitt hoch. */
export function abschnittWechseln(u: Uhrzustand, wallJetzt: number): Uhrzustand {
  const gestoppt = anhalten(u, wallJetzt);
  return { ...gestoppt, abschnitt: gestoppt.abschnitt + 1 };
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Uhr mit Stützpunktrechnung und Korrektur"
```

---

### Task 5: Reduzierer — Spielstand, Feldbesetzung, Wechsel

**Files:**
- Create: `src/domain/reduzierer.ts`
- Test: `src/domain/reduzierer.test.ts`

**Interfaces:**
- Consumes: `Ereignis`, `Hinweis` aus Task 2; `findeEintrag` aus Task 2
- Produces:
  - `interface Strafe { spieler: number; endeT: number }`
  - `interface Zustand { t: number; abschnitt: number; uhrLaeuft: boolean; toreEigen: number; toreGegner: number; aufDemFeld: number[]; disqualifiziert: number[]; strafen: Strafe[]; hinweise: Hinweis[] }`
  - `const ZUSTAND_ANFANG: Zustand`
  - `function schritt(z: Zustand, e: Ereignis): Zustand`
  - `function reduziere(ereignisse: readonly Ereignis[]): Zustand`

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/domain/reduzierer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reduziere, ZUSTAND_ANFANG } from './reduzierer';
import type { Ereignis } from './ereignis';

let seq = 0;
/** Baut ein Ereignis; die Reihenfolge ergibt sich aus der Aufrufreihenfolge. */
function e(typ: string, t: number, rest: Partial<Ereignis> = {}): Ereignis {
  return { seq: ++seq, t, wall: new Date(t * 1000).toISOString(), typ, ...rest };
}

describe('Reduzierer: Spielstand', () => {
  it('beginnt bei null zu null', () => {
    expect(reduziere([])).toEqual(ZUSTAND_ANFANG);
  });

  it('zählt eigene Tore', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('UL', 0), e('T', 10, { spieler: 7 })]);
    expect(z.toreEigen).toBe(1);
  });

  it('merkt sich, ob die Uhr läuft', () => {
    expect(reduziere([e('UL', 0)]).uhrLaeuft).toBe(true);
    expect(reduziere([e('UL', 0), e('US', 30)]).uhrLaeuft).toBe(false);
  });

  it('warnt bei einem Wurf, während die Uhr steht', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('T', 10, { spieler: 7 })]);
    expect(z.toreEigen).toBe(1);
    expect(z.hinweise.some((h) => h.text === 'Die Uhr steht')).toBe(true);
  });

  it('warnt nicht bei einem Wechsel, während die Uhr steht', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('W', 10, { spieler: 7, ein: 12 })]);
    expect(z.hinweise).toEqual([]);
  });

  it('zählt Siebenmeter-Tore mit, verworfene nicht', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('ST', 10, { spieler: 7 }),
      e('SF', 20, { spieler: 7 }),
    ]);
    expect(z.toreEigen).toBe(1);
  });

  it('zählt das Tor des Torwarts als eigenes Tor', () => {
    const z = reduziere([e('I', 0, { spieler: 12 }), e('PT', 10, { spieler: 12 })]);
    expect(z.toreEigen).toBe(1);
  });

  it('zählt Gegentore', () => {
    const z = reduziere([e('GT', 10), e('GS', 20)]);
    expect(z.toreGegner).toBe(2);
  });

  it('führt die Spielzeit des letzten Ereignisses mit', () => {
    expect(reduziere([e('GT', 10), e('GT', 45)]).t).toBe(45);
  });
});

describe('Reduzierer: Feldbesetzung', () => {
  it('stellt Spieler mit I aufs Feld', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('I', 0, { spieler: 12 })]);
    expect(z.aufDemFeld).toEqual([7, 12]);
  });

  it('nimmt Spieler mit O vom Feld', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('O', 5, { spieler: 7 })]);
    expect(z.aufDemFeld).toEqual([]);
  });

  it('tauscht mit W aus und ein', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('W', 60, { spieler: 7, ein: 12 })]);
    expect(z.aufDemFeld).toEqual([12]);
  });

  it('hält die Feldliste sortiert', () => {
    const z = reduziere([e('I', 0, { spieler: 12 }), e('I', 0, { spieler: 7 })]);
    expect(z.aufDemFeld).toEqual([7, 12]);
  });
});

describe('Reduzierer: Hinweise statt Blockaden', () => {
  it('zählt ein Tor auch dann, wenn der Spieler nicht auf dem Feld steht', () => {
    const z = reduziere([e('T', 10, { spieler: 7 })]);
    expect(z.toreEigen).toBe(1);
    expect(z.hinweise.some((h) => h.text.includes('nicht auf dem Feld'))).toBe(true);
  });

  it('warnt bei mehr als sieben Spielern auf dem Feld', () => {
    const acht = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => e('I', 0, { spieler: n }));
    const z = reduziere(acht);
    expect(z.aufDemFeld).toHaveLength(8);
    expect(z.hinweise.some((h) => h.text.includes('mehr als sieben'))).toBe(true);
  });

  it('warnt, wenn ein Spieler doppelt aufs Feld gestellt wird', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('I', 5, { spieler: 7 })]);
    expect(z.aufDemFeld).toEqual([7]);
    expect(z.hinweise.some((h) => h.text.includes('steht bereits'))).toBe(true);
  });

  it('warnt bei einem unbekannten Ereigniscode, ohne den Rest zu verlieren', () => {
    const z = reduziere([e('QQ', 10, { spieler: 7 }), e('GT', 20)]);
    expect(z.toreGegner).toBe(1);
    expect(z.hinweise.some((h) => h.text.includes('unbekannt'))).toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test src/domain/reduzierer.test.ts`
Expected: FAIL — `Failed to resolve import "./reduzierer"`.

- [ ] **Step 3: `src/domain/reduzierer.ts` schreiben**

```ts
import type { Ereignis, Hinweis, Wirkung } from './ereignis';
import { findeEintrag } from './katalog';

/** Aktionen, die nur bei laufender Uhr stattfinden können. */
const NUR_IM_SPIEL: readonly Wirkung[] = [
  'wurf', 'treffer', 'siebenmeter_treffer', 'siebenmeter_fehl', 'gegentor',
];

export interface Strafe {
  spieler: number;
  /** Spielzeit, zu der die Strafe abgelaufen ist. */
  endeT: number;
}

export interface Zustand {
  /** Spielzeit des zuletzt verarbeiteten Ereignisses. */
  t: number;
  abschnitt: number;
  uhrLaeuft: boolean;
  toreEigen: number;
  toreGegner: number;
  aufDemFeld: number[];
  disqualifiziert: number[];
  strafen: Strafe[];
  hinweise: Hinweis[];
}

export const ZUSTAND_ANFANG: Zustand = {
  t: 0,
  abschnitt: 1,
  uhrLaeuft: false,
  toreEigen: 0,
  toreGegner: 0,
  aufDemFeld: [],
  disqualifiziert: [],
  strafen: [],
  hinweise: [],
};

export const STRAFDAUER = 120;

/**
 * Verarbeitet ein Ereignis. Prüfungen erzeugen Hinweise, verwerfen aber nie:
 * live darf nichts hängen bleiben, nur weil ein Wechsel übersehen wurde.
 */
export function schritt(z: Zustand, e: Ereignis): Zustand {
  const eintrag = findeEintrag(e.typ);
  const hinweise: Hinweis[] = [];
  const warne = (text: string) => hinweise.push({ seq: e.seq, text });

  if (!eintrag) {
    return { ...z, t: e.t, hinweise: [...z.hinweise, { seq: e.seq, text: `Code ${e.typ} ist unbekannt` }] };
  }

  if (NUR_IM_SPIEL.includes(eintrag.wirkung) && !z.uhrLaeuft) warne('Die Uhr steht');

  // Abgelaufene Zeitstrafen fallen weg, bevor irgendetwas anderes geprüft wird.
  const strafen = z.strafen.filter((s) => s.endeT > e.t);

  let { toreEigen, toreGegner, aufDemFeld, disqualifiziert, abschnitt, uhrLaeuft } = {
    ...z,
    strafen,
  };
  aufDemFeld = [...aufDemFeld];
  disqualifiziert = [...disqualifiziert];
  let neueStrafen = [...strafen];

  const aufDemFeldPruefen = () => {
    if (e.spieler !== undefined && !aufDemFeld.includes(e.spieler)) {
      warne(`Nr. ${e.spieler} steht nicht auf dem Feld`);
    }
  };

  switch (eintrag.wirkung) {
    case 'treffer':
    case 'siebenmeter_treffer':
      aufDemFeldPruefen();
      toreEigen += 1;
      break;

    case 'wurf':
    case 'siebenmeter_fehl':
    case 'zaehler':
      aufDemFeldPruefen();
      break;

    case 'gegentor':
      toreGegner += 1;
      break;

    case 'strafe': {
      aufDemFeldPruefen();
      if (e.spieler !== undefined) {
        aufDemFeld = aufDemFeld.filter((n) => n !== e.spieler);
        neueStrafen = [...neueStrafen, { spieler: e.spieler, endeT: e.t + STRAFDAUER }];
      }
      break;
    }

    case 'karte': {
      aufDemFeldPruefen();
      if (eintrag.kartenart === 'rot' && e.spieler !== undefined) {
        aufDemFeld = aufDemFeld.filter((n) => n !== e.spieler);
        if (!disqualifiziert.includes(e.spieler)) disqualifiziert.push(e.spieler);
      }
      break;
    }

    case 'wechsel': {
      const rein = e.typ.toUpperCase() === 'W' ? e.ein : e.typ.toUpperCase() === 'I' ? e.spieler : undefined;
      const raus = e.typ.toUpperCase() === 'W' || e.typ.toUpperCase() === 'O' ? e.spieler : undefined;

      if (raus !== undefined) {
        if (!aufDemFeld.includes(raus)) warne(`Nr. ${raus} steht nicht auf dem Feld`);
        aufDemFeld = aufDemFeld.filter((n) => n !== raus);
      }
      if (rein !== undefined) {
        if (aufDemFeld.includes(rein)) warne(`Nr. ${rein} steht bereits auf dem Feld`);
        else if (disqualifiziert.includes(rein)) warne(`Nr. ${rein} ist disqualifiziert`);
        else if (neueStrafen.some((s) => s.spieler === rein)) warne(`Nr. ${rein} sitzt eine Zeitstrafe ab`);
        else aufDemFeld.push(rein);
      }
      if (aufDemFeld.length > 7) warne('Es stehen mehr als sieben Spieler auf dem Feld');
      break;
    }

    case 'uhr': {
      const code = e.typ.toUpperCase();
      if (code === 'HZ') {
        abschnitt += 1;
        uhrLaeuft = false;
      } else if (code === 'AZ' || code === 'US') {
        uhrLaeuft = false;
      } else if (code === 'UL') {
        uhrLaeuft = true;
      }
      break;
    }
  }

  aufDemFeld.sort((a, b) => a - b);

  return {
    t: e.t,
    abschnitt,
    uhrLaeuft,
    toreEigen,
    toreGegner,
    aufDemFeld,
    disqualifiziert,
    strafen: neueStrafen,
    hinweise: [...z.hinweise, ...hinweise],
  };
}

export function reduziere(ereignisse: readonly Ereignis[]): Zustand {
  return ereignisse.reduce(schritt, ZUSTAND_ANFANG);
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Reduzierer für Spielstand, Feldbesetzung und Wechsel"
```

---

### Task 6: Reduzierer — Zeitstrafen und Karten

**Files:**
- Modify: `src/domain/reduzierer.ts` (nur falls die Tests etwas aufdecken)
- Test: `src/domain/reduzierer.strafen.test.ts`

**Interfaces:**
- Consumes: `reduziere`, `Zustand`, `STRAFDAUER` aus Task 5
- Produces: keine neuen Bezeichner; dieser Task sichert das Verhalten der Wirkungen `strafe` und `karte` ab

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/domain/reduzierer.strafen.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reduziere, STRAFDAUER } from './reduzierer';
import type { Ereignis } from './ereignis';

let seq = 0;
function e(typ: string, t: number, rest: Partial<Ereignis> = {}): Ereignis {
  return { seq: ++seq, t, wall: new Date(t * 1000).toISOString(), typ, ...rest };
}

describe('Zeitstrafen', () => {
  it('nimmt den bestraften Spieler sofort vom Feld', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('Z', 100, { spieler: 7 })]);
    expect(z.aufDemFeld).toEqual([]);
    expect(z.strafen).toEqual([{ spieler: 7, endeT: 100 + STRAFDAUER }]);
  });

  it('lässt die Strafe nach 120 Sekunden Spielzeit auslaufen', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('Z', 100, { spieler: 7 }),
      e('GT', 100 + STRAFDAUER),
    ]);
    expect(z.strafen).toEqual([]);
  });

  it('stellt den Spieler nach Ablauf nicht von selbst zurück aufs Feld', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('Z', 100, { spieler: 7 }),
      e('GT', 400),
    ]);
    expect(z.aufDemFeld).toEqual([]);
  });

  it('verweigert die Einwechslung während einer laufenden Strafe', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('I', 0, { spieler: 8 }),
      e('Z', 100, { spieler: 7 }),
      e('W', 150, { spieler: 8, ein: 7 }),
    ]);
    expect(z.aufDemFeld).toEqual([]);
    expect(z.hinweise.some((h) => h.text.includes('Zeitstrafe absitzt') || h.text.includes('sitzt eine Zeitstrafe ab'))).toBe(true);
  });

  it('lässt die Einwechslung nach Ablauf der Strafe zu', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('I', 0, { spieler: 8 }),
      e('Z', 100, { spieler: 7 }),
      e('W', 100 + STRAFDAUER + 1, { spieler: 8, ein: 7 }),
    ]);
    expect(z.aufDemFeld).toEqual([7]);
  });
});

describe('Karten', () => {
  it('zählt eine Verwarnung, ohne den Spieler vom Feld zu nehmen', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('ZG', 100, { spieler: 7 })]);
    expect(z.aufDemFeld).toEqual([7]);
    expect(z.disqualifiziert).toEqual([]);
  });

  it('nimmt bei einer Disqualifikation dauerhaft vom Feld', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('ZR', 100, { spieler: 7 })]);
    expect(z.aufDemFeld).toEqual([]);
    expect(z.disqualifiziert).toEqual([7]);
  });

  it('lässt einen disqualifizierten Spieler nicht zurück aufs Feld', () => {
    const z = reduziere([
      e('I', 0, { spieler: 7 }),
      e('I', 0, { spieler: 8 }),
      e('ZR', 100, { spieler: 7 }),
      e('W', 200, { spieler: 8, ein: 7 }),
    ]);
    expect(z.aufDemFeld).toEqual([]);
    expect(z.hinweise.some((h) => h.text.includes('disqualifiziert'))).toBe(true);
  });

  it('zählt die Zeitstrafe des Gegners, ohne die eigene Aufstellung anzufassen', () => {
    const z = reduziere([e('I', 0, { spieler: 7 }), e('GZ', 100)]);
    expect(z.aufDemFeld).toEqual([7]);
    expect(z.strafen).toEqual([]);
  });
});
```

- [ ] **Step 2: Tests laufen lassen**

Run: `npm test`
Expected: Die meisten bestehen bereits aus Task 5. Schlägt einer fehl, ist der Reduzierer anzupassen — nicht der Test.

- [ ] **Step 3: Gefundene Abweichungen in `src/domain/reduzierer.ts` beheben**

Erwartete Fundstelle: der Hinweistext bei laufender Zeitstrafe muss die
Zeichenkette `sitzt eine Zeitstrafe ab` enthalten. Weicht er ab, den Text im
`wechsel`-Zweig angleichen.

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Zeitstrafen und Karten im Reduzierer abgesichert"
```

---

### Task 7: Statistik

**Files:**
- Create: `src/domain/statistik.ts`
- Test: `src/domain/statistik.test.ts`

**Interfaces:**
- Consumes: `schritt`, `ZUSTAND_ANFANG` aus Task 5; `findeEintrag` aus Task 2; `Spieler`, `Ereignis` aus Task 2
- Produces:
  - `const TECHNISCHE_FEHLER: readonly string[]`
  - `interface SpielerStatistik { nummer: number; name: string; torwart: boolean; einsatzzeit: number; tore: number; wuerfe: number; wurfquote: number | null; siebenmeterTore: number; siebenmeterVersuche: number; technischeFehler: number; gegentoreImEinsatz: number; plusMinus: number; zaehler: Record<string, number> }`
  - `function statistik(ereignisse: readonly Ereignis[], kader: readonly Spieler[], bisT?: number): SpielerStatistik[]`

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/domain/statistik.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { statistik } from './statistik';
import type { Ereignis, Spieler } from './ereignis';

let seq = 0;
function e(typ: string, t: number, rest: Partial<Ereignis> = {}): Ereignis {
  return { seq: ++seq, t, wall: new Date(t * 1000).toISOString(), typ, ...rest };
}

const KADER: Spieler[] = [
  { nummer: 7, name: 'Anna', torwart: false },
  { nummer: 12, name: 'Bea', torwart: true },
  { nummer: 77, name: 'Cem', torwart: false },
];

/** Holt eine Spielerzeile aus dem Ergebnis. */
function von(s: ReturnType<typeof statistik>, nummer: number) {
  const zeile = s.find((x) => x.nummer === nummer);
  if (!zeile) throw new Error(`Nr. ${nummer} fehlt in der Statistik`);
  return zeile;
}

describe('Statistik: Zählungen', () => {
  it('führt jeden Kaderspieler auf, auch ohne Aktion', () => {
    expect(statistik([], KADER).map((s) => s.nummer)).toEqual([7, 12, 77]);
  });

  it('zählt Tore und Würfe und rechnet die Quote', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('T', 10, { spieler: 7 }), e('F', 20, { spieler: 7 }), e('FB', 30, { spieler: 7 })],
      KADER,
    );
    expect(von(s, 7).tore).toBe(1);
    expect(von(s, 7).wuerfe).toBe(3);
    expect(von(s, 7).wurfquote).toBeCloseTo(1 / 3);
  });

  it('lässt die Wurfquote ohne Wurf offen', () => {
    expect(von(statistik([], KADER), 7).wurfquote).toBeNull();
  });

  it('führt Siebenmeter getrennt von den Feldwürfen', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('ST', 10, { spieler: 7 }), e('SF', 20, { spieler: 7 })],
      KADER,
    );
    expect(von(s, 7).siebenmeterTore).toBe(1);
    expect(von(s, 7).siebenmeterVersuche).toBe(2);
    expect(von(s, 7).wuerfe).toBe(0);
  });

  it('fasst die technischen Fehler zusammen', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('TF', 10, { spieler: 7 }), e('TS', 20, { spieler: 7 }), e('TD', 30, { spieler: 7 })],
      KADER,
    );
    expect(von(s, 7).technischeFehler).toBe(3);
  });

  it('hält jeden Code auch einzeln fest', () => {
    const s = statistik([e('I', 0, { spieler: 7 }), e('BG', 10, { spieler: 7 })], KADER);
    expect(von(s, 7).zaehler.BG).toBe(1);
  });

  it('trennt Nr. 7 und Nr. 77 sauber', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('I', 0, { spieler: 77 }), e('T', 10, { spieler: 77 })],
      KADER,
    );
    expect(von(s, 7).tore).toBe(0);
    expect(von(s, 77).tore).toBe(1);
  });
});

describe('Statistik: Einsatzzeit', () => {
  it('zählt nur die Zeit auf dem Feld', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('O', 300, { spieler: 7 }), e('GT', 600)],
      KADER,
      900,
    );
    expect(von(s, 7).einsatzzeit).toBe(300);
  });

  it('rechnet bis zum angegebenen Zeitpunkt weiter, wenn der Spieler noch steht', () => {
    const s = statistik([e('I', 0, { spieler: 7 })], KADER, 600);
    expect(von(s, 7).einsatzzeit).toBe(600);
  });

  it('zählt keine Zeit, solange die Uhr steht — die Spielzeit rückt dann nicht vor', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('AZ', 300), e('GT', 300)],
      KADER,
      300,
    );
    expect(von(s, 7).einsatzzeit).toBe(300);
  });

  it('rechnet einen Uhrsprung nach vorn der Einsatzzeit zu', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('U', 100, { zeit: 400 }), e('GT', 400)],
      KADER,
      400,
    );
    expect(von(s, 7).einsatzzeit).toBe(400);
  });

  it('zählt bei einem Uhrsprung zurück keine negative Zeit', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('GT', 400), e('U', 100, { zeit: 100 }), e('GT', 100)],
      KADER,
      100,
    );
    expect(von(s, 7).einsatzzeit).toBe(400);
  });

  it('rechnet die Strafzeit nicht als Einsatzzeit', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('Z', 100, { spieler: 7 })],
      KADER,
      400,
    );
    expect(von(s, 7).einsatzzeit).toBe(100);
  });
});

describe('Statistik: Plus/Minus und Torwartquote', () => {
  it('schreibt ein eigenes Tor allen auf dem Feld gut', () => {
    const s = statistik(
      [e('I', 0, { spieler: 7 }), e('I', 0, { spieler: 12 }), e('T', 100, { spieler: 7 })],
      KADER,
    );
    expect(von(s, 7).plusMinus).toBe(1);
    expect(von(s, 12).plusMinus).toBe(1);
    expect(von(s, 77).plusMinus).toBe(0);
  });

  it('schreibt ein Gegentor allen auf dem Feld an', () => {
    const s = statistik([e('I', 0, { spieler: 12 }), e('GT', 100)], KADER);
    expect(von(s, 12).plusMinus).toBe(-1);
  });

  it('zählt Gegentore während der Einsatzzeit für die Torwartquote', () => {
    const s = statistik(
      [e('I', 0, { spieler: 12 }), e('GT', 100), e('O', 200, { spieler: 12 }), e('GT', 300)],
      KADER,
    );
    expect(von(s, 12).gegentoreImEinsatz).toBe(1);
    expect(von(s, 12).zaehler.P ?? 0).toBe(0);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test src/domain/statistik.test.ts`
Expected: FAIL — `Failed to resolve import "./statistik"`.

- [ ] **Step 3: `src/domain/statistik.ts` schreiben**

```ts
import type { Ereignis, Spieler } from './ereignis';
import { findeEintrag } from './katalog';
import { schritt, ZUSTAND_ANFANG } from './reduzierer';

/** Codes, die in der Spalte „technische Fehler" zusammengefasst werden. */
export const TECHNISCHE_FEHLER: readonly string[] = ['TF', 'TS', 'TD', 'TA'];

export interface SpielerStatistik {
  nummer: number;
  name: string;
  torwart: boolean;
  /** Sekunden Spielzeit auf dem Feld. */
  einsatzzeit: number;
  tore: number;
  /** Feldwürfe einschließlich der Treffer, ohne Siebenmeter. */
  wuerfe: number;
  /** null, solange kein Wurf vorliegt. */
  wurfquote: number | null;
  siebenmeterTore: number;
  siebenmeterVersuche: number;
  technischeFehler: number;
  /** Gegentore, die fielen, während der Spieler auf dem Feld stand. */
  gegentoreImEinsatz: number;
  plusMinus: number;
  /** Rohzählung je Katalogcode — wächst mit dem Katalog, ohne diesen Typ zu ändern. */
  zaehler: Record<string, number>;
}

function leereZeile(s: Spieler): SpielerStatistik {
  return {
    nummer: s.nummer,
    name: s.name,
    torwart: s.torwart,
    einsatzzeit: 0,
    tore: 0,
    wuerfe: 0,
    wurfquote: null,
    siebenmeterTore: 0,
    siebenmeterVersuche: 0,
    technischeFehler: 0,
    gegentoreImEinsatz: 0,
    plusMinus: 0,
    zaehler: {},
  };
}

/**
 * Rechnet die Kennzahlen aus dem Ereignis-Log. `bisT` ist die Spielzeit, bis zu
 * der die Einsatzzeit der aktuell auf dem Feld stehenden Spieler weiterläuft —
 * für die Live-Anzeige die aktuelle Spielzeit, für den Export die Endzeit.
 */
export function statistik(
  ereignisse: readonly Ereignis[],
  kader: readonly Spieler[],
  bisT?: number,
): SpielerStatistik[] {
  const zeilen = new Map<number, SpielerStatistik>();
  for (const s of kader) zeilen.set(s.nummer, leereZeile(s));

  /** Spieler, die im Log auftauchen, aber nicht im Kader stehen, gehen nicht verloren. */
  const zeile = (nummer: number): SpielerStatistik => {
    let z = zeilen.get(nummer);
    if (!z) {
      z = leereZeile({ nummer, name: `Nr. ${nummer}`, torwart: false });
      zeilen.set(nummer, z);
    }
    return z;
  };

  let zustand = ZUSTAND_ANFANG;
  let vorherT = 0;

  for (const ereignis of ereignisse) {
    // Einsatzzeit für die Spanne VOR diesem Ereignis, mit der damaligen Aufstellung.
    const dauer = Math.max(0, ereignis.t - vorherT);
    for (const nummer of zustand.aufDemFeld) zeile(nummer).einsatzzeit += dauer;

    const eintrag = findeEintrag(ereignis.typ);
    if (eintrag) {
      if (ereignis.spieler !== undefined) {
        const z = zeile(ereignis.spieler);
        z.zaehler[eintrag.code] = (z.zaehler[eintrag.code] ?? 0) + 1;

        switch (eintrag.wirkung) {
          case 'treffer':
            z.tore += 1;
            z.wuerfe += 1;
            break;
          case 'wurf':
            z.wuerfe += 1;
            break;
          case 'siebenmeter_treffer':
            z.siebenmeterTore += 1;
            z.siebenmeterVersuche += 1;
            break;
          case 'siebenmeter_fehl':
            z.siebenmeterVersuche += 1;
            break;
          default:
            break;
        }
        if (TECHNISCHE_FEHLER.includes(eintrag.code)) z.technischeFehler += 1;
      }

      // Plus/Minus mit der Aufstellung, die zum Zeitpunkt des Tores galt.
      if (eintrag.wirkung === 'treffer' || eintrag.wirkung === 'siebenmeter_treffer') {
        for (const nummer of zustand.aufDemFeld) zeile(nummer).plusMinus += 1;
      }
      if (eintrag.wirkung === 'gegentor') {
        for (const nummer of zustand.aufDemFeld) {
          const z = zeile(nummer);
          z.plusMinus -= 1;
          z.gegentoreImEinsatz += 1;
        }
      }
    }

    zustand = schritt(zustand, ereignis);
    vorherT = ereignis.t;
  }

  if (bisT !== undefined) {
    const dauer = Math.max(0, bisT - vorherT);
    for (const nummer of zustand.aufDemFeld) zeile(nummer).einsatzzeit += dauer;
  }

  for (const z of zeilen.values()) {
    z.wurfquote = z.wuerfe === 0 ? null : z.tore / z.wuerfe;
  }

  return [...zeilen.values()].sort((a, b) => a.nummer - b.nummer);
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Statistik mit Einsatzzeiten, Plus/Minus und Torwartquote"
```

---

### Task 8: Persistenz

**Files:**
- Create: `src/persistenz/speicher.ts`
- Test: `src/persistenz/speicher.test.ts`

**Interfaces:**
- Consumes: `Ereignis`, `Spieler` aus Task 2
- Produces:
  - `interface Spiel { id: string; gegner: string; datum: string; ereignisse: Ereignis[] }`
  - `function kaderSpeichern(kader: readonly Spieler[]): Promise<void>`
  - `function kaderLaden(): Promise<Spieler[]>`
  - `function spielAnlegen(gegner: string, datum: string): Promise<Spiel>`
  - `function ereignisAnhaengen(spielId: string, e: Ereignis): Promise<void>`
  - `function ereignisseErsetzen(spielId: string, ereignisse: readonly Ereignis[]): Promise<void>`
  - `function spielLaden(spielId: string): Promise<Spiel | undefined>`
  - `function laufendesSpiel(): Promise<Spiel | undefined>`
  - `function spielBeenden(): Promise<void>`

- [ ] **Step 1: Testumgebung um IndexedDB ergänzen**

`vite.config.ts` anpassen:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/testaufbau.ts'],
  },
});
```

`src/testaufbau.ts` anlegen:

```ts
// Stellt den Tests eine IndexedDB im Arbeitsspeicher bereit.
import 'fake-indexeddb/auto';
```

- [ ] **Step 2: Fehlschlagenden Test schreiben**

`src/persistenz/speicher.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  kaderSpeichern,
  kaderLaden,
  spielAnlegen,
  ereignisAnhaengen,
  ereignisseErsetzen,
  spielLaden,
  laufendesSpiel,
  spielBeenden,
  datenbankLoeschen,
} from './speicher';
import type { Ereignis, Spieler } from '../domain/ereignis';

const KADER: Spieler[] = [
  { nummer: 7, name: 'Anna', torwart: false },
  { nummer: 12, name: 'Bea', torwart: true },
];

function e(seq: number, typ: string): Ereignis {
  return { seq, t: seq * 10, wall: new Date().toISOString(), typ };
}

beforeEach(async () => {
  await datenbankLoeschen();
});

describe('Speicher: Kader', () => {
  it('gibt ohne gespeicherten Kader eine leere Liste zurück', async () => {
    expect(await kaderLaden()).toEqual([]);
  });

  it('speichert den Kader und liest ihn wieder', async () => {
    await kaderSpeichern(KADER);
    expect(await kaderLaden()).toEqual(KADER);
  });

  it('ersetzt einen bestehenden Kader', async () => {
    await kaderSpeichern(KADER);
    await kaderSpeichern([{ nummer: 1, name: 'Dana', torwart: true }]);
    expect(await kaderLaden()).toHaveLength(1);
  });
});

describe('Speicher: Spiel', () => {
  it('legt ein Spiel an und merkt es als laufend', async () => {
    const spiel = await spielAnlegen('TSV Beispiel', '2026-09-06');
    const laufend = await laufendesSpiel();
    expect(laufend?.id).toBe(spiel.id);
    expect(laufend?.gegner).toBe('TSV Beispiel');
  });

  it('hängt Ereignisse in Reihenfolge an', async () => {
    const spiel = await spielAnlegen('TSV Beispiel', '2026-09-06');
    await ereignisAnhaengen(spiel.id, e(1, 'GT'));
    await ereignisAnhaengen(spiel.id, e(2, 'T'));
    expect((await spielLaden(spiel.id))?.ereignisse.map((x) => x.seq)).toEqual([1, 2]);
  });

  it('ersetzt die Ereignisliste vollständig — für den Korrekturmodus', async () => {
    const spiel = await spielAnlegen('TSV Beispiel', '2026-09-06');
    await ereignisAnhaengen(spiel.id, e(1, 'GT'));
    await ereignisAnhaengen(spiel.id, e(2, 'T'));
    await ereignisseErsetzen(spiel.id, [e(1, 'GT')]);
    expect((await spielLaden(spiel.id))?.ereignisse).toHaveLength(1);
  });

  it('meldet nach dem Beenden kein laufendes Spiel mehr', async () => {
    await spielAnlegen('TSV Beispiel', '2026-09-06');
    await spielBeenden();
    expect(await laufendesSpiel()).toBeUndefined();
  });

  it('behält das beendete Spiel abrufbar', async () => {
    const spiel = await spielAnlegen('TSV Beispiel', '2026-09-06');
    await ereignisAnhaengen(spiel.id, e(1, 'GT'));
    await spielBeenden();
    expect((await spielLaden(spiel.id))?.ereignisse).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test src/persistenz/speicher.test.ts`
Expected: FAIL — `Failed to resolve import "./speicher"`.

- [ ] **Step 4: `src/persistenz/speicher.ts` schreiben**

```ts
import type { Ereignis, Spieler } from '../domain/ereignis';

export interface Spiel {
  id: string;
  gegner: string;
  /** ISO-Datum, JJJJ-MM-TT. */
  datum: string;
  ereignisse: Ereignis[];
}

const DB_NAME = 'handball-tracker';
const DB_VERSION = 1;
const SPEICHER_KADER = 'kader';
const SPEICHER_SPIELE = 'spiele';
const SPEICHER_META = 'meta';

let offen: Promise<IDBDatabase> | undefined;

function alsPromise<T>(anfrage: IDBRequest<T>): Promise<T> {
  return new Promise((erfuellen, ablehnen) => {
    anfrage.onsuccess = () => erfuellen(anfrage.result);
    anfrage.onerror = () => ablehnen(anfrage.error);
  });
}

function datenbank(): Promise<IDBDatabase> {
  if (offen) return offen;
  offen = new Promise((erfuellen, ablehnen) => {
    const anfrage = indexedDB.open(DB_NAME, DB_VERSION);
    anfrage.onupgradeneeded = () => {
      const db = anfrage.result;
      if (!db.objectStoreNames.contains(SPEICHER_KADER)) db.createObjectStore(SPEICHER_KADER);
      if (!db.objectStoreNames.contains(SPEICHER_SPIELE)) db.createObjectStore(SPEICHER_SPIELE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(SPEICHER_META)) db.createObjectStore(SPEICHER_META);
    };
    anfrage.onsuccess = () => erfuellen(anfrage.result);
    anfrage.onerror = () => ablehnen(anfrage.error);
  });
  return offen;
}

async function lesen<T>(speicher: string, schluessel: IDBValidKey): Promise<T | undefined> {
  const db = await datenbank();
  const tx = db.transaction(speicher, 'readonly');
  return alsPromise<T | undefined>(tx.objectStore(speicher).get(schluessel));
}

async function schreiben(speicher: string, wert: unknown, schluessel?: IDBValidKey): Promise<void> {
  const db = await datenbank();
  const tx = db.transaction(speicher, 'readwrite');
  await alsPromise(schluessel === undefined ? tx.objectStore(speicher).put(wert) : tx.objectStore(speicher).put(wert, schluessel));
}

export async function kaderSpeichern(kader: readonly Spieler[]): Promise<void> {
  await schreiben(SPEICHER_KADER, [...kader], 'aktuell');
}

export async function kaderLaden(): Promise<Spieler[]> {
  return (await lesen<Spieler[]>(SPEICHER_KADER, 'aktuell')) ?? [];
}

export async function spielAnlegen(gegner: string, datum: string): Promise<Spiel> {
  const spiel: Spiel = { id: `${datum}-${Date.now()}`, gegner, datum, ereignisse: [] };
  await schreiben(SPEICHER_SPIELE, spiel);
  await schreiben(SPEICHER_META, spiel.id, 'laufend');
  return spiel;
}

export async function spielLaden(spielId: string): Promise<Spiel | undefined> {
  return lesen<Spiel>(SPEICHER_SPIELE, spielId);
}

export async function ereignisAnhaengen(spielId: string, e: Ereignis): Promise<void> {
  const spiel = await spielLaden(spielId);
  if (!spiel) throw new Error(`Spiel ${spielId} ist nicht gespeichert`);
  spiel.ereignisse.push(e);
  await schreiben(SPEICHER_SPIELE, spiel);
}

export async function ereignisseErsetzen(spielId: string, ereignisse: readonly Ereignis[]): Promise<void> {
  const spiel = await spielLaden(spielId);
  if (!spiel) throw new Error(`Spiel ${spielId} ist nicht gespeichert`);
  spiel.ereignisse = [...ereignisse];
  await schreiben(SPEICHER_SPIELE, spiel);
}

export async function laufendesSpiel(): Promise<Spiel | undefined> {
  const id = await lesen<string>(SPEICHER_META, 'laufend');
  if (!id) return undefined;
  return spielLaden(id);
}

export async function spielBeenden(): Promise<void> {
  await schreiben(SPEICHER_META, undefined, 'laufend');
}

/** Nur für Tests: setzt die Datenbank zurück. */
export async function datenbankLoeschen(): Promise<void> {
  if (offen) (await offen).close();
  offen = undefined;
  await new Promise<void>((erfuellen) => {
    const anfrage = indexedDB.deleteDatabase(DB_NAME);
    anfrage.onsuccess = () => erfuellen();
    anfrage.onerror = () => erfuellen();
    anfrage.onblocked = () => erfuellen();
  });
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Persistenz für Kader und Spiele in IndexedDB"
```

---

### Task 9: Export

**Files:**
- Create: `src/persistenz/export.ts`
- Test: `src/persistenz/export.test.ts`

**Interfaces:**
- Consumes: `Spiel` aus Task 8; `SpielerStatistik` aus Task 7; `Ereignis` aus Task 2; `findeEintrag` aus Task 2; `alsUhrzeit` aus Task 3
- Produces:
  - `function alsJsonl(ereignisse: readonly Ereignis[]): string`
  - `function alsCsv(zeilen: readonly SpielerStatistik[]): string`
  - `function alsMarkdown(spiel: Spiel, zeilen: readonly SpielerStatistik[], toreEigen: number, toreGegner: number): string`
  - `function dateiname(spiel: Spiel, endung: 'jsonl' | 'csv' | 'md'): string`

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/persistenz/export.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { alsJsonl, alsCsv, alsMarkdown, dateiname } from './export';
import type { Spiel } from './speicher';
import type { Ereignis } from '../domain/ereignis';
import type { SpielerStatistik } from '../domain/statistik';

const SPIEL: Spiel = { id: 'x', gegner: 'TSV Beispiel', datum: '2026-09-06', ereignisse: [] };

const EREIGNISSE: Ereignis[] = [
  { seq: 1, t: 10, wall: '2026-09-06T18:00:10.000Z', typ: 'T', spieler: 7, pos: 2 },
  { seq: 2, t: 40, wall: '2026-09-06T18:00:40.000Z', typ: 'GT' },
];

const ZEILE: SpielerStatistik = {
  nummer: 7,
  name: 'Anna',
  torwart: false,
  einsatzzeit: 1830,
  tore: 4,
  wuerfe: 8,
  wurfquote: 0.5,
  siebenmeterTore: 1,
  siebenmeterVersuche: 2,
  technischeFehler: 3,
  gegentoreImEinsatz: 12,
  plusMinus: -2,
  zaehler: { T: 4, BG: 2, P: 0 },
};

describe('Export: JSONL', () => {
  it('schreibt eine Zeile je Ereignis', () => {
    expect(alsJsonl(EREIGNISSE).split('\n')).toHaveLength(2);
  });

  it('schreibt gültiges JSON je Zeile', () => {
    const erste = JSON.parse(alsJsonl(EREIGNISSE).split('\n')[0] ?? '');
    expect(erste).toEqual(EREIGNISSE[0]);
  });
});

describe('Export: CSV', () => {
  it('beginnt mit der Kopfzeile', () => {
    expect(alsCsv([ZEILE]).split('\n')[0]).toBe(
      'Nummer;Name;Torwart;Einsatzzeit;Tore;Wuerfe;Wurfquote;7m-Tore;7m-Versuche;Technische Fehler;Ballverluste;Ballgewinne;Bloecke;Paraden;Gegentore im Einsatz;Zeitstrafen;Gelbe Karten;Rote Karten;Plus/Minus',
    );
  });

  it('schreibt die Einsatzzeit als mm:ss', () => {
    expect(alsCsv([ZEILE]).split('\n')[1]).toContain(';30:30;');
  });

  it('schreibt die Wurfquote mit deutschem Dezimalkomma', () => {
    expect(alsCsv([ZEILE]).split('\n')[1]).toContain(';0,50;');
  });

  it('lässt die Wurfquote ohne Wurf leer', () => {
    const ohne = { ...ZEILE, wuerfe: 0, tore: 0, wurfquote: null };
    expect(alsCsv([ohne]).split('\n')[1]).toContain(';;');
  });

  it('nimmt fehlende Zähler als null an', () => {
    expect(alsCsv([ZEILE]).split('\n')[1]).toMatch(/;0;2;0;0;/);
  });
});

describe('Export: Markdown und Dateiname', () => {
  it('nennt Gegner und Endstand', () => {
    const md = alsMarkdown(SPIEL, [ZEILE], 28, 26);
    expect(md).toContain('TSV Beispiel');
    expect(md).toContain('28:26');
  });

  it('baut den Dateinamen aus Datum und Gegner', () => {
    expect(dateiname(SPIEL, 'csv')).toBe('spiel-2026-09-06-tsv-beispiel.csv');
  });

  it('ersetzt Sonderzeichen im Gegnernamen', () => {
    const spiel = { ...SPIEL, gegner: 'HSG Groß/Klein e.V.' };
    expect(dateiname(spiel, 'jsonl')).toBe('spiel-2026-09-06-hsg-gross-klein-e-v.jsonl');
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test src/persistenz/export.test.ts`
Expected: FAIL — `Failed to resolve import "./export"`.

- [ ] **Step 3: `src/persistenz/export.ts` schreiben**

```ts
import type { Ereignis } from '../domain/ereignis';
import type { SpielerStatistik } from '../domain/statistik';
import { findeEintrag } from '../domain/katalog';
import { alsUhrzeit } from '../eingabe/grammatik';
import type { Spiel } from './speicher';

export function alsJsonl(ereignisse: readonly Ereignis[]): string {
  return ereignisse.map((e) => JSON.stringify(e)).join('\n');
}

const CSV_KOPF = [
  'Nummer', 'Name', 'Torwart', 'Einsatzzeit', 'Tore', 'Wuerfe', 'Wurfquote',
  '7m-Tore', '7m-Versuche', 'Technische Fehler', 'Ballverluste', 'Ballgewinne',
  'Bloecke', 'Paraden', 'Gegentore im Einsatz', 'Zeitstrafen', 'Gelbe Karten',
  'Rote Karten', 'Plus/Minus',
];

/** Semikolon als Trennzeichen und Komma als Dezimaltrenner — so öffnet Excel die Datei auf Anhieb richtig. */
export function alsCsv(zeilen: readonly SpielerStatistik[]): string {
  const quote = (q: number | null) => (q === null ? '' : q.toFixed(2).replace('.', ','));
  const z = (zeile: SpielerStatistik, code: string) => zeile.zaehler[code] ?? 0;

  const daten = zeilen.map((zeile) =>
    [
      zeile.nummer,
      zeile.name,
      zeile.torwart ? 'ja' : 'nein',
      alsUhrzeit(zeile.einsatzzeit),
      zeile.tore,
      zeile.wuerfe,
      quote(zeile.wurfquote),
      zeile.siebenmeterTore,
      zeile.siebenmeterVersuche,
      zeile.technischeFehler,
      z(zeile, 'BV'),
      z(zeile, 'BG'),
      z(zeile, 'B'),
      z(zeile, 'P') + z(zeile, 'PS'),
      zeile.gegentoreImEinsatz,
      z(zeile, 'Z'),
      z(zeile, 'ZG'),
      z(zeile, 'ZR'),
      zeile.plusMinus,
    ].join(';'),
  );

  return [CSV_KOPF.join(';'), ...daten].join('\n');
}

export function alsMarkdown(
  spiel: Spiel,
  zeilen: readonly SpielerStatistik[],
  toreEigen: number,
  toreGegner: number,
): string {
  const kopf = `# Spiel gegen ${spiel.gegner}\n\n${spiel.datum} · Endstand **${toreEigen}:${toreGegner}**\n`;

  const tabelle = [
    '| Nr. | Name | Zeit | Tore | Würfe | Quote | 7m | Techn. F. | +/− |',
    '|---:|---|---:|---:|---:|---:|---:|---:|---:|',
    ...zeilen.map((z) =>
      `| ${z.nummer} | ${z.name} | ${alsUhrzeit(z.einsatzzeit)} | ${z.tore} | ${z.wuerfe} | ` +
      `${z.wurfquote === null ? '–' : `${Math.round(z.wurfquote * 100)} %`} | ` +
      `${z.siebenmeterTore}/${z.siebenmeterVersuche} | ${z.technischeFehler} | ` +
      `${z.plusMinus > 0 ? '+' : ''}${z.plusMinus} |`,
    ),
  ].join('\n');

  const verlauf = spiel.ereignisse
    .map((e) => {
      const eintrag = findeEintrag(e.typ);
      const wer = e.spieler === undefined ? '' : ` Nr. ${e.spieler}`;
      return `- ${alsUhrzeit(e.t)}${wer} — ${eintrag?.bezeichnung ?? e.typ}`;
    })
    .join('\n');

  return `${kopf}\n## Spieler\n\n${tabelle}\n\n## Verlauf\n\n${verlauf}\n`;
}

export function dateiname(spiel: Spiel, endung: 'jsonl' | 'csv' | 'md'): string {
  const gegner = spiel.gegner
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `spiel-${spiel.datum}-${gegner}.${endung}`;
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Export als JSONL, CSV und Markdown"
```

---

### Task 10: Kaderprüfung und Kadermaske

**Files:**
- Create: `src/domain/kader.ts`, `src/ui/kader.ts`, `src/stil.css`
- Modify: `src/main.ts`, `index.html`
- Test: `src/domain/kader.test.ts`

**Interfaces:**
- Consumes: `Spieler` aus Task 2; `kaderSpeichern`, `kaderLaden` aus Task 8
- Produces:
  - `function normalisiereNummer(text: string): number | undefined`
  - `type Rohzeile = { nummer: string; name: string; torwart: boolean }`
  - `type Kaderpruefung = { ok: true; kader: Spieler[] } | { ok: false; fehler: string[] }`
  - `function pruefeKader(zeilen: readonly Rohzeile[]): Kaderpruefung`
  - `function passendeSpieler(kader: readonly Spieler[], ziffern: string): number[]`
  - `function zeigeKader(wurzel: HTMLElement, weiter: (kader: Spieler[]) => void): Promise<void>`

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/domain/kader.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalisiereNummer, pruefeKader, passendeSpieler } from './kader';
import type { Spieler } from './ereignis';

const KADER: Spieler[] = [
  { nummer: 7, name: 'Anna', torwart: false },
  { nummer: 12, name: 'Bea', torwart: true },
  { nummer: 77, name: 'Cem', torwart: false },
];

describe('Trikotnummern normalisieren', () => {
  it('entfernt führende Nullen', () => {
    expect(normalisiereNummer('07')).toBe(7);
  });

  it('nimmt gewöhnliche Nummern unverändert', () => {
    expect(normalisiereNummer('77')).toBe(77);
  });

  it('weist Leerzeichen und leere Eingaben zurück', () => {
    expect(normalisiereNummer('')).toBeUndefined();
    expect(normalisiereNummer('  ')).toBeUndefined();
  });

  it('weist alles zurück, was keine Ziffernfolge ist', () => {
    expect(normalisiereNummer('7a')).toBeUndefined();
    expect(normalisiereNummer('-3')).toBeUndefined();
  });
});

describe('Kader prüfen', () => {
  it('nimmt einen sauberen Kader an', () => {
    const ergebnis = pruefeKader([
      { nummer: '7', name: 'Anna', torwart: false },
      { nummer: '12', name: 'Bea', torwart: true },
    ]);
    expect(ergebnis).toEqual({
      ok: true,
      kader: [
        { nummer: 7, name: 'Anna', torwart: false },
        { nummer: 12, name: 'Bea', torwart: true },
      ],
    });
  });

  it('weist doppelte Nummern ab', () => {
    const ergebnis = pruefeKader([
      { nummer: '7', name: 'Anna', torwart: false },
      { nummer: '07', name: 'Cem', torwart: false },
    ]);
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) expect(ergebnis.fehler[0]).toContain('7');
  });

  it('weist eine Zeile ohne Namen ab', () => {
    const ergebnis = pruefeKader([{ nummer: '7', name: '   ', torwart: false }]);
    expect(ergebnis.ok).toBe(false);
  });

  it('weist eine unlesbare Nummer ab', () => {
    const ergebnis = pruefeKader([{ nummer: 'x', name: 'Anna', torwart: false }]);
    expect(ergebnis.ok).toBe(false);
  });

  it('sortiert nach Trikotnummer', () => {
    const ergebnis = pruefeKader([
      { nummer: '12', name: 'Bea', torwart: true },
      { nummer: '7', name: 'Anna', torwart: false },
    ]);
    if (ergebnis.ok) expect(ergebnis.kader.map((s) => s.nummer)).toEqual([7, 12]);
  });
});

describe('Passende Spieler zu einer Ziffernfolge', () => {
  it('hebt bei 7 sowohl Nr. 7 als auch Nr. 77 hervor', () => {
    expect(passendeSpieler(KADER, '7')).toEqual([7, 77]);
  });

  it('grenzt bei 77 auf Nr. 77 ein', () => {
    expect(passendeSpieler(KADER, '77')).toEqual([77]);
  });

  it('liefert bei leerer Eingabe niemanden', () => {
    expect(passendeSpieler(KADER, '')).toEqual([]);
  });

  it('liefert bei unbekanntem Präfix niemanden', () => {
    expect(passendeSpieler(KADER, '9')).toEqual([]);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test src/domain/kader.test.ts`
Expected: FAIL — `Failed to resolve import "./kader"`.

- [ ] **Step 3: `src/domain/kader.ts` schreiben**

```ts
import type { Spieler } from './ereignis';

export type Rohzeile = { nummer: string; name: string; torwart: boolean };
export type Kaderpruefung = { ok: true; kader: Spieler[] } | { ok: false; fehler: string[] };

/** Nimmt nur reine Ziffernfolgen an und entfernt führende Nullen, damit 07 und 7 derselbe Spieler sind. */
export function normalisiereNummer(text: string): number | undefined {
  const roh = text.trim();
  if (!/^[0-9]+$/.test(roh)) return undefined;
  return Number(roh);
}

export function pruefeKader(zeilen: readonly Rohzeile[]): Kaderpruefung {
  const fehler: string[] = [];
  const kader: Spieler[] = [];
  const gesehen = new Set<number>();

  zeilen.forEach((zeile, i) => {
    const nummer = normalisiereNummer(zeile.nummer);
    if (nummer === undefined) {
      fehler.push(`Zeile ${i + 1}: „${zeile.nummer}" ist keine Trikotnummer`);
      return;
    }
    if (zeile.name.trim() === '') {
      fehler.push(`Zeile ${i + 1}: Nr. ${nummer} hat keinen Namen`);
      return;
    }
    if (gesehen.has(nummer)) {
      fehler.push(`Nr. ${nummer} ist doppelt vergeben — jede Zuordnung wäre mehrdeutig`);
      return;
    }
    gesehen.add(nummer);
    kader.push({ nummer, name: zeile.name.trim(), torwart: zeile.torwart });
  });

  if (fehler.length > 0) return { ok: false, fehler };
  kader.sort((a, b) => a.nummer - b.nummer);
  return { ok: true, kader };
}

/**
 * Alle Spieler, deren Nummer mit den getippten Ziffern beginnt. Bei „7" sind
 * das Nr. 7 und Nr. 77 — die sichtbare Entsprechung der Regel, dass die Nummer
 * erst mit dem ersten Buchstaben feststeht.
 */
export function passendeSpieler(kader: readonly Spieler[], ziffern: string): number[] {
  if (ziffern === '') return [];
  return kader.filter((s) => String(s.nummer).startsWith(ziffern)).map((s) => s.nummer);
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: `src/stil.css` anlegen**

```css
:root {
  --grund: #0d1b2a;
  --flaeche: #1b263b;
  --rand: #2e4057;
  --schrift: #e0e6ed;
  --gedaempft: #8fa3bf;
  --gut: #2ec4a6;
  --schlecht: #e5484d;
  --hervor: #f2c744;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font: 16px/1.4 system-ui, sans-serif;
  background: var(--grund);
  color: var(--schrift);
}

#app { padding: 1rem; }

button, input, select {
  font: inherit;
  color: inherit;
  background: var(--flaeche);
  border: 1px solid var(--rand);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
}

button { cursor: pointer; }

table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--rand); }

.fehler { color: var(--schlecht); }
```

- [ ] **Step 6: `index.html` um das Stylesheet ergänzen**

Im `<head>` vor dem `</head>` einfügen:

```html
<link rel="stylesheet" href="/src/stil.css" />
```

- [ ] **Step 7: `src/ui/kader.ts` schreiben**

```ts
import type { Spieler } from '../domain/ereignis';
import { pruefeKader } from '../domain/kader';
import type { Rohzeile } from '../domain/kader';
import { kaderLaden, kaderSpeichern } from '../persistenz/speicher';

/** Zeigt die Kadermaske. Ruft `weiter` mit dem geprüften Kader auf, sobald gespeichert wurde. */
export async function zeigeKader(wurzel: HTMLElement, weiter: (kader: Spieler[]) => void): Promise<void> {
  let zeilen: Rohzeile[] = (await kaderLaden()).map((s) => ({
    nummer: String(s.nummer),
    name: s.name,
    torwart: s.torwart,
  }));
  if (zeilen.length === 0) zeilen = [{ nummer: '', name: '', torwart: false }];

  function zeichne(fehler: string[] = []): void {
    wurzel.innerHTML = `
      <h1>Kader</h1>
      <table>
        <thead><tr><th>Nr.</th><th>Name</th><th>Torwart</th><th></th></tr></thead>
        <tbody>
          ${zeilen
            .map(
              (z, i) => `
            <tr>
              <td><input data-feld="nummer" data-i="${i}" size="4" value="${z.nummer}" inputmode="numeric" /></td>
              <td><input data-feld="name" data-i="${i}" value="${z.name}" /></td>
              <td><input data-feld="torwart" data-i="${i}" type="checkbox" ${z.torwart ? 'checked' : ''} /></td>
              <td><button data-loeschen="${i}">Entfernen</button></td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
      <p>
        <button id="zeile-dazu">Spieler hinzufügen</button>
        <button id="speichern">Kader speichern und weiter</button>
        <button id="ausgeben">Als JSON sichern</button>
        <input id="einlesen" type="file" accept="application/json" />
      </p>
      ${fehler.length ? `<ul class="fehler">${fehler.map((f) => `<li>${f}</li>`).join('')}</ul>` : ''}
    `;

    wurzel.querySelectorAll<HTMLInputElement>('input[data-feld]').forEach((feld) => {
      feld.addEventListener('input', () => {
        const i = Number(feld.dataset.i);
        const zeile = zeilen[i];
        if (!zeile) return;
        if (feld.dataset.feld === 'torwart') zeile.torwart = feld.checked;
        else if (feld.dataset.feld === 'nummer') zeile.nummer = feld.value;
        else zeile.name = feld.value;
      });
    });

    wurzel.querySelectorAll<HTMLButtonElement>('button[data-loeschen]').forEach((knopf) => {
      knopf.addEventListener('click', () => {
        zeilen.splice(Number(knopf.dataset.loeschen), 1);
        zeichne();
      });
    });

    wurzel.querySelector('#zeile-dazu')?.addEventListener('click', () => {
      zeilen.push({ nummer: '', name: '', torwart: false });
      zeichne();
    });

    wurzel.querySelector('#speichern')?.addEventListener('click', async () => {
      const ergebnis = pruefeKader(zeilen);
      if (!ergebnis.ok) {
        zeichne(ergebnis.fehler);
        return;
      }
      await kaderSpeichern(ergebnis.kader);
      weiter(ergebnis.kader);
    });

    wurzel.querySelector('#ausgeben')?.addEventListener('click', () => {
      const ergebnis = pruefeKader(zeilen);
      if (!ergebnis.ok) {
        zeichne(ergebnis.fehler);
        return;
      }
      herunterladen('kader.json', JSON.stringify(ergebnis.kader, null, 2));
    });

    wurzel.querySelector<HTMLInputElement>('#einlesen')?.addEventListener('change', async (ereignis) => {
      const datei = (ereignis.target as HTMLInputElement).files?.[0];
      if (!datei) return;
      const gelesen = JSON.parse(await datei.text()) as Spieler[];
      zeilen = gelesen.map((s) => ({ nummer: String(s.nummer), name: s.name, torwart: s.torwart }));
      zeichne();
    });
  }

  zeichne();
}

export function herunterladen(name: string, inhalt: string): void {
  const url = URL.createObjectURL(new Blob([inhalt], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 8: `src/main.ts` auf die Kadermaske umstellen**

```ts
import { zeigeKader } from './ui/kader';

const wurzel = document.querySelector<HTMLDivElement>('#app');
if (!wurzel) throw new Error('#app fehlt in index.html');

void zeigeKader(wurzel, (kader) => {
  console.log('Kader steht', kader);
});
```

- [ ] **Step 9: In der Anwendung nachsehen**

Run: `npm run dev`
Erwartet: Die Kadermaske erscheint. Prüfen: Zeile hinzufügen, Namen eintragen,
zwei Spieler mit derselben Nummer anlegen → Fehlermeldung; `07` und `7`
gleichzeitig → dieselbe Fehlermeldung; nach dem Speichern und einem Neuladen der
Seite ist der Kader wieder da.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Kaderprüfung und Kadermaske"
```

---

### Task 11: Spielstart

**Files:**
- Create: `src/ui/spielstart.ts`
- Modify: `src/domain/kader.ts` (Startaufstellung als Ereignisse), `src/main.ts`
- Test: `src/domain/kader.test.ts` (erweitern)

**Interfaces:**
- Consumes: `Spieler`, `Ereignis` aus Task 2; `spielAnlegen`, `ereignisAnhaengen` aus Task 8
- Produces:
  - `function startEreignisse(aufstellung: readonly number[], wall: string): Ereignis[]`
  - `function zeigeSpielstart(wurzel: HTMLElement, kader: readonly Spieler[], weiter: (spielId: string) => void): void`

- [ ] **Step 1: Fehlschlagenden Test an `src/domain/kader.test.ts` anhängen**

```ts
import { startEreignisse } from './kader';

describe('Startaufstellung', () => {
  it('erzeugt je Spieler ein Ereignis „kommt aufs Feld" zur Spielzeit null', () => {
    const ereignisse = startEreignisse([7, 12], '2026-09-06T18:00:00.000Z');
    expect(ereignisse).toEqual([
      { seq: 1, t: 0, wall: '2026-09-06T18:00:00.000Z', typ: 'I', spieler: 7 },
      { seq: 2, t: 0, wall: '2026-09-06T18:00:00.000Z', typ: 'I', spieler: 12 },
    ]);
  });

  it('erzeugt ohne Aufstellung nichts', () => {
    expect(startEreignisse([], '2026-09-06T18:00:00.000Z')).toEqual([]);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test src/domain/kader.test.ts`
Expected: FAIL — `startEreignisse is not a function`.

- [ ] **Step 3: `startEreignisse` an `src/domain/kader.ts` anhängen**

```ts
import type { Ereignis } from './ereignis';

/**
 * Die Startaufstellung als Ereignisse. Es sind gewöhnliche Feldzugänge, keine
 * Sonderform — dadurch braucht der Reduzierer keinen Sonderfall „Spielbeginn".
 */
export function startEreignisse(aufstellung: readonly number[], wall: string): Ereignis[] {
  return aufstellung.map((spieler, i) => ({ seq: i + 1, t: 0, wall, typ: 'I', spieler }));
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: `src/ui/spielstart.ts` schreiben**

```ts
import type { Spieler } from '../domain/ereignis';
import { startEreignisse } from '../domain/kader';
import { spielAnlegen, ereignisAnhaengen } from '../persistenz/speicher';

export function zeigeSpielstart(
  wurzel: HTMLElement,
  kader: readonly Spieler[],
  weiter: (spielId: string) => void,
): void {
  const gewaehlt = new Set<number>();

  function zeichne(meldung = ''): void {
    wurzel.innerHTML = `
      <h1>Spiel starten</h1>
      <p>
        <label>Gegner <input id="gegner" placeholder="TSV Beispiel" /></label>
        <label>Datum <input id="datum" type="date" value="${new Date().toISOString().slice(0, 10)}" /></label>
      </p>
      <h2>Startaufstellung <small>(${gewaehlt.size} von 7)</small></h2>
      <ul style="list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:.5rem">
        ${kader
          .map(
            (s) => `<li><button data-nummer="${s.nummer}" style="${
              gewaehlt.has(s.nummer) ? 'outline:2px solid var(--hervor)' : ''
            }">${s.nummer} ${s.name}${s.torwart ? ' (TW)' : ''}</button></li>`,
          )
          .join('')}
      </ul>
      <p><button id="los">Erfassung beginnen</button></p>
      ${meldung ? `<p class="fehler">${meldung}</p>` : ''}
    `;

    wurzel.querySelectorAll<HTMLButtonElement>('button[data-nummer]').forEach((knopf) => {
      knopf.addEventListener('click', () => {
        const nummer = Number(knopf.dataset.nummer);
        if (gewaehlt.has(nummer)) gewaehlt.delete(nummer);
        else gewaehlt.add(nummer);
        zeichne();
      });
    });

    wurzel.querySelector('#los')?.addEventListener('click', async () => {
      const gegner = wurzel.querySelector<HTMLInputElement>('#gegner')?.value.trim() ?? '';
      const datum = wurzel.querySelector<HTMLInputElement>('#datum')?.value ?? '';
      if (gegner === '') return zeichne('Bitte den Gegner eintragen.');
      if (gewaehlt.size === 0) return zeichne('Bitte mindestens einen Spieler aufstellen.');

      const spiel = await spielAnlegen(gegner, datum);
      for (const e of startEreignisse([...gewaehlt].sort((a, b) => a - b), new Date().toISOString())) {
        await ereignisAnhaengen(spiel.id, e);
      }
      weiter(spiel.id);
    });
  }

  zeichne();
}
```

Mehr als sieben Gewählte werden hier nicht abgewiesen: die Prüfung gehört in den
Reduzierer, der warnt statt zu blockieren, und ein Spiel kann mit weniger als
sieben beginnen.

- [ ] **Step 6: `src/main.ts` verketten**

```ts
import { zeigeKader } from './ui/kader';
import { zeigeSpielstart } from './ui/spielstart';

const wurzel = document.querySelector<HTMLDivElement>('#app');
if (!wurzel) throw new Error('#app fehlt in index.html');

void zeigeKader(wurzel, (kader) => {
  zeigeSpielstart(wurzel, kader, (spielId) => {
    console.log('Spiel läuft', spielId);
  });
});
```

- [ ] **Step 7: In der Anwendung nachsehen**

Run: `npm run dev`
Erwartet: Nach dem Speichern des Kaders erscheint die Startmaske. Prüfen:
Aufstellung anklickbar und wieder abwählbar, ohne Gegner erscheint eine Meldung,
nach „Erfassung beginnen" steht die Spiel-Kennung in der Konsole.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Spielstart mit Gegner und Startaufstellung"
```

---

### Task 12: Erfassungsbildschirm — Layout und Anzeige

**Files:**
- Create: `src/ui/erfassung.ts`
- Modify: `src/stil.css`
- Test: keiner — reine Anzeige; geprüft wird in der laufenden Anwendung (Schritt 4)

**Interfaces:**
- Consumes: `Zustand` aus Task 5; `SpielerStatistik` aus Task 7; `Puffer` aus Task 3; `Katalogeintrag` aus Task 2; `Spieler`, `Ereignis` aus Task 2; `alsUhrzeit` aus Task 3; `findeEintrag` aus Task 2
- Produces:
  - `interface Ansicht { kader: readonly Spieler[]; ereignisse: readonly Ereignis[]; zustand: Zustand; werte: readonly SpielerStatistik[]; jetztT: number; uhrLaeuft: boolean; abschnitt: number; puffer: Puffer; klartextZeile: string; hervorgehoben: readonly number[]; vorschlaege: readonly Katalogeintrag[] }`
  - `function zeichneErfassung(wurzel: HTMLElement, a: Ansicht): void`

- [ ] **Step 1: `src/stil.css` um das Erfassungslayout ergänzen**

Ans Ende der Datei anhängen:

```css
.erfassung { display: grid; grid-template-rows: auto 1fr auto auto; gap: .75rem; height: 100vh; }
.kopf { display: flex; align-items: baseline; gap: 1.5rem; }
.uhr { font-size: 3rem; font-variant-numeric: tabular-nums; }
.uhr.steht { color: var(--gedaempft); }
.stand { font-size: 2rem; font-weight: 700; }

.plaetze { display: flex; flex-wrap: wrap; gap: .5rem; }
.kachel {
  border: 1px solid var(--rand); border-radius: 8px; padding: .5rem .75rem;
  background: var(--flaeche); min-width: 8rem;
}
.kachel.hervor { outline: 2px solid var(--hervor); }
.kachel.bestraft { border-color: var(--schlecht); }
.kachel .nr { font-size: 1.5rem; font-weight: 700; }
.kachel .zahlen { color: var(--gedaempft); font-size: .85rem; }

.bank { opacity: .65; }

.eingabe { border-top: 1px solid var(--rand); padding-top: .5rem; }
.eingabe .puffer { font-size: 1.5rem; font-variant-numeric: tabular-nums; }
.eingabe .unbekannt { color: var(--schlecht); }
.treffer { display: flex; flex-wrap: wrap; gap: .5rem; color: var(--gedaempft); }
.treffer .code { color: var(--schrift); font-weight: 700; }

.feed { max-height: 8rem; overflow-y: auto; font-size: .9rem; }
.feed li { list-style: none; }
.feed .warnung { color: var(--schlecht); }

.pruefliste summary { cursor: pointer; color: var(--schlecht); }
.pruefliste ul { margin: .25rem 0; padding-left: 1.25rem; font-size: .9rem; }
```

- [ ] **Step 2: `src/ui/erfassung.ts` schreiben**

```ts
import type { Ereignis, Katalogeintrag, Spieler } from '../domain/ereignis';
import type { Zustand } from '../domain/reduzierer';
import type { SpielerStatistik } from '../domain/statistik';
import type { Puffer } from '../eingabe/grammatik';
import { alsUhrzeit } from '../eingabe/grammatik';
import { findeEintrag } from '../domain/katalog';

export interface Ansicht {
  kader: readonly Spieler[];
  ereignisse: readonly Ereignis[];
  zustand: Zustand;
  werte: readonly SpielerStatistik[];
  jetztT: number;
  uhrLaeuft: boolean;
  abschnitt: number;
  puffer: Puffer;
  klartextZeile: string;
  /** Trikotnummern, die zur bisherigen Ziffernfolge passen. */
  hervorgehoben: readonly number[];
  vorschlaege: readonly Katalogeintrag[];
}

export function zeichneErfassung(wurzel: HTMLElement, a: Ansicht): void {
  const werteVon = new Map(a.werte.map((w) => [w.nummer, w]));
  const strafeVon = new Map(a.zustand.strafen.map((s) => [s.spieler, s.endeT]));

  const kachel = (s: Spieler): string => {
    const w = werteVon.get(s.nummer);
    const restsekunden = strafeVon.has(s.nummer) ? Math.max(0, (strafeVon.get(s.nummer) ?? 0) - a.jetztT) : undefined;
    const klassen = [
      'kachel',
      a.hervorgehoben.includes(s.nummer) ? 'hervor' : '',
      restsekunden !== undefined ? 'bestraft' : '',
    ].filter(Boolean).join(' ');
    const zahlen = w
      ? `${w.tore}/${w.wuerfe} · ${alsUhrzeit(w.einsatzzeit)} · ${w.plusMinus > 0 ? '+' : ''}${w.plusMinus}`
      : '';
    return `<div class="${klassen}">
      <div class="nr">${s.nummer}${restsekunden !== undefined ? ` <small>${alsUhrzeit(restsekunden)}</small>` : ''}</div>
      <div>${s.name}</div>
      <div class="zahlen">${zahlen}</div>
    </div>`;
  };

  const aufDemFeld = a.kader.filter((s) => a.zustand.aufDemFeld.includes(s.nummer));
  const bank = a.kader.filter((s) => !a.zustand.aufDemFeld.includes(s.nummer));

  const hinweisZu = new Map(a.zustand.hinweise.map((h) => [h.seq, h.text]));
  const feed = [...a.ereignisse].reverse().slice(0, 12).map((e) => {
    const eintrag = findeEintrag(e.typ);
    const wer = e.spieler === undefined ? '' : ` Nr. ${e.spieler}`;
    const warnung = hinweisZu.get(e.seq);
    return `<li>${alsUhrzeit(e.t)}${wer} — ${eintrag?.bezeichnung ?? e.typ}` +
      `${warnung ? ` <span class="warnung">⚠ ${warnung}</span>` : ''}</li>`;
  }).join('');

  const treffer = a.vorschlaege
    .map((e) => `<span><span class="code">${e.code}</span> ${e.bezeichnung}</span>`)
    .join('');

  const unbekannt = a.klartextZeile.endsWith('— unbekannt');

  wurzel.innerHTML = `
    <div class="erfassung">
      <div class="kopf">
        <div class="uhr ${a.uhrLaeuft ? '' : 'steht'}">${alsUhrzeit(a.jetztT)}</div>
        <div class="stand">${a.zustand.toreEigen}:${a.zustand.toreGegner}</div>
        <div>${a.abschnitt}. Abschnitt${a.uhrLaeuft ? '' : ' · Uhr steht'}</div>
      </div>

      <div>
        <div class="plaetze">${aufDemFeld.map(kachel).join('')}</div>
        <h3>Bank</h3>
        <div class="plaetze bank">${bank.map(kachel).join('')}</div>
      </div>

      <div class="eingabe">
        <div class="puffer ${unbekannt ? 'unbekannt' : ''}">${a.klartextZeile || '&nbsp;'}</div>
        <div class="treffer">${treffer}</div>
      </div>

      <ul class="feed">${feed}</ul>

      ${a.zustand.hinweise.length === 0 ? '' : `
        <details class="pruefliste">
          <summary>${a.zustand.hinweise.length} Punkte zum Prüfen</summary>
          <ul>${a.zustand.hinweise.map((h) => `<li class="warnung">${h.text}</li>`).join('')}</ul>
        </details>`}
    </div>
  `;
}
```

- [ ] **Step 3: Vorübergehende Vorschau in `src/main.ts` einhängen**

Den Rückruf aus Task 11 ersetzen:

```ts
  zeigeSpielstart(wurzel, kader, async (spielId) => {
    const { spielLaden } = await import('./persistenz/speicher');
    const { reduziere } = await import('./domain/reduzierer');
    const { statistik } = await import('./domain/statistik');
    const { zeichneErfassung } = await import('./ui/erfassung');
    const { LEERER_PUFFER } = await import('./eingabe/grammatik');

    const spiel = await spielLaden(spielId);
    if (!spiel) return;
    const zustand = reduziere(spiel.ereignisse);
    zeichneErfassung(wurzel, {
      kader,
      ereignisse: spiel.ereignisse,
      zustand,
      werte: statistik(spiel.ereignisse, kader, 0),
      jetztT: 0,
      uhrLaeuft: false,
      abschnitt: 1,
      puffer: LEERER_PUFFER,
      klartextZeile: '',
      hervorgehoben: [],
      vorschlaege: [],
    });
  });
```

- [ ] **Step 4: In der Anwendung nachsehen**

Run: `npm run dev`
Erwartet: Nach dem Spielstart erscheint der Erfassungsbildschirm. Prüfen: Uhr
steht auf `00:00` und ist gedämpft, Spielstand `0:0`, die aufgestellten Spieler
stehen oben, alle übrigen auf der Bank, der Feed listet die Feldzugänge, und die
Prüfliste ist noch nicht vorhanden, weil es keine Hinweise gibt.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Erfassungsbildschirm mit Feld, Bank, Eingabezeile und Feed"
```

---

### Task 13: Tastatur und Rückmeldung

**Files:**
- Create: `src/eingabe/ereignisbau.ts`, `src/ui/tastatur.ts`
- Modify: `src/main.ts`
- Test: `src/eingabe/ereignisbau.test.ts`

**Interfaces:**
- Consumes: `Analyse`, `analysiere`, `tasteVerarbeiten`, `zeichenLoeschen`, `LEERER_PUFFER`, `klartext`, `vorschlaege` aus Task 3; `passendeSpieler` aus Task 10; `Uhrzustand`-Funktionen aus Task 4; `zeichneErfassung` aus Task 12; Speicherfunktionen aus Task 8
- Produces:
  - `function baueEreignis(a: Analyse, seq: number, t: number, wall: string): Ereignis | undefined`
  - `function starteErfassung(wurzel: HTMLElement, kader: readonly Spieler[], spielId: string): Promise<void>`

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/eingabe/ereignisbau.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { baueEreignis } from './ereignisbau';
import { analysiere, tasteVerarbeiten, LEERER_PUFFER } from './grammatik';

const WALL = '2026-09-06T18:00:00.000Z';
function analyseVon(text: string) {
  return analysiere([...text].reduce(tasteVerarbeiten, LEERER_PUFFER));
}

describe('Ereignis bauen', () => {
  it('baut ein Tor mit Spieler', () => {
    expect(baueEreignis(analyseVon('7T'), 5, 120, WALL)).toEqual({
      seq: 5, t: 120, wall: WALL, typ: 'T', spieler: 7,
    });
  });

  it('nimmt die Wurfposition mit auf', () => {
    expect(baueEreignis(analyseVon('7T2'), 5, 120, WALL)).toMatchObject({ typ: 'T', spieler: 7, pos: 2 });
  });

  it('lässt die Wurfposition weg, wenn sie nicht getippt wurde', () => {
    expect(baueEreignis(analyseVon('7T'), 5, 120, WALL)).not.toHaveProperty('pos');
  });

  it('baut den Wechsel mit einwechselnder Nummer', () => {
    expect(baueEreignis(analyseVon('7W12'), 5, 120, WALL)).toMatchObject({ typ: 'W', spieler: 7, ein: 12 });
  });

  it('baut die Uhrkorrektur mit Zielzeit in Sekunden', () => {
    expect(baueEreignis(analyseVon('U2003'), 5, 120, WALL)).toMatchObject({ typ: 'U', zeit: 1203 });
  });

  it('baut ein Gegnerereignis ohne Spieler', () => {
    expect(baueEreignis(analyseVon('GT'), 5, 120, WALL)).toEqual({ seq: 5, t: 120, wall: WALL, typ: 'GT' });
  });

  it('baut nichts aus einer unfertigen Eingabe', () => {
    expect(baueEreignis(analyseVon('7'), 5, 120, WALL)).toBeUndefined();
    expect(baueEreignis(analyseVon('7QQ'), 5, 120, WALL)).toBeUndefined();
    expect(baueEreignis(analyseVon(''), 5, 120, WALL)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test src/eingabe/ereignisbau.test.ts`
Expected: FAIL — `Failed to resolve import "./ereignisbau"`.

- [ ] **Step 3: `src/eingabe/ereignisbau.ts` schreiben**

```ts
import type { Ereignis } from '../domain/ereignis';
import type { Analyse } from './grammatik';

/** Aus einer fertigen Analyse ein Ereignis. Alles andere ergibt nichts. */
export function baueEreignis(a: Analyse, seq: number, t: number, wall: string): Ereignis | undefined {
  if (a.art !== 'bereit') return undefined;
  const e: Ereignis = { seq, t, wall, typ: a.eintrag.code };
  if (a.spieler !== undefined) e.spieler = a.spieler;
  if (a.pos !== undefined) e.pos = a.pos;
  if (a.ein !== undefined) e.ein = a.ein;
  if (a.zeit !== undefined) e.zeit = a.zeit;
  return e;
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: `src/ui/tastatur.ts` schreiben**

```ts
import type { Ereignis, Spieler } from '../domain/ereignis';
import { reduziere } from '../domain/reduzierer';
import { statistik } from '../domain/statistik';
import { passendeSpieler } from '../domain/kader';
import {
  LEERER_PUFFER, analysiere, klartext, tasteVerarbeiten, vorschlaege, zeichenLoeschen,
} from '../eingabe/grammatik';
import type { Puffer } from '../eingabe/grammatik';
import { baueEreignis } from '../eingabe/ereignisbau';
import {
  UHR_ANFANG, abschnittWechseln, anhalten, korrigieren, spielzeit, umschalten,
} from '../domain/uhr';
import type { Uhrzustand } from '../domain/uhr';
import { ereignisseErsetzen, spielLaden } from '../persistenz/speicher';
import { zeichneErfassung } from './erfassung';

export async function starteErfassung(
  wurzel: HTMLElement,
  kader: readonly Spieler[],
  spielId: string,
): Promise<void> {
  const spiel = await spielLaden(spielId);
  if (!spiel) throw new Error(`Spiel ${spielId} ist nicht gespeichert`);

  let ereignisse: Ereignis[] = [...spiel.ereignisse];
  let puffer: Puffer = LEERER_PUFFER;
  let uhr: Uhrzustand = UHR_ANFANG;

  const jetzt = () => Date.now();
  const zeichne = (): void => {
    const t = spielzeit(uhr, jetzt());
    const zustand = reduziere(ereignisse);
    zeichneErfassung(wurzel, {
      kader,
      ereignisse,
      zustand,
      werte: statistik(ereignisse, kader, t),
      jetztT: t,
      uhrLaeuft: uhr.laeuft,
      abschnitt: uhr.abschnitt,
      puffer,
      klartextZeile: klartext(puffer),
      hervorgehoben: hervorhebung(),
      vorschlaege: vorschlaege(puffer),
    });
  };

  /**
   * Solange nur Ziffern getippt sind, leuchten alle Spieler, deren Nummer so
   * beginnt — bei „7" also Nr. 7 und Nr. 77. Steht der Code, bleibt genau einer.
   */
  const hervorhebung = (): number[] => {
    const a = analysiere(puffer);
    if (a.art === 'bereit' && a.spieler !== undefined) return [a.spieler];
    return passendeSpieler(kader, puffer.ziffern);
  };

  const sichern = async (): Promise<void> => {
    await ereignisseErsetzen(spielId, ereignisse);
  };

  const bestaetigen = async (): Promise<void> => {
    const a = analysiere(puffer);
    const t = spielzeit(uhr, jetzt());
    const e = baueEreignis(a, naechsteSeq(), t, new Date().toISOString());
    if (!e) return; // unfertig oder unbekannt: die Eingabetaste bleibt wirkungslos
    ereignisse = [...ereignisse, e];

    // Uhrereignisse wirken zusätzlich auf die Uhr selbst.
    if (e.typ === 'U' && e.zeit !== undefined) uhr = korrigieren(uhr, e.zeit, jetzt());
    if (e.typ === 'HZ') uhr = abschnittWechseln(uhr, jetzt());
    if (e.typ === 'AZ') uhr = anhalten(uhr, jetzt());

    puffer = LEERER_PUFFER;
    await sichern();
    zeichne();
  };

  const naechsteSeq = (): number => (ereignisse.at(-1)?.seq ?? 0) + 1;

  /**
   * Das Starten und Anhalten der Uhr ist ein gewöhnliches Ereignis. Nur dadurch
   * überlebt der Uhrzustand ein Neuladen, und nur dadurch kann der Reduzierer
   * eine Aktion bei stehender Uhr überhaupt bemerken.
   */
  const uhrUmschalten = async (): Promise<void> => {
    const laeuftGleich = !uhr.laeuft;
    uhr = umschalten(uhr, jetzt());
    ereignisse = [...ereignisse, {
      seq: naechsteSeq(),
      t: spielzeit(uhr, jetzt()),
      wall: new Date().toISOString(),
      typ: laeuftGleich ? 'UL' : 'US',
    }];
    await sichern();
    zeichne();
  };

  const pufferHatInhalt = (): boolean =>
    puffer.ziffern !== '' || puffer.code !== '' || puffer.argument !== '';

  const zurueck = async (): Promise<void> => {
    ereignisse = ereignisse.slice(0, -1);
    await sichern();
    zeichne();
  };

  const beiTaste = (ereignis: KeyboardEvent): void => {
    if (ereignis.ctrlKey && ereignis.key.toLowerCase() === 'z') {
      ereignis.preventDefault();
      void zurueck();
      return;
    }
    if (ereignis.ctrlKey || ereignis.altKey || ereignis.metaKey) return;

    switch (ereignis.key) {
      case ' ':
        ereignis.preventDefault();
        void uhrUmschalten();
        return;
      case 'Enter':
        ereignis.preventDefault();
        void bestaetigen();
        return;
      case 'Backspace':
        ereignis.preventDefault();
        puffer = zeichenLoeschen(puffer);
        zeichne();
        return;
      case 'Escape':
        ereignis.preventDefault();
        puffer = LEERER_PUFFER;
        zeichne();
        return;
      default:
        if (ereignis.key.length !== 1) return;
        puffer = tasteVerarbeiten(puffer, ereignis.key);
        zeichne();
    }
  };

  window.addEventListener('keydown', beiTaste);
  // Die Uhr wird gerechnet, nicht getickt; dieser Takt zeichnet nur neu.
  window.setInterval(() => { if (uhr.laeuft) zeichne(); }, 250);
  zeichne();
}
```

- [ ] **Step 6: `src/main.ts` auf die Erfassung umstellen**

```ts
import { zeigeKader } from './ui/kader';
import { zeigeSpielstart } from './ui/spielstart';
import { starteErfassung } from './ui/tastatur';
import { kaderLaden, laufendesSpiel, spielBeenden } from './persistenz/speicher';

const wurzel = document.querySelector<HTMLDivElement>('#app');
if (!wurzel) throw new Error('#app fehlt in index.html');

function vonVorn(): void {
  void zeigeKader(wurzel!, (kader) => {
    zeigeSpielstart(wurzel!, kader, (spielId) => {
      void starteErfassung(wurzel!, kader, spielId);
    });
  });
}

/** Ein abgestürzter Tab oder ein leerer Akku sollen höchstens die letzte Aktion kosten. */
async function start(): Promise<void> {
  const laufend = await laufendesSpiel();
  if (!laufend) return vonVorn();

  wurzel!.innerHTML = `
    <h1>Unterbrochenes Spiel</h1>
    <p>Gegen ${laufend.gegner} vom ${laufend.datum}, ${laufend.ereignisse.length} Ereignisse.</p>
    <p><button id="fortsetzen">Fortsetzen</button> <button id="verwerfen">Neues Spiel</button></p>
  `;
  wurzel!.querySelector('#fortsetzen')?.addEventListener('click', async () => {
    void starteErfassung(wurzel!, await kaderLaden(), laufend.id);
  });
  wurzel!.querySelector('#verwerfen')?.addEventListener('click', async () => {
    await spielBeenden();
    vonVorn();
  });
}

void start();
```

- [ ] **Step 7: In der Anwendung nachsehen**

Run: `npm run dev`
Durchspielen und jeweils prüfen:

| Eingabe | Erwartung |
|---|---|
| Leertaste | Uhr läuft los, Anzeige nicht mehr gedämpft |
| `7` | Nr. 7 **und** Nr. 77 leuchten, die Zeile zeigt nur `7` |
| `T` | nur noch Nr. 7 leuchtet, Zeile zeigt `Nr. 7 · Tor`, darunter `T`, `TA`, `TD`, `TF`, `TS` |
| Eingabetaste | Spielstand geht auf 1:0, Ereignis erscheint oben im Feed |
| `77T` + Eingabetaste | Tor für Nr. 77, nicht für Nr. 7 |
| `7QQ` | Zeile rot mit `— unbekannt`, Eingabetaste bewirkt nichts |
| `GT` + Eingabetaste | Gegentor, Spielstand 1:1 |
| `7Z` + Eingabetaste | Nr. 7 wandert auf die Bank, Kachel rot mit ablaufender Restzeit |
| Strg+Z | letztes Ereignis verschwindet, Spielstand stimmt wieder |
| Tor eingeben, während die Uhr steht | Tor zählt trotzdem, unten erscheint die Prüfliste mit „Die Uhr steht" |
| Leertaste, dann Seite neu laden und fortsetzen | die Uhr steht wieder dort, wo sie stand |
| Seite neu laden, Spiel fortsetzen | die Ereignisse sind noch da |

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Tastatursteuerung mit dreistufiger Rückmeldung"
```

---

### Task 14: Korrekturmodus

**Files:**
- Create: `src/domain/korrektur.ts`, `src/ui/korrektur.ts`
- Modify: `src/ui/tastatur.ts`
- Test: `src/domain/korrektur.test.ts`

**Interfaces:**
- Consumes: `Ereignis` aus Task 2
- Produces:
  - `function ereignisEntfernen(ereignisse: readonly Ereignis[], seq: number): Ereignis[]`
  - `function spielerAendern(ereignisse: readonly Ereignis[], seq: number, spieler: number): Ereignis[]`
  - `function zeigeKorrektur(wurzel: HTMLElement, ereignisse: readonly Ereignis[], fertig: (neu: Ereignis[]) => void): void`

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/domain/korrektur.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ereignisEntfernen, spielerAendern } from './korrektur';
import type { Ereignis } from './ereignis';

const LOG: Ereignis[] = [
  { seq: 1, t: 0, wall: 'w', typ: 'I', spieler: 7 },
  { seq: 2, t: 10, wall: 'w', typ: 'T', spieler: 7 },
  { seq: 3, t: 20, wall: 'w', typ: 'GT' },
];

describe('Korrektur', () => {
  it('entfernt ein Ereignis aus der Mitte', () => {
    expect(ereignisEntfernen(LOG, 2).map((e) => e.typ)).toEqual(['I', 'GT']);
  });

  it('vergibt die Reihenfolgenummern lückenlos neu', () => {
    expect(ereignisEntfernen(LOG, 2).map((e) => e.seq)).toEqual([1, 2]);
  });

  it('lässt das Log unverändert, wenn die Nummer nicht vorkommt', () => {
    expect(ereignisEntfernen(LOG, 99)).toEqual(LOG);
  });

  it('ändert den Spieler eines Ereignisses', () => {
    const neu = spielerAendern(LOG, 2, 12);
    expect(neu[1]?.spieler).toBe(12);
    expect(neu[0]?.spieler).toBe(7);
  });

  it('rührt das Ausgangs-Log nicht an', () => {
    ereignisEntfernen(LOG, 2);
    spielerAendern(LOG, 2, 12);
    expect(LOG).toHaveLength(3);
    expect(LOG[1]?.spieler).toBe(7);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test src/domain/korrektur.test.ts`
Expected: FAIL — `Failed to resolve import "./korrektur"`.

- [ ] **Step 3: `src/domain/korrektur.ts` schreiben**

```ts
import type { Ereignis } from './ereignis';

/** Vergibt die Reihenfolgenummern lückenlos neu; die Zeitstempel bleiben unangetastet. */
function neuNummerieren(ereignisse: readonly Ereignis[]): Ereignis[] {
  return ereignisse.map((e, i) => ({ ...e, seq: i + 1 }));
}

export function ereignisEntfernen(ereignisse: readonly Ereignis[], seq: number): Ereignis[] {
  if (!ereignisse.some((e) => e.seq === seq)) return [...ereignisse];
  return neuNummerieren(ereignisse.filter((e) => e.seq !== seq));
}

export function spielerAendern(ereignisse: readonly Ereignis[], seq: number, spieler: number): Ereignis[] {
  return ereignisse.map((e) => (e.seq === seq ? { ...e, spieler } : { ...e }));
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: `src/ui/korrektur.ts` schreiben**

```ts
import type { Ereignis } from '../domain/ereignis';
import { findeEintrag } from '../domain/katalog';
import { ereignisEntfernen, spielerAendern } from '../domain/korrektur';
import { alsUhrzeit } from '../eingabe/grammatik';

/**
 * Zeigt die Ereignisliste zum Korrigieren. Pfeiltasten wählen, Entf löscht,
 * eine getippte Zahl plus Eingabetaste setzt den Spieler neu, Esc schließt.
 */
export function zeigeKorrektur(
  wurzel: HTMLElement,
  ereignisse: readonly Ereignis[],
  fertig: (neu: Ereignis[]) => void,
): void {
  let liste: Ereignis[] = [...ereignisse];
  let auswahl = liste.length - 1;
  let eingabe = '';

  function zeichne(): void {
    wurzel.innerHTML = `
      <h1>Korrektur</h1>
      <p>Pfeiltasten wählen · Entf löscht · Zahl eintippen und Eingabetaste setzt den Spieler · Esc schließt</p>
      <ul style="list-style:none;padding:0">
        ${liste.map((e, i) => {
          const eintrag = findeEintrag(e.typ);
          const wer = e.spieler === undefined ? '' : ` Nr. ${e.spieler}`;
          return `<li style="${i === auswahl ? 'outline:2px solid var(--hervor)' : ''}">
            ${alsUhrzeit(e.t)}${wer} — ${eintrag?.bezeichnung ?? e.typ}
          </li>`;
        }).join('')}
      </ul>
      <p class="puffer">${eingabe ? `neuer Spieler: ${eingabe}` : '&nbsp;'}</p>
    `;
  }

  function beiTaste(ereignis: KeyboardEvent): void {
    ereignis.preventDefault();
    const gewaehlt = liste[auswahl];

    if (ereignis.key === 'Escape') {
      window.removeEventListener('keydown', beiTaste);
      fertig(liste);
      return;
    }
    if (ereignis.key === 'ArrowUp') auswahl = Math.max(0, auswahl - 1);
    else if (ereignis.key === 'ArrowDown') auswahl = Math.min(liste.length - 1, auswahl + 1);
    else if (ereignis.key === 'Delete' && gewaehlt) {
      liste = ereignisEntfernen(liste, gewaehlt.seq);
      auswahl = Math.min(auswahl, liste.length - 1);
    } else if (/^[0-9]$/.test(ereignis.key)) eingabe += ereignis.key;
    else if (ereignis.key === 'Backspace') eingabe = eingabe.slice(0, -1);
    else if (ereignis.key === 'Enter' && gewaehlt && eingabe !== '') {
      liste = spielerAendern(liste, gewaehlt.seq, Number(eingabe));
      eingabe = '';
    }
    zeichne();
  }

  window.addEventListener('keydown', beiTaste);
  zeichne();
}
```

- [ ] **Step 6: Korrekturmodus in `src/ui/tastatur.ts` einhängen**

In `beiTaste` den `Escape`-Zweig ersetzen:

```ts
      case 'Escape':
        ereignis.preventDefault();
        if (puffer !== LEERER_PUFFER) {
          puffer = LEERER_PUFFER;
          zeichne();
          return;
        }
        window.removeEventListener('keydown', beiTaste);
        void import('./korrektur').then(({ zeigeKorrektur }) => {
          zeigeKorrektur(wurzel, ereignisse, async (neu) => {
            ereignisse = neu;
            await sichern();
            window.addEventListener('keydown', beiTaste);
            zeichne();
          });
        });
        return;
```

Esc verwirft also zuerst den Puffer und öffnet erst bei leerem Puffer die
Korrektur — sonst wäre ein Vertipper nicht mehr wegzuwerfen, ohne den Modus zu
wechseln.

- [ ] **Step 7: In der Anwendung nachsehen**

Run: `npm run dev`
Erwartet: Nach einigen Eingaben öffnet Esc bei leerem Puffer die Liste. Prüfen:
Pfeiltasten wählen, Entf löscht und der Spielstand stimmt danach, Zahl plus
Eingabetaste schreibt ein Tor auf einen anderen Spieler um, Esc kehrt zur
Erfassung zurück, und die Zahlen sind neu gerechnet.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Korrekturmodus für das Ereignis-Log"
```

---

### Task 15: Beispielspiel als Vergleichstest und Exportknöpfe

**Files:**
- Create: `src/domain/beispielspiel.ts`, `src/domain/beispielspiel.test.ts`
- Modify: `src/ui/tastatur.ts` (Exportknöpfe), `src/ui/erfassung.ts` (Knopfleiste)

**Interfaces:**
- Consumes: alles Vorige
- Produces:
  - `const BEISPIEL_KADER: Spieler[]`
  - `const BEISPIEL_EREIGNISSE: Ereignis[]`

- [ ] **Step 1: `src/domain/beispielspiel.ts` schreiben**

```ts
import type { Ereignis, Spieler } from './ereignis';

export const BEISPIEL_KADER: Spieler[] = [
  { nummer: 1, name: 'Torwart Eins', torwart: true },
  { nummer: 7, name: 'Sieben', torwart: false },
  { nummer: 12, name: 'Zwölf', torwart: false },
  { nummer: 77, name: 'Siebenundsiebzig', torwart: false },
];

let n = 0;
function e(typ: string, t: number, rest: Partial<Ereignis> = {}): Ereignis {
  return { seq: ++n, t, wall: new Date(1_760_000_000_000 + t * 1000).toISOString(), typ, ...rest };
}

/**
 * Ein kurzes, vollständig durchgerechnetes Spiel: Aufstellung, Tore, Fehlwürfe,
 * Siebenmeter, technischer Fehler, Zeitstrafe mit Ablauf, Wechsel, Gegentore,
 * Halbzeit und Uhrkorrektur.
 */
export const BEISPIEL_EREIGNISSE: Ereignis[] = [
  e('I', 0, { spieler: 1 }),
  e('I', 0, { spieler: 7 }),
  e('I', 0, { spieler: 12 }),
  e('UL', 0),

  e('T', 60, { spieler: 7, pos: 2 }),
  e('GT', 120),
  e('F', 180, { spieler: 12 }),
  e('P', 200, { spieler: 1 }),
  e('TF', 240, { spieler: 12 }),
  e('ST', 300, { spieler: 7 }),
  e('SF', 360, { spieler: 7 }),
  e('GT', 420),

  e('Z', 480, { spieler: 12 }),          // 12 geht runter, Strafe bis 600
  e('GT', 540),                           // fällt in Unterzahl
  e('W', 660, { spieler: 7, ein: 77 }),   // Strafe ist abgelaufen, 7 raus, 77 rein
  e('T', 720, { spieler: 77 }),

  e('HZ', 900),
  e('U', 900, { zeit: 900 }),
];
```

- [ ] **Step 2: Vergleichstest schreiben**

`src/domain/beispielspiel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BEISPIEL_EREIGNISSE, BEISPIEL_KADER } from './beispielspiel';
import { reduziere } from './reduzierer';
import { statistik } from './statistik';

describe('Beispielspiel', () => {
  const zustand = reduziere(BEISPIEL_EREIGNISSE);
  const werte = statistik(BEISPIEL_EREIGNISSE, BEISPIEL_KADER, 900);
  const von = (nummer: number) => {
    const z = werte.find((w) => w.nummer === nummer);
    if (!z) throw new Error(`Nr. ${nummer} fehlt`);
    return z;
  };

  it('kommt auf den erwarteten Endstand', () => {
    expect(`${zustand.toreEigen}:${zustand.toreGegner}`).toBe('3:3');
  });

  it('hat am Ende die erwartete Aufstellung', () => {
    expect(zustand.aufDemFeld).toEqual([1, 77]);
  });

  it('hat keine laufende Zeitstrafe mehr', () => {
    expect(zustand.strafen).toEqual([]);
  });

  it('rechnet die Werte für Nr. 7', () => {
    const s = von(7);
    expect(s.tore).toBe(1);
    expect(s.wuerfe).toBe(1);
    expect(s.siebenmeterTore).toBe(1);
    expect(s.siebenmeterVersuche).toBe(2);
    expect(s.einsatzzeit).toBe(660);
    expect(s.plusMinus).toBe(-1);
  });

  it('rechnet die Werte für Nr. 12, dessen Strafzeit nicht zählt', () => {
    const s = von(12);
    expect(s.technischeFehler).toBe(1);
    expect(s.wuerfe).toBe(1);
    expect(s.tore).toBe(0);
    expect(s.wurfquote).toBe(0);
    expect(s.einsatzzeit).toBe(480);
    expect(s.zaehler.Z).toBe(1);
  });

  it('rechnet die Werte für Nr. 77, der erst spät kommt', () => {
    const s = von(77);
    expect(s.einsatzzeit).toBe(240);
    expect(s.tore).toBe(1);
    expect(s.plusMinus).toBe(1);
  });

  it('rechnet die Torwartwerte', () => {
    const s = von(1);
    expect(s.einsatzzeit).toBe(900);
    expect(s.gegentoreImEinsatz).toBe(3);
    expect(s.zaehler.P).toBe(1);
  });

  it('erzeugt keine Hinweise — das Beispielspiel ist widerspruchsfrei', () => {
    expect(zustand.hinweise).toEqual([]);
  });
});
```

- [ ] **Step 3: Tests laufen lassen**

Run: `npm test src/domain/beispielspiel.test.ts`
Expected: PASS. Schlägt etwas fehl, ist zuerst von Hand nachzurechnen, welche
Seite recht hat — die erwarteten Werte im Test oder die Rechnung im Code.

- [ ] **Step 4: Exportknöpfe in `src/ui/erfassung.ts` ergänzen**

In `zeichneErfassung` vor dem schließenden `</div>` der Klasse `erfassung`
einfügen:

```html
      <p>
        <button id="export-jsonl">Ereignisse (JSONL)</button>
        <button id="export-csv">Statistik (CSV)</button>
        <button id="export-md">Zusammenfassung (Markdown)</button>
      </p>
```

- [ ] **Step 5: Knöpfe in `src/ui/tastatur.ts` verdrahten**

Am Ende von `zeichne()` anhängen:

```ts
    const exportieren = async (endung: 'jsonl' | 'csv' | 'md'): Promise<void> => {
      const { alsJsonl, alsCsv, alsMarkdown, dateiname } = await import('../persistenz/export');
      const { herunterladen } = await import('./kader');
      const aktuell = { ...spiel, ereignisse };
      const werte = statistik(ereignisse, kader, spielzeit(uhr, jetzt()));
      const z = reduziere(ereignisse);
      const inhalt =
        endung === 'jsonl' ? alsJsonl(ereignisse)
        : endung === 'csv' ? alsCsv(werte)
        : alsMarkdown(aktuell, werte, z.toreEigen, z.toreGegner);
      herunterladen(dateiname(aktuell, endung), inhalt);
    };
    wurzel.querySelector('#export-jsonl')?.addEventListener('click', () => void exportieren('jsonl'));
    wurzel.querySelector('#export-csv')?.addEventListener('click', () => void exportieren('csv'));
    wurzel.querySelector('#export-md')?.addEventListener('click', () => void exportieren('md'));
```

- [ ] **Step 6: Vollständigen Durchlauf prüfen**

Run: `npm test && npm run build && npm run dev`
Erwartet: Alle Tests bestehen, der Bau läuft durch. In der Anwendung ein kurzes
Spiel erfassen und alle drei Dateien herunterladen. Prüfen: Die JSONL hat eine
Zeile je Ereignis, die CSV öffnet in einem Tabellenprogramm mit korrekten
Spalten, die Markdown-Datei nennt Endstand und Verlauf.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Beispielspiel als Vergleichstest und Exportknöpfe"
```
