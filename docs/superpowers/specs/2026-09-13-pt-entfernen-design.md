# `PT` entfernen — Design

Stand: 2026-09-13 · Anlass: Spiel vom 13.09.2026 · Reihenfolge: **1 von 5**

## Problem

Der Katalog führt `PT` „Tor durch den Torwart" als eigenen Code mit Wirkung
`treffer`. Das ist doppelt: ob eine Spielerin Torhüterin ist, steht im Kader.
Ein Tor der Torhüterin ist ein gewöhnliches `T` mit ihrer Nummer; die
Auswertung kann Torwart-Tore jederzeit über die Kader-Eigenschaft
herausfiltern. Ein zweiter Code für denselben Sachverhalt kostet einen
Merkposten und erzeugt zwei Schreibweisen für ein Ereignis.

## Entscheidung

`PT` wird aus dem Katalog gestrichen. Tor durch die Torhüterin: `1T⏎`, bei
einem Gegenstoß `1TG⏎` (siehe Spec „Gegenstöße beider Seiten").

## Änderungen

- `src/domain/katalog.ts`: Eintrag `PT` entfernen.
- `src/domain/katalog.test.ts`: Test, dass `findeEintrag('PT')` `undefined`
  liefert und `eintraegeMitPraefix('P')` nur `P` und `PS` (später `PG`) enthält.
- `docs/superpowers/specs/2026-09-05-handball-tracker-design.md`, Abschnitt 6,
  Tabelle „`P…` — Torwart": Zeile `PT` streichen, Satz ergänzen: „Tore der
  Torhüterin sind gewöhnliche `T`; die Torwart-Eigenschaft kommt aus dem Kader."

## Alte Logs

Ereignisse mit `typ: "PT"` in bereits gespeicherten Spielen laufen durch den
Reduzierer als unbekannter Code: Hinweis „Code PT ist unbekannt", kein Tor,
Spielstand um eins zu niedrig. Es gibt keine Migration — der Fall betrifft
höchstens die wenigen bisher erfassten Spiele und wird im Korrekturmodus
behoben, indem das Ereignis auf `T` geändert wird. Die Prüfliste zeigt den
Hinweis, sodass die Stelle nicht übersehen wird.

## Tests

Katalogtest wie oben. Kein Reduzierer- oder Statistiktest nötig, weil dort
keine Logik an `PT` hängt.

## Nicht im Umfang

Keine gesonderte Kennzahl „Tore durch Torhüterin"; sie ist jederzeit als
`tore` aller Zeilen mit `torwart: true` ablesbar.
