# Handball-Tracker — Design

Stand: 2026-09-05

## 1. Zweck

Ein Werkzeug, mit dem eine einzelne Person ein Handballspiel ihrer Mannschaft
live vom Zuschauerplatz aus erfasst und hinterher auswertet. Erfassung
ausschließlich über die Tastatur, mit möglichst wenigen Anschlägen pro Aktion,
damit der Blick beim Spiel bleibt.

## 2. Nutzungssituation

Diese Randbedingungen begründen fast alle Entscheidungen weiter unten:

- **Eine Person, Zuschauerplatz, Laptop.** Beide Hände frei, aber die Aufmerksamkeit
  gehört dem Spiel. Blindbedienung ist Pflicht.
- **Wenige Anschläge je Aktion.** Der Normalfall ist zwei Tasten. Alles, was
  regelmäßig drei oder mehr kostet, wird live nicht erfasst.
- **Unterbrechungen sind normal.** Die Anwendung muss zwei Minuten ohne Eingabe
  überstehen, ohne in einen unklaren Zustand zu geraten.
- **Kein Statistikpersonal, keine zweite Person, kein Netz in der Halle.**

## 3. Getroffene Entscheidungen

| Frage | Entscheidung | Begründung |
|---|---|---|
| Einsatzzeit pro Spieler | Vollständige Wechselerfassung | Ausdrücklich gewünscht; ermöglicht zusätzlich Plus/Minus und Plausibilitätsprüfungen |
| Erfassung des Gegners | Nur Tore, Siebenmeter-Tore und Zeitstrafen | Hält den Zusatzaufwand bei nahezu null, genügt für Spielstand, Verlaufskurve und Plus/Minus |
| Spielzeitmessung | Uhr in der Anwendung, jederzeit auf die Hallenuhr korrigierbar | Robust gegen Drift, ohne dass jede Unterbrechung sauber getroffen werden muss |
| Detailtiefe je Wurf | Wurfposition als *optionale* Ziffer hinter dem Code | Der Wurf zählt auch ohne Position; die Entscheidung fällt je Situation |
| Plattform | Lokale Browser-Anwendung, TypeScript, kein Server, kein UI-Framework | Feldübersicht ist bei voller Wechselerfassung unverzichtbar und im Terminal schlecht darstellbar; späterer Wechsel auf ein Tablet bleibt offen |

Ausdrücklich verworfen: native Java-Anwendung (unverhältnismäßiger Oberflächen-
und Paketieraufwand), Terminal-Oberfläche (zu wenig Übersicht für die
Wechselerfassung), Angular (Zeremonie ohne Gegenwert bei einer Ein-Fenster-Anwendung).

## 4. Architektur

Der Zustand wird nirgends gehalten, sondern berechnet:

```
Tastendruck → Grammatik → Ereignis → Log (append-only) → reduce() → Zustand → Anzeige
                                       ↓
                                  Speicher / Export
```

Das Ereignis-Log ist die einzige Wahrheit. Spielstand, Feldbesetzung, laufende
Zeitstrafen und sämtliche Kennzahlen sind Ableitungen daraus. Daraus folgt
unmittelbar:

- **Rückgängig** ist das Streichen der letzten Zeile.
- **Korrektur** ist das Ändern einer Zeile; alle Folgewerte stimmen danach wieder.
- **Uhrkorrektur** ist ein gewöhnliches Ereignis.
- **Export** ist das Herausschreiben des Logs.

### Verzeichnisaufbau

```
src/
  domain/
    ereignis.ts      Ereignistypen und ihre Wirkungen
    katalog.ts       Konfiguration: Kategorien, Tastenbelegung, Wirkung
    reduzierer.ts    reduce(Ereignisse) -> Zustand
    statistik.ts     Zustand -> Kennzahlen
  eingabe/
    grammatik.ts     Tastenpuffer -> Ereignis
  ui/
    kader.ts         Kadermaske
    spielstart.ts    Gegner und Startaufstellung
    erfassung.ts     Erfassungsbildschirm
    korrektur.ts     Korrekturmodus
  persistenz/
    speicher.ts      IndexedDB: Kader, laufendes Spiel, Ereignisse
    export.ts        JSONL / CSV / Markdown
```

