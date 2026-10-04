# Auswertung — Design und Ideenliste

Stand: 2026-09-13 · Anlass: Wunsch nach einer Statistikseite nach dem Spiel

## 1. Zweck

Nach dem Spiel soll eine Seite alles zeigen, was das Ereignis-Log über die
Mannschaft und jede einzelne Spielerin hergibt — und sich als **eine einzelne
HTML-Datei** speichern lassen, die per Mail oder Messenger weitergeschickt
werden kann und beim Empfänger ohne Internet, ohne die App und ohne Nachdenken
genauso aussieht wie in der App. Dieselbe Seite muss sich aus einem früheren
Export wiederherstellen lassen.

## 2. Rahmenentscheidungen

| Frage | Entscheidung | Begründung |
|---|---|---|
| Ein Renderer oder zwei | **Eine** reine Funktion `Spiel + Kader → HTML-Text`; die App zeigt den Text an, der Export schreibt ihn mit eingebettetem CSS in eine Datei | Keine zwei Wahrheiten; in Vitest ohne DOM testbar |
| Diagramme | Inline-SVG, zur Erzeugungszeit gerechnet | Kein JavaScript, keine Bibliothek, funktioniert in Mail-Vorschau und offline |
| Interaktivität | Nur natives `<details>` zum Aufklappen | Braucht kein Skript; die Datei bleibt ein Dokument |
| Farben | App: dunkel wie die Erfassung. Export: hell auf weiß | Ein weitergeschicktes Dokument wird gelesen und gedruckt, nicht in der Halle bedient; gleiche Struktur, andere Variablen |
| Import | **Nur JSONL.** CSV und Markdown sind abgeleitet und verlustbehaftet | Nur die Ereignisse erlauben eine Neuberechnung |
| JSONL-Kopfzeile | Erste Zeile `{"kopf":1,"gegner":…,"datum":…,"kader":[…]}` | Bisher fehlen Gegner, Datum und Kader in der Datei; ohne sie gibt es beim Import nur Nummern |
| Alte JSONL ohne Kopfzeile | Werden weiter gelesen: Gegner und Datum aus dem Dateinamen `spiel-JJJJ-MM-TT-<gegner>.jsonl`, Kader aus dem im Browser gespeicherten Kader | Bereits erfasste Spiele bleiben auswertbar |
| Mannschaftsname | Nicht vorhanden, wird nicht eingeführt | Kopf heißt „Spiel gegen X" |

## 3. Vollständige Ideenliste

Die Nummern sind Referenz für spätere Runden. **Kern** = erste Umsetzung
(Abschnitt 4). **Zweite Runde** = umgesetzt am 2026-09-13 (Abschnitt 5).
**Später** = fachlich geklärt, wartet. **Offen** = noch nicht entschieden.
**Verworfen** = bewusst nicht.

### A — Spielanalyse (Mannschaft)

