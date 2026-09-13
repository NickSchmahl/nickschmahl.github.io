# Fehlwürfe des Gegners (`GF`) — Design

Stand: 2026-09-13 · Anlass: Spiel vom 13.09.2026 · Reihenfolge: **3 von 5**

## Problem

Vom Gegner werden nur Tore (`GT`, `GS`) und Zeitstrafen (`GZ`) erfasst. Wie viele
Würfe der Gegner hatte und wie hoch seine Wurfquote war, ist damit nicht
ablesbar — die eigene Abwehrleistung bleibt unsichtbar. Paraden (`P`, `PS`)
decken nur den gehaltenen Teil der Fehlwürfe ab.

## Entscheidung

Neuer Code `GF` „Fehlwurf des Gegners" für Würfe, die **ohne Parade** nicht im
Tor landen: daneben, Pfosten, Latte, geblockt. Gehaltene Würfe laufen weiter
ausschließlich über die Parade der Torhüterin. So bleibt es bei genau einer
Eingabe pro gegnerischem Wurf:

| Ausgang | Eingabe |
|---|---|
| Tor | `GT⏎` |
| Siebenmeter-Tor | `GS⏎` |
| gehalten | `12P⏎` (bzw. `12PS⏎`, `12PG⏎`) |
| daneben, Pfosten, geblockt | `GF⏎` |

**Gegnerwürfe** = GT + GS + GF + P + PS (+ GTG, GFG, PG aus den Folge-Specs).
**Gegnerquote** = (GT + GS + GTG) / Gegnerwürfe.

Ein eigener Block (`B`) ist weiterhin eine Abwehraktion der Spielerin und kein
Ersatz für `GF`: Wer den Wurf als gegnerischen Versuch zählen will, gibt
zusätzlich `GF` ein. Live wird das meist unterbleiben, und das ist in Ordnung —
die Gegnerquote ist dann geringfügig zu hoch, aber nie doppelt gezählt.

## Datenmodell

Neue Wirkung `gegnerwurf`: „zählt als Wurfversuch des Gegners ohne Tor". Sie
gehört wie `gegentor` zu `NUR_IM_SPIEL` (Hinweis bei stehender Uhr). Kein
Spieler, kein Argument.

`Zustand` bekommt `wuerfeGegner: number` — aus Vorsicht nicht als abgeleitete
Summe, sondern im Reduzierer bei `gegentor` und `gegnerwurf` hochgezählt, damit
der Kopf der Erfassung ohne Statistiklauf auskommt. Paraden fließen dort
ebenfalls ein: `gegnerwurf`, `gegentor` und jeder `zaehler`-Eintrag mit Code
`P`, `PS`, `PG` erhöhen `wuerfeGegner`. Die Paradencodes werden dafür in
`katalog.ts` als Konstante `PARADEN` geführt, damit Reduzierer und Statistik
dieselbe Liste benutzen.

## Katalog

```ts
{ code: 'GF', bezeichnung: 'Fehlwurf des Gegners', wirkung: 'gegnerwurf', brauchtSpieler: false }
```

## Anzeige und Export

- **Kopf der Erfassung**: unter dem Spielstand eine kleine Zeile
  `Würfe Gegner 23 · 48 %`. Die Quote fehlt, solange `wuerfeGegner === 0`.
- **Markdown-Export**: neuer Abschnitt `## Gegner` mit Toren, Würfen, Quote und
  Zeitstrafen. Die CSV ist spielerbezogen und bleibt unverändert.
- **Feed**: `GF` erscheint wie `GT` ohne Spielernummer.

## Tests

- Reduzierer: `GF` erhöht `wuerfeGegner`, nicht `toreGegner`; `GT` erhöht beides;
  `12P` erhöht `wuerfeGegner`; `GF` bei stehender Uhr erzeugt einen Hinweis.
- Grammatik: `GF⏎` ohne Nummer ergibt das Ereignis; `7GF⏎` bleibt wie `7GT⏎`
  unbekannt, weil der Code keinen Spieler nimmt (bestehende Regel in
  `grammatik.ts`).
- Export: Markdown enthält den Gegner-Abschnitt mit den erwarteten Zahlen; im
  Beispielspiel (`beispielspiel.ts`) zwei `GF` ergänzen und die Erwartung
  anpassen.

## Nicht im Umfang

Keine Wurfposition beim Gegner, kein Neun-Felder-Raster, keine namentliche
Erfassung gegnerischer Spieler (siehe Grundspec, Abschnitt 14).