`domain/` kennt weder DOM noch Speicher und ist vollständig ohne Oberfläche
testbar. Das ist die einzige Schichtgrenze, die strikt eingehalten wird.

## 5. Datenmodell

Eine Ereigniszeile:

```json
{"seq":143,"t":1834,"wall":"2026-09-05T19:42:11.884Z","typ":"T","spieler":7,"pos":2}
```

- `seq` — fortlaufende Nummer, bestimmt die Reihenfolge
- `t` — Spielzeit in Sekunden seit Anpfiff der ersten Halbzeit
- `wall` — Echtzeit; erlaubt es, nach einer Uhrkorrektur nachzuvollziehen, was
  tatsächlich wann geschah, und ist die Grundlage jeder späteren Nachbearbeitung
- `typ` — Kategorie aus dem Katalog
- weitere Felder je nach Typ: `spieler`, `pos`, `ein`, `aus`, `notiz`

Gespeichert wird als JSON Lines: eine Zeile je Ereignis, anhängend geschrieben.

### Wirkungen

Der Reduzierer kennt nur diese Wirkungen. Jede Kategorie des Katalogs bildet auf
genau eine davon ab — dadurch erweitert eine **zählende** Kategorie die
Konfiguration, nicht den Code.

Zwei Wirkungen sind davon ausgenommen, weil sie keine Zählung sind, sondern
Steuerung: `wechsel` unterscheidet `W`, `I` und `O`, `uhr` unterscheidet `HZ`,
`AZ`, `UL` und `US`. Beide bilden eine geschlossene Menge von Steueroperationen
ab, die sich nicht mit neuen Statistikkategorien erweitert. Sie über
Katalogmetadaten zu abstrahieren wäre eine Indirektion ohne zweiten Nutzer.

| Wirkung | Bedeutung |
|---|---|
| `wurf` | zählt als Wurfversuch |
| `treffer` | zählt als Wurfversuch **und** Tor, erhöht den eigenen Spielstand |
| `siebenmeter_treffer` | zählt als Siebenmeter-Versuch **und** -Tor, erhöht den eigenen Spielstand |
| `siebenmeter_fehl` | zählt als Siebenmeter-Versuch ohne Tor |
| `gegentor` | erhöht den Spielstand des Gegners |
| `strafe` | startet eine Zeitstrafe von 120 Sekunden Spielzeit |
| `karte` | Verwarnung wird nur gezählt; eine Disqualifikation nimmt den Spieler dauerhaft vom Feld und sperrt ihn für weitere Wechsel |
| `wechsel` | verändert die Feldbesetzung |
| `zaehler` | reine Zählung ohne Nebenwirkung |
| `uhr` | Start, Stopp, Korrektur, Abschnittswechsel |
| `notiz` | wird nur im Verlauf angezeigt |

## 6. Ereigniskatalog

Ein Code besteht aus einem oder zwei Buchstaben und ist die Abkürzung des
deutschen Begriffs. Verwandte Aktionen teilen sich den ersten Buchstaben — man
merkt sich sieben Familien statt dreißig Einzelfälle.

**Wurf und Tor**

| Code | Aktion | Wirkung |
|---|---|---|
| `T` | Tor | `treffer` |
| `F` | Fehlwurf (daneben oder gehalten) | `wurf` |
| `FB` | Fehlwurf, geblockt | `wurf` |
| `A` | Assist | `zaehler` |

**`T…` — technische Fehler**

| Code | Aktion | Wirkung |
|---|---|---|
| `TF` | Technischer Fehler, unspezifisch | `zaehler` |
| `TS` | Schrittfehler | `zaehler` |
| `TD` | Doppelfehler | `zaehler` |
| `TA` | Angriffsfoul (Stürmerfoul) | `zaehler` |