| Nr. | Idee | Status | Anmerkung |
|---|---|---|---|
| 1 | **Kopf**: Endstand, Halbzeitstand, Gegner, Datum; Ampel zur Datenqualität (Anzahl Prüfhinweise) | Kern | |
| 2 | **Verlaufskurve**: Tordifferenz über die Spielzeit; Halbzeit, Auszeiten, eigene Zeitstrafen als Marken | Kern | |
| 3 | **Kennzahlen HZ1 / HZ2 / gesamt**: Tore, Würfe, Quote, 7m, technische Fehler, Ballverluste, Paraden, Zeitstrafen, Gegentore | Kern | |
| 4 | **Phasen**: 10-Minuten-Blöcke mit Toren für/gegen, Würfen, Fehlern | Kern | Blocklänge 10 min; 5 min später als Option denkbar |
| 5 | **Schlaglichter**: erzeugte Sätze — größter Rückstand/Vorsprung, Führungswechsel, längste Serie, Verlauf nach Auszeit | Zweite Runde | Umgesetzt |
| 6 | **Wurfbild Mannschaft** je Position | Umgesetzt (2026-10-04) | Spielfeld-SVG mit Kreisen je Feldposition (Fläche ∝ Würfe) und Tabelle inkl. Gegenstoß, Siebenmeter und „ohne Position"; auch im Markdown-Export. Beim Tippen eines Wurfcodes zeigt die Tastenhilfe die Positionsziffern |
| 7 | **Angriffseffizienz**: Angriffe ≈ Würfe + techn. Fehler + Ballverluste + 7m; Tore je Angriff | Offen | Näherung, weil Angriffe nicht als Ereignis erfasst werden |
| 8 | **Über-/Unterzahl**: Tore für/gegen während eigener Zeitstrafen und Gegnerstrafen (`GZ`, 120 s angenommen) | Zweite Runde | Umgesetzt |
| 9 | **Auszeit-Wirkung**: Stand davor, Verlauf fünf Minuten danach | Offen | Als Satz in 5 enthalten; ein eigener Abschnitt bleibt offen |
| 10 | **Aufstellungen**: die drei Formationen mit der längsten Einsatzzeit, Tore für/gegen | Kern | Aussagekraft hängt an sauberer Wechselerfassung; die Seite sagt dazu die Zeitspanne |
| 11 | **Siebenmeter-Bilanz** beider Seiten | Zweite Runde | Umgesetzt |
| 12 | **Gegner**: Tore, Würfe, Quote, Zeitstrafen, Gegenstöße | Später | Setzt Specs `GF`/Gegenstöße voraus |
| 13 | **Prüfliste**: alle Hinweise des Reduzierers | Kern (als Aufklappliste unter dem Kopf) | Fast geschenkt, weil 1 die Anzahl ohnehin zeigt |

### B — Je Spielerin

| Nr. | Idee | Status | Anmerkung |
|---|---|---|---|
| 14 | **Kopf je Spielerin**: Nummer, Name, Einsatzzeit und Anteil, Tore/Würfe/Quote, 7m, +/−; Torhüterin: Paraden, Gegentore im Einsatz, Fangquote | Kern | |
| 15 | **Einsatzleiste**: Zeitstrahl mit Feldphasen, Zeitstrafe rot, Tore als Marken | Kern | |
| 16 | **Ereignisliste**: alle Ereignisse der Spielerin mit Spielzeit, Aktion und Spielstand im Moment; aufklappbar | Kern | |
| 17 | **Wurfbild je Spielerin** | Später | Wie 6 |
| 18 | **Bilanz auf dem Feld**, auf 60 Minuten normiert | Zweite Runde | Umgesetzt — als Vergleichstabelle vor den Karten |
| 19 | **Sonstige Zähler** (Assists, Blocks, Ballgewinne, 1:1, Karten …), nur die ungleich null | Kern (Teil von 14) | Kostet nichts, weil `zaehler` schon je Code vorliegt |

### C — Bedienung

| Nr. | Idee | Status | Anmerkung |
|---|---|---|---|
| 20 | **Bildschirm „Auswertung"** aus der Erfassung heraus, mit „Als HTML speichern", „Zurück zur Erfassung", „Spiel beenden" | Kern | Auswertung ist eine Ansicht; Beenden bleibt ein eigener Schritt |
| 21 | **„Spiel aus Datei auswerten"** auf dem Kaderbildschirm — JSONL laden | Kern | |
| 22 | Sortierung der Spielerinnen umschaltbar | Verworfen | Bräuchte Skript in der Datei; Nummernreihenfolge genügt |
| 23 | **Druckansicht** (A4-CSS) | Zweite Runde | Umgesetzt |
| 24 | JSONL-Kopfzeile mit Gegner, Datum, Kader | Kern | Voraussetzung für 21 |

## 4. Entwurf des Kerns

### 4.1 Module

