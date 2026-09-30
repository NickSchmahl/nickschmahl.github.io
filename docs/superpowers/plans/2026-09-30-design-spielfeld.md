# Design „Spielfeld“: Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die App bekommt das Designpaket „Spielfeld“: einheitliche Design-Tokens für hell und dunkel, lokale Schriften, ein Logo, ein neues Erfassungslayout mit dem Verlauf als Seitenleiste, Bearbeiten direkt im Verlauf, Maus-Bedienung und denselben Stil im Bericht.

**Architecture:** Alle Farben, Schriften und Radien stehen in `src/design/tokens.css`. Die App bindet die Datei als Stylesheet ein, der exportierte Bericht bettet sie als Text ein (`?raw`). Die Schriften liegen als eingebettete woff2 in `src/design/schriften.ts` (`?inline`). Die UI bleibt bei Template-Strings ohne Framework. Neue Logik (Verlaufsauswahl, Vorschläge per Klick, Farbmodus, „betrifft die Uhr?“) steckt in reinen Funktionen mit Vitest-Tests. Die Module `ui/erfassung.ts` und `ui/tastatur.ts` zeichnen und verdrahten nur. Der eigene Korrektur-Bildschirm entfällt.

**Tech Stack:** Vite 8, TypeScript 7, Vitest 4, `@fontsource/saira` und `@fontsource/saira-condensed` 5.3 (nur als Quelle der woff2-Dateien). Kein UI-Framework.

**Spec:** Keine eigene Datei. Die abgestimmten Entscheidungen stehen unten unter „Designentscheidungen“. Referenz für Farben, Maße und Anordnung ist das Mockup `docs/design/designpakete.html`, Paket 1 „Spielfeld“, im Browser öffnen.

## Global Constraints

- Sprache in Code, Bezeichnern, Kommentaren und Oberflächentexten: **Deutsch**.
- `src/domain/**` und `src/eingabe/**` importieren nichts aus `src/ui/**`, `src/persistenz/**`, `src/bericht/**` oder `src/design/**` und greifen nicht auf `document`, `window` oder `indexedDB` zu.
- `src/design/**` greift nicht aufs DOM zu und importiert nur Schriftdateien aus `node_modules`, sonst nichts aus `src`.
- `src/bericht/**` importiert nur aus `src/domain/**`, `src/eingabe/**` und `src/design/**`. Kein DOM-Zugriff, alle Funktionen liefern Text.
- **Farben nur über Tokens** aus `src/design/tokens.css`. Keine Farbliterale in `src/stil.css`, `src/bericht/stil.ts` oder im Markup. Ausnahmen: `#ffffff` als Papierhintergrund im Druck und `rgba(0, 0, 0, …)` für Schatten.
- **Keine neuen Laufzeitabhängigkeiten.** Nur `@fontsource/saira@^5.3.0` und `@fontsource/saira-condensed@^5.3.0` als devDependencies.
- Die Tastaturgrammatik und alle bisherigen Kürzel funktionieren unverändert weiter. Neu hinzu kommt nur, was unter „Designentscheidungen“ steht.
- Freitexte (Namen, Gegner, Notizen, Meldungen) laufen im HTML immer durch `htmlEscapen`.
- Arbeit auf dem Branch `design-spielfeld`. **Nicht auf `main` pushen**, denn ein Push auf `main` deployt über GitHub Pages.
- Nach jedem Task committen. Commit-Nachrichten auf Deutsch, mit Leerzeile und `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` am Ende.
- Tests: `npm test` (Vitest, Node-Umgebung). Typen: `npx tsc --noEmit`. Build: `npm run build`.

## Designentscheidungen

1. **Tokens:** Farbwerte wie im Mockup, Paket „Spielfeld“ (siehe Task 1). Hell ist der Grundsatz. Dunkel folgt `prefers-color-scheme`, solange niemand umgeschaltet hat. Der Druck ist immer hell.
2. **Farbmodus-Schalter:** Er sitzt in der Kopfleiste jedes Bildschirms und wechselt reihum System → hell → dunkel. Die Wahl liegt in `localStorage` unter `handball-tracker:thema`. Ein gesperrter Speicher darf nie stören.
3. **Schriften:** Saira (400, 600) für Text, Saira Condensed (600, 700) für Zahlen und Überschriften, nur der lateinische Zeichensatz. Sie sind eingebettet, also offline nutzbar und im exportierten Bericht enthalten.
4. **Logo:** Torraum-Bogen (6 m), gestrichelte 9-m-Linie, Tor und Ball in Hallenorange, dazu der Schriftzug „Handball / Tracker“. Dasselbe Zeichen dient als Favicon.
5. **Erfassungslayout:**
   - Oben die Kopfleiste: Logo, Uhr, Stand, Spielinfo, Strafen-Pillen, Auswertung, Export-Menü und Farbmodus.
   - Links darunter „Auf dem Feld“ in vier Spalten, darunter die Bank als kompakte Reihe, ganz unten die Eingabezeile. Bei weniger Platz werden es drei oder zwei Spalten, damit die Kennzahlen nicht gequetscht werden. *(Nachtrag aus der Abschlussprüfung.)*
   - Rechts der Verlauf über die volle Höhe.
   - Unter 900 px Breite wird alles einspaltig und der Verlauf rutscht nach unten.
   - **Kein** Live-Diagramm der Tordifferenz.
6. **Kacheln:** Nummer und Name, darunter beschriftete Kennzahlen: Tore, 7m, Zeit, +/−. Bei Torhüterinnen Paraden, Gegentore, Zeit, +/−. Freie Feldplätze erscheinen als „Platz frei“.
7. **Maus:**
   - Kachel anklicken setzt die Nummer in die Eingabe.
   - Die Vorschläge unter der Eingabezeile sind klickbar. Ein Klick bucht sofort, wenn der Eintrag damit vollständig ist.
   - Die Uhr lässt sich anklicken wie die Leertaste.
8. **Verlauf:**
   - Alle Einträge, Neuestes oben, mit einer Überschrift je Abschnitt.
   - Tore fett, Gegentore rot, Notizen kursiv, Hinweise an der Zeile.
   - „N prüfen“ springt zum nächsten auffälligen Eintrag. Die aufklappbare Prüfliste entfällt.
9. **Bearbeiten im Verlauf:**
   - Nur „Spielerin ändern“ und „Löschen“, wie bisher.
   - Auswahl per Klick oder mit `Esc` bei leerer Eingabe.
   - Tasten: `↑`/`↓` wählen, Ziffern und `⏎` setzen die Spielerin, `Entf` oder `⌫` (bei leerer Nummer) löschen, `Esc` schließt.
   - Die Leertaste schaltet auch dann die Uhr.
10. **Uhr bei Korrekturen:**
    - Die Uhr läuft weiter.
    - Nur wenn eine Korrektur ein Uhr-Ereignis betrifft (`UL`, `US`, `AZ`, `HZ`, `U`), wird die Uhr wie bisher angehalten und aus dem Log bestimmt.
    - Ein Rückgängig, das ein Uhr-Ereignis betrifft, holt den Uhrzustand von vorher zurück. Ein versehentliches Anhalten läuft so nahtlos weiter. *(Nachtrag aus der Abschlussprüfung.)*
11. **Rückgängig:**
    - `Strg+Z` und `⌘+Z` nehmen die letzte Änderung zurück: Buchung, Uhr schalten, Notiz, Löschen oder Spielerin ändern.
    - Der Stapel hält 100 Stände und überlebt kein Neuladen. Nach dem Neuladen löscht man den letzten Eintrag über den Verlauf.
    - `⌘+⇧+Z` (Wiederholen) löst kein Rückgängig aus. Ein Doppelklick auf „Löschen“ und eine gehaltene `Entf`-Taste löschen nur einen Eintrag. *(Nachtrag aus der Abschlussprüfung.)*
12. **Übrige Bildschirme:** Kader, Spielstart, „Unterbrochenes Spiel“ und Auswertung bekommen dieselbe Kopfleiste und dieselben Bausteine (Karte, Knopf, Feld, Tabelle). Die Startaufstellung wird aus Kacheln gewählt.
13. **Bericht:**
    - Tokens und Spielfeld-Typografie, Logo im Kopf.
    - Die Exportdatei bettet Tokens und Schriften ein und folgt damit der Systemeinstellung, der Druck ist hell.
    - Die eigenen Farbsätze `BERICHT_HELL` und `BERICHT_DUNKEL` entfallen.

## Dateien

| Datei | Verantwortung |
|---|---|
| `package.json` | + devDependencies `@fontsource/saira`, `@fontsource/saira-condensed` |
| `tsconfig.json` | + Typen `vite/client` (für `?raw` und `?inline`) |
| `index.html` | Favicon, `color-scheme`, kein Stylesheet-Link mehr |
| `public/favicon.svg` (neu) | App-Symbol |
| `src/design/tokens.css` (neu) | Farben hell/dunkel/Druck, Schriftfamilien, Radius |
| `src/design/schriften.ts` (neu) | `SCHRIFTEN_CSS`: `@font-face` mit eingebetteten woff2 |
| `src/design/logo.ts` (neu) | `LOGO_ZEICHEN`, `logoHtml()` |
| `src/stil.css` | App-Bausteine und Erfassungslayout auf Tokens |
| `src/main.ts` | Stile, Schriften und Farbmodus einbinden; Bildschirm „Unterbrochenes Spiel“ |
| `src/ui/thema.ts` (neu) | Farbmodus wählen, speichern, anwenden; Umschaltknopf |
| `src/ui/kopf.ts` (neu) | `kopfleiste()` für alle Bildschirme außer der Erfassung |
| `src/ui/kader.ts`, `src/ui/spielstart.ts`, `src/ui/auswertung.ts` | Kopfleiste und Bausteine |
| `src/ui/verlauf.ts` (neu) | Verlaufszeilen, Tastenlogik der Auswahl, Nachbar nach dem Löschen, nächster Hinweis, Kurzbeschreibung |
| `src/eingabe/klick.ts` (neu) | Vorschläge für die Maus, Nummer und Code per Klick |
| `src/ui/erfassung.ts` | Neues Layout, Kennzahlen, Verlauf mit Bearbeiten |
| `src/ui/tastatur.ts` | Mausklicks, Verlaufsauswahl, Rückgängig-Stapel, Uhr bei Korrekturen |
| `src/ui/korrektur.ts` | **wird gelöscht** |
| `src/domain/korrektur.ts` | + `betrifftUhr` |
| `src/bericht/stil.ts` | Bericht-CSS auf Tokens, ohne eigene Farbsätze |
| `src/bericht/auswertung.ts` | Logo im Kopf; Exportdatei bettet Tokens und Schriften ein |
| `docs/design/designpakete.html` | Referenz-Mockup, wird in Task 1 mit eingecheckt |

## Hilfe für die Sichtprüfungen

Dev-Server: `npm run dev -- --port 5183`, dann `http://localhost:5183` öffnen. Ein realistisches Testspiel legt dieses Snippet in der Browser-Konsole an. Es überschreibt Kader und laufendes Spiel **im Speicher dieses Browsers**:

```js
const s = await import('/src/persistenz/speicher.ts');
await s.kaderSpeichern([
  {nummer:1,name:'Lena Brandt',torwart:true},{nummer:12,name:'Mia Hoffmann',torwart:true},
  {nummer:3,name:'Jule Weber',torwart:false},{nummer:5,name:'Sara Klein',torwart:false},
  {nummer:7,name:'Emma Vogt',torwart:false},{nummer:8,name:'Nele Krüger',torwart:false},
  {nummer:10,name:'Hanna Scholz',torwart:false},{nummer:11,name:'Lea Wolf',torwart:false},
  {nummer:14,name:'Pia Neumann',torwart:false},{nummer:17,name:'Ida Schwarz',torwart:false},
  {nummer:21,name:'Clara Braun',torwart:false},{nummer:23,name:'Marie Zimmer',torwart:false},
  {nummer:77,name:'Tessa Lange',torwart:false}]);
const spiel = await s.spielAnlegen('HSG Nordwest', '2026-09-27');
let n = 0; const ev = []; const e = (typ, t, r = {}) => ev.push({ seq: ++n, t, wall: new Date(1790000000000 + t * 1000).toISOString(), typ, ...r });
for (const nr of [1,3,5,7,8,10,11]) e('I', 0, { spieler: nr });
e('UL',0); e('T',45,{spieler:7,pos:2}); e('GT',90); e('F',130,{spieler:10,pos:3}); e('P',160,{spieler:1}); e('GF',165);
e('TG',190,{spieler:5}); e('TF',240,{spieler:8}); e('GT',260); e('ST',300,{spieler:7}); e('A',330,{spieler:3}); e('T',331,{spieler:11,pos:6});
e('GF',380); e('FB',420,{spieler:7,pos:4}); e('Z',470,{spieler:8}); e('GTG',520); e('BG',560,{spieler:3}); e('T',600,{spieler:10,pos:3});
e('W',640,{spieler:11,ein:14}); e('GS',700); e('SF',760,{spieler:7}); e('T',800,{spieler:14,pos:1}); e('#',820,{text:'Abwehr steht zu flach, mehr raus auf RL'});
e('B',850,{spieler:5}); e('GT',900); e('AZ',930); e('T',990,{spieler:5,pos:5}); e('ZG',1010,{spieler:3});
await s.ereignisseErsetzen(spiel.id, ev);
location.reload();
```

Danach „Fortsetzen“ klicken. Das Spiel steht 7:5. Nr. 8 „darf rein“, ein Eintrag hat den Hinweis „Die Uhr steht“.

---

### Task 1: Design-Grundlage (Tokens, Schriften, Logo, Favicon)

**Files:**
- Modify: `package.json`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/stil.css`, `src/ui/spielstart.ts:27`, `src/ui/korrektur.ts:28`
- Create: `src/design/tokens.css`, `src/design/schriften.ts`, `src/design/logo.ts`, `public/favicon.svg`
- Test: `src/design/tokens.test.ts`, `src/design/schriften.test.ts`, `src/design/logo.test.ts`
- Add: `docs/design/designpakete.html` (liegt schon im Arbeitsverzeichnis, nur einchecken)

**Interfaces:**
- Consumes: nichts.
- Produces:
  - CSS-Custom-Properties auf `:root`: `--grund`, `--flaeche`, `--flaeche-2`, `--rand`, `--schrift`, `--gedaempft`, `--akzent`, `--akzent-schrift`, `--feld`, `--feld-hell`, `--gut`, `--schlecht`, `--warnung`, `--markierung`, `--gut-flaeche`, `--schlecht-flaeche`, `--familie-zahl`, `--familie-text`, `--radius`
  - `src/design/schriften.ts`: `export const SCHRIFTEN_CSS: string`
  - `src/design/logo.ts`: `export const LOGO_ZEICHEN: string`, `export function logoHtml(): string`
  - `import tokens from './tokens.css?raw'` liefert den Text der Tokens (Typen über `vite/client`)

- [ ] **Step 1: Branch anlegen, Referenz-Mockup einchecken**

```bash
git switch -c design-spielfeld
git add docs/design/designpakete.html
git commit -m "Referenz-Mockup der drei Designpakete

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Schriftpakete installieren und Typen für `?raw`/`?inline` freischalten**

```bash
npm install -D @fontsource/saira@^5.3.0 @fontsource/saira-condensed@^5.3.0
```

In `tsconfig.json` die Zeile `"types": ["vitest/globals"]` ersetzen durch:

```json
    "types": ["vitest/globals", "vite/client"]
```

- [ ] **Step 3: Failing Tests schreiben**

`src/design/tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import tokens from './tokens.css?raw';

/** Der Inhalt des ersten Blocks, der mit dem Selektor beginnt. */
function block(selektor: string): string {
  const anfang = tokens.indexOf(selektor);
  if (anfang < 0) throw new Error(`Selektor fehlt: ${selektor}`);
  const auf = tokens.indexOf('{', anfang);
  return tokens.slice(auf + 1, tokens.indexOf('}', auf));
}

const namen = (text: string): string[] => [...text.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]!).sort();

describe('Design-Tokens', () => {
  it('definiert jede Farbe hell, dunkel (System und Schalter) und für den Druck', () => {
    const farben = namen(block(':root {')).filter((n) => !n.startsWith('--familie') && n !== '--radius');
    expect(farben).toContain('--akzent');
    expect(namen(block(':root:not([data-theme="light"])'))).toEqual(farben);
    expect(namen(block(':root[data-theme="dark"]'))).toEqual(farben);
    expect(namen(block(':root:is('))).toEqual(farben);
  });

  it('nennt die eingebetteten Schriftfamilien', () => {
    expect(tokens).toContain('--familie-zahl: "Saira Condensed"');
    expect(tokens).toContain('--familie-text: "Saira"');
  });
});
```

`src/design/schriften.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SCHRIFTEN_CSS } from './schriften';

describe('Schriften', () => {
  it('bettet vier Schnitte als woff2 ein', () => {
    expect(SCHRIFTEN_CSS.match(/src: url\(data:font\/woff2;base64,/g)).toHaveLength(4);
  });

  it('stellt die Familien bereit, die die Tokens nennen', () => {
    expect(SCHRIFTEN_CSS).toContain('font-family: "Saira";');
    expect(SCHRIFTEN_CSS).toContain('font-family: "Saira Condensed";');
  });
});
```

`src/design/logo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LOGO_ZEICHEN, logoHtml } from './logo';

describe('Logo', () => {
  it('liefert Zeichen und Schriftzug mit Namen für Screenreader', () => {
    const html = logoHtml();
    expect(html).toContain('aria-label="Handball-Tracker"');
    expect(html).toContain(LOGO_ZEICHEN);
    expect(html).toContain('Tracker');
  });

  it('färbt ausschließlich über Tokens', () => {
    expect(LOGO_ZEICHEN).not.toMatch(/#[0-9a-f]{3,6}\b/i);
    expect(LOGO_ZEICHEN).toContain('var(--akzent)');
  });
});
```

- [ ] **Step 4: Tests laufen lassen, sie schlagen fehl**

Run: `npx vitest run src/design`
Expected: FAIL, die Module `./tokens.css?raw`, `./schriften` und `./logo` fehlen.

- [ ] **Step 5: Tokens anlegen**

`src/design/tokens.css`:

```css
/*
 * Design-Tokens „Spielfeld“. Einzige Quelle für Farben, Schriften und Radien:
 * die App bindet die Datei als Stylesheet ein, der exportierte Bericht bettet
 * sie als Text ein. Hell ist der Grundsatz; dunkel folgt dem System, solange
 * niemand umgeschaltet hat, und der Druck ist immer hell.
 */
:root {
  --grund: #e7edf0;
  --flaeche: #ffffff;
  --flaeche-2: #f2f6f8;
  --rand: #c9d5dc;
  --schrift: #0f2530;
  --gedaempft: #5a707c;
  --akzent: #e0552b;
  --akzent-schrift: #ffffff;
  --feld: #1f6f9f;
  --feld-hell: #dcebf4;
  --gut: #178a5f;
  --schlecht: #c9303a;
  --warnung: #a87400;
  --markierung: rgba(224, 85, 43, .13);
  --gut-flaeche: rgba(23, 138, 95, .2);
  --schlecht-flaeche: rgba(201, 48, 58, .18);
  --familie-zahl: "Saira Condensed", "Arial Narrow", sans-serif;
  --familie-text: "Saira", system-ui, sans-serif;
  --radius: 6px;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --grund: #0a171e;
    --flaeche: #11232c;
    --flaeche-2: #0d1d25;
    --rand: #22404d;
    --schrift: #e2edf1;
    --gedaempft: #87a2ad;
    --akzent: #ff7a4d;
    --akzent-schrift: #1a0a04;
    --feld: #52acdf;
    --feld-hell: #123447;
    --gut: #35c28f;
    --schlecht: #ff6b6b;
    --warnung: #f2b73a;
    --markierung: rgba(255, 122, 77, .18);
    --gut-flaeche: rgba(53, 194, 143, .25);
    --schlecht-flaeche: rgba(255, 107, 107, .25);
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
  --grund: #0a171e;
  --flaeche: #11232c;
  --flaeche-2: #0d1d25;
  --rand: #22404d;
  --schrift: #e2edf1;
  --gedaempft: #87a2ad;
  --akzent: #ff7a4d;
  --akzent-schrift: #1a0a04;
  --feld: #52acdf;
  --feld-hell: #123447;
  --gut: #35c28f;
  --schlecht: #ff6b6b;
  --warnung: #f2b73a;
  --markierung: rgba(255, 122, 77, .18);
  --gut-flaeche: rgba(53, 194, 143, .25);
  --schlecht-flaeche: rgba(255, 107, 107, .25);
  color-scheme: dark;
}

@media print {
  /* :is(…) hebt die Spezifität auf die der Dunkel-Regeln; als letzte Regel gewinnt sie. */
  :root:is([data-theme], :not([data-theme])) {
    --grund: #ffffff;
    --flaeche: #ffffff;
    --flaeche-2: #f2f6f8;
    --rand: #c9d5dc;
    --schrift: #0f2530;
    --gedaempft: #5a707c;
    --akzent: #e0552b;
    --akzent-schrift: #ffffff;
    --feld: #1f6f9f;
    --feld-hell: #dcebf4;
    --gut: #178a5f;
    --schlecht: #c9303a;
    --warnung: #a87400;
    --markierung: rgba(224, 85, 43, .13);
    --gut-flaeche: rgba(23, 138, 95, .2);
    --schlecht-flaeche: rgba(201, 48, 58, .18);
    color-scheme: light;
  }
}
```

- [ ] **Step 6: Schriften einbetten**

`src/design/schriften.ts`:

```ts
import sairaText400 from '@fontsource/saira/files/saira-latin-400-normal.woff2?inline';
import sairaText600 from '@fontsource/saira/files/saira-latin-600-normal.woff2?inline';
import sairaZahl600 from '@fontsource/saira-condensed/files/saira-condensed-latin-600-normal.woff2?inline';
import sairaZahl700 from '@fontsource/saira-condensed/files/saira-condensed-latin-700-normal.woff2?inline';

/**
 * Die Schriften liegen als data:-URLs im Bundle statt bei einem Schriftdienst:
 * in der Halle gibt es oft kein Netz, und der exportierte Bericht soll bei allen
 * gleich aussehen. Nur der lateinische Zeichensatz; Umlaute und ß sind enthalten.
 */
const schnitt = (familie: string, gewicht: number, url: string): string =>
  `@font-face { font-family: "${familie}"; font-style: normal; font-weight: ${gewicht}; font-display: swap; src: url(${url}) format("woff2"); }`;

export const SCHRIFTEN_CSS = [
  schnitt('Saira', 400, sairaText400),
  schnitt('Saira', 600, sairaText600),
  schnitt('Saira Condensed', 600, sairaZahl600),
  schnitt('Saira Condensed', 700, sairaZahl700),
].join('\n');
```

- [ ] **Step 7: Logo anlegen**

`src/design/logo.ts`:

```ts
/**
 * Das Zeichen: Torraum (6-Meter-Bogen), gestrichelte 9-Meter-Linie, Tor und
 * Ball. Alle Farben kommen über Inline-Styles aus den Tokens; so kommt das Logo
 * in App und Exportdatei ohne eigenes CSS aus und macht beide Farbmodi mit.
 */
export const LOGO_ZEICHEN =
  '<svg class="logo-zeichen" viewBox="0 0 48 48" width="2.6em" height="2.6em" aria-hidden="true" style="flex:none;overflow:visible">' +
  '<path d="M1 45 A23 23 0 0 1 47 45" style="fill:none;stroke:var(--schrift);stroke-width:2.5;stroke-dasharray:4 3.4;opacity:.5"/>' +
  '<path d="M9 45 A15 15 0 0 1 39 45" style="fill:none;stroke:var(--schrift);stroke-width:4"/>' +
  '<rect x="16" y="43" width="16" height="4" rx="1" style="fill:var(--schrift)"/>' +
  '<circle cx="24" cy="14" r="6" style="fill:var(--akzent)"/>' +
  '</svg>';

/** Zeichen mit Schriftzug; die Größe folgt der Schriftgröße des umgebenden Elements. */
export function logoHtml(): string {
  return '<span class="logo" role="img" aria-label="Handball-Tracker" style="display:inline-flex;align-items:center;gap:.55em;color:var(--schrift);line-height:1">' +
    LOGO_ZEICHEN +
    '<span style="display:flex;flex-direction:column;font-family:var(--familie-zahl);font-weight:700;font-size:1.25em;line-height:.92;text-transform:uppercase;letter-spacing:.03em">' +
    'Handball<span style="font-weight:600;color:var(--akzent)">Tracker</span></span></span>';
}
```

- [ ] **Step 8: Tests laufen lassen, sie bestehen**

Run: `npx vitest run src/design`
Expected: PASS (6 Tests)

- [ ] **Step 9: Favicon und `index.html`**

`public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <style>
    .linie { stroke: #0f2530; }
    .tor { fill: #0f2530; }
    @media (prefers-color-scheme: dark) {
      .linie { stroke: #e2edf1; }
      .tor { fill: #e2edf1; }
    }
  </style>
  <path class="linie" d="M1 45 A23 23 0 0 1 47 45" fill="none" stroke-width="2.5" stroke-dasharray="4 3.4" opacity=".5"/>
  <path class="linie" d="M9 45 A15 15 0 0 1 39 45" fill="none" stroke-width="4"/>
  <rect class="tor" x="16" y="43" width="16" height="4" rx="1"/>
  <circle cx="24" cy="14" r="6" fill="#e0552b"/>
</svg>
```

`index.html` vollständig:

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>Handball-Tracker</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 10: Stile und Schriften in `main.ts` einbinden**

Ganz oben in `src/main.ts`, vor den bestehenden Imports:

```ts
import './design/tokens.css';
import './stil.css';
import { SCHRIFTEN_CSS } from './design/schriften';
```

Direkt nach den Imports, vor `const wurzel = …`:

```ts
// Die Schriften hängen als eigenes Stylesheet im Kopf; dieselben Regeln bettet der Bericht ein.
const schriften = document.createElement('style');
schriften.id = 'schriften';
schriften.textContent = SCHRIFTEN_CSS;
document.head.appendChild(schriften);
```

- [ ] **Step 11: `stil.css` auf die Tokens umstellen**

In `src/stil.css`:
- Den ganzen Block `:root { … }` am Anfang löschen. Die Farben kommen jetzt aus `tokens.css`, die bisherigen Namen `--grund`, `--flaeche`, `--rand`, `--schrift`, `--gedaempft`, `--gut`, `--schlecht` gibt es dort weiter.
- `body { … font: 16px/1.4 system-ui, sans-serif; … }` → `font: 16px/1.4 var(--familie-text);`
- In `button, input, select { … }` → `border-radius: var(--radius);`
- `.uhr { font-size: 3rem; … }` → zusätzlich `font-family: var(--familie-zahl);`
- `.stand { … }` → zusätzlich `font-family: var(--familie-zahl);`
- `.kachel .nr { … }` → zusätzlich `font-family: var(--familie-zahl);`
- `.eingabe .puffer { … }` → zusätzlich `font-family: var(--familie-zahl);`
- `.kachel.hervor { outline: 2px solid var(--hervor); }` → `var(--akzent)`

In `src/ui/spielstart.ts` (Zeile 27) und `src/ui/korrektur.ts` (Zeile 28) jeweils `var(--hervor)` → `var(--akzent)`.

Kontrolle: `grep -rn "\-\-hervor" src` findet nichts mehr.

- [ ] **Step 12: Typen, Tests, Build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: keine Typfehler, alle Tests PASS, Build erzeugt `dist/` mit `favicon.svg`.

- [ ] **Step 13: Sichtprüfung**

Dev-Server starten und die Seite prüfen:
- Hell: Grund `#e7edf0`, Schrift Saira.
- Im Browser Dunkelmodus erzwingen (DevTools → Rendering → `prefers-color-scheme: dark`): Grund `#0a171e`.
- Das Favicon zeigt den Torraum mit orangem Ball.
- In den DevTools (Network) werden keine Schriften von fremden Hosts geladen.

- [ ] **Step 14: Commit**

```bash
git add package.json package-lock.json tsconfig.json index.html public/favicon.svg src/design src/main.ts src/stil.css src/ui/spielstart.ts src/ui/korrektur.ts
git commit -m "Design-Tokens „Spielfeld“, eingebettete Schriften, Logo und Favicon

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Farbmodus, Kopfleiste und die Bildschirme außerhalb der Erfassung

**Files:**
- Create: `src/ui/thema.ts`, `src/ui/kopf.ts`
- Modify: `src/main.ts`, `src/ui/kader.ts`, `src/ui/spielstart.ts`, `src/ui/auswertung.ts`, `src/bericht/stil.ts` (eine Zeile im Druckblock), `src/stil.css`
- Test: `src/ui/thema.test.ts`, `src/ui/kopf.test.ts`

**Interfaces:**
- Consumes: `logoHtml()` aus `src/design/logo.ts`; alle Tokens aus Task 1.
- Produces:
  - `src/ui/thema.ts`: `type Thema = 'system' | 'hell' | 'dunkel'`, `naechstesThema(t: Thema): Thema`, `themaAttribut(t: Thema): 'light' | 'dark' | null`, `themaLaden(ablage: Pick<Storage, 'getItem' | 'setItem'> | undefined): Thema`, `themaSpeichern(ablage, t: Thema): void`, `themaKnopfHtml(): string`, `themaEinrichten(): void`
  - `src/ui/kopf.ts`: `kopfleiste(titel: string, knoepfe?: string): string`
  - CSS-Klassen in `stil.css`: `.seite`, `.kopfleiste`, `.inhalt`, `.karte`, `.abschnitt-titel`, `.knopf` (+ `.primaer`, `.gefahr`, `.klein`, `.symbol`, `.datei`), `.knopfzeile`, `.feld`, `.beschriftet`, `.formular-zeile`, `.tabelle`, `.pille` (+ `.gut`, `.schlecht`, `.warnung`), `.auswahl-kacheln`, `.bericht-rahmen`

- [ ] **Step 1: Failing Tests schreiben**

`src/ui/thema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { naechstesThema, themaAttribut, themaKnopfHtml, themaLaden, themaSpeichern } from './thema';

const ablage = (werte: Record<string, string> = {}) => ({
  getItem: (k: string) => werte[k] ?? null,
  setItem: (k: string, v: string) => { werte[k] = v; },
});

describe('Farbmodus', () => {
  it('wechselt reihum System → hell → dunkel → System', () => {
    expect(naechstesThema('system')).toBe('hell');
    expect(naechstesThema('hell')).toBe('dunkel');
    expect(naechstesThema('dunkel')).toBe('system');
  });

  it('setzt das Attribut nur bei einer ausdrücklichen Wahl', () => {
    expect(themaAttribut('system')).toBeNull();
    expect(themaAttribut('hell')).toBe('light');
    expect(themaAttribut('dunkel')).toBe('dark');
  });

  it('merkt sich die Wahl', () => {
    const a = ablage();
    themaSpeichern(a, 'dunkel');
    expect(themaLaden(a)).toBe('dunkel');
  });

  it('fällt bei unbekanntem Wert oder ohne Speicher auf System zurück', () => {
    expect(themaLaden(ablage({ 'handball-tracker:thema': 'lila' }))).toBe('system');
    expect(themaLaden(undefined)).toBe('system');
  });

  it('übersteht einen gesperrten Speicher', () => {
    const gesperrt = {
      getItem: () => { throw new Error('gesperrt'); },
      setItem: () => { throw new Error('gesperrt'); },
    };
    expect(themaLaden(gesperrt)).toBe('system');
    expect(() => themaSpeichern(gesperrt, 'hell')).not.toThrow();
  });

  it('beschriftet den Umschaltknopf mit dem aktuellen Modus', () => {
    const knopf = themaKnopfHtml();
    expect(knopf).toContain('data-thema-knopf');
    expect(knopf).toContain('Farbmodus: wie das System');
  });
});
```

`src/ui/kopf.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { kopfleiste } from './kopf';