**`S…` — Siebenmeter**

| Code | Aktion | Wirkung |
|---|---|---|
| `ST` | Siebenmeter-Tor | `siebenmeter_treffer` |
| `SF` | Siebenmeter verworfen | `siebenmeter_fehl` |
| `SH` | Siebenmeter herausgeholt | `zaehler` |
| `SV` | Siebenmeter verursacht | `zaehler` |

**`B…` und Zweikampf — Abwehr- und Ballaktionen**

| Code | Aktion | Wirkung |
|---|---|---|
| `B` | Block | `zaehler` |
| `BG` | Ballgewinn | `zaehler` |
| `BV` | Ballverlust (Fehlpass, vertändelt) | `zaehler` |
| `N` | Neutralisierung | `zaehler` |
| `E` | Eins-gegen-eins gewonnen | `zaehler` |
| `EV` | Eins-gegen-eins verloren | `zaehler` |

**`P…` — Torwart**

| Code | Aktion | Wirkung |
|---|---|---|
| `P` | Parade | `zaehler` |
| `PS` | Parade bei Siebenmeter | `zaehler` |
| `PT` | Tor durch den Torwart | `treffer` |

Gegentore je Torwart werden nicht eingegeben, sondern aus den Gegentoren
während seiner Einsatzzeit abgeleitet.

**`Z…` — Strafen**

| Code | Aktion | Wirkung |
|---|---|---|
| `Z` | Zeitstrafe, zwei Minuten | `strafe` |
| `ZG` | Verwarnung, gelbe Karte | `karte` |
| `ZR` | Disqualifikation, rote Karte | `karte` |
| `ZH` | Zeitstrafe herausgeholt | `zaehler` |

**Feldbesetzung**

| Code | Aktion | Wirkung |
|---|---|---|
| `W` | Wechsel; das Ziffernargument ist die einwechselnde Nummer | `wechsel` |
| `I` | Kommt aufs Feld | `wechsel` |
| `O` | Geht vom Feld | `wechsel` |

`I` und `O` sind nötig, weil `W` einen ausgewechselten Spieler voraussetzt: die
Startaufstellung, die Rückkehr nach einer Zeitstrafe und das bewusste Spiel in
Unterzahl haben keinen Gegenpart. Die Startaufstellung erzeugt deshalb
`I`-Ereignisse und braucht keinen Sonderfall im Reduzierer.

**`G…` — Gegner (ohne Spielernummer)**

| Code | Aktion | Wirkung |
|---|---|---|
| `GT` | Gegentor | `gegentor` |
| `GS` | Gegentor durch Siebenmeter | `gegentor` |
| `GZ` | Zeitstrafe für den Gegner | `zaehler` |

**Spielsteuerung (ohne Spielernummer)**

| Code | Aktion | Wirkung |
|---|---|---|
| `HZ` | Abschnittswechsel: Halbzeit, Spielende | `uhr` |
| `AZ` | Auszeit | `uhr` |
| `U` | Uhrkorrektur; das Ziffernargument ist die Hallenuhrzeit als `mmss` | `uhr` |
| `UL` | Uhr läuft — von der Leertaste erzeugt | `uhr` |
| `US` | Uhr steht — von der Leertaste erzeugt | `uhr` |

**Wurfpositionen** — Ziffernargument nach `T` oder `F`, von links nach rechts
über die Angriffsreihe:

`1` Linksaußen · `2` Rückraum links · `3` Rückraum Mitte · `4` Rückraum rechts ·
`5` Rechtsaußen · `6` Kreis · `7` Gegenstoß