```
src/domain/auswertung.ts     reine Rechnung: Verlauf, Abschnittskennzahlen, Phasen,
                             Aufstellungen, Einsatzphasen, Ereignisse mit Spielstand
src/bericht/diagramme.ts     SVG-Text: Verlaufskurve, Phasenbalken, Einsatzleiste
src/bericht/stil.ts          CSS des Berichts als Text; zwei Variablensätze (dunkel/hell)
src/bericht/auswertung.ts    berichtHtml(spiel, kader) -> HTML-Fragment
                             berichtDatei(spiel, kader) -> vollständiges HTML-Dokument
src/persistenz/export.ts     alsJsonl bekommt die Kopfzeile; neu: ausJsonl
src/ui/auswertung.ts         Bildschirm: Fragment einsetzen, Knöpfe verdrahten
src/ui/tastatur.ts           Knopf „Auswertung", Tastatur abhängen/anhängen
src/ui/kader.ts              Dateiauswahl „Spiel aus Datei auswerten"
src/main.ts                  Verdrahtung des Imports
```

`src/bericht/` ist neu: Textbausteine ohne DOM-Zugriff, testbar wie `domain/`,
aber Darstellung statt Fachlogik. Die Regel „`domain/` importiert nichts aus
`ui/` oder `persistenz/`" gilt unverändert; `bericht/` importiert nur aus
`domain/` und `eingabe/` (für `alsUhrzeit`).

### 4.2 Rechnung (`domain/auswertung.ts`)

Alle Funktionen laufen einmal durch die Ereignisse und führen den Reduzierer
mit — die Aufstellung, der Spielstand und der Abschnitt **vor** dem Ereignis
sind das, was zählt.

```ts
interface Verlaufspunkt { t: number; eigen: number; gegner: number }
interface Marke { t: number; art: 'halbzeit' | 'auszeit' | 'strafe'; text: string }
interface Verlauf { punkte: Verlaufspunkt[]; marken: Marke[]; endeT: number }
```

- `verlauf(ereignisse)`: ein Punkt bei `t = 0` und nach jedem Tor; Marken für
  `HZ` (nur der erste, also Halbzeit), `AZ`, `Z`. `endeT` ist die Spielzeit des
  letzten Ereignisses, aufgerundet auf volle fünf Minuten, mindestens die
  Halbzeitmarke mal zwei — bei 2 × 25 Minuten Jugendspielzeit endet die Achse
  also nicht bei 60.
- `halbzeitstand(ereignisse)`: Spielstand beim ersten `HZ`, `undefined` ohne.

```ts
interface Teamkennzahlen {
  tore: number; wuerfe: number; quote: number | null;
  siebenmeterTore: number; siebenmeterVersuche: number;
  technischeFehler: number; ballverluste: number; paraden: number;
  zeitstrafen: number; gegentore: number;
}
```

- `kennzahlenJeAbschnitt(ereignisse)`: `{ abschnitte: Teamkennzahlen[]; gesamt }`,
  Index 0 = erste Halbzeit. Zugeordnet wird nach `zustand.abschnitt` vor dem
  Ereignis. Paraden = `P` + `PS`; Ballverluste = `BV`; technische Fehler wie
  `TECHNISCHE_FEHLER`.

```ts
interface Phase { von: number; bis: number; tore: number; gegentore: number; wuerfe: number; fehler: number }
```

- `phasen(ereignisse, blockSekunden = 600)`: Blöcke bis `endeT` des Verlaufs.
  `wuerfe` = Feldwürfe + Siebenmeter, `fehler` = technische Fehler + Ballverluste.

```ts
interface Aufstellung { nummern: number[]; dauer: number; tore: number; gegentore: number }
```

- `aufstellungen(ereignisse)`: für jede Spanne zwischen zwei Ereignissen die
  sortierte Feldbesetzung als Schlüssel; Dauer und Tore in der Spanne
  aufsummieren; absteigend nach Dauer. Spannen mit leerem Feld fallen weg.

```ts
interface Einsatzphase { von: number; bis: number; art: 'feld' | 'strafe' }
interface Spielerverlauf { phasen: Einsatzphase[]; tore: number[] }
interface Spielerereignis { t: number; typ: string; bezeichnung: string; stand: string; hinweis?: string }
```

