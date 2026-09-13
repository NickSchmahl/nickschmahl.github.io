# Siebenmeter in der Spielersicht — Design

Stand: 2026-09-13 · Anlass: Spiel vom 13.09.2026 · Reihenfolge: **2 von 5**

## Problem

Die Spielerkachel auf dem Erfassungsbildschirm zeigt `Tore/Würfe · Zeit · +/−`.
`tore` und `wuerfe` in `SpielerStatistik` sind bewusst nur Feldwürfe; die
Siebenmeter laufen getrennt in `siebenmeterTore` und `siebenmeterVersuche`.
Damit steht eine Spielerin, die zwei Siebenmeter verwandelt und sonst nichts
geworfen hat, mit `0/0` auf der Kachel — live wirkt das wie ein Erfassungsfehler.

## Entscheidung

Siebenmeter werden **getrennt** angezeigt, nicht in Tore/Würfe eingerechnet. Die
Feldwurfquote bleibt rein, und die Kachel wird nur dort länger, wo es etwas zu
zeigen gibt.

Kacheltext:

```
4/6 · 7m 1/1 · 12:30 · +2      Spielerin mit mindestens einem Siebenmeter
4/6 · 12:30 · +2               Spielerin ohne Siebenmeter — unverändert
0/0 · 7m 2/2 · 08:10 · 0       nur Siebenmeter geworfen
```

Das Stück `7m a/b` erscheint genau dann, wenn `siebenmeterVersuche > 0`.

## Änderungen

- `src/ui/erfassung.ts`, `zahlenText()`: Siebenmeter-Stück einfügen.
- `src/ui/erfassung.test.ts`: drei Fälle wie oben.

`SpielerStatistik`, Reduzierer, Export und Feed bleiben unverändert — die
CSV-Spalten `Tore`, `Wuerfe`, `7m-Tore`, `7m-Versuche` sind bereits getrennt und
passen zu dieser Darstellung.

## Nicht im Umfang

Keine Gesamttorzahl (Feld + 7m) in Kachel oder Export. Wer sie braucht,
addiert zwei Spalten; eine dritte Zahl auf der Kachel wäre live nicht mehr
mit einem Blick lesbar.