**Bewusst nicht aufgenommen:** Freiwurf und „kein Abwurf" (ohne
Aussagewert für die Auswertung) sowie die Feinbeurteilung des Torwarts —
Antizipation, Stellungsspiel, Bein hoch, Arm unten. Letztere sind live vom
Zuschauerplatz aus nicht zuverlässig zu beurteilen; falsch erfasst sind sie
schlechter als gar nicht erfasst. Nachrüsten ist jeweils ein Eintrag in
`katalog.ts`.

## 7. Eingabegrammatik

```
[Trikotnummer] Code [Argument] ⏎
```

- Ziffern am Anfang bilden die Trikotnummer, beliebig viele.
- Der erste Buchstabe schließt die Nummer ab und beginnt den Code, der ein oder
  zwei Buchstaben lang ist. **Die Nummer endet ausschließlich am ersten
  Buchstaben** — nicht nach einer festen Stellenzahl und nicht nach einer
  Wartezeit. Deshalb sind einstellige und zweistellige Nummern nebeneinander
  eindeutig: `7T` ist Nr. 7, `77T` ist Nr. 77.
- Ziffern **nach** dem Code sind dessen Argument: Wurfposition bei `T` und `F`,
  einwechselnde Nummer bei `W`, Uhrzeit bei `U`.
- Die Eingabetaste bestätigt. Sie ist notwendig, weil `T` und `TF` beide gültige
  Codes sind — ohne Bestätigung wäre nicht entscheidbar, ob die Eingabe fertig
  ist.
- Ein Code ohne vorangestellte Nummer ist ein Team- oder Gegnerereignis.

Beispiele:

```
7T⏎        Tor durch Nr. 7
7T2⏎       dasselbe Tor, aus dem linken Rückraum
7TF⏎       technischer Fehler von Nr. 7
7TS⏎       Schrittfehler von Nr. 7
12F⏎       Fehlwurf von Nr. 12
77T⏎       Tor durch Nr. 77 — nicht durch Nr. 7
4SH⏎       Nr. 4 holt einen Siebenmeter heraus
7Z⏎        zwei Minuten für Nr. 7
12P⏎       Parade von Torwart Nr. 12
7W12⏎      Nr. 7 geht vom Feld, Nr. 12 kommt
GT⏎        Gegentor
U2003⏎     Uhr auf 20:03 stellen
```

Sofort wirkende Tasten, ohne Bestätigung:

| Taste | Wirkung |
|---|---|
| Leertaste | Uhr starten oder anhalten; erzeugt dabei ein `UL`- oder `US`-Ereignis |
| Rücktaste | letztes Zeichen im Puffer löschen |
| Esc | Puffer verwerfen |
| Strg+`Z` | letztes gespeichertes Ereignis rückgängig |

Der Puffer wird durchgehend im Klartext mitgeschrieben, etwa
`7 TF → Nr. 7 · Technischer Fehler`, sodass ein kurzer Blick vor dem Bestätigen
genügt. Solange nur Ziffern im Puffer stehen, zeigt die Zeile die Ziffern roh und
löst sie **nicht** zu einem Spielernamen auf — aus einer 7 kann noch eine 77
werden, und eine Zeile, die zwischenzeitlich den falschen Namen behauptet, wäre
schlimmer als gar keine. Erst mit dem ersten Buchstaben steht die Nummer fest und
der Name erscheint. Bei unbekanntem Code sagt die Zeile das, und die
Eingabetaste bleibt wirkungslos.

## 8. Uhr

Die Uhr läuft in der Anwendung und wird mit der Leertaste gestartet und
angehalten. Alle Zeitstempel `t` beziehen sich auf sie.

Eine Uhrkorrektur (`U`, dann die auf der Hallenuhr abgelesene Zeit als `mmss`,
dann die Eingabetaste) erzeugt ein
Ereignis, das den Versatz **ab diesem Punkt** neu setzt. Bereits erfasste
Ereignisse behalten ihre Spielzeit. Das ist bewusst gewählt: die Hallenuhr ist
maßgeblich, die aufgelaufene Abweichung wird nicht rückwirkend über vergangene
Ereignisse verteilt, weil unbekannt ist, wann sie entstand. Springt die Uhr dabei
vorwärts, wächst die Einsatzzeit der gerade auf dem Feld stehenden Spieler
entsprechend — das entspricht der Realität.