describe('Kopfleiste', () => {
  it('enthält Logo, Titel, eigene Knöpfe und den Farbmodus', () => {
    const html = kopfleiste('Kader', '<button id="x"></button>');
    expect(html).toContain('aria-label="Handball-Tracker"');
    expect(html).toContain('<h1>Kader</h1>');
    expect(html).toContain('<button id="x"></button>');
    expect(html).toContain('data-thema-knopf');
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie schlagen fehl**

Run: `npx vitest run src/ui/thema.test.ts src/ui/kopf.test.ts`
Expected: FAIL, die Module fehlen.

- [ ] **Step 3: `src/ui/thema.ts` schreiben**

```ts
export type Thema = 'system' | 'hell' | 'dunkel';

type Ablage = Pick<Storage, 'getItem' | 'setItem'>;

const SCHLUESSEL = 'handball-tracker:thema';
const REIHE: readonly Thema[] = ['system', 'hell', 'dunkel'];
const NAME: Record<Thema, string> = { system: 'wie das System', hell: 'hell', dunkel: 'dunkel' };

/** Der zuletzt angewandte Modus; nur `themaEinrichten` ändert ihn. */
let aktuell: Thema = 'system';

export function naechstesThema(t: Thema): Thema {
  return REIHE[(REIHE.indexOf(t) + 1) % REIHE.length]!;
}

/** Das Attribut am Wurzelelement; `null` heißt: dem System folgen. */
export function themaAttribut(t: Thema): 'light' | 'dark' | null {
  if (t === 'hell') return 'light';
  if (t === 'dunkel') return 'dark';
  return null;
}

/** Ein gesperrter oder fehlender Speicher (privates Fenster) darf den Start nie verhindern. */
export function themaLaden(ablage: Ablage | undefined): Thema {
  try {
    const wert = ablage?.getItem(SCHLUESSEL);
    return REIHE.find((t) => t === wert) ?? 'system';
  } catch {
    return 'system';
  }
}

export function themaSpeichern(ablage: Ablage | undefined, t: Thema): void {
  try {
    ablage?.setItem(SCHLUESSEL, t);
  } catch {
    // Dann gilt die Wahl eben nur bis zum Neuladen.
  }
}

const beschriftung = (t: Thema): string => `Farbmodus: ${NAME[t]}`;

export function themaKnopfHtml(): string {
  const text = beschriftung(aktuell);
  return `<button type="button" class="knopf symbol" data-thema-knopf title="${text}" aria-label="${text}">◐</button>`;
}

function lokaleAblage(): Ablage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function anwenden(t: Thema): void {
  aktuell = t;
  const attribut = themaAttribut(t);
  if (attribut) document.documentElement.setAttribute('data-theme', attribut);
  else document.documentElement.removeAttribute('data-theme');
  for (const knopf of document.querySelectorAll<HTMLElement>('[data-thema-knopf]')) {
    knopf.title = beschriftung(t);
    knopf.setAttribute('aria-label', beschriftung(t));
  }
}

/**
 * Einmal beim Start: gespeicherte Wahl anwenden und jeden Umschaltknopf
 * bedienen, egal auf welchem Bildschirm er gerade steht.
 */
export function themaEinrichten(): void {
  anwenden(themaLaden(lokaleAblage()));
  document.addEventListener('click', (ereignis) => {
    const knopf = (ereignis.target as Element | null)?.closest<HTMLElement>('[data-thema-knopf]');
    if (!knopf) return;
    const neu = naechstesThema(aktuell);
    themaSpeichern(lokaleAblage(), neu);
    anwenden(neu);
    // Der Fokus muss weg: sonst löst die Leertaste der Erfassung den Knopf ein zweites Mal aus.
    knopf.blur();
  });
}
```

- [ ] **Step 4: `src/ui/kopf.ts` schreiben**

```ts
import { logoHtml } from '../design/logo';
import { themaKnopfHtml } from './thema';

/**
 * Die Kopfleiste aller Bildschirme außer der Erfassung: Logo, Titel, rechts
 * eigene Knöpfe und der Farbmodus. `titel` ist fester Text, kein Freitext.
 */
export function kopfleiste(titel: string, knoepfe = ''): string {
  return `<header class="kopfleiste">${logoHtml()}<h1>${titel}</h1>` +
    `<div class="kopfleiste-knoepfe">${knoepfe}${themaKnopfHtml()}</div></header>`;
}
```

- [ ] **Step 5: Tests laufen lassen, sie bestehen**

Run: `npx vitest run src/ui/thema.test.ts src/ui/kopf.test.ts`
Expected: PASS (7 Tests)

- [ ] **Step 6: Gemeinsame Bausteine in `src/stil.css`**

Die Regel `#app { padding: 1rem; }` ersetzen durch `#app { padding: 0; }`. Die Regel `.auswertung-knoepfe { … }` löschen. Am Ende anhängen:

```css
/* ---------- Gemeinsame Bausteine ---------- */
.seite { min-height: 100vh; display: flex; flex-direction: column; }
.kopfleiste { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; padding: .75rem 1.5rem; background: var(--flaeche); border-bottom: 2px solid var(--schrift); }
.kopfleiste .logo { font-size: 14px; }
.kopfleiste h1 { margin: 0; font-family: var(--familie-zahl); font-size: 1.6rem; font-weight: 700; }
.kopfleiste-knoepfe { margin-left: auto; display: flex; flex-wrap: wrap; gap: .5rem; }
.inhalt { width: 100%; max-width: 60rem; margin: 0 auto; padding: 1.5rem; display: grid; gap: 1rem; align-content: start; }
.karte { display: grid; gap: 1rem; padding: 1.25rem; background: var(--flaeche); border: 1px solid var(--rand); border-radius: var(--radius); }
.abschnitt-titel { margin: 0; display: flex; align-items: baseline; gap: .6rem; font-family: var(--familie-zahl); font-size: .95rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--gedaempft); }
.abschnitt-titel b { color: var(--schrift); }

.knopf { position: relative; display: inline-flex; align-items: center; gap: .4rem; font: inherit; font-size: .9rem; font-weight: 600; color: var(--schrift); background: var(--flaeche-2); border: 1px solid var(--rand); border-radius: var(--radius); padding: .5rem .8rem; cursor: pointer; white-space: nowrap; }
.knopf:hover { border-color: var(--gedaempft); }
.knopf.primaer { background: var(--akzent); color: var(--akzent-schrift); border-color: transparent; }
.knopf.gefahr { color: var(--schlecht); border-color: var(--schlecht); background: var(--flaeche); }
.knopf.klein { font-size: .8rem; padding: .3rem .6rem; }
.knopf.symbol { padding: .5rem .7rem; }
.knopf.datei input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.knopfzeile { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }

.feld { font: inherit; color: var(--schrift); background: var(--flaeche); border: 1px solid var(--rand); border-radius: var(--radius); padding: .45rem .6rem; }
.feld:focus { outline: 2px solid var(--akzent); outline-offset: 0; }
input[type="checkbox"] { accent-color: var(--akzent); width: 1.1rem; height: 1.1rem; }
.beschriftet { display: grid; gap: .25rem; font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--gedaempft); }
.beschriftet .feld { font-size: 1rem; font-weight: 400; text-transform: none; letter-spacing: 0; }
.formular-zeile { display: flex; flex-wrap: wrap; gap: 1rem; }

.tabelle { border-collapse: collapse; width: 100%; }
.tabelle th { text-align: left; padding: .35rem .5rem; font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--gedaempft); border-bottom: 2px solid var(--rand); }
.tabelle td { padding: .35rem .5rem; border-bottom: 1px solid var(--rand); }

.pille { display: inline-flex; align-items: center; gap: .35rem; padding: .15rem .65rem; border-radius: 999px; font: inherit; font-size: .8rem; font-weight: 600; white-space: nowrap; border: 1.5px solid currentColor; background: var(--flaeche); }
button.pille { cursor: pointer; }
.pille.gut { color: var(--gut); }
.pille.schlecht { color: var(--schlecht); }
.pille.warnung { color: var(--warnung); }

.auswahl-kacheln { display: grid; grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr)); gap: .5rem; }
.auswahl-kacheln .kachel { display: flex; align-items: center; gap: .6rem; min-width: 0; text-align: left; font: inherit; color: var(--schrift); background: var(--flaeche); border: 1px solid var(--rand); border-radius: var(--radius); padding: .5rem .75rem; cursor: pointer; }
.auswahl-kacheln .kachel .nr { font-family: var(--familie-zahl); font-size: 1.8rem; font-weight: 700; line-height: 1; min-width: 1.4em; }
.auswahl-kacheln .kachel .name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.auswahl-kacheln .kachel .name em { font-style: normal; font-size: .7rem; font-weight: 700; letter-spacing: .06em; color: var(--gedaempft); margin-left: .3rem; }
.auswahl-kacheln .kachel.gewaehlt { border-color: var(--feld); box-shadow: inset 0 4px 0 var(--feld); }

.bericht-rahmen { padding: 1.5rem 1rem 3rem; }
```

- [ ] **Step 7: Farbmodus beim Start einrichten, Bildschirm „Unterbrochenes Spiel“**

In `src/main.ts` die Imports ergänzen:

```ts
import { alsDatum, htmlEscapen } from './bericht/html';
import { kopfleiste } from './ui/kopf';
import { themaEinrichten } from './ui/thema';
```

Direkt nach dem Block, der die Schriften einhängt:

```ts
themaEinrichten();
```

In `start()` das Template `wurzel!.innerHTML = \`<h1>Unterbrochenes Spiel</h1>…\`` ersetzen durch:

```ts
  wurzel!.innerHTML = `
    <div class="seite">
      ${kopfleiste('Unterbrochenes Spiel')}
      <main class="inhalt">
        <section class="karte">
          <p>Gegen <b>${htmlEscapen(laufend.gegner)}</b> vom ${alsDatum(laufend.datum)}, ${laufend.ereignisse.length} Ereignisse.</p>
          <div class="knopfzeile">
            <button type="button" class="knopf primaer" id="fortsetzen">Fortsetzen</button>
            <button type="button" class="knopf" id="verwerfen">Neues Spiel</button>
          </div>
        </section>
      </main>
    </div>
  `;
```

- [ ] **Step 8: Kader-Bildschirm**

In `src/ui/kader.ts` `import { kopfleiste } from './kopf';` ergänzen. In `zeichne()` das Template `wurzel.innerHTML = \`<h1>Kader</h1>…\`` vollständig ersetzen durch:

```ts
    wurzel.innerHTML = `
      <div class="seite">
        ${kopfleiste('Kader')}
        <main class="inhalt">
          <section class="karte">
            <h2 class="abschnitt-titel">Spielerinnen</h2>
            <table class="tabelle">
              <thead><tr><th>Nr.</th><th>Name</th><th>Torhüterin</th><th></th></tr></thead>
              <tbody>
                ${zeilen
                  .map(
                    (z, i) => `
                <tr>
                  <td><input class="feld" data-feld="nummer" data-i="${i}" size="4" value="${htmlEscapen(z.nummer)}" inputmode="numeric" /></td>
                  <td><input class="feld" data-feld="name" data-i="${i}" value="${htmlEscapen(z.name)}" /></td>
                  <td><input data-feld="torwart" data-i="${i}" type="checkbox" ${z.torwart ? 'checked' : ''} /></td>
                  <td><button type="button" class="knopf gefahr klein" data-loeschen="${i}">Entfernen</button></td>
                </tr>`,
                  )
                  .join('')}
              </tbody>
            </table>
            <div class="knopfzeile">
              <button type="button" class="knopf" id="zeile-dazu">Spielerin hinzufügen</button>
              <button type="button" class="knopf primaer" id="speichern">Kader speichern und weiter</button>
            </div>
          </section>
          ${fehler.length ? `<ul class="fehler">${fehler.map((f) => `<li>${htmlEscapen(f)}</li>`).join('')}</ul>` : ''}
          <section class="karte">
            <h2 class="abschnitt-titel">Dateien</h2>
            <div class="knopfzeile">
              <button type="button" class="knopf" id="ausgeben">Kader als JSON sichern</button>
              <label class="knopf datei">Kader aus JSON laden<input id="einlesen" type="file" accept="application/json" /></label>
              ${auswerten ? '<label class="knopf datei">Spiel aus Datei auswerten<input id="spiel-einlesen" type="file" accept=".jsonl" /></label>' : ''}
            </div>
          </section>
        </main>
      </div>
    `;
```

Die IDs und `data-*`-Attribute bleiben gleich, die Handler darunter bleiben unverändert.

- [ ] **Step 9: Spielstart-Bildschirm**

In `src/ui/spielstart.ts` `import { kopfleiste } from './kopf';` ergänzen. In `zeichne()` das Template vollständig ersetzen durch:

```ts
    wurzel.innerHTML = `
      <div class="seite">
        ${kopfleiste('Spiel starten')}
        <main class="inhalt">
          <section class="karte">
            <div class="formular-zeile">
              <label class="beschriftet">Gegner <input id="gegner" class="feld" placeholder="TSV Beispiel" value="${htmlEscapen(gegner)}" /></label>
              <label class="beschriftet">Datum <input id="datum" class="feld" type="date" value="${htmlEscapen(datum)}" /></label>
            </div>
          </section>
          <section class="karte">
            <h2 class="abschnitt-titel">Startaufstellung <b>${gewaehlt.size} von 7</b></h2>
            <div class="auswahl-kacheln">
              ${kader
                .map(
                  (s) => `<button type="button" class="kachel${gewaehlt.has(s.nummer) ? ' gewaehlt' : ''}" data-nummer="${s.nummer}" aria-pressed="${gewaehlt.has(s.nummer)}">` +
                    `<span class="nr">${s.nummer}</span><span class="name">${htmlEscapen(s.name)}${s.torwart ? '<em>TW</em>' : ''}</span></button>`,
                )
                .join('')}
            </div>
          </section>
          ${meldung ? `<p class="fehler">${meldung}</p>` : ''}
          <div class="knopfzeile"><button type="button" class="knopf primaer" id="los">Erfassung beginnen</button></div>
        </main>
      </div>
    `;
```

Die Handler (`#gegner`, `#datum`, `button[data-nummer]`, `#los`) bleiben unverändert.

- [ ] **Step 10: Auswertungs-Bildschirm und Druck**

In `src/ui/auswertung.ts` `import { kopfleiste } from './kopf';` ergänzen. In `zeigeAuswertung` das Template `wurzel.innerHTML = \`<div class="auswertung-knoepfe">…\`` ersetzen durch:

```ts
  const knoepfe = [
    '<button type="button" class="knopf" id="html-speichern">Als HTML speichern</button>',
    '<button type="button" class="knopf" id="jsonl-speichern">Ereignisse (JSONL)</button>',
    '<button type="button" class="knopf" id="drucken">Drucken</button>',
    optionen.zurueck ? '<button type="button" class="knopf primaer" id="zurueck">Zurück zur Erfassung</button>' : '',
    optionen.beenden ? '<button type="button" class="knopf gefahr" id="beenden">Spiel beenden</button>' : '',
    optionen.zumStart ? '<button type="button" class="knopf" id="zum-start">Zum Start</button>' : '',
  ].join('');
  wurzel.innerHTML = `<div class="seite">${kopfleiste('Auswertung', knoepfe)}<main class="bericht-rahmen">${berichtHtml(spiel, kader)}</main></div>`;
```

In `src/bericht/stil.ts` im Druckblock `.auswertung-knoepfe { display: none; }` → `.kopfleiste { display: none; }`.

- [ ] **Step 11: Typen, Tests, Sichtprüfung**

Run: `npx tsc --noEmit && npm test`
Expected: alles PASS.

Sichtprüfung auf dem Dev-Server:
- Kader, Spielstart, „Unterbrochenes Spiel“ und Auswertung zeigen die Kopfleiste mit Logo.
- `◐` wechselt System → hell → dunkel, die Wahl überlebt ein Neuladen.
- Dateiauswahl-Knöpfe öffnen den Dateidialog.
- Die Startaufstellung markiert gewählte Kacheln blau und zählt „n von 7“.

Die Erfassung sieht bis Task 3 noch alt aus, das ist erwartet.

- [ ] **Step 12: Commit**

```bash
git add src/ui/thema.ts src/ui/thema.test.ts src/ui/kopf.ts src/ui/kopf.test.ts src/main.ts src/ui/kader.ts src/ui/spielstart.ts src/ui/auswertung.ts src/bericht/stil.ts src/stil.css
git commit -m "Farbmodus-Schalter, Kopfleiste und neue Bausteine für Kader, Spielstart und Auswertung

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Neues Erfassungslayout mit Kennzahlen und Verlauf als Seitenleiste

**Files:**
- Create: `src/ui/verlauf.ts`
- Modify: `src/ui/erfassung.ts` (vollständig neu, siehe unten), `src/stil.css` (Erfassungsteil ersetzen)
- Test: `src/ui/verlauf.test.ts` (neu), `src/ui/erfassung.test.ts` (anpassen)

**Interfaces:**
- Consumes: `logoHtml()` (Task 1), `themaKnopfHtml()` (Task 2), `.pille`, `.knopf`, `.abschnitt-titel` (Task 2).
- Produces:
  - `src/ui/verlauf.ts`: `type Verlaufszeile = { art: 'abschnitt'; abschnitt: number } | { art: 'eintrag'; ereignis: Ereignis; hinweis?: string }`, `verlaufszeilen(ereignisse: readonly Ereignis[], hinweise: readonly Hinweis[]): Verlaufszeile[]`, `reihenfolge(zeilen: readonly Verlaufszeile[]): number[]`
  - `src/ui/erfassung.ts`: `interface Kennzahl { titel: string; wert: string }`, `kennzahlen(w: SpielerStatistik | undefined): Kennzahl[]`, `meldungenHtml(anzeigen: readonly Strafanzeige[]): string`, `verlaufText(e: Ereignis): string`. Weiter exportiert: `Ansicht`, `Strafanzeige`, `strafanzeigen`, `gegnerZeile`, `gegenstossZeile`, `zeichneErfassung`, `aktualisiereZeit`.
  - **Entfällt:** `zahlenText`, `freimeldung`, `ereignisText`.
  - DOM-Anker, die Task 4 und 5 nutzen: `#uhrzeit` (Uhr-Knopf), `.kachel[data-nr]`, `.verlauf-liste`, `.verlauf-zeile[data-seq]`, `.treffer`, IDs `#auswertung`, `#export-jsonl`, `#export-csv`, `#export-md`.

- [ ] **Step 1: Failing Tests für den Verlauf**

`src/ui/verlauf.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Ereignis } from '../domain/ereignis';
import { reihenfolge, verlaufszeilen } from './verlauf';

const E = (seq: number, typ: string, rest: Partial<Ereignis> = {}): Ereignis => ({ seq, t: seq * 60, wall: '', typ, ...rest });

describe('Verlaufszeilen', () => {
  it('zeigt Neuestes zuerst, mit einer Überschrift je Abschnitt', () => {
    const zeilen = verlaufszeilen([E(1, 'T', { spieler: 7 }), E(2, 'HZ'), E(3, 'GT')], []);
    expect(zeilen.map((z) => (z.art === 'abschnitt' ? `A${z.abschnitt}` : z.ereignis.seq))).toEqual(['A2', 3, 'A1', 2, 1]);
  });

  it('hängt Hinweise an ihren Eintrag', () => {
    const zeilen = verlaufszeilen([E(1, 'T', { spieler: 7 })], [
      { seq: 1, text: 'Die Uhr steht' },
      { seq: 1, text: 'Nr. 7 steht nicht auf dem Feld' },
    ]);
    expect(zeilen[1]).toEqual({ art: 'eintrag', ereignis: E(1, 'T', { spieler: 7 }), hinweis: 'Die Uhr steht · Nr. 7 steht nicht auf dem Feld' });
  });

  it('bleibt ohne Ereignisse leer', () => {
    expect(verlaufszeilen([], [])).toEqual([]);
  });

  it('liefert die Reihenfolge der Einträge ohne Überschriften', () => {
    expect(reihenfolge(verlaufszeilen([E(1, 'T'), E(2, 'HZ'), E(3, 'GT')], []))).toEqual([3, 2, 1]);
  });
});
```

- [ ] **Step 2: Bestehende Tests in `src/ui/erfassung.test.ts` umstellen**

Den Import in Zeile 3 ersetzen durch:

```ts
import { kennzahlen, meldungenHtml, strafanzeigen, gegenstossZeile, gegnerZeile, verlaufText } from './erfassung';
```

Den ganzen `describe('Freimeldung', …)` ersetzen durch:

```ts
describe('Meldungen im Kopf', () => {
  it('zeigt laufende Strafen mit Restzeit und abgelaufene als „darf rein"', () => {
    const html = meldungenHtml(strafanzeigen([{ spieler: 7, endeT: 220 }, { spieler: 12, endeT: 100 }], 160));
    expect(html).toBe('<span class="pille schlecht">Nr. 7 · 01:00</span><span class="pille gut">Nr. 12 darf rein</span>');
  });

  it('bleibt ohne Strafen leer', () => {
    expect(meldungenHtml([])).toBe('');
  });
});
```

Den ganzen `describe('Kacheltext', …)` ersetzen durch:

```ts
describe('Kennzahlen der Kachel', () => {
  it('zeigt Tore, Siebenmeter, Zeit und Plus/Minus', () => {
    expect(kennzahlen(ZEILE)).toEqual([
      { titel: 'Tore', wert: '4/6' },
      { titel: '7m', wert: '–' },
      { titel: 'Zeit', wert: '12:30' },
      { titel: '+/−', wert: '+2' },
    ]);
  });

  it('zeigt die Siebenmeter, sobald einer geworfen wurde', () => {
    expect(kennzahlen({ ...ZEILE, siebenmeterTore: 1, siebenmeterVersuche: 2 })[1]).toEqual({ titel: '7m', wert: '1/2' });
  });

  it('zeigt bei der Torhüterin Paraden und Gegentore statt Würfen', () => {
    expect(kennzahlen({ ...ZEILE, torwart: true, zaehler: { P: 3, PG: 1 }, gegentoreImEinsatz: 9, plusMinus: -1 })).toEqual([
      { titel: 'Paraden', wert: '4' },
      { titel: 'Gegentore', wert: '9' },
      { titel: 'Zeit', wert: '12:30' },
      { titel: '+/−', wert: '-1' },
    ]);
  });

  it('bleibt ohne Statistik leer', () => {
    expect(kennzahlen(undefined)).toEqual([]);
  });
});
```

Den ganzen `describe('Verlaufszeile', …)` ersetzen durch:

```ts
describe('Text einer Verlaufszeile', () => {
  it('zeigt bei einer Notiz den entschärften Text', () => {
    expect(verlaufText({ seq: 1, t: 0, wall: '', typ: '#', text: 'Gegner <5:1>' })).toBe('Gegner &lt;5:1&gt;');
  });

  it('nennt die Aktion ohne Nummer, die steht in eigener Spalte', () => {
    expect(verlaufText({ seq: 1, t: 0, wall: '', typ: 'T', spieler: 7 })).toBe('Tor');
  });

  it('hängt die Wurfposition an', () => {
    expect(verlaufText({ seq: 1, t: 0, wall: '', typ: 'T', spieler: 7, pos: 2 })).toBe('Tor <small>· Rückraum links</small>');
  });

  it('nennt beim Wechsel die zweite Nummer ohne Richtung', () => {
    expect(verlaufText({ seq: 1, t: 0, wall: '', typ: 'W', spieler: 7, ein: 12 })).toBe('Wechsel ⇄ Nr. 12');
  });

  it('zeigt bei der Uhrkorrektur die neue Zeit', () => {
    expect(verlaufText({ seq: 1, t: 900, wall: '', typ: 'U', zeit: 900 })).toBe('Uhrkorrektur <small>· 15:00</small>');
  });
});
```

- [ ] **Step 3: Tests laufen lassen, sie schlagen fehl**

Run: `npx vitest run src/ui/verlauf.test.ts src/ui/erfassung.test.ts`
Expected: FAIL, `./verlauf` fehlt, `kennzahlen`, `meldungenHtml` und `verlaufText` sind nicht exportiert.

- [ ] **Step 4: `src/ui/verlauf.ts` schreiben**

```ts
import type { Ereignis, Hinweis } from '../domain/ereignis';

export type Verlaufszeile =
  | { art: 'abschnitt'; abschnitt: number }
  | { art: 'eintrag'; ereignis: Ereignis; hinweis?: string };

/**
 * Neuestes zuerst, mit einer Überschrift je Abschnitt. Der Abschnittswechsel
 * selbst gehört noch zu dem Abschnitt, den er beendet.
 */
export function verlaufszeilen(ereignisse: readonly Ereignis[], hinweise: readonly Hinweis[]): Verlaufszeile[] {
  const texte = new Map<number, string[]>();
  for (const h of hinweise) texte.set(h.seq, [...(texte.get(h.seq) ?? []), h.text]);

  let abschnitt = 1;
  const mitAbschnitt = ereignisse.map((e) => {
    const eigener = abschnitt;
    if (e.typ.toUpperCase() === 'HZ') abschnitt += 1;
    return { e, abschnitt: eigener };
  });

  const zeilen: Verlaufszeile[] = [];
  let letzter: number | undefined;
  for (const { e, abschnitt: a } of mitAbschnitt.reverse()) {
    if (a !== letzter) {
      zeilen.push({ art: 'abschnitt', abschnitt: a });
      letzter = a;
    }
    const hinweis = texte.get(e.seq)?.join(' · ');
    zeilen.push(hinweis ? { art: 'eintrag', ereignis: e, hinweis } : { art: 'eintrag', ereignis: e });
  }
  return zeilen;
}

/** Die Einträge in der Reihenfolge des Verlaufs, ohne Überschriften. */
export function reihenfolge(zeilen: readonly Verlaufszeile[]): number[] {
  return zeilen.flatMap((z) => (z.art === 'eintrag' ? [z.ereignis.seq] : []));
}
```

- [ ] **Step 5: `src/ui/erfassung.ts` vollständig ersetzen**

```ts
import type { Ereignis, Katalogeintrag, Spieler } from '../domain/ereignis';
import { PARADEN, findeEintrag } from '../domain/katalog';
import type { Strafe, Zustand } from '../domain/reduzierer';
import type { SpielerStatistik, Teamstatistik } from '../domain/statistik';
import type { Puffer } from '../eingabe/grammatik';
import { POSITIONEN, alsUhrzeit } from '../eingabe/grammatik';
import { NOTIZ_CODE } from '../eingabe/notiz';
import { htmlEscapen } from '../bericht/html';
import { logoHtml } from '../design/logo';
import { themaKnopfHtml } from './thema';
import { verlaufszeilen } from './verlauf';
import type { Verlaufszeile } from './verlauf';

export interface Ansicht {
  kader: readonly Spieler[];
  ereignisse: readonly Ereignis[];
  zustand: Zustand;
  werte: readonly SpielerStatistik[];
  team: Teamstatistik;
  jetztT: number;
  uhrLaeuft: boolean;
  abschnitt: number;
  puffer: Puffer;
  klartextZeile: string;
  /** Trikotnummern, die zur bisherigen Ziffernfolge passen. */
  hervorgehoben: readonly number[];
  vorschlaege: readonly Katalogeintrag[];
}

export interface Strafanzeige {
  nummer: number;
  /** Restsekunden der Strafe; 0, sobald sie abgelaufen ist. */
  rest: number;
  /** Die zwei Minuten sind um, der Spieler darf zurück aufs Feld. */
  frei: boolean;
}

/**
 * Eine offene Strafe bleibt im Zustand, bis der Spieler zurückkehrt. Ob sie
 * noch läuft, entscheidet erst die aktuelle Spielzeit — deshalb wird sie hier
 * gerechnet und nicht im Reduzierer.
 */
export function strafanzeigen(strafen: readonly Strafe[], jetztT: number): Strafanzeige[] {
  return strafen.map((s) => {
    const rest = Math.max(0, s.endeT - jetztT);
    return { nummer: s.spieler, rest, frei: rest === 0 };
  });
}

/** Die Pillen im Kopf: laufende Strafen mit Restzeit, abgelaufene als „darf rein". */
export function meldungenHtml(anzeigen: readonly Strafanzeige[]): string {
  return anzeigen
    .map((s) => (s.frei
      ? `<span class="pille gut">Nr. ${s.nummer} darf rein</span>`
      : `<span class="pille schlecht">Nr. ${s.nummer} · ${alsUhrzeit(s.rest)}</span>`))
    .join('');
}

function kachelKlassen(a: Ansicht, s: Spieler, anzeige: Strafanzeige | undefined): string {
  return [
    'kachel',
    s.torwart ? 'torwart' : '',
    a.hervorgehoben.includes(s.nummer) ? 'hervor' : '',
    anzeige && !anzeige.frei ? 'bestraft' : '',
    anzeige?.frei ? 'frei' : '',
  ].filter(Boolean).join(' ');
}

function strafText(anzeige: Strafanzeige | undefined): string {
  if (!anzeige) return '';
  return anzeige.frei ? 'frei' : alsUhrzeit(anzeige.rest);
}

export interface Kennzahl {
  titel: string;
  wert: string;
}

/** Die vier Werte unter der Kachel; die Torhüterin zeigt Paraden und Gegentore statt Würfen. */
export function kennzahlen(w: SpielerStatistik | undefined): Kennzahl[] {
  if (!w) return [];
  const zeit = { titel: 'Zeit', wert: alsUhrzeit(w.einsatzzeit) };
  const plusMinus = { titel: '+/−', wert: `${w.plusMinus > 0 ? '+' : ''}${w.plusMinus}` };
  if (w.torwart) {
    const paraden = PARADEN.reduce((summe, code) => summe + (w.zaehler[code] ?? 0), 0);
    return [
      { titel: 'Paraden', wert: String(paraden) },
      { titel: 'Gegentore', wert: String(w.gegentoreImEinsatz) },
      zeit,
      plusMinus,
    ];
  }
  return [
    { titel: 'Tore', wert: `${w.tore}/${w.wuerfe}` },
    { titel: '7m', wert: w.siebenmeterVersuche > 0 ? `${w.siebenmeterTore}/${w.siebenmeterVersuche}` : '–' },
    zeit,
    plusMinus,
  ];
}

function kennzahlenHtml(w: SpielerStatistik | undefined): string {
  return kennzahlen(w).map((k) => `<span class="kennzahl"><small>${k.titel}</small>${k.wert}</span>`).join('');
}

/** Die Zeile unter dem Spielstand; die Quote fehlt, solange der Gegner nicht geworfen hat. */
export function gegnerZeile(z: Zustand): string {
  if (z.wuerfeGegner === 0) return 'Würfe Gegner 0';
  return `Würfe Gegner ${z.wuerfeGegner} · ${Math.round((z.toreGegner / z.wuerfeGegner) * 100)} %`;
}

export function gegenstossZeile(t: Teamstatistik): string {
  return `Gegenstoß ${t.gegenstossTore}/${t.gegenstossWuerfe} · Gegner ${t.gegnerGegenstossTore}/${t.gegnerGegenstossWuerfe}`;
}

/** Der Text einer Verlaufszeile ohne Zeit und Nummer, die stehen in eigenen Spalten. */
export function verlaufText(e: Ereignis): string {
  if (e.typ === NOTIZ_CODE) return htmlEscapen(e.text ?? '');
  const bezeichnung = findeEintrag(e.typ)?.bezeichnung ?? e.typ;
  // Beim Wechsel ohne Richtung: wer hereinkommt, entscheidet erst die Feldbesetzung.
  if (e.ein !== undefined) return `${bezeichnung} ⇄ Nr. ${e.ein}`;
  if (e.pos !== undefined) return `${bezeichnung} <small>· ${POSITIONEN[e.pos] ?? e.pos}</small>`;
  if (e.zeit !== undefined) return `${bezeichnung} <small>· ${alsUhrzeit(e.zeit)}</small>`;
  return bezeichnung;
}

function zeileHtml(z: Verlaufszeile): string {
  if (z.art === 'abschnitt') return `<li class="verlauf-abschnitt">${z.abschnitt}. Abschnitt</li>`;
  const e = z.ereignis;
  const wirkung = findeEintrag(e.typ)?.wirkung;
  const klassen = [
    'verlauf-zeile',
    wirkung === 'treffer' || wirkung === 'siebenmeter_treffer' ? 'tor' : '',
    wirkung === 'gegentor' ? 'gegentor' : '',
    wirkung === 'notiz' ? 'notiz' : '',
  ].filter(Boolean).join(' ');
  const wer = e.spieler !== undefined
    ? `<span class="wer">${e.spieler}</span>`
    : `<span class="wer team">${wirkung === 'notiz' ? '✎' : '·'}</span>`;
  const hinweis = z.hinweis ? `<span class="hinweis">⚠ ${htmlEscapen(z.hinweis)}</span>` : '';
  return `<li class="${klassen}" data-seq="${e.seq}"><time>${alsUhrzeit(e.t)}</time>${wer}<span class="was">${verlaufText(e)}</span>${hinweis}</li>`;
}

function verlaufHtml(a: Ansicht): string {
  const zeilen = verlaufszeilen(a.ereignisse, a.zustand.hinweise);
  const pruefen = a.zustand.hinweise.length === 0
    ? ''
    : `<span class="pille warnung">${a.zustand.hinweise.length} prüfen</span>`;
  return `<aside class="verlauf">
      <div class="verlauf-kopf"><h2>Verlauf</h2><span class="anzahl">${a.ereignisse.length} Einträge</span>${pruefen}</div>
      <ol class="verlauf-liste">${zeilen.map(zeileHtml).join('')}</ol>
    </aside>`;
}

export function zeichneErfassung(wurzel: HTMLElement, a: Ansicht): void {
  const werteVon = new Map(a.werte.map((w) => [w.nummer, w]));
  const anzeigen = strafanzeigen(a.zustand.strafen, a.jetztT);
  const anzeigeVon = new Map(anzeigen.map((s) => [s.nummer, s]));

  const kachel = (s: Spieler): string => {
    const anzeige = anzeigeVon.get(s.nummer);
    return `<button type="button" class="${kachelKlassen(a, s, anzeige)}" data-nr="${s.nummer}">` +
      `<span class="nr">${s.nummer}</span>` +
      `<span class="name">${htmlEscapen(s.name)}${s.torwart ? '<em>TW</em>' : ''}</span>` +
      `<span class="kennzahlen">${kennzahlenHtml(werteVon.get(s.nummer))}</span>` +
      `<span class="strafe">${strafText(anzeige)}</span></button>`;
  };

  const aufDemFeld = a.kader.filter((s) => a.zustand.aufDemFeld.includes(s.nummer));
  const bank = a.kader.filter((s) => !a.zustand.aufDemFeld.includes(s.nummer));
  const freiePlaetze = '<div class="frei-platz">Platz frei</div>'.repeat(Math.max(0, 7 - aufDemFeld.length));
  const treffer = a.vorschlaege
    .map((e) => `<span class="vorschlag"><code>${e.code}</code>${e.bezeichnung}</span>`)
    .join('');
  const unbekannt = a.klartextZeile.endsWith('— unbekannt');

  // Das Neuzeichnen ersetzt die Liste; ohne das hier spränge der Verlauf bei jeder Taste nach oben.
  const scroll = wurzel.querySelector('.verlauf-liste')?.scrollTop ?? 0;

  wurzel.innerHTML = `
    <div class="erfassung">
      <header class="erfassung-kopf">
        ${logoHtml()}
        <button type="button" class="uhr${a.uhrLaeuft ? '' : ' steht'}" id="uhrzeit" title="Uhr starten oder anhalten (Leertaste)">
          <span class="zeit">${alsUhrzeit(a.jetztT)}</span><small class="uhr-status">${a.uhrLaeuft ? 'läuft' : 'Uhr steht'}</small>
        </button>
        <div class="stand"><span>${a.zustand.toreEigen}</span><span class="trenner">:</span><span class="gegner-tore">${a.zustand.toreGegner}</span></div>
        <div class="spielinfo">
          <b>${a.abschnitt}. Abschnitt</b>
          <span>${gegnerZeile(a.zustand)}</span>
          <span>${gegenstossZeile(a.team)}</span>
        </div>
        <div class="meldungen" id="meldungen">${meldungenHtml(anzeigen)}</div>
        <nav class="kopf-knoepfe">
          <button type="button" class="knopf" id="auswertung">Auswertung</button>
          <details class="menue">
            <summary class="knopf">Export</summary>
            <div class="menue-inhalt">
              <button type="button" class="knopf" id="export-jsonl">Ereignisse (JSONL)</button>
              <button type="button" class="knopf" id="export-csv">Statistik (CSV)</button>
              <button type="button" class="knopf" id="export-md">Zusammenfassung (Markdown)</button>
            </div>
          </details>
          ${themaKnopfHtml()}
        </nav>
      </header>

      <main class="spielflaeche">
        <section class="bereich">
          <h2 class="abschnitt-titel">Auf dem Feld <b>${aufDemFeld.length}/7</b></h2>
          <div class="kacheln feld">${aufDemFeld.map(kachel).join('')}${freiePlaetze}</div>
        </section>
        <section class="bereich">
          <h2 class="abschnitt-titel">Bank</h2>
          <div class="kacheln bank">${bank.map(kachel).join('')}</div>
        </section>
      </main>

      <div class="eingabe">
        <div class="zeile"><span class="prompt">›</span><span class="puffer${unbekannt ? ' unbekannt' : ''}">${htmlEscapen(a.klartextZeile)}</span></div>
        <div class="treffer">${treffer}</div>
        <div class="tastenhilfe">
          <span><kbd>⏎</kbd> buchen</span><span><kbd>Leertaste</kbd> Uhr</span><span><kbd>#</kbd> Notiz</span>
          <span><kbd>Esc</kbd> Verlauf</span><span><kbd>Strg</kbd>+<kbd>Z</kbd> zurück</span>
        </div>
      </div>

      ${verlaufHtml(a)}
    </div>
  `;

  const liste = wurzel.querySelector('.verlauf-liste');
  if (liste) liste.scrollTop = scroll;
}

/**
 * Der Sekundentakt schreibt nur die Stellen fort, die von der Spielzeit
 * abhängen. Würde er wie eine Eingabe alles neu zeichnen, verlöre der Verlauf
 * bei jedem Tick seine Scrollposition.
 */
export function aktualisiereZeit(wurzel: HTMLElement, a: Ansicht): void {
  const uhr = wurzel.querySelector<HTMLElement>('#uhrzeit');
  if (!uhr) return; // noch nichts gezeichnet
  const zeit = uhr.querySelector('.zeit');
  if (zeit) zeit.textContent = alsUhrzeit(a.jetztT);
  uhr.classList.toggle('steht', !a.uhrLaeuft);
  const status = uhr.querySelector('.uhr-status');
  if (status) status.textContent = a.uhrLaeuft ? 'läuft' : 'Uhr steht';

  const anzeigen = strafanzeigen(a.zustand.strafen, a.jetztT);
  const meldungen = wurzel.querySelector('#meldungen');
  if (meldungen) meldungen.innerHTML = meldungenHtml(anzeigen);

  const anzeigeVon = new Map(anzeigen.map((s) => [s.nummer, s]));
  const werteVon = new Map(a.werte.map((w) => [w.nummer, w]));
  const spielerVon = new Map(a.kader.map((s) => [s.nummer, s]));
  for (const kachel of wurzel.querySelectorAll<HTMLElement>('.kachel[data-nr]')) {
    const s = spielerVon.get(Number(kachel.dataset.nr));
    if (!s) continue;
    const anzeige = anzeigeVon.get(s.nummer);
    kachel.className = kachelKlassen(a, s, anzeige);
    const strafe = kachel.querySelector('.strafe');
    if (strafe) strafe.textContent = strafText(anzeige);
    const zahlen = kachel.querySelector('.kennzahlen');
    if (zahlen) zahlen.innerHTML = kennzahlenHtml(werteVon.get(s.nummer));
  }
}
```

- [ ] **Step 6: Tests laufen lassen, sie bestehen**

Run: `npx vitest run src/ui && npx tsc --noEmit`
Expected: PASS, keine Typfehler. `src/ui/tastatur.ts` braucht keine Änderung, es nutzt nur `zeichneErfassung`, `aktualisiereZeit`, `Ansicht` und die IDs.

- [ ] **Step 7: Erfassungs-CSS ersetzen**

In `src/stil.css` alle Regeln von `.erfassung { … }` bis einschließlich `.pruefliste ul { … }` löschen, dazu `.freimeldung`, `.feed …` und `.kachel …`. Stattdessen einfügen:

```css
/* ---------- Erfassung ---------- */
.erfassung {
  height: 100vh;
  height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 23rem;
  grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-areas: "kopf kopf" "spiel verlauf" "eingabe verlauf";
}
.erfassung-kopf { grid-area: kopf; display: flex; align-items: center; gap: 1.75rem; min-width: 0; padding: .8rem 1.4rem; background: var(--flaeche); border-bottom: 2px solid var(--schrift); }
.erfassung-kopf .logo { font-size: 14px; }
.uhr { display: flex; flex-direction: column; align-items: flex-start; gap: .2rem; padding: 0; background: none; border: 0; color: var(--schrift); cursor: pointer; font-family: var(--familie-zahl); font-size: 3.3rem; line-height: .9; font-weight: 700; font-variant-numeric: tabular-nums; }
.uhr .uhr-status { font-family: var(--familie-text); font-size: .7rem; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--gut); }
.uhr.steht { color: var(--gedaempft); }
.uhr.steht .uhr-status { color: var(--warnung); }
.stand { display: flex; align-items: baseline; gap: .15rem; font-family: var(--familie-zahl); font-size: 3.3rem; line-height: .9; font-weight: 700; font-variant-numeric: tabular-nums; }
.stand .trenner { color: var(--akzent); }
.stand .gegner-tore { color: var(--gedaempft); }
.spielinfo { display: grid; gap: .1rem; font-size: .8rem; color: var(--gedaempft); }
.spielinfo b { color: var(--schrift); font-size: .95rem; }
.meldungen { display: flex; flex-wrap: wrap; gap: .4rem; margin-left: auto; }
.kopf-knoepfe { display: flex; align-items: center; gap: .5rem; }
.menue { position: relative; }
.menue > summary { list-style: none; }
.menue > summary::-webkit-details-marker { display: none; }
.menue-inhalt { position: absolute; right: 0; top: calc(100% + .35rem); z-index: 5; display: grid; gap: .35rem; padding: .5rem; background: var(--flaeche); border: 1px solid var(--rand); border-radius: var(--radius); box-shadow: 0 10px 30px -12px rgba(0, 0, 0, .35); }

.spielflaeche { grid-area: spiel; overflow-y: auto; min-width: 0; padding: 1.2rem 1.4rem; display: flex; flex-direction: column; gap: 1.4rem; background: var(--flaeche-2); }
.bereich { display: grid; gap: .6rem; }
.kacheln { display: grid; gap: .75rem; }
.kacheln.feld { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.kacheln.bank { grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); gap: .5rem; }

.erfassung .kachel { position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-areas: "nr name" "zahlen zahlen"; column-gap: .75rem; align-items: center; min-width: 0; text-align: left; font: inherit; color: var(--schrift); background: var(--flaeche); border: 1px solid var(--rand); border-radius: var(--radius); padding: .75rem .9rem; cursor: pointer; }
.erfassung .kachel:hover { border-color: var(--gedaempft); }
.erfassung .kachel .nr { grid-area: nr; min-width: 1.1em; font-family: var(--familie-zahl); font-size: 2.8rem; line-height: .9; font-weight: 700; font-variant-numeric: tabular-nums; }
.erfassung .kachel.torwart .nr { color: var(--feld); }
.erfassung .kachel .name { grid-area: name; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.erfassung .kachel .name em { font-style: normal; font-size: .7rem; font-weight: 700; letter-spacing: .06em; color: var(--gedaempft); margin-left: .3rem; }
.kennzahlen { grid-area: zahlen; display: flex; justify-content: space-between; gap: .6rem; margin-top: .6rem; padding-top: .5rem; border-top: 1px solid var(--rand); font-weight: 600; font-variant-numeric: tabular-nums; }
.kennzahlen:empty { display: none; }
.kennzahl small { display: block; font-size: .62rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--gedaempft); }
.kacheln.feld .kachel { box-shadow: inset 0 4px 0 var(--feld); }
.kacheln.bank .kachel { padding: .5rem .7rem; opacity: .8; }
.kacheln.bank .kachel .nr { font-size: 1.6rem; }
.kacheln.bank .kennzahlen { display: none; }
.erfassung .kachel .strafe { position: absolute; top: -.6rem; right: .5rem; padding: 0 .3rem; font-size: .7rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; font-variant-numeric: tabular-nums; background: var(--flaeche); border: 1.5px solid currentColor; border-radius: 4px; }
.erfassung .kachel .strafe:empty { display: none; }
.erfassung .kachel.bestraft { border-color: var(--schlecht); }
.erfassung .kachel.bestraft .strafe { color: var(--schlecht); }
.erfassung .kachel.frei { opacity: 1; border-color: var(--gut); box-shadow: inset 0 0 0 1px var(--gut); }
.erfassung .kachel.frei .strafe { color: var(--gut); }
.erfassung .kachel.hervor { opacity: 1; outline: 3px solid var(--akzent); outline-offset: 1px; }
.frei-platz { display: grid; place-items: center; min-height: 6rem; color: var(--gedaempft); font-weight: 600; border: 1px dashed var(--rand); border-radius: var(--radius); }

.eingabe { grid-area: eingabe; display: grid; gap: .5rem; padding: .8rem 1.4rem 1rem; background: var(--flaeche); border-top: 1px solid var(--rand); }
.eingabe .zeile { display: flex; align-items: baseline; gap: .7rem; min-width: 0; }
.eingabe .prompt { color: var(--akzent); font-family: var(--familie-zahl); font-size: 1.9rem; font-weight: 700; line-height: 1; }
.eingabe .puffer { font-family: var(--familie-zahl); font-size: 1.9rem; font-weight: 700; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.eingabe .puffer:empty::before { content: "Nummer · Kürzel · Position"; color: var(--gedaempft); font-family: var(--familie-text); font-size: 1.1rem; font-weight: 600; }
.eingabe .unbekannt { color: var(--schlecht); }
.treffer { display: flex; flex-wrap: wrap; gap: .35rem; min-height: 1.9rem; }
.vorschlag { display: inline-flex; align-items: center; gap: .4rem; padding: .2rem .7rem .2rem .25rem; font: inherit; font-size: .82rem; color: var(--schrift); background: var(--flaeche-2); border: 1px solid var(--rand); border-radius: 999px; }
button.vorschlag { cursor: pointer; }
.vorschlag code { padding: 0 .45rem; font-family: var(--familie-zahl); font-weight: 700; background: var(--flaeche); border: 1px solid var(--rand); border-radius: 999px; }
.tastenhilfe { display: flex; flex-wrap: wrap; gap: .3rem 1rem; font-size: .75rem; color: var(--gedaempft); }
kbd { padding: 0 .3rem; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: .7rem; color: var(--schrift); background: var(--flaeche); border: 1px solid var(--rand); border-bottom-width: 2px; border-radius: 4px; }

.verlauf { grid-area: verlauf; display: flex; flex-direction: column; min-height: 0; background: var(--flaeche); border-left: 1px solid var(--rand); }
.verlauf-kopf { display: flex; align-items: center; gap: .6rem; padding: 1rem 1.1rem .5rem; }
.verlauf-kopf h2 { margin: 0; font-family: var(--familie-zahl); font-size: 1.4rem; }
.verlauf-kopf .anzahl { margin-right: auto; color: var(--gedaempft); font-size: .8rem; }
.verlauf-liste { flex: 1; min-height: 0; overflow-y: auto; list-style: none; margin: 0; padding: 0 .5rem .75rem; }
.verlauf-abschnitt { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: .6rem; padding: .6rem .6rem .35rem; background: var(--flaeche); font-size: .7rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--gedaempft); }
.verlauf-abschnitt::after { content: ""; flex: 1; border-top: 2px dashed var(--rand); }
.verlauf-zeile { display: grid; grid-template-columns: 2.9rem 2.1rem minmax(0, 1fr) auto; gap: .5rem; align-items: center; padding: .35rem .6rem; border-radius: var(--radius); font-size: .9rem; }
.verlauf-zeile time { color: var(--gedaempft); font-size: .8rem; font-variant-numeric: tabular-nums; }
.verlauf-zeile .wer { text-align: center; line-height: 1.4rem; font-family: var(--familie-zahl); font-weight: 700; font-variant-numeric: tabular-nums; color: var(--feld); background: var(--feld-hell); border-radius: 4px; }
.verlauf-zeile .wer.team { color: var(--gedaempft); background: none; }
.verlauf-zeile .was { min-width: 0; }
.verlauf-zeile .was small { color: var(--gedaempft); }
.verlauf-zeile .hinweis { color: var(--warnung); font-size: .72rem; font-weight: 700; white-space: nowrap; }
.verlauf-zeile.tor .was { font-weight: 700; }
.verlauf-zeile.tor .wer { color: var(--flaeche); background: var(--feld); }
.verlauf-zeile.gegentor .was { color: var(--schlecht); }
.verlauf-zeile.notiz .was { font-style: italic; }

@media (max-width: 900px) {
  .erfassung { height: auto; grid-template-columns: minmax(0, 1fr); grid-template-areas: "kopf" "spiel" "eingabe" "verlauf"; }
  .erfassung-kopf { flex-wrap: wrap; gap: .75rem 1.25rem; }
  .kacheln.feld { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .verlauf { max-height: 60vh; border-left: 0; border-top: 1px solid var(--rand); }
}
```

Die Regeln `.uhr`, `.uhr.steht`, `.stand`, `.gegner`, `.plaetze`, `.bank .kachel`, `.eingabe …`, `.treffer …` aus dem alten Block sind damit ersetzt. Kontrolle: `grep -n "plaetze\|feed\|pruefliste\|freimeldung" src/stil.css` findet nichts mehr.

- [ ] **Step 8: Sichtprüfung**

Testspiel anlegen (siehe „Hilfe für die Sichtprüfungen“), Fenster etwa 1400 × 900. Prüfen:
- **Kopf:** Logo, Uhr „16:50 · Uhr steht“, Stand 7:5, Spielinfo und die Pille „Nr. 8 darf rein“.
- **Feld:** Sechs Kacheln mit beschrifteten Kennzahlen, bei Nr. 1 und Nr. 12 „Paraden/Gegentore“, dazu ein „Platz frei“.
- **Bank:** Kompakte Reihe, Nr. 8 grün mit „FREI“.
- **Verlauf:**
  - Rechts, voll scrollbar, Neuestes oben, Überschrift „1. Abschnitt“.
  - Der Eintrag „16:30 Nr. 5 Tor · Rechtsaußen“ trägt „⚠ Die Uhr steht“.
  - Kopf „1 prüfen“.
- **Tippen:** `7T2` zeigt „Nr. 7 · Tor · Rückraum links“, `⏎` bucht, der Verlauf behält seine Scrollposition.
- **Farbmodus:** `◐` schaltet auch hier um.
- **Schmales Fenster:** Unter 900 px ist alles einspaltig.

- [ ] **Step 9: Commit**

```bash
git add src/ui/verlauf.ts src/ui/verlauf.test.ts src/ui/erfassung.ts src/ui/erfassung.test.ts src/stil.css
git commit -m "Erfassung im neuen Layout: Kacheln mit Kennzahlen, Verlauf als Seitenleiste

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Maus-Bedienung (Kachel, Vorschläge, Uhr)

**Files:**
- Create: `src/eingabe/klick.ts`
- Modify: `src/ui/erfassung.ts` (Attribute im Markup), `src/ui/tastatur.ts` (vollständig, siehe unten)
- Test: `src/eingabe/klick.test.ts`

**Interfaces:**
- Consumes: `vorschlaege`, `analysiere`, `LEERER_PUFFER`, `type Puffer` aus `src/eingabe/grammatik.ts`; `findeEintrag` aus `src/domain/katalog.ts`; Markup aus Task 3.
- Produces:
  - `src/eingabe/klick.ts`: `HAEUFIG_MIT_NUMMER: readonly string[]`, `HAEUFIG_OHNE_NUMMER: readonly string[]`, `klickVorschlaege(p: Puffer): Katalogeintrag[]`, `vorschlagWaehlen(p: Puffer, code: string): Puffer`, `nummerWaehlen(nummer: number): Puffer`
  - Markup-Konvention: jedes klickbare Element der Erfassung trägt `data-aktion` (`uhr`, `auswertung`, `export` + `data-endung`, `nummer` + `data-nr`, `vorschlag` + `data-code`). Task 5 ergänzt `zeile`, `spieler-setzen`, `loeschen`, `schliessen`, `pruefen`.
  - `tastatur.ts`: `anhaengen()`/`abhaengen()` registrieren und entfernen `keydown` am Fenster und `click` an der Wurzel gemeinsam.

- [ ] **Step 1: Failing Test schreiben**

`src/eingabe/klick.test.ts`:

```ts
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
```

- [ ] **Step 2: Test laufen lassen, er schlägt fehl**

Run: `npx vitest run src/eingabe/klick.test.ts`
Expected: FAIL, `./klick` fehlt.

- [ ] **Step 3: `src/eingabe/klick.ts` schreiben**

```ts
import type { Katalogeintrag } from '../domain/ereignis';
import { findeEintrag } from '../domain/katalog';
import { vorschlaege } from './grammatik';
import type { Puffer } from './grammatik';

/** Ohne getippten Code: die häufigsten Aktionen einer Spielerin … */
export const HAEUFIG_MIT_NUMMER: readonly string[] = ['T', 'F', 'TF', 'BG', 'A', 'ST', 'Z', 'W'];
/** … und ohne Nummer die des Gegners und der Uhr. */
export const HAEUFIG_OHNE_NUMMER: readonly string[] = ['GT', 'GF', 'GTG', 'AZ', 'HZ'];

/**
 * Die anklickbaren Vorschläge unter der Eingabezeile. Angeboten wird nur, was
 * zur Eingabe passt: mit Nummer nur Aktionen einer Spielerin, ohne Nummer nur
 * Einträge ohne Spielerin, und nichts mehr, sobald ein Argument getippt wird.
 */
export function klickVorschlaege(p: Puffer): Katalogeintrag[] {
  if (p.argument !== '') return [];
  const mitNummer = p.ziffern !== '';
  if (p.code === '') {
    return (mitNummer ? HAEUFIG_MIT_NUMMER : HAEUFIG_OHNE_NUMMER).flatMap((code) => findeEintrag(code) ?? []);
  }
  return vorschlaege(p).filter((e) => e.brauchtSpieler === mitNummer);
}

/** Ein angeklickter Vorschlag ersetzt den getippten Code; die Nummer bleibt. */
export function vorschlagWaehlen(p: Puffer, code: string): Puffer {
  return { ziffern: p.ziffern, code, argument: '' };
}

/** Ein Klick auf eine Kachel setzt deren Nummer und verwirft den Rest der Eingabe. */
export function nummerWaehlen(nummer: number): Puffer {
  return { ziffern: String(nummer), code: '', argument: '' };
}
```

- [ ] **Step 4: Test laufen lassen, er besteht**

Run: `npx vitest run src/eingabe/klick.test.ts`
Expected: PASS (7 Tests)

- [ ] **Step 5: Markup in `src/ui/erfassung.ts` klickbar machen**

Fünf Stellen ändern:

1. In `kachel` den Anfang `\`<button type="button" class="${kachelKlassen(a, s, anzeige)}" data-nr="${s.nummer}">\`` ersetzen durch
   `\`<button type="button" class="${kachelKlassen(a, s, anzeige)}" data-aktion="nummer" data-nr="${s.nummer}">\``
2. `const treffer = …` ersetzen durch:
   ```ts
   const treffer = a.vorschlaege
     .map((e) => `<button type="button" class="vorschlag" data-aktion="vorschlag" data-code="${e.code}"><code>${e.code}</code>${e.bezeichnung}</button>`)
     .join('');
   ```
3. Den Uhr-Knopf `<button type="button" class="uhr…" id="uhrzeit" …>` um `data-aktion="uhr"` ergänzen, die `id` bleibt.
4. `<button type="button" class="knopf" id="auswertung">Auswertung</button>` → `<button type="button" class="knopf" data-aktion="auswertung">Auswertung</button>`
5. Die drei Export-Knöpfe ersetzen durch:
   ```html
   <button type="button" class="knopf" data-aktion="export" data-endung="jsonl">Ereignisse (JSONL)</button>
   <button type="button" class="knopf" data-aktion="export" data-endung="csv">Statistik (CSV)</button>
   <button type="button" class="knopf" data-aktion="export" data-endung="md">Zusammenfassung (Markdown)</button>
   ```

- [ ] **Step 6: `src/ui/tastatur.ts` vollständig ersetzen**

```ts
import type { Ereignis, Spieler } from '../domain/ereignis';
import { reduziere } from '../domain/reduzierer';
import { statistik, teamstatistik } from '../domain/statistik';
import { passendeSpieler } from '../domain/kader';
import {
  LEERER_PUFFER, analysiere, klartext, tasteVerarbeiten, zeichenLoeschen,
} from '../eingabe/grammatik';
import type { Puffer } from '../eingabe/grammatik';
import { klickVorschlaege, nummerWaehlen, vorschlagWaehlen } from '../eingabe/klick';
import { baueEreignis } from '../eingabe/ereignisbau';
import { baueNotiz, notizTaste, notizZeile } from '../eingabe/notiz';
import type { Notizentwurf } from '../eingabe/notiz';
import {
  UHR_ANFANG, abschnittWechseln, anhalten, korrigieren, spielzeit, starten, umschalten,
} from '../domain/uhr';
import type { Uhrzustand } from '../domain/uhr';
import { ereignisseErsetzen, spielBeenden, spielLaden } from '../persistenz/speicher';
import { aktualisiereZeit, zeichneErfassung } from './erfassung';
import type { Ansicht } from './erfassung';

type Endung = 'jsonl' | 'csv' | 'md';

export async function starteErfassung(
  wurzel: HTMLElement,
  kader: readonly Spieler[],
  spielId: string,
): Promise<void> {
  const spiel = await spielLaden(spielId);
  if (!spiel) throw new Error(`Spiel ${spielId} ist nicht gespeichert`);

  let ereignisse: Ereignis[] = [...spiel.ereignisse];
  let puffer: Puffer = LEERER_PUFFER;
  /** Offenes Notizfeld; solange es steht, ist jede Taste Text. */
  let notiz: Notizentwurf | undefined;
  const anfangszustand = reduziere(ereignisse);
  let uhr: Uhrzustand = {
    ...UHR_ANFANG, laeuft: false, basisT: anfangszustand.t, abschnitt: anfangszustand.abschnitt,
  };

  const jetzt = () => Date.now();
  const ansicht = (): Ansicht => {
    const t = spielzeit(uhr, jetzt());
    const zustand = reduziere(ereignisse);
    return {
      kader,
      ereignisse,
      zustand,
      werte: statistik(ereignisse, kader, t),
      team: teamstatistik(ereignisse),
      jetztT: t,
      uhrLaeuft: uhr.laeuft,
      abschnitt: uhr.abschnitt,
      puffer,
      // Ob `7W12` die 7 oder die 12 hereinholt, hängt an der Feldbesetzung.
      klartextZeile: notiz ? notizZeile(notiz) : klartext(puffer, zustand.aufDemFeld),
      hervorgehoben: hervorhebung(),
      // In der Notiz ist jede Taste Text; Vorschläge wären dort irreführend.
      vorschlaege: notiz ? [] : klickVorschlaege(puffer),
    };
  };

  const zeichne = (): void => {
    zeichneErfassung(wurzel, ansicht());
  };

  const exportieren = async (endung: Endung): Promise<void> => {
    const { alsJsonl, alsCsv, alsMarkdown, dateiname } = await import('../persistenz/export');
    const { herunterladen } = await import('./kader');
    const aktuell = { ...spiel, ereignisse };
    const werte = statistik(ereignisse, kader, spielzeit(uhr, jetzt()));
    const z = reduziere(ereignisse);
    const inhalt =
      endung === 'jsonl' ? alsJsonl(aktuell, kader)
      : endung === 'csv' ? alsCsv(werte)
      : alsMarkdown(aktuell, werte, z);
    herunterladen(dateiname(aktuell, endung), inhalt);
  };

  /** Tastatur und Maus gehören der Erfassung nur, solange sie zu sehen ist. */
  const anhaengen = (): void => {
    window.addEventListener('keydown', beiTaste);
    wurzel.addEventListener('click', beiKlick);
  };
  const abhaengen = (): void => {
    window.removeEventListener('keydown', beiTaste);
    wurzel.removeEventListener('click', beiKlick);
  };

  /** Die Auswertung ist eine Ansicht des Logs; solange sie offen ist, ruhen Tastatur und Maus. */
  const auswertungOeffnen = async (): Promise<void> => {
    abhaengen();
    const { zeigeAuswertung } = await import('./auswertung');
    zeigeAuswertung(wurzel, { ...spiel, ereignisse }, kader, {
      zurueck: () => {
        anhaengen();
        zeichne();
      },
      beenden: async () => {
        await spielBeenden();
        // Neu laden räumt Tastatur, Takt und Zustand auf und landet beim Kader.
        window.location.reload();
      },
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

  let schreibkette: Promise<unknown> = Promise.resolve();
  const sichern = async (): Promise<void> => {
    // Ein einzelner fehlgeschlagener Schreibvorgang darf die Kette nicht dauerhaft
    // vergiften: sonst würde jede spätere Sicherung stillschweigend ausbleiben.
    schreibkette = schreibkette.catch(() => {}).then(() => ereignisseErsetzen(spielId, ereignisse));
    await schreibkette;
  };

  const bestaetigen = async (): Promise<void> => {
    const a = analysiere(puffer);
    const t = spielzeit(uhr, jetzt());
    const roh = baueEreignis(a, naechsteSeq(), t, new Date().toISOString());
    if (!roh) return; // unfertig oder unbekannt: die Eingabetaste bleibt wirkungslos
    // Eine Uhrkorrektur trägt als eigenen Zeitstempel den neu gesetzten Wert,
    // nicht den vor der Korrektur gültigen — sonst verwirft ein späteres Neuladen,
    // Rückgängig oder Schließen der Korrektur die Korrektur wieder, weil Zustand.t
    // (und damit die daraus abgeleitete lokale Uhr) auf den alten Wert zurückfällt.
    const e = roh.typ === 'U' && roh.zeit !== undefined ? { ...roh, t: roh.zeit } : roh;
    ereignisse = [...ereignisse, e];

    // Uhrereignisse wirken zusätzlich auf die Uhr selbst.
    if (e.typ === 'U' && e.zeit !== undefined) uhr = korrigieren(uhr, e.zeit, jetzt());
    if (e.typ === 'HZ') uhr = abschnittWechseln(uhr, jetzt());
    if (e.typ === 'AZ') uhr = anhalten(uhr, jetzt());
    if (e.typ === 'UL') uhr = starten(uhr, jetzt());
    if (e.typ === 'US') uhr = anhalten(uhr, jetzt());

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
    const zustand = reduziere(ereignisse);
    uhr = {
      ...uhr, laeuft: false, basisT: zustand.t, abschnitt: zustand.abschnitt,
    };
    await sichern();
    zeichne();
  };

  const notizSpeichern = async (t: number, text: string): Promise<void> => {
    ereignisse = [...ereignisse, baueNotiz(t, text, naechsteSeq(), new Date().toISOString())];
    await sichern();
    zeichne();
  };

  /** Im Notizfeld ist auch die Leertaste Text — die Uhr läuft einfach weiter. */
  const beiNotiztaste = (ereignis: KeyboardEvent, entwurf: Notizentwurf): void => {
    if (ereignis.ctrlKey || ereignis.metaKey) return;
    ereignis.preventDefault();
    const s = notizTaste(entwurf, ereignis.key);
    notiz = s.art === 'weiter' ? s.entwurf : undefined;
    if (s.art === 'speichern') void notizSpeichern(s.t, s.text);
    else zeichne();
  };

  const beiTaste = (ereignis: KeyboardEvent): void => {
    if (notiz) {
      beiNotiztaste(ereignis, notiz);
      return;
    }
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
        if (pufferHatInhalt()) {
          puffer = LEERER_PUFFER;
          zeichne();
          return;
        }
        abhaengen();
        void import('./korrektur').then(({ zeigeKorrektur }) => {
          zeigeKorrektur(wurzel, ereignisse, async (neu) => {
            ereignisse = neu;
            const zustand = reduziere(ereignisse);
            uhr = {
              ...uhr, laeuft: false, basisT: zustand.t, abschnitt: zustand.abschnitt,
            };
            await sichern();
            anhaengen();
            zeichne();
          });
        });
        return;
      case '#':
        // Nur bei leerem Puffer, sonst ginge ein halb getippter Code verloren.
        if (pufferHatInhalt()) return;
        ereignis.preventDefault();
        notiz = { t: spielzeit(uhr, jetzt()), text: '' };
        zeichne();
        return;
      default:
        if (ereignis.key.length !== 1) return;
        puffer = tasteVerarbeiten(puffer, ereignis.key);
        zeichne();
    }
  };

  /** Mausbedienung: jedes klickbare Element der Erfassung trägt ein `data-aktion`. */
  const beiKlick = (ereignis: MouseEvent): void => {
    const ziel = (ereignis.target as Element | null)?.closest<HTMLElement>('[data-aktion]');
    if (!ziel) return;
    switch (ziel.dataset.aktion) {
      case 'uhr':
        void uhrUmschalten();
        return;
      case 'auswertung':
        void auswertungOeffnen();
        return;
      case 'export':
        ziel.closest('details')?.removeAttribute('open');
        void exportieren(ziel.dataset.endung as Endung);
        return;
      case 'nummer':
        if (notiz) return;
        puffer = nummerWaehlen(Number(ziel.dataset.nr));
        zeichne();
        return;
      case 'vorschlag':
        if (notiz) return;
        puffer = vorschlagWaehlen(puffer, ziel.dataset.code ?? '');
        // Ist der Eintrag damit vollständig, bucht der Klick sofort; sonst fehlt noch ein Argument.
        if (analysiere(puffer).art === 'bereit') void bestaetigen();
        else zeichne();
        return;
    }
  };

  anhaengen();
  // Die Uhr wird gerechnet, nicht getickt; dieser Takt schreibt nur die
  // zeitabhängigen Stellen fort — alles neu zu zeichnen würde die
  // Scrollposition im Verlauf bei jeder Sekunde zurücksetzen.
  window.setInterval(() => { if (uhr.laeuft) aktualisiereZeit(wurzel, ansicht()); }, 250);
  zeichne();
}
```

- [ ] **Step 7: Typen, Tests, Sichtprüfung**

Run: `npx tsc --noEmit && npm test`
Expected: alles PASS.

Sichtprüfung mit dem Testspiel:
- Kachel 7 anklicken: Eingabe „7“, Nr. 7 und Nr. 77 leuchten, die Vorschläge zeigen T, F, TF, BG, A, ST, Z, W.
- „Tor“ anklicken bucht sofort.
- Kachel 7, dann „Wechsel“: Die Eingabe zeigt „Nr. 7 · Wechsel · Nr. __“, `14` und `⏎` buchen.
- Ohne Eingabe „Gegentor“ anklicken bucht ein Gegentor.
- Klick auf die Uhr startet und stoppt sie.
- Export-Menü öffnen, „Statistik (CSV)“ lädt eine Datei.
- „Auswertung“ öffnet, „Zurück zur Erfassung“ kehrt zurück, Tastatur und Klicks funktionieren weiter.
- Nach einem Klick auf `◐` löst die Leertaste nur die Uhr aus.

- [ ] **Step 8: Commit**

```bash
git add src/eingabe/klick.ts src/eingabe/klick.test.ts src/ui/erfassung.ts src/ui/tastatur.ts
git commit -m "Maus-Bedienung in der Erfassung: Kachel, Vorschläge und Uhr per Klick

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Bearbeiten im Verlauf, Rückgängig, Uhr läuft bei Korrekturen weiter

**Files:**
- Modify: `src/domain/korrektur.ts`, `src/ui/verlauf.ts`, `src/ui/erfassung.ts`, `src/ui/tastatur.ts` (vollständig, siehe unten), `src/stil.css`
- Delete: `src/ui/korrektur.ts`
- Test: `src/domain/korrektur.test.ts` (ergänzen), `src/ui/verlauf.test.ts` (ergänzen)

**Interfaces:**
- Consumes: `verlaufszeilen`, `reihenfolge`, `type Verlaufszeile` (Task 3); `klickVorschlaege`, `nummerWaehlen`, `vorschlagWaehlen` (Task 4); `ereignisEntfernen(ereignisse, seq)` und `spielerAendern(ereignisse, seq, spieler)` aus `src/domain/korrektur.ts`. `ereignisEntfernen` **vergibt die `seq` neu**.
- Produces:
  - `src/domain/korrektur.ts`: `betrifftUhr(vorher: readonly Ereignis[], nachher: readonly Ereignis[]): boolean`
  - `src/ui/verlauf.ts`:
    - `interface Auswahl { seq: number; nummer: string }`
    - `type Verlaufsschritt = { art: 'waehlen'; auswahl: Auswahl } | { art: 'schliessen' } | { art: 'loeschen'; seq: number } | { art: 'spieler'; seq: number; nummer: number } | { art: 'nichts' }`
    - `verlaufTaste(auswahl: Auswahl, taste: string, reihe: readonly number[]): Verlaufsschritt`
    - `auswahlNachLoeschen(reiheVorher: readonly number[], geloescht: number, reiheNachher: readonly number[]): number | undefined`
    - `naechsterHinweis(reihe: readonly number[], auffaellig: ReadonlySet<number>, aktuell: number | undefined): number | undefined`
    - `kurzbeschreibung(e: Ereignis): string`
  - `Ansicht` bekommt `auswahl: Auswahl | undefined` und `meldung: string`.

- [ ] **Step 1: Failing Tests: `betrifftUhr`**

In `src/domain/korrektur.test.ts` den Import um `betrifftUhr` ergänzen, z. B. `import { betrifftUhr, ereignisEntfernen, spielerAendern } from './korrektur';`. Ist `Ereignis` noch nicht importiert, `import type { Ereignis } from './ereignis';` ergänzen. Am Ende anhängen:

```ts
describe('Betrifft eine Korrektur die Uhr?', () => {
  const log: Ereignis[] = [
    { seq: 1, t: 0, wall: '', typ: 'UL' },
    { seq: 2, t: 60, wall: '', typ: 'T', spieler: 7 },
    { seq: 3, t: 90, wall: '', typ: 'AZ' },
  ];

  it('nein, wenn ein Tor gelöscht wird', () => {
    expect(betrifftUhr(log, ereignisEntfernen(log, 2))).toBe(false);
  });

  it('nein, wenn die Spielerin geändert wird', () => {
    expect(betrifftUhr(log, spielerAendern(log, 2, 12))).toBe(false);
  });

  it('ja, wenn eine Auszeit gelöscht wird', () => {
    expect(betrifftUhr(log, ereignisEntfernen(log, 3))).toBe(true);
  });

  it('ja, wenn ein Uhr-Ereignis dazukommt oder verschwindet', () => {
    expect(betrifftUhr(log, [...log, { seq: 4, t: 120, wall: '', typ: 'UL' }])).toBe(true);
    expect(betrifftUhr([...log, { seq: 4, t: 120, wall: '', typ: 'UL' }], log)).toBe(true);
  });
});
```

- [ ] **Step 2: Failing Tests: Verlaufsauswahl**

In `src/ui/verlauf.test.ts` den Import ersetzen durch

```ts
import { auswahlNachLoeschen, kurzbeschreibung, naechsterHinweis, reihenfolge, verlaufTaste, verlaufszeilen } from './verlauf';
```

und am Ende anhängen:

```ts
describe('Tasten im Verlauf', () => {
  const reihe = [5, 4, 3, 2, 1];
  const auf = (seq: number, nummer = '') => ({ seq, nummer });

  it('blättert mit den Pfeiltasten und bleibt an den Enden stehen', () => {
    expect(verlaufTaste(auf(3), 'ArrowUp', reihe)).toEqual({ art: 'waehlen', auswahl: auf(4) });
    expect(verlaufTaste(auf(3), 'ArrowDown', reihe)).toEqual({ art: 'waehlen', auswahl: auf(2) });
    expect(verlaufTaste(auf(5), 'ArrowUp', reihe)).toEqual({ art: 'waehlen', auswahl: auf(5) });
    expect(verlaufTaste(auf(1), 'ArrowDown', reihe)).toEqual({ art: 'waehlen', auswahl: auf(1) });
  });

  it('sammelt bis zu drei Ziffern und setzt sie mit der Eingabetaste', () => {
    expect(verlaufTaste(auf(3), '1', reihe)).toEqual({ art: 'waehlen', auswahl: auf(3, '1') });
    expect(verlaufTaste(auf(3, '12'), '3', reihe)).toEqual({ art: 'waehlen', auswahl: auf(3, '123') });
    expect(verlaufTaste(auf(3, '123'), '4', reihe)).toEqual({ art: 'nichts' });
    expect(verlaufTaste(auf(3, '12'), 'Enter', reihe)).toEqual({ art: 'spieler', seq: 3, nummer: 12 });
  });

  it('schließt mit Esc oder mit der Eingabetaste ohne Nummer', () => {
    expect(verlaufTaste(auf(3), 'Escape', reihe)).toEqual({ art: 'schliessen' });
    expect(verlaufTaste(auf(3), 'Enter', reihe)).toEqual({ art: 'schliessen' });
  });

  it('löscht mit Entf, mit ⌫ erst wenn keine Ziffer mehr steht', () => {
    expect(verlaufTaste(auf(3), 'Delete', reihe)).toEqual({ art: 'loeschen', seq: 3 });
    expect(verlaufTaste(auf(3, '12'), 'Backspace', reihe)).toEqual({ art: 'waehlen', auswahl: auf(3, '1') });
    expect(verlaufTaste(auf(3), 'Backspace', reihe)).toEqual({ art: 'loeschen', seq: 3 });
  });

  it('ignoriert andere Tasten', () => {
    expect(verlaufTaste(auf(3), 'x', reihe)).toEqual({ art: 'nichts' });
  });
});

describe('Auswahl nach dem Löschen', () => {
  it('rückt auf die Zeile, die jetzt an derselben Stelle steht', () => {
    // Vorher 5 4 3 2 1, die 3 fällt weg; die Nummern werden neu vergeben: 4 3 2 1.
    expect(auswahlNachLoeschen([5, 4, 3, 2, 1], 3, [4, 3, 2, 1])).toBe(2);
  });

  it('nimmt beim letzten Eintrag den neuen letzten', () => {
    expect(auswahlNachLoeschen([5, 4, 3, 2, 1], 1, [4, 3, 2, 1])).toBe(1);
  });

  it('wählt nichts mehr, wenn die Liste leer ist', () => {
    expect(auswahlNachLoeschen([1], 1, [])).toBeUndefined();
  });
});

describe('Nächster Eintrag zum Prüfen', () => {
  const reihe = [5, 4, 3, 2, 1];
  const auffaellig = new Set([4, 2]);

  it('beginnt oben, wenn nichts gewählt ist', () => {
    expect(naechsterHinweis(reihe, auffaellig, undefined)).toBe(4);
  });

  it('springt zum nächsten darunter und am Ende wieder nach oben', () => {
    expect(naechsterHinweis(reihe, auffaellig, 4)).toBe(2);
    expect(naechsterHinweis(reihe, auffaellig, 2)).toBe(4);
  });

  it('findet nichts ohne Hinweise', () => {
    expect(naechsterHinweis(reihe, new Set(), undefined)).toBeUndefined();
  });
});

describe('Kurzbeschreibung', () => {
  it('nennt Zeit, Nummer und Aktion', () => {
    expect(kurzbeschreibung({ seq: 1, t: 750, wall: '', typ: 'T', spieler: 7 })).toBe('12:30 Nr. 7 Tor');
  });

  it('lässt die Nummer bei Einträgen ohne Spielerin weg', () => {
    expect(kurzbeschreibung({ seq: 1, t: 90, wall: '', typ: 'GT' })).toBe('01:30 Gegentor');
  });

  it('zeigt bei einer Notiz den Text', () => {
    expect(kurzbeschreibung({ seq: 1, t: 90, wall: '', typ: '#', text: 'Abwehr zu flach' })).toBe('01:30 Notiz „Abwehr zu flach"');
  });
});
```

- [ ] **Step 3: Tests laufen lassen, sie schlagen fehl**

Run: `npx vitest run src/domain/korrektur.test.ts src/ui/verlauf.test.ts`
Expected: FAIL, `betrifftUhr`, `verlaufTaste`, `auswahlNachLoeschen`, `naechsterHinweis` und `kurzbeschreibung` fehlen.

- [ ] **Step 4: `betrifftUhr` in `src/domain/korrektur.ts`**

Oben ergänzen: `import { findeEintrag } from './katalog';`. Am Ende anhängen:

```ts
/** Die Uhr-Ereignisse als vergleichbare Kette: Reihenfolge, Art, Zeit und Zielzeit. */
function uhrkette(ereignisse: readonly Ereignis[]): string {
  return ereignisse
    .filter((e) => findeEintrag(e.typ)?.wirkung === 'uhr')
    .map((e) => `${e.typ.toUpperCase()}@${e.t}:${e.zeit ?? ''}`)
    .join('|');
}

/**
 * Ob eine Änderung am Log die Uhr betrifft. Nur dann muss die Uhr aus dem Log
 * neu bestimmt werden; jede andere Korrektur lässt sie weiterlaufen. Verglichen
 * wird nach Inhalt, nicht nach `seq`, denn das Löschen vergibt die Nummern neu.
 */
export function betrifftUhr(vorher: readonly Ereignis[], nachher: readonly Ereignis[]): boolean {
  return uhrkette(vorher) !== uhrkette(nachher);
}
```

- [ ] **Step 5: Auswahl-Logik in `src/ui/verlauf.ts`**

Oben ergänzen:

```ts
import { findeEintrag } from '../domain/katalog';
import { alsUhrzeit } from '../eingabe/grammatik';
import { NOTIZ_CODE } from '../eingabe/notiz';
```

Am Ende anhängen:

```ts
/** Die gewählte Zeile und die dazu getippten Ziffern der neuen Nummer. */
export interface Auswahl {
  seq: number;
  nummer: string;
}

export type Verlaufsschritt =
  | { art: 'waehlen'; auswahl: Auswahl }
  | { art: 'schliessen' }
  | { art: 'loeschen'; seq: number }
  | { art: 'spieler'; seq: number; nummer: number }
  | { art: 'nichts' };

/**
 * Ein Tastendruck, während eine Zeile gewählt ist. `reihe` ist die Reihenfolge
 * der Anzeige, Neuestes zuerst. `⌫` löscht erst, wenn keine Ziffer mehr steht:
 * auf dem Mac gibt es keine eigene Entf-Taste.
 */
export function verlaufTaste(auswahl: Auswahl, taste: string, reihe: readonly number[]): Verlaufsschritt {
  const stelle = reihe.indexOf(auswahl.seq);
  const zu = (i: number): Verlaufsschritt =>
    ({ art: 'waehlen', auswahl: { seq: reihe[i] ?? auswahl.seq, nummer: '' } });
  switch (taste) {
    case 'ArrowUp':
      return zu(Math.max(0, stelle - 1));
    case 'ArrowDown':
      return zu(Math.min(reihe.length - 1, stelle + 1));
    case 'Delete':
      return { art: 'loeschen', seq: auswahl.seq };
    case 'Backspace':
      return auswahl.nummer === ''
        ? { art: 'loeschen', seq: auswahl.seq }
        : { art: 'waehlen', auswahl: { ...auswahl, nummer: auswahl.nummer.slice(0, -1) } };
    case 'Enter':
      return auswahl.nummer === ''
        ? { art: 'schliessen' }
        : { art: 'spieler', seq: auswahl.seq, nummer: Number(auswahl.nummer) };
    case 'Escape':
      return { art: 'schliessen' };
    default:
      if (/^[0-9]$/.test(taste) && auswahl.nummer.length < 3) {
        return { art: 'waehlen', auswahl: { ...auswahl, nummer: auswahl.nummer + taste } };
      }
      return { art: 'nichts' };
  }
}

/**
 * Nach dem Löschen rückt die Auswahl auf die Zeile, die jetzt an derselben
 * Stelle steht. Über die Stelle, nicht über die Nummer: das Löschen vergibt die
 * Nummern neu.
 */
export function auswahlNachLoeschen(
  reiheVorher: readonly number[],
  geloescht: number,
  reiheNachher: readonly number[],
): number | undefined {
  if (reiheNachher.length === 0) return undefined;
  const stelle = Math.max(0, reiheVorher.indexOf(geloescht));
  return reiheNachher[Math.min(stelle, reiheNachher.length - 1)];
}

/** Der nächste auffällige Eintrag unterhalb der aktuellen Auswahl; am Ende geht es oben weiter. */
export function naechsterHinweis(
  reihe: readonly number[],
  auffaellig: ReadonlySet<number>,
  aktuell: number | undefined,
): number | undefined {
  const start = aktuell === undefined ? -1 : reihe.indexOf(aktuell);
  for (let k = 1; k <= reihe.length; k += 1) {
    const seq = reihe[(start + k) % reihe.length];
    if (seq !== undefined && auffaellig.has(seq)) return seq;
  }
  return undefined;
}

/** Ein Eintrag als schlichter Text für Rückmeldungen, z. B. „12:30 Nr. 7 Tor". */
export function kurzbeschreibung(e: Ereignis): string {
  const was = e.typ === NOTIZ_CODE ? `Notiz „${e.text ?? ''}"` : (findeEintrag(e.typ)?.bezeichnung ?? e.typ);
  return [alsUhrzeit(e.t), e.spieler !== undefined ? `Nr. ${e.spieler}` : '', was].filter(Boolean).join(' ');
}
```

- [ ] **Step 6: Tests laufen lassen, sie bestehen**

Run: `npx vitest run src/domain/korrektur.test.ts src/ui/verlauf.test.ts`
Expected: PASS

- [ ] **Step 7: Markup für Auswahl und Bearbeiten in `src/ui/erfassung.ts`**

1. Imports: `import type { Verlaufszeile } from './verlauf';` ersetzen durch `import type { Auswahl, Verlaufszeile } from './verlauf';`.
2. In `interface Ansicht` nach `vorschlaege` ergänzen:
   ```ts
     /** Die im Verlauf gewählte Zeile, sonst undefined. */
     auswahl: Auswahl | undefined;
     /** Rückmeldung in der Eingabezeile, z. B. nach dem Löschen. */
     meldung: string;
   ```
3. `zeileHtml` vollständig ersetzen:
   ```ts
   function zeileHtml(z: Verlaufszeile, auswahl: Auswahl | undefined): string {
     if (z.art === 'abschnitt') return `<li class="verlauf-abschnitt">${z.abschnitt}. Abschnitt</li>`;
     const e = z.ereignis;
     const wirkung = findeEintrag(e.typ)?.wirkung;
     const klassen = [
       'verlauf-zeile',
       wirkung === 'treffer' || wirkung === 'siebenmeter_treffer' ? 'tor' : '',
       wirkung === 'gegentor' ? 'gegentor' : '',
       wirkung === 'notiz' ? 'notiz' : '',
       auswahl?.seq === e.seq ? 'gewaehlt' : '',
     ].filter(Boolean).join(' ');
     const wer = e.spieler !== undefined
       ? `<span class="wer">${e.spieler}</span>`
       : `<span class="wer team">${wirkung === 'notiz' ? '✎' : '·'}</span>`;
     const hinweis = z.hinweis ? `<span class="hinweis">⚠ ${htmlEscapen(z.hinweis)}</span>` : '';
     return `<li class="${klassen}" data-aktion="zeile" data-seq="${e.seq}"><time>${alsUhrzeit(e.t)}</time>${wer}<span class="was">${verlaufText(e)}</span>${hinweis}</li>`;
   }

   /** Unter der gewählten Zeile: Nummern zum Umsetzen, Löschen, Fertig. */
   function bearbeitenHtml(e: Ereignis, auswahl: Auswahl, a: Ansicht): string {
     const mitSpielerin = e.spieler !== undefined;
     const nummern = a.kader.map((s) => {
       const klassen = [
         'nummer',
         s.nummer === e.spieler ? 'aktuell' : '',
         a.zustand.aufDemFeld.includes(s.nummer) ? 'auf-dem-feld' : '',
       ].filter(Boolean).join(' ');
       return `<button type="button" class="${klassen}" data-aktion="spieler-setzen" data-nr="${s.nummer}" title="${htmlEscapen(s.name)}">${s.nummer}</button>`;
     }).join('');
     const getippt = auswahl.nummer === '' ? 'oder Nummer tippen' : `neue Nr. <b>${auswahl.nummer}</b> ⏎`;
     return `<li class="bearbeiten">
         ${mitSpielerin ? `<span class="bearbeiten-titel">Spielerin ändern</span><div class="nummernwahl">${nummern}</div>` : ''}
         <div class="knopfzeile">
           <button type="button" class="knopf gefahr klein" data-aktion="loeschen">Löschen</button>
           <button type="button" class="knopf klein" data-aktion="schliessen">Fertig</button>
           ${mitSpielerin ? `<span class="getippt">${getippt}</span>` : ''}
         </div>
       </li>`;
   }
   ```
4. `verlaufHtml` vollständig ersetzen:
   ```ts
   function verlaufHtml(a: Ansicht): string {
     const zeilen = verlaufszeilen(a.ereignisse, a.zustand.hinweise);
     const pruefen = a.zustand.hinweise.length === 0
       ? ''
       : `<button type="button" class="pille warnung" data-aktion="pruefen" title="Zum nächsten auffälligen Eintrag">${a.zustand.hinweise.length} prüfen</button>`;
     const html = zeilen.map((z) => {
       const zeile = zeileHtml(z, a.auswahl);
       return z.art === 'eintrag' && a.auswahl?.seq === z.ereignis.seq
         ? zeile + bearbeitenHtml(z.ereignis, a.auswahl, a)
         : zeile;
     }).join('');
     return `<aside class="verlauf">
         <div class="verlauf-kopf"><h2>Verlauf</h2><span class="anzahl">${a.ereignisse.length} Einträge</span>${pruefen}</div>
         <ol class="verlauf-liste">${html}</ol>
       </aside>`;
   }
   ```
5. In `zeichneErfassung` vor `// Das Neuzeichnen ersetzt …` ergänzen:
   ```ts
   const mitMeldung = a.meldung !== '' && a.klartextZeile === '';
   const hilfe = a.auswahl
     ? '<span><kbd>↑</kbd><kbd>↓</kbd> wählen</span><span>Zahl <kbd>⏎</kbd> Spielerin setzen</span><span><kbd>⌫</kbd> löschen</span><span><kbd>Esc</kbd> zurück zur Eingabe</span><span><kbd>Leertaste</kbd> Uhr</span>'
     : '<span><kbd>⏎</kbd> buchen</span><span><kbd>Leertaste</kbd> Uhr</span><span><kbd>#</kbd> Notiz</span><span><kbd>Esc</kbd> Verlauf bearbeiten</span><span><kbd>Strg</kbd>/<kbd>⌘</kbd>+<kbd>Z</kbd> rückgängig</span>';
   ```
   Den `<div class="eingabe">…</div>`-Block im Template ersetzen durch:
   ```html
         <div class="eingabe">
           <div class="zeile${mitMeldung ? ' mit-meldung' : ''}"><span class="prompt">›</span><span class="puffer${unbekannt ? ' unbekannt' : ''}">${htmlEscapen(a.klartextZeile)}</span>${mitMeldung ? `<span class="meldung">${htmlEscapen(a.meldung)}</span>` : ''}</div>
           <div class="treffer">${treffer}</div>
           <div class="tastenhilfe">${hilfe}</div>
         </div>
   ```

- [ ] **Step 8: `src/ui/tastatur.ts` vollständig ersetzen**

```ts
import type { Ereignis, Spieler } from '../domain/ereignis';
import { reduziere } from '../domain/reduzierer';
import { statistik, teamstatistik } from '../domain/statistik';
import { passendeSpieler } from '../domain/kader';
import { betrifftUhr, ereignisEntfernen, spielerAendern } from '../domain/korrektur';
import {
  LEERER_PUFFER, analysiere, klartext, tasteVerarbeiten, zeichenLoeschen,
} from '../eingabe/grammatik';
import type { Puffer } from '../eingabe/grammatik';
import { klickVorschlaege, nummerWaehlen, vorschlagWaehlen } from '../eingabe/klick';
import { baueEreignis } from '../eingabe/ereignisbau';
import { baueNotiz, notizTaste, notizZeile } from '../eingabe/notiz';
import type { Notizentwurf } from '../eingabe/notiz';
import {
  UHR_ANFANG, abschnittWechseln, anhalten, korrigieren, spielzeit, starten, umschalten,
} from '../domain/uhr';
import type { Uhrzustand } from '../domain/uhr';
import { ereignisseErsetzen, spielBeenden, spielLaden } from '../persistenz/speicher';
import { aktualisiereZeit, zeichneErfassung } from './erfassung';
import type { Ansicht } from './erfassung';
import {
  auswahlNachLoeschen, kurzbeschreibung, naechsterHinweis, reihenfolge, verlaufTaste, verlaufszeilen,
} from './verlauf';
import type { Auswahl } from './verlauf';

type Endung = 'jsonl' | 'csv' | 'md';

/** So viele Änderungen lassen sich mit Strg+Z zurücknehmen. */
const RUECKGAENGIG_GRENZE = 100;

export async function starteErfassung(
  wurzel: HTMLElement,
  kader: readonly Spieler[],
  spielId: string,
): Promise<void> {
  const spiel = await spielLaden(spielId);
  if (!spiel) throw new Error(`Spiel ${spielId} ist nicht gespeichert`);

  let ereignisse: Ereignis[] = [...spiel.ereignisse];
  let puffer: Puffer = LEERER_PUFFER;
  /** Offenes Notizfeld; solange es steht, ist jede Taste Text. */
  let notiz: Notizentwurf | undefined;
  /** Die im Verlauf gewählte Zeile. Solange sie steht, gehen Ziffern in ihre neue Nummer. */
  let auswahl: Auswahl | undefined;
  /** Rückmeldung in der Eingabezeile; die nächste Taste oder der nächste Klick räumt sie ab. */
  let meldung = '';
  /** Stände des Logs vor jeder Änderung, der jüngste zuletzt. Überlebt kein Neuladen. */
  let stapel: Ereignis[][] = [];
  const anfangszustand = reduziere(ereignisse);
  let uhr: Uhrzustand = {
    ...UHR_ANFANG, laeuft: false, basisT: anfangszustand.t, abschnitt: anfangszustand.abschnitt,
  };

  const jetzt = () => Date.now();
  /** Die Einträge in der Reihenfolge des Verlaufs, Neuestes zuerst. */
  const reihe = (): number[] => reihenfolge(verlaufszeilen(ereignisse, []));

  const ansicht = (): Ansicht => {
    const t = spielzeit(uhr, jetzt());
    const zustand = reduziere(ereignisse);
    return {
      kader,
      ereignisse,
      zustand,
      werte: statistik(ereignisse, kader, t),
      team: teamstatistik(ereignisse),
      jetztT: t,
      uhrLaeuft: uhr.laeuft,
      abschnitt: uhr.abschnitt,
      puffer,
      // Ob `7W12` die 7 oder die 12 hereinholt, hängt an der Feldbesetzung.
      klartextZeile: notiz ? notizZeile(notiz) : klartext(puffer, zustand.aufDemFeld),
      hervorgehoben: hervorhebung(),
      // In der Notiz und beim Bearbeiten gehören die Tasten nicht der Eingabe.
      vorschlaege: notiz || auswahl ? [] : klickVorschlaege(puffer),
      auswahl,
      meldung,
    };
  };

  const zeichne = (auswahlZeigen = false): void => {
    zeichneErfassung(wurzel, ansicht());
    if (!auswahlZeigen) return;
    // Beim Blättern bleibt die gewählte Zeile samt Bearbeitung im sichtbaren Teil der Liste.
    wurzel.querySelector('.verlauf-zeile.gewaehlt')?.scrollIntoView({ block: 'nearest' });
    wurzel.querySelector('.bearbeiten')?.scrollIntoView({ block: 'nearest' });
  };

  const exportieren = async (endung: Endung): Promise<void> => {
    const { alsJsonl, alsCsv, alsMarkdown, dateiname } = await import('../persistenz/export');
    const { herunterladen } = await import('./kader');
    const aktuell = { ...spiel, ereignisse };
    const werte = statistik(ereignisse, kader, spielzeit(uhr, jetzt()));
    const z = reduziere(ereignisse);
    const inhalt =
      endung === 'jsonl' ? alsJsonl(aktuell, kader)
      : endung === 'csv' ? alsCsv(werte)
      : alsMarkdown(aktuell, werte, z);
    herunterladen(dateiname(aktuell, endung), inhalt);
  };

  /** Tastatur und Maus gehören der Erfassung nur, solange sie zu sehen ist. */
  const anhaengen = (): void => {
    window.addEventListener('keydown', beiTaste);
    wurzel.addEventListener('click', beiKlick);
  };
  const abhaengen = (): void => {
    window.removeEventListener('keydown', beiTaste);
    wurzel.removeEventListener('click', beiKlick);
  };

  /** Die Auswertung ist eine Ansicht des Logs; solange sie offen ist, ruhen Tastatur und Maus. */
  const auswertungOeffnen = async (): Promise<void> => {
    abhaengen();
    const { zeigeAuswertung } = await import('./auswertung');
    zeigeAuswertung(wurzel, { ...spiel, ereignisse }, kader, {
      zurueck: () => {
        anhaengen();
        zeichne();
      },
      beenden: async () => {
        await spielBeenden();
        // Neu laden räumt Tastatur, Takt und Zustand auf und landet beim Kader.
        window.location.reload();
      },
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

  let schreibkette: Promise<unknown> = Promise.resolve();
  const sichern = async (): Promise<void> => {
    // Ein einzelner fehlgeschlagener Schreibvorgang darf die Kette nicht dauerhaft
    // vergiften: sonst würde jede spätere Sicherung stillschweigend ausbleiben.
    schreibkette = schreibkette.catch(() => {}).then(() => ereignisseErsetzen(spielId, ereignisse));
    await schreibkette;
  };

  /** Legt den Stand vor einer Änderung ab, damit Strg+Z ihn zurückholen kann. */
  const merken = (): void => {
    stapel = [...stapel, ereignisse].slice(-RUECKGAENGIG_GRENZE);
  };

  /** Wie früher nach jeder Korrektur: die Uhr steht und übernimmt Zeit und Abschnitt aus dem Log. */
  const uhrAusLog = (): void => {
    const zustand = reduziere(ereignisse);
    uhr = { ...uhr, laeuft: false, basisT: zustand.t, abschnitt: zustand.abschnitt };
  };

  /**
   * Ersetzt das Log nach einer Korrektur. Die Uhr läuft weiter, außer die
   * Korrektur trifft ein Uhr-Ereignis: dann ist ihr Zustand nur aus dem Log bestimmbar.
   */
  const logKorrigieren = async (neu: Ereignis[]): Promise<void> => {
    const vorher = ereignisse;
    merken();
    ereignisse = neu;
    if (betrifftUhr(vorher, neu)) uhrAusLog();
    await sichern();
  };

  const rueckgaengig = async (): Promise<void> => {
    const vorher = stapel.at(-1);
    if (!vorher) return;
    stapel = stapel.slice(0, -1);
    const aktuell = ereignisse;
    ereignisse = vorher;
    auswahl = undefined;
    if (betrifftUhr(aktuell, vorher)) uhrAusLog();
    meldung = 'Rückgängig gemacht';
    await sichern();
    zeichne();
  };

  const loeschen = async (seq: number): Promise<void> => {
    const e = ereignisse.find((x) => x.seq === seq);
    if (!e) return;
    const reiheVorher = reihe();
    await logKorrigieren(ereignisEntfernen(ereignisse, seq));
    const naechste = auswahlNachLoeschen(reiheVorher, seq, reihe());
    auswahl = naechste === undefined ? undefined : { seq: naechste, nummer: '' };
    meldung = `Gelöscht: ${kurzbeschreibung(e)} · Strg+Z stellt wieder her`;
    zeichne(true);
  };

  const spielerSetzen = async (seq: number, nummer: number): Promise<void> => {
    const e = ereignisse.find((x) => x.seq === seq);
    if (e && e.spieler !== undefined && e.spieler !== nummer) {
      await logKorrigieren(spielerAendern(ereignisse, seq, nummer));
    }
    auswahl = { seq, nummer: '' };
    zeichne(true);
  };

  /** Springt zum nächsten Eintrag mit Hinweis, unterhalb der aktuellen Auswahl. */
  const naechsterPruefpunkt = (): void => {
    const auffaellig = new Set(reduziere(ereignisse).hinweise.map((h) => h.seq));
    const seq = naechsterHinweis(reihe(), auffaellig, auswahl?.seq);
    if (seq === undefined) return;
    auswahl = { seq, nummer: '' };
    zeichne(true);
  };

  const bestaetigen = async (): Promise<void> => {
    const a = analysiere(puffer);
    const t = spielzeit(uhr, jetzt());
    const roh = baueEreignis(a, naechsteSeq(), t, new Date().toISOString());
    if (!roh) return; // unfertig oder unbekannt: die Eingabetaste bleibt wirkungslos
    // Eine Uhrkorrektur trägt als eigenen Zeitstempel den neu gesetzten Wert,
    // nicht den vor der Korrektur gültigen — sonst verwirft ein späteres Neuladen,
    // Rückgängig oder Schließen der Korrektur die Korrektur wieder, weil Zustand.t
    // (und damit die daraus abgeleitete lokale Uhr) auf den alten Wert zurückfällt.
    const e = roh.typ === 'U' && roh.zeit !== undefined ? { ...roh, t: roh.zeit } : roh;
    merken();
    ereignisse = [...ereignisse, e];

    // Uhrereignisse wirken zusätzlich auf die Uhr selbst.
    if (e.typ === 'U' && e.zeit !== undefined) uhr = korrigieren(uhr, e.zeit, jetzt());
    if (e.typ === 'HZ') uhr = abschnittWechseln(uhr, jetzt());
    if (e.typ === 'AZ') uhr = anhalten(uhr, jetzt());
    if (e.typ === 'UL') uhr = starten(uhr, jetzt());
    if (e.typ === 'US') uhr = anhalten(uhr, jetzt());

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
    merken();
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

  const notizSpeichern = async (t: number, text: string): Promise<void> => {
    merken();
    ereignisse = [...ereignisse, baueNotiz(t, text, naechsteSeq(), new Date().toISOString())];
    await sichern();
    zeichne();
  };

  /** Im Notizfeld ist auch die Leertaste Text — die Uhr läuft einfach weiter. */
  const beiNotiztaste = (ereignis: KeyboardEvent, entwurf: Notizentwurf): void => {
    if (ereignis.ctrlKey || ereignis.metaKey) return;
    ereignis.preventDefault();
    const s = notizTaste(entwurf, ereignis.key);
    notiz = s.art === 'weiter' ? s.entwurf : undefined;
    if (s.art === 'speichern') void notizSpeichern(s.t, s.text);
    else zeichne();
  };

  /** Tasten, während eine Zeile im Verlauf gewählt ist. */
  const beiVerlaufstaste = (ereignis: KeyboardEvent, aktuell: Auswahl): void => {
    const schritt = verlaufTaste(aktuell, ereignis.key, reihe());
    if (schritt.art === 'nichts') return;
    ereignis.preventDefault();
    switch (schritt.art) {
      case 'waehlen':
        auswahl = schritt.auswahl;
        zeichne(true);
        return;
      case 'schliessen':
        auswahl = undefined;
        zeichne();
        return;
      case 'loeschen':
        void loeschen(schritt.seq);
        return;
      case 'spieler':
        void spielerSetzen(schritt.seq, schritt.nummer);
        return;
    }
  };

  const beiTaste = (ereignis: KeyboardEvent): void => {
    if (notiz) {
      beiNotiztaste(ereignis, notiz);
      return;
    }
    // Strg+Z unter Windows und Linux, ⌘+Z auf dem Mac.
    if ((ereignis.ctrlKey || ereignis.metaKey) && ereignis.key.toLowerCase() === 'z') {
      ereignis.preventDefault();
      void rueckgaengig();
      return;
    }
    if (ereignis.ctrlKey || ereignis.altKey || ereignis.metaKey) return;
    meldung = '';

    // Die Uhr lässt sich immer schalten, auch beim Bearbeiten: das Spiel wartet nicht.
    if (ereignis.key === ' ') {
      ereignis.preventDefault();
      void uhrUmschalten();
      return;
    }
    if (auswahl) {
      beiVerlaufstaste(ereignis, auswahl);
      return;
    }

    switch (ereignis.key) {
      case 'Enter':
        ereignis.preventDefault();
        void bestaetigen();
        return;
      case 'Backspace':
        ereignis.preventDefault();
        puffer = zeichenLoeschen(puffer);
        zeichne();
        return;
      case 'Escape': {
        ereignis.preventDefault();
        if (pufferHatInhalt()) {
          puffer = LEERER_PUFFER;
          zeichne();
          return;
        }
        // Esc bei leerer Eingabe springt in den Verlauf, auf den neuesten Eintrag.
        const neueste = reihe()[0];
        if (neueste === undefined) return;
        auswahl = { seq: neueste, nummer: '' };
        zeichne(true);
        return;
      }
      case '#':
        // Nur bei leerem Puffer, sonst ginge ein halb getippter Code verloren.
        if (pufferHatInhalt()) return;
        ereignis.preventDefault();
        notiz = { t: spielzeit(uhr, jetzt()), text: '' };
        zeichne();
        return;
      default:
        if (ereignis.key.length !== 1) return;
        puffer = tasteVerarbeiten(puffer, ereignis.key);
        zeichne();
    }
  };

  /** Mausbedienung: jedes klickbare Element der Erfassung trägt ein `data-aktion`. */
  const beiKlick = (ereignis: MouseEvent): void => {
    const ziel = (ereignis.target as Element | null)?.closest<HTMLElement>('[data-aktion]');
    if (!ziel) return;
    meldung = '';
    switch (ziel.dataset.aktion) {
      case 'uhr':
        void uhrUmschalten();
        return;
      case 'auswertung':
        void auswertungOeffnen();
        return;
      case 'export':
        ziel.closest('details')?.removeAttribute('open');
        void exportieren(ziel.dataset.endung as Endung);
        return;
      case 'nummer':
        if (notiz) return;
        auswahl = undefined;
        puffer = nummerWaehlen(Number(ziel.dataset.nr));
        zeichne();
        return;
      case 'vorschlag':
        if (notiz) return;
        puffer = vorschlagWaehlen(puffer, ziel.dataset.code ?? '');
        // Ist der Eintrag damit vollständig, bucht der Klick sofort; sonst fehlt noch ein Argument.
        if (analysiere(puffer).art === 'bereit') void bestaetigen();
        else zeichne();
        return;
      case 'zeile': {
        if (notiz) return;
        const seq = Number(ziel.dataset.seq);
        auswahl = auswahl?.seq === seq ? undefined : { seq, nummer: '' };
        zeichne();
        return;
      }
      case 'spieler-setzen':
        if (auswahl) void spielerSetzen(auswahl.seq, Number(ziel.dataset.nr));
        return;
      case 'loeschen':
        if (auswahl) void loeschen(auswahl.seq);
        return;
      case 'schliessen':
        auswahl = undefined;
        zeichne();
        return;
      case 'pruefen':
        if (!notiz) naechsterPruefpunkt();
        return;
    }
  };

  anhaengen();
  // Die Uhr wird gerechnet, nicht getickt; dieser Takt schreibt nur die
  // zeitabhängigen Stellen fort — alles neu zu zeichnen würde die
  // Scrollposition im Verlauf bei jeder Sekunde zurücksetzen.
  window.setInterval(() => { if (uhr.laeuft) aktualisiereZeit(wurzel, ansicht()); }, 250);
  zeichne();
}
```

- [ ] **Step 9: Alten Korrektur-Bildschirm löschen**

```bash
git rm src/ui/korrektur.ts
grep -rn "korrektur'" src/ui
```

Expected: `grep` findet nur den Import `from '../domain/korrektur'` in `tastatur.ts`.

- [ ] **Step 10: CSS für Auswahl und Bearbeiten**

Am Ende von `src/stil.css` anhängen:

```css
/* ---------- Verlauf bearbeiten ---------- */
.verlauf-zeile { cursor: pointer; }
.verlauf-zeile:hover { background: var(--flaeche-2); }
.verlauf-zeile.gewaehlt { background: var(--markierung); }
.bearbeiten { display: grid; gap: .6rem; margin: .15rem .35rem .6rem; padding: .75rem; font-size: .85rem; background: var(--flaeche-2); border: 1px solid var(--rand); border-radius: var(--radius); }
.bearbeiten-titel { font-size: .68rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--gedaempft); }
.nummernwahl { display: flex; flex-wrap: wrap; gap: .3rem; }
.nummernwahl .nummer { min-width: 2.4rem; padding: .2rem .35rem; font-family: var(--familie-zahl); font-size: 1rem; font-weight: 700; color: var(--schrift); background: var(--flaeche); border: 1px solid var(--rand); border-radius: var(--radius); cursor: pointer; opacity: .6; }
.nummernwahl .nummer.auf-dem-feld { opacity: 1; }
.nummernwahl .nummer.aktuell { opacity: 1; color: var(--akzent-schrift); background: var(--akzent); border-color: transparent; }
.bearbeiten .getippt { margin-left: auto; color: var(--gedaempft); }
.bearbeiten .getippt b { color: var(--schrift); font-family: var(--familie-zahl); font-size: 1.1rem; }
.eingabe .zeile.mit-meldung .puffer:empty::before { content: none; }
.eingabe .meldung { color: var(--gedaempft); font-size: .9rem; }
```

- [ ] **Step 11: Typen, Tests, Sichtprüfung**

Run: `npx tsc --noEmit && npm test`
Expected: alles PASS.

Sichtprüfung mit dem Testspiel. Uhr mit der Leertaste starten, dann:
- **Esc und Pfeiltasten:** `Esc` wählt den neuesten Eintrag und klappt die Bearbeitung auf. `↓` blättert, die Auswahl bleibt sichtbar, auch weit unten im Verlauf.
- **Spielerin ändern:** Auf „Tor · Nr. 7“ `1`, `4`, `⏎` tippen. Die Zeile zeigt Nr. 14, **die Uhr läuft weiter**.
- **Löschen:** `⌫` löscht, die Eingabezeile zeigt „Gelöscht: … · Strg+Z stellt wieder her“, die Auswahl rückt nach. `⌘+Z` bzw. `Strg+Z` stellt den Eintrag wieder her.
- **Uhr-Ereignis löschen:** Den Eintrag „Auszeit“ wählen und löschen, die Uhr steht danach.
- **Prüfen:** Im Kopf „1 prüfen“ anklicken springt zum Eintrag mit „⚠ Die Uhr steht“.
- **Maus:** Klick auf eine Zeile wählt, eine Nummer in der Nummernwahl setzt sie, „Fertig“ schließt.
- **Leertaste:** Sie schaltet die Uhr auch bei gewählter Zeile.
- **Nach dem Neuladen:** `Strg+Z` tut nichts, das ist erwartet.

- [ ] **Step 12: Commit**

```bash
git add src/domain/korrektur.ts src/domain/korrektur.test.ts src/ui/verlauf.ts src/ui/verlauf.test.ts src/ui/erfassung.ts src/ui/tastatur.ts src/stil.css
git commit -m "Verlauf direkt bearbeiten, Rückgängig für jede Änderung, Uhr läuft bei Korrekturen weiter

Der eigene Korrektur-Bildschirm entfällt.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Bericht im Stil „Spielfeld“

**Files:**
- Modify: `src/bericht/stil.ts` (vollständig), `src/bericht/auswertung.ts` (Kopf und `berichtDatei`), `src/ui/auswertung.ts` (Stil einhängen)
- Test: `src/bericht/auswertung.test.ts` (Berichtsdatei)

**Interfaces:**
- Consumes: `src/design/tokens.css?raw`, `SCHRIFTEN_CSS`, `logoHtml()` (Task 1). Die Klasse `.kopfleiste` aus Task 2 wird im Druck ausgeblendet.
- Produces: `BERICHT_CSS: string` (einziger Export von `bericht/stil.ts`). **Entfallen:** `BERICHT_HELL`, `BERICHT_DUNKEL`.

- [ ] **Step 1: Failing Test schreiben**

In `src/bericht/auswertung.test.ts` im `describe('Berichtsdatei', …)` die Zeile `expect(datei).toContain('--b-grund: #ffffff');` löschen und diesen Test anhängen:

```ts
  it('bettet Design-Tokens, Schriften und Logo ein', () => {
    const datei = berichtDatei(SPIEL, BEISPIEL_KADER);
    expect(datei).toContain('--akzent: #e0552b');
    expect(datei).toContain('prefers-color-scheme: dark');
    expect(datei).toContain('font-family: "Saira Condensed";');
    expect(datei).toContain('data:font/woff2;base64,');
    expect(datei).toContain('aria-label="Handball-Tracker"');
    expect(datei).not.toContain('--b-');
  });
```

- [ ] **Step 2: Test laufen lassen, er schlägt fehl**

Run: `npx vitest run src/bericht/auswertung.test.ts`
Expected: FAIL beim neuen Test, die Datei enthält noch `--b-…` und keine Tokens.

- [ ] **Step 3: `src/bericht/stil.ts` vollständig ersetzen**

```ts
/**
 * Der Bericht bringt sein CSS als Text mit, damit die Exportdatei ohne die App
 * auskommt. Farben und Schriften kommen ausschließlich aus den Design-Tokens
 * (`src/design/tokens.css`): in der App liegen sie schon global, die
 * Exportdatei bettet sie zusammen mit den Schriften ein.
 */
export const BERICHT_CSS = `
.bericht { background: var(--grund); color: var(--schrift); font: 15px/1.45 var(--familie-text); max-width: 60rem; margin: 0 auto; padding: 1rem 1.25rem 2rem; }
.bericht h1, .bericht h2, .bericht h3, .bericht .kopf .endstand, .bericht .spielerin .nr, .bericht .werte dd { font-family: var(--familie-zahl); }
.bericht header { padding-bottom: 1rem; border-bottom: 2px solid var(--schrift); }
.bericht .titelzeile { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; }
.bericht .titelzeile .logo { font-size: 12px; }
.bericht h1 { font-size: 2rem; line-height: 1.05; font-weight: 700; margin: 0 0 .25rem; }
.bericht h2 { font-size: 1.05rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--gedaempft); margin: 2rem 0 .6rem; padding-bottom: .3rem; border-bottom: 2px dashed var(--rand); }
.bericht h3 { font-size: 1.15rem; font-weight: 700; margin: 0; display: flex; align-items: baseline; gap: .5rem; }
.bericht .kopf { display: flex; flex-wrap: wrap; align-items: baseline; gap: 1rem 2rem; }
.bericht .kopf .endstand { font-size: 3.2rem; line-height: 1; font-weight: 700; font-variant-numeric: tabular-nums; }
.bericht .kopf .halbzeit, .bericht .kopf .datum { color: var(--gedaempft); }
.bericht .pruefung summary { cursor: pointer; color: var(--gedaempft); }
.bericht .pruefung.auffaellig summary { color: var(--schlecht); }
.bericht .pruefung ul { margin: .25rem 0; padding-left: 1.25rem; font-size: .9rem; }
.bericht table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
.bericht th, .bericht td { text-align: left; padding: .3rem .5rem; border-bottom: 1px solid var(--rand); }
.bericht th.zahl, .bericht td.zahl { text-align: right; }
.bericht thead th { color: var(--gedaempft); font-weight: 600; font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; }
.bericht .hinweis { color: var(--gedaempft); font-size: .9rem; }
.bericht .diagramm { display: block; margin: .5rem 0; }
.bericht .spielerin { background: var(--flaeche); border: 1px solid var(--rand); border-radius: var(--radius); padding: .75rem 1rem; margin: .75rem 0; }
.bericht .spielerin .nr { font-size: 1.8rem; font-weight: 700; min-width: 2.2rem; }
.bericht .spielerin .rolle { color: var(--gedaempft); font-family: var(--familie-text); font-size: .85rem; font-weight: 400; }
.bericht .werte { display: flex; flex-wrap: wrap; gap: .25rem 1.5rem; margin: .5rem 0 0; }
.bericht .werte div { display: flex; gap: .4rem; align-items: baseline; }
.bericht .werte dt { color: var(--gedaempft); font-size: .85rem; }
.bericht .werte dd { margin: 0; font-size: 1.1rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.bericht .werte small { font-weight: 400; color: var(--gedaempft); }
.bericht .zaehler { margin: .35rem 0 0; color: var(--gedaempft); font-size: .9rem; }
.bericht .plusminus.plus { color: var(--gut); }
.bericht .plusminus.minus { color: var(--schlecht); }
.bericht .spielerin details { margin-top: .5rem; }
.bericht .spielerin summary { cursor: pointer; color: var(--gedaempft); }
.bericht .spielerin details table { font-size: .9rem; margin-top: .25rem; }
.bericht .warnung { color: var(--schlecht); }
.bericht .fuss { margin-top: 3rem; color: var(--gedaempft); font-size: .85rem; }
.bericht .schlaglichter { margin: .5rem 0; padding-left: 1.25rem; }
.bericht .schlaglichter li { margin: .15rem 0; }

.bericht .vk-raster { stroke: var(--rand); stroke-width: 1; }
.bericht .vk-null { stroke: var(--gedaempft); stroke-width: 1.5; }
.bericht .vk-linie { fill: none; stroke: var(--schrift); stroke-width: 2.5; stroke-linejoin: round; }
.bericht .vk-plus { fill: var(--gut-flaeche); }
.bericht .vk-minus { fill: var(--schlecht-flaeche); }
.bericht .vk-achse-text { fill: var(--gedaempft); font-size: 12px; }
.bericht .vk-halbzeit line { stroke: var(--gedaempft); stroke-dasharray: 4 4; }
.bericht .vk-halbzeit text { fill: var(--gedaempft); font-size: 12px; }
.bericht .vk-auszeit { fill: var(--akzent); }
.bericht .vk-strafe { stroke: var(--schlecht); stroke-width: 3; }
.bericht .pb-grund { stroke: var(--gedaempft); }
.bericht .pb-tore { fill: var(--gut); }
.bericht .pb-gegentore { fill: var(--schlecht); }
.bericht .pb-wert { fill: var(--schrift); font-size: 12px; }
.bericht .pb-achse-text { fill: var(--gedaempft); font-size: 12px; }
.bericht .el-grund { fill: var(--rand); }
.bericht .el-feld { fill: var(--feld); }
.bericht .el-strafe { fill: var(--schlecht); }
.bericht .el-tor { fill: var(--akzent); }
.bericht .el-halbzeit { stroke: var(--gedaempft); stroke-dasharray: 3 3; }

/* Druck: A4, ohne Bedienelemente; hell machen die Tokens. Zugeklappte Details
   bleiben zu — wer sie auf Papier will, klappt sie vorher auf. */
@page { size: A4; margin: 15mm; }
@media print {
  body { background: #ffffff; }
  .kopfleiste { display: none; }
  .bericht { font-size: 11pt; max-width: none; padding: 0; }
  .bericht h2 { break-after: avoid; margin-top: 1.2rem; }
  .bericht table, .bericht .spielerin, .bericht .diagramm { break-inside: avoid; }
  .bericht summary { list-style: none; }
  .bericht .fuss { margin-top: 1.5rem; }
}
`;
```

- [ ] **Step 4: Logo im Kopf, Exportdatei mit Tokens und Schriften**

In `src/bericht/auswertung.ts`:

1. Den Import `import { BERICHT_CSS, BERICHT_HELL } from './stil';` ersetzen durch:
   ```ts
   import TOKENS_CSS from '../design/tokens.css?raw';
   import { logoHtml } from '../design/logo';
   import { SCHRIFTEN_CSS } from '../design/schriften';
   import { BERICHT_CSS } from './stil';
   ```
2. In `kopf()` die Zeile `<h1>Spiel gegen ${htmlEscapen(spiel.gegner)}</h1>` ersetzen durch:
   ```ts
       <div class="titelzeile"><h1>Spiel gegen ${htmlEscapen(spiel.gegner)}</h1>${logoHtml()}</div>
   ```
3. In `berichtDatei` den Inhalt von `<style>…</style>` ersetzen durch:
   ```ts
   <style>
   ${TOKENS_CSS}
   ${SCHRIFTEN_CSS}
   body { margin: 0; background: var(--grund); }
   ${BERICHT_CSS}
   </style>
   ```

In `src/ui/auswertung.ts`:
- `import { BERICHT_CSS, BERICHT_DUNKEL } from '../bericht/stil';` → `import { BERICHT_CSS } from '../bericht/stil';`
- In `stilEinhaengen()` `stil.textContent = \`${BERICHT_DUNKEL}\n${BERICHT_CSS}\`;` → `stil.textContent = BERICHT_CSS;`
- Den Kommentar über `stilEinhaengen` ersetzen durch: `/** Das Berichts-CSS kommt als Text mit und wird einmal in den Kopf gehängt; die Tokens liegen schon global. */`

- [ ] **Step 5: Tests, Typen, Build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: alles PASS.

Kontrolle: `grep -rn "BERICHT_HELL\|BERICHT_DUNKEL\|--b-" src` findet nichts.

- [ ] **Step 6: Sichtprüfung**

- In der Erfassung „Auswertung“ öffnen: Der Bericht erscheint im Spielfeld-Stil mit Logo rechts im Kopf und folgt hell/dunkel über `◐`.
- Die Diagramme sind in beiden Modi lesbar: Fläche grün/rot, Auszeit orange, Einsatzleiste blau.
- „Als HTML speichern“, die Datei direkt im Browser öffnen: gleicher Stil, Saira-Schriften auch ohne Netz (Netzwerk in den DevTools auf „Offline“).
- Druckvorschau (`⌘P`): hell, ohne Kopfleiste, weißer Hintergrund.

- [ ] **Step 7: Commit**

```bash
git add src/bericht/stil.ts src/bericht/auswertung.ts src/bericht/auswertung.test.ts src/ui/auswertung.ts
git commit -m "Bericht im Stil „Spielfeld“: Tokens, Schriften und Logo, auch in der Exportdatei

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Abschlussprüfung

**Files:** keine neuen. Kleine Korrekturen aus der Prüfung gehören in einen eigenen Commit.

- [ ] **Step 1: Alles grün**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: keine Typfehler, alle Tests PASS, Build erfolgreich.

- [ ] **Step 2: Reste suchen**

```bash
grep -rn "\-\-hervor\|\-\-b-\|BERICHT_HELL\|BERICHT_DUNKEL\|zahlenText\|freimeldung\|ereignisText\|zeigeKorrektur\|auswertung-knoepfe\|style=\"outline" src
grep -rnE "#[0-9a-fA-F]{3,6}\b" src/stil.css src/bericht/stil.ts src/ui
```

Expected: Der erste Befehl findet nichts. Der zweite findet nur `#ffffff` im Druckblock von `src/bericht/stil.ts`.

- [ ] **Step 3: Durchgang durch die ganze App, hell und dunkel**

Mit dem Testspiel, einmal im Farbmodus „hell“ und einmal „dunkel“:
1. „Neues Spiel“ → Kader (Tabelle, Knöpfe, Datei-Knöpfe) → Spielstart (Gegner, Datum, sieben Kacheln wählen) → „Erfassung beginnen“.
2. Erfassung per Tastatur: `␣` (Uhr läuft), `7T2⏎`, `GT⏎`, `12Z⏎`, `#Test⏎`, `Esc`, `↓`, `1 4 ⏎`, `⌫`, `Strg/⌘+Z`.
3. Erfassung per Maus: Kachel → Vorschlag, Klick auf die Uhr, Klick auf eine Verlaufszeile → Nummer → Löschen → Fertig, „N prüfen“.
4. Auswertung → „Als HTML speichern“ → Datei öffnen → „Zurück zur Erfassung“.
5. Fenster auf etwa 800 px Breite verkleinern: einspaltig, nichts ragt seitlich heraus.
6. Neuladen: „Unterbrochenes Spiel“ mit Kopfleiste, „Fortsetzen“ führt zurück, der Farbmodus ist erhalten.

- [ ] **Step 4: Vorher/Nachher festhalten**

Je einen Screenshot der Erfassung in hell und dunkel machen. Für den Vergleich dient das Mockup `docs/design/designpakete.html`, Paket „Spielfeld“, Abschnitt „Erfassung am Rechner“. Größere Abweichungen notieren und klären, nicht stillschweigend übernehmen.

- [ ] **Step 5: Branch abschließen**

Den Skill `superpowers:finishing-a-development-branch` verwenden. Merge nach `main` und Push nur nach Rückfrage, denn der Push deployt.