- `spielerverlauf(ereignisse, nummer, endeT)`: Feldphasen aus der Feldbesetzung
  vor/nach jedem Ereignis; eine `strafe`-Phase von `Z` bis `min(endeT_Strafe,
  Rückkehr)`. Steht die Spielerin am Ende noch auf dem Feld, endet die Phase bei
  `endeT`. `tore` sind die Spielzeiten ihrer Treffer (Feld und 7m).
- `spielerereignisse(ereignisse, nummer)`: alle Ereignisse mit `spieler ===
  nummer` oder `ein === nummer`, mit Spielstand **nach** dem Ereignis und dem
  Reduzierer-Hinweis zum `seq`, falls vorhanden.

### 4.3 Diagramme (`bericht/diagramme.ts`)

Alle drei liefern einen `<svg>`-Text mit `viewBox`, `width="100%"` und
`role="img"` plus `<title>`. Farben ausschließlich über CSS-Variablen des
Berichts, damit dunkel und hell ohne zweite SVG-Fassung funktionieren.

- **Verlaufskurve**: Treppenlinie der Differenz `eigen − gegner`. Nulllinie,
  Y-Bereich symmetrisch um die größte Abweichung (mindestens ±3). X-Achse mit
  Beschriftung alle zehn Minuten. Halbzeit als gestrichelte Senkrechte, Auszeit
  als Dreieck unter der Achse, eigene Zeitstrafe als roter Strich am oberen
  Rand. Fläche über der Nulllinie leicht grün, darunter leicht rot gefüllt.
- **Phasenbalken**: je Block zwei Balken (Tore, Gegentore) nebeneinander, Werte
  als Zahl über dem Balken, Block-Beschriftung `0–10` unter der Achse.
- **Einsatzleiste**: ein Streifen über die volle Spielzeit; Feldphasen als
  gefüllte Rechtecke, Strafphasen rot, Tore als Marken oberhalb, Halbzeit als
  Strich. Höhe etwa 18 Einheiten, damit sie unter den Spielerinnenkopf passt.

### 4.4 Bericht (`bericht/auswertung.ts`)

Reihenfolge der Seite:

1. **Kopf** — `Spiel gegen <Gegner>`, Datum, Endstand groß, Halbzeitstand
   klein, Zeile „n Punkte zum Prüfen" als `<details>` mit der Hinweisliste
   (bei 0: „keine Auffälligkeiten“).
2. **Verlauf** — Verlaufskurve.
3. **Kennzahlen** — Tabelle mit Spalten HZ1, HZ2, gesamt (bei Verlängerung
   weitere Abschnitte).
4. **Phasen** — Phasenbalken, darunter eine Tabelle mit Würfen und Fehlern je
   Block.
5. **Aufstellungen** — bis zu drei Zeilen: Nummern mit Namen, Dauer, Tore
   für:gegen. Fehlen Wechsel im Log völlig, zeigt der Abschnitt nur die
   Startaufstellung, mit dem Satz „Keine Wechsel erfasst“.
6. **Spielerinnen** — nach Nummer. Je Spielerin eine Karte:
   - Kopfzeile: `7 Name` · `Zeit 41:20 (69 %)` · `Tore 5/8 (63 %)` · `7m 1/1` · `+3`;
     bei Torhüterinnen statt Tore/7m: `Paraden 9` · `Gegentore 14` · `Fangquote 39 %`.
     Dazu die ungleich null besetzten Zähler als kleine Liste: „2 Assists · 1 Block
     · 3 technische Fehler · 1 Zeitstrafe“.
   - Einsatzleiste.
   - `<details>` „12 Ereignisse“ mit der Ereignisliste `mm:ss · Aktion · Stand`,
     Hinweise wie im Feed mit ⚠.
   - Spielerinnen ohne Einsatz und ohne Ereignis: eine Zeile „nicht eingesetzt“.

Alle Namen und der Gegner laufen durch `htmlEscapen` — der Gegnername ist
freie Eingabe.

`berichtDatei` umschließt das Fragment mit `<!doctype html>`, `<meta charset>`,
`<title>Spiel gegen X · Datum</title>`, dem CSS aus `bericht/stil.ts` mit dem
hellen Variablensatz und einer Fußzeile „Erstellt mit Handball-Tracker am
<Datum>“.