Das Starten und Anhalten der Uhr ist selbst ein Ereignis (`UL`, `US`). Nur dadurch
übersteht der Uhrzustand ein Neuladen der Seite, und nur dadurch kann überhaupt
auffallen, dass eine Spielaktion bei stehender Uhr eingetragen wurde.

Zeitstrafen laufen über 120 Sekunden *Spielzeit*, also nicht während
Unterbrechungen. Läuft eine Strafe ab, wandert der Spieler auf die Bank, nicht
automatisch aufs Feld; wer nachrückt, entscheidet ein Wechsel-Ereignis.

## 9. Bildschirme

Drei Bildschirme, in dieser Reihenfolge durchlaufen.

### Kader

Eine Maske zum Anlegen und Pflegen der Mannschaft: Trikotnummer, Name,
Kennzeichnung als Torwart. Zeilen lassen sich hinzufügen, ändern und löschen.
Der Kader bleibt zwischen Spielen erhalten und lässt sich als JSON aus- und
wieder einlesen, damit er nicht am Browser eines einzelnen Rechners hängt.

Beim Speichern wird geprüft: doppelt vergebene Trikotnummern werden abgewiesen,
weil sie jede Zuordnung mehrdeutig machen; führende Nullen werden entfernt,
damit `07` und `7` nicht als zwei Spieler geführt werden.

### Spielstart

Gegner und Datum eintragen, Startaufstellung wählen — sechs Feldspieler und ein
Torwart. Das erzeugt die ersten Wechsel-Ereignisse. Danach startet die Uhr mit
der Leertaste, und die Erfassung beginnt.

### Erfassung

Ein Fenster, kein Scrollen. Von oben nach unten:

- **Kopf** — Spielzeit groß, Spielstand, laufender Abschnitt
- **Feld** — bis zu sieben Plätze mit Nummer, Name und Kurzzahlen; rot
  hinterlegt bei laufender Zeitstrafe, mit Restzeit
- **Bank** — übrige Spieler des Kaders
- **Eingabezeile** — der Puffer im Klartext
- **Feed** — die letzten Ereignisse, das jüngste oben

Die Rückmeldung während der Eingabe läuft in drei Stufen:

1. **Ziffern getippt.** Alle Spieler, deren Nummer mit den getippten Ziffern
   beginnt, werden hervorgehoben. Bei `7` leuchten also Nr. 7 *und* Nr. 77 —
   das ist die sichtbare Entsprechung der Regel, dass die Nummer erst mit dem
   ersten Buchstaben feststeht.
2. **Code begonnen.** Es bleibt genau ein Spieler hervorgehoben. Daneben
   erscheint die Liste aller Codes, die mit dem Getippten beginnen, jeweils mit
   Klartextbezeichnung: nach `T` also „Tor" als sofort bestätigbar, darunter
   `TF`, `TS`, `TD` und `TA` als mögliche Fortsetzungen. Der Katalog ist damit
   beim Tippen sichtbar und muss nicht auswendig gelernt werden.
3. **Bestätigt.** Das Ereignis erscheint oben im Feed, kurz hervorgehoben, und
   die Zahlen auf der Spielerkachel aktualisieren sich.

Die Maus wird nur in der Kadermaske, beim Spielstart und im Korrekturmodus
verwendet; während der Erfassung ist sie überflüssig.

## 10. Fehlertoleranz

Prüfungen warnen, sie blockieren nie. Ein Tor eines Spielers, der laut Zustand
auf der Bank sitzt, wird gespeichert **und markiert**. Live darf nichts hängen
bleiben, nur weil ein Wechsel übersehen wurde.

