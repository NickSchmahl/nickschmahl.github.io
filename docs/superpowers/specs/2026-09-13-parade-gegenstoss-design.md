# `PG` — Parade beim Gegenstoß — Design

Stand: 2026-09-13 · Anlass: Spiel vom 13.09.2026 · Reihenfolge: **5 von 5**
Setzt voraus: Spec „Gegenstöße beider Seiten" (Teamstatistik, `GTG`).

## Problem

Eine Parade beim Tempogegenstoß ist die wertvollste Parade im Spiel — freier
Wurf, kurze Distanz, kein Block davor. Sie geht in `P` unter. Für die
Torhüterin ist die Gegenstoß-Fangquote die aussagekräftigste Einzelzahl, und
für die Mannschaft ergänzt sie das Bild aus `GTG`/`GFG`: Wie viele gegnerische
Gegenstöße haben wir überstanden, und woran lag es?

## Entscheidung

Eigener Code `PG` „Parade beim Gegenstoß", analog zu `PS` „Parade bei
Siebenmeter". Bewusst kein Positionsargument hinter `P`: die `P`-Familie
bleibt eine kurze, aufzählbare Liste (`P`, `PS`, `PG`), die beim Tippen
vollständig sichtbar ist.

```ts
{ code: 'PG', bezeichnung: 'Parade beim Gegenstoß', wirkung: 'zaehler', brauchtSpieler: true }
```

Eingabe: `12PG⏎`. Eine Parade beim Gegenstoß wird **nur** als `PG` erfasst,
nicht zusätzlich als `P`.

## Auswertung

- **Paraden gesamt** = P + PS + PG. Überall, wo bisher `P + PS` gerechnet wird
  (CSV-Spalte `Paraden`), kommt `PG` hinzu; dafür die Konstante `PARADEN` aus
  der `GF`-Spec verwenden.
- **Gegnerwürfe** (Reduzierer, `wuerfeGegner`) zählen `PG` mit.
- **Gegnerische Gegenstoßwürfe** (Teamstatistik) = GTG + GFG + PG.
- **Gegenstoß-Fangquote** der Torhüterin = PG / (PG + Gegentore aus Gegenstoß
  während ihrer Einsatzzeit). Dafür bekommt `SpielerStatistik` neben
  `gegentoreImEinsatz` ein `gegenstossGegentoreImEinsatz`, das bei `GTG`
  für alle Spielerinnen auf dem Feld hochgezählt wird.

## Anzeige und Export

- **CSV**: neue Spalte `Paraden Gegenstoss` hinter `Paraden`; `Paraden`
  enthält `PG`.
- **Markdown**: im Abschnitt `## Gegner` die Zeile
  `Gegenstöße Gegner 2/5 · davon gehalten 2`.
- **Spielerkachel**: unverändert.

## Grundspec

Abschnitt 6, Tabelle „`P…` — Torwart": Zeile `PG` ergänzen.

## Tests

- Katalog: `eintraegeMitPraefix('P')` liefert `P`, `PG`, `PS`.
- Statistik: `PG` erhöht `zaehler.PG`; CSV-Spalte `Paraden` zählt `P`, `PS`, `PG`
  zusammen; `GTG` erhöht `gegenstossGegentoreImEinsatz` nur bei Spielerinnen
  auf dem Feld.
- Reduzierer: `12PG` erhöht `wuerfeGegner`.

## Nicht im Umfang

Keine Feinbeurteilung der Parade (Antizipation, Bein, Arm) — siehe Grundspec,
Abschnitt 6, „Bewusst nicht aufgenommen".