### 4.5 Export und Import (`persistenz/export.ts`)

- `alsJsonl(spiel, kader)` schreibt zuerst
  `{"kopf":1,"gegner":"…","datum":"JJJJ-MM-TT","kader":[{"nummer":7,"name":"…","torwart":false},…]}`
  und dann je Ereignis eine Zeile. Der Schlüssel `kopf` kommt in keinem
  Ereignis vor; die Zeile ist damit eindeutig.
- `ausJsonl(text, ersatz: { dateiname?: string; kader: readonly Spieler[] })`
  liefert `{ spiel: Spiel; kader: Spieler[] }`. Mit Kopfzeile kommen Gegner,
  Datum und Kader aus ihr; ohne aus `ersatz` — Gegner und Datum aus dem
  Dateinamen `spiel-JJJJ-MM-TT-<gegner>.jsonl` (Bindestriche im Gegner werden
  zu Leerzeichen; passt der Name nicht, „unbekannt“ und heutiges Datum).
  Leere Zeilen werden übersprungen; eine Zeile, die kein JSON ist, wirft einen
  Fehler mit Zeilennummer. Ereignisse werden nach `seq` sortiert.
- `dateiname(spiel, 'html')` ergänzt die Endung.

### 4.6 Bildschirme

**Erfassung** bekommt neben den Exportknöpfen einen Knopf „Auswertung“. Er
hängt die Tastatur ab (wie beim Korrekturmodus) und zeigt den
Auswertungsbildschirm.

**Auswertung** (`ui/auswertung.ts`): oben eine Knopfzeile — „Als HTML
speichern“, „Ereignisse (JSONL)“, „Zurück zur Erfassung“ (nur wenn aus der
Erfassung gekommen), „Spiel beenden“ (nur bei laufendem Spiel; ruft
`spielBeenden()` und führt zum Kaderbildschirm) bzw. „Zum Start“ (nach Import).
Darunter das Fragment aus `berichtHtml`, in ein `<div class="bericht">` mit dem
dunklen Variablensatz eingebettet. Das CSS des Berichts wird einmalig als
`<style>` eingefügt.

**Kader** bekommt unter der Tabelle einen Abschnitt „Auswertung“ mit
`<input type="file" accept=".jsonl">` und dem Text „Spiel aus Datei auswerten“.
Die Datei wird mit `ausJsonl` und dem aktuell angezeigten Kader als Ersatz
gelesen; bei Fehler erscheint die Meldung in der Fehlerliste der Maske.

### 4.7 Tests

- `domain/auswertung.test.ts` gegen das Beispielspiel und kleine Sequenzen:
  Verlaufspunkte und Marken; Halbzeitstand; Kennzahlen je Abschnitt (HZ-Ereignis
  selbst zählt zum ersten Abschnitt); Phasen mit Blockgrenzen; Aufstellungen
  sortiert nach Dauer mit richtigen Toren; Einsatzphasen mit Strafe und
  Rückkehr; Ereignisliste mit Stand nach dem Ereignis.
- `bericht/diagramme.test.ts`: gültige SVG-Hülle, Anzahl der Marken, Balken.
- `bericht/auswertung.test.ts`: Fragment enthält Endstand, Halbzeitstand,
  alle Spielerinnen; Torhüterin zeigt Fangquote; Gegnername mit `<` wird
  escaped; `berichtDatei` beginnt mit `<!doctype html>` und enthält `<style>`.
- `persistenz/export.test.ts`: Kopfzeile, Rundreise `alsJsonl → ausJsonl`,
  alte Datei ohne Kopfzeile mit Dateinamen und Ersatzkader, Fehler bei
  kaputter Zeile.
- Durchklicken in der App: Beispielspiel erfassen → Auswertung → HTML speichern
  → Datei im Browser öffnen; JSONL des Spiels gegen Hamburg-Nord (ohne
  Kopfzeile) importieren.