Geprüft wird auf: Trikotnummer, die im Kader nicht vorkommt, Aktion eines nicht
auf dem Feld stehenden Spielers, mehr als sieben Spieler auf dem Feld, Wechsel
eines gesperrten Spielers, Wurf oder Tor bei stehender Uhr. Die letzte Prüfung
gilt nur für Aktionen, die zwingend im laufenden Spiel stattfinden — Wechsel,
Karten und Zeitstrafen fallen naturgemäß in Unterbrechungen und werden nicht
angemahnt. Die Markierungen sammelt die Anwendung und zeigt sie als aufklappbare
Prüfliste unter dem Ereignis-Feed.

Der Korrekturmodus (Esc) zeigt die Ereignisliste; mit den Pfeiltasten wird
ausgewählt, geändert oder gelöscht. Die Rücktaste löscht im Normalbetrieb das
zuletzt erfasste Ereignis.

## 11. Persistenz und Export

Nach jedem Ereignis wird in IndexedDB geschrieben. Ein geschlossener Tab oder ein
leerer Akku kosten damit höchstens die letzte Aktion. Beim Start bietet die
Anwendung an, ein unterbrochenes Spiel fortzusetzen.

Der Kader liegt ebenfalls in IndexedDB und überdauert das einzelne Spiel. Er
lässt sich als JSON ausgeben und wieder einlesen.

Exportiert wird in drei Formen:

- `spiel-JJJJ-MM-TT-<gegner>.jsonl` — die rohen Ereignisse, verlustfrei
- `spiel-JJJJ-MM-TT-<gegner>.csv` — Spielerstatistik: Nummer, Name, Einsatzzeit,
  Tore, Würfe, Wurfquote, Siebenmeter-Tore und -Versuche, Assists, technische
  Fehler, Ballverluste, Ballgewinne, Blocks, Paraden, Gegentore während der eigenen
  Einsatzzeit (für die Torwartquote), Zeitstrafen, Karten, Plus/Minus
- `spiel-JJJJ-MM-TT-<gegner>.md` — kompakte Zusammenfassung samt Verlauf

## 12. Auswertung

Die Kennzahlen rechnet die Anwendung selbst — deterministisch, testbar,
nachprüfbar. Ein Sprachmodell ist für Rechenarbeit auf einigen hundert
Ereigniszeilen das falsche Werkzeug.

Die JSONL-Datei ist das Format für freie Fragen an eine KI („in welchen Phasen
brachen wir ein?", „wie sah die Wurfverteilung nach dem Rückstand aus?"). Beide
Wege bestehen nebeneinander; die Anwendung liefert die Zahlen, das Sprachmodell
die Interpretation.

## 13. Tests

Der Reduzierer ist eine reine Funktion und wird über Ereignissequenzen geprüft:
Spielstand, Feldbesetzung, Ablauf von Zeitstrafen, Einsatzzeiten über
Uhrkorrekturen hinweg, Plus/Minus. Dazu ein vollständiges Beispielspiel als
Fixture mit erwarteter Endstatistik als Vergleichswert.

Die Grammatik wird getrennt geprüft: Tastenfolge hinein, erwartetes Ereignis
heraus, einschließlich der Auflösung von `T` gegen `TF`, der Unterscheidung von
`7T` und `77T` bei einem Kader, der beide Nummern enthält, der Ziffernargumente
und des Falls, dass die Wurfposition weggelassen wird.

Die Oberfläche bleibt dünn genug, dass sie keine eigenen Tests braucht.

## 14. Nicht im Umfang

Kein Server, keine Cloud, keine Synchronisation, keine Mehrbenutzerfähigkeit,
keine Videoanbindung, keine namentliche Erfassung gegnerischer Spieler, kein
Neun-Felder-Torraster, keine Ligaverwaltung, keine Saisonauswertung über mehrere
Spiele hinweg.

## 15. Werkzeuge

Vite, TypeScript, Vitest. Kein Oberflächen-Framework: die Anzeige ist ein
statisches Layout, dessen Textknoten aktualisiert werden.
