# Gegenstöße beider Seiten — Design

Stand: 2026-09-13 · Anlass: Spiel vom 13.09.2026 · Reihenfolge: **4 von 5**
Setzt voraus: Spec „Fehlwürfe des Gegners (`GF`)" (Wirkung `gegnerwurf`).

## Problem

Eigene Gegenstöße lassen sich bisher nur über die Wurfposition `7` hinter `T`
oder `F` kennzeichnen (`7T7⏎`). Das ist live unhandlich — die Ziffer 7 hinter
der Nummer 7 liest sich schlecht, und die Position ist als *optional* gedacht,
wird also gern weggelassen. Für den Gegner gibt es gar keine Möglichkeit, ein
Gegenstoßtor vom Positionsangriff zu unterscheiden. Damit ist nicht ablesbar,
wie viele Gegenstöße beide Seiten gelaufen sind und wie viele davon saßen —
eine der Kennzahlen, die in der Halle am meisten interessieren.

## Entscheidung

Gegenstoß wird als **eigener Code am Ausgang** erfasst, nicht als eigenes
Ereignis. Ein Gegenstoß ohne Abschluss (Ballverlust im Lauf) wird nicht
gesondert gezählt; er taucht als `BV` oder technischer Fehler auf wie jede
andere Ballverlustsituation.

| Code | Aktion | Wirkung | Spieler |
|---|---|---|---|
| `TG` | Tor aus Gegenstoß | `treffer` | ja |
| `FG` | Fehlwurf aus Gegenstoß | `wurf` | ja |
| `GTG` | Gegentor aus Gegenstoß | `gegentor` | nein |
| `GFG` | Fehlwurf des Gegners aus Gegenstoß | `gegnerwurf` | nein |

`TG` und `FG` nehmen **kein** Positionsargument; die Position ist durch den Code
festgelegt. Die Wurfposition `7` bleibt in der Grammatik gültig, damit alte
Logs weiter stimmen; die Auswertung behandelt `T` mit `pos: 7` wie `TG` und `F`
mit `pos: 7` wie `FG`. In der Klartext-Trefferliste beim Tippen erscheint `TG`
als Fortsetzung von `T`, sodass der Weg über den Code sichtbar ist.

Drei-Buchstaben-Codes sind neu. Die Grammatik erlaubt bisher ein oder zwei
Buchstaben; sie wird auf „ein bis drei" erweitert. Da die Eingabetaste ohnehin
bestätigt, entsteht keine Mehrdeutigkeit: `GT⏎` ist das Gegentor, `GTG⏎` das
Gegentor aus Gegenstoß.

## Statistik

`SpielerStatistik` erhält `gegenstossTore` und `gegenstossWuerfe` (Würfe
einschließlich Tore). Beide zählen `TG`/`FG` sowie `T`/`F`/`FB` mit `pos === 7`.
`tore` und `wuerfe` schließen die Gegenstöße wie bisher ein — `TG` ist ein
Treffer wie jeder andere.

Für die Mannschaft und den Gegner rechnet eine neue Funktion
`teamstatistik(ereignisse)` in `statistik.ts`:

```ts
interface Teamstatistik {
  gegenstossTore: number;      // TG + T7
  gegenstossWuerfe: number;    // TG + FG + T7 + F7 + FB7
  gegnerGegenstossTore: number;    // GTG
  gegnerGegenstossWuerfe: number;  // GTG + GFG + PG
}
```

`PG` (Parade beim Gegenstoß, Folge-Spec) zählt als gegnerischer Gegenstoßwurf,
weil eine Parade nur nach einem Wurf möglich ist.

## Anzeige und Export

- **Kopf der Erfassung**: neben `Würfe Gegner` eine Zeile
  `Gegenstoß 4/5 · Gegner 2/3` (Tore/Würfe je Seite).
- **Spielerkachel**: unverändert — die Kachel ist voll.
- **CSV**: zwei neue Spalten `Gegenstoss-Tore`, `Gegenstoss-Wuerfe` hinter
  `7m-Versuche`.
- **Markdown**: Zeile `Gegenstöße: 4/5 · Gegner 2/3` im Kopf sowie im
  Abschnitt `## Gegner`.
- **Feed**: wie andere Ereignisse, Bezeichnung aus dem Katalog.

## Grundspec

Abschnitt 6 und 7 der Grundspec anpassen: Codes ergänzen, Codelänge „ein bis
drei Buchstaben", Hinweis bei Wurfposition 7: „gleichwertig zu `TG`/`FG`;
bevorzugt wird der Code".

## Tests

- Grammatik: `7TG⏎`, `7FG⏎`, `GTG⏎`, `GFG⏎`; `7TG7⏎` wird abgewiesen (kein
  Argument); `GT⏎` bleibt Gegentor; Trefferliste nach `T` enthält `TG`.
- Statistik: `TG` erhöht `tore`, `wuerfe`, `gegenstossTore`, `gegenstossWuerfe`;
  `T` mit `pos: 7` liefert dieselben Zahlen; `F` ohne Position erhöht
  `gegenstossWuerfe` nicht.
- Teamstatistik: Beispielspiel um je einen Gegenstoß beider Seiten ergänzen,
  Erwartung anpassen.
- Export: neue CSV-Spalten, Markdown-Zeile.

## Nicht im Umfang

Kein eigenes Ereignis „Gegenstoß gelaufen" unabhängig vom Ausgang. Keine
Unterscheidung erste/zweite Welle.