### 4.8 Nicht im Kern

Alles mit Status „Später“, „Offen“ oder „Verworfen“ in Abschnitt 3.
Saisonauswertung über mehrere Spiele bleibt außerhalb (Grundspec, Abschnitt 14).

## 5. Zweite Runde (5, 8, 11, 18, 23)

Alles in den bestehenden Modulen; keine neuen Schnittstellen.

### 5.1 Rechnung (`domain/auswertung.ts`)

- `schlaglichter(ereignisse)` liefert Rohdaten, keine Sätze: größter
  Vorsprung/Rückstand (Differenz, Spielzeit, Stand nach dem Tor — beim ersten
  Erreichen), Führungswechsel (die Führung geht von einer Seite auf die andere,
  Ausgleiche dazwischen zählen nicht als Wechsel), Ausgleiche, längste eigene
  Serie und längste Gegnerserie (Tore in Folge ohne Tor der anderen Seite),
  längste eigene torlose Phase (vom Anwurf bzw. letzten Tor bis zum nächsten
  bzw. letzten Ereignis), je Auszeit Stand davor und Tore für/gegen in den fünf
  Minuten danach.
- `ueberUnterzahl(ereignisse)`: jede Spanne zwischen zwei Ereignissen wird an
  den Strafenden geteilt und nach aktiven Strafen eingeordnet — eigene aus
  `zustand.strafen` mit `endeT > t`, Gegner aus `GZ` plus `STRAFDAUER`, selbst
  mitgeführt. Mehr eigene als gegnerische Strafen: Unterzahl; umgekehrt
  Überzahl; gleich viele: Gleichzahl, fällt raus. Je Lage Dauer, Situationen
  (Eintritt in die Lage mit einer Spanne, die Zeit hat — eine zweite Strafe
  während der ersten ist keine neue Situation), Tore, Gegentore. Ein Tor zählt
  zur Lage unmittelbar davor.
- `siebenmeterBilanz(ereignisse)`: eigen `ST`/`SF` gesamt und je Werferin, `SH`
  je Spielerin; Gegner `GS` als Tor und `PS` als gehalten, `SV` je Spielerin,
  gehalten je Torhüterin. Verworfene Gegner-Siebenmeter ohne Parade sind nicht
  erfassbar; Versuche des Gegners = Tore + gehaltene.
- Bilanz je 60 Minuten braucht keine neue Rechnung: `plusMinus / einsatzzeit ×
  3600` aus `statistik`; Tore für im Einsatz = `plusMinus + gegentoreImEinsatz`.

### 5.2 Bericht

Neue Abschnitte in dieser Reihenfolge: **Schlaglichter** nach dem Verlauf als
Liste von Sätzen (Serien erst ab drei Toren, torlose Phase erst ab fünf
Minuten; ohne Tor „Kein Tor erfasst“), **Siebenmeter** und **Über- und
Unterzahl** nach den Kennzahlen (Tabellen; ohne Vorkommen jeweils ein Satz),
**Bilanz auf dem Feld** vor den Spielerinnenkarten als Vergleichstabelle der
eingesetzten Spielerinnen nach Nummer (Einsatz, Tore für, Gegentore, +/−, +/−
je 60 min mit deutschem Komma; die Normierung erst ab fünf Minuten Einsatz,
sonst „–“). Spielminuten in den Sätzen: 0–60 s ist die erste Minute.

### 5.3 Druck

`@page A4` mit 15 mm Rand und ein `@media print`-Block in `BERICHT_CSS`: heller
Variablensatz mit höherer Spezifität (gilt so auch beim Drucken aus der dunklen
App), 11 pt, volle Breite, Karten, Tabellen und Diagramme ohne Umbruch im
Inneren, Überschriften nicht am Seitenende, Knopfzeile ausgeblendet. Die App
bekommt den Knopf „Drucken“ (`window.print()`). Zugeklappte `<details>` drucken
Browser nicht auf — wer Ereignislisten auf Papier will, klappt sie vorher auf;
ein Skript dafür kommt nicht in die Exportdatei.
