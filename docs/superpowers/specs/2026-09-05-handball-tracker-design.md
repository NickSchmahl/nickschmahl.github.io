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
| Detailtiefe je Wurf | Wurfposition als *optionale* dritte Taste | Der Wurf zählt auch ohne Position; die Entscheidung fällt je Situation |
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
    anzeige.ts       DOM-Aktualisierung
    korrektur.ts     Korrekturmodus
  persistenz/
    speicher.ts      IndexedDB
    export.ts        JSONL / CSV / Markdown
kader.json           Mannschaftskader
```

`domain/` kennt weder DOM noch Speicher und ist vollständig ohne Oberfläche
testbar. Das ist die einzige Schichtgrenze, die strikt eingehalten wird.

## 5. Datenmodell

Eine Ereigniszeile:

```json
{"seq":143,"t":1834,"wall":"2026-09-05T19:42:11.884Z","typ":"TOR","spieler":7,"pos":"RL"}
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
genau eine davon ab — dadurch erweitert eine neue Kategorie die Konfiguration,
nicht den Code:

| Wirkung | Bedeutung |
|---|---|
| `wurf` | zählt als Wurfversuch |
| `treffer` | zählt als Wurfversuch **und** Tor, erhöht den eigenen Spielstand |
| `siebenmeter` | wie `wurf`/`treffer`, aber in eigener Zählung geführt |
| `gegentor` | erhöht den Spielstand des Gegners |
| `strafe` | startet eine Zeitstrafe von 120 Sekunden Spielzeit |
| `karte` | Verwarnung oder Disqualifikation |
| `wechsel` | verändert die Feldbesetzung |
| `zaehler` | reine Zählung ohne Nebenwirkung |
| `uhr` | Start, Stopp, Korrektur, Abschnittswechsel |
| `notiz` | wird nur im Verlauf angezeigt |

## 6. Ereigniskatalog

Startkatalog. Er ist vollständig genug für ein Spiel; Erweiterungen der Liste
sind Einträge in `katalog.ts`, keine Änderung am Reduzierer.

**Mit Spielernummer**

| Taste | Kategorie | Wirkung | Position anhängbar |
|---|---|---|---|
| `T` | Tor | `treffer` | ja |
| `F` | Fehlwurf | `wurf` | ja |
| `S` | Siebenmeter-Tor | `siebenmeter` | – |
| `D` | Siebenmeter verworfen | `siebenmeter` | – |
| `H` | Siebenmeter herausgeholt | `zaehler` | – |
| `V` | Siebenmeter verursacht | `zaehler` | – |
| `X` | Technischer Fehler | `zaehler` | – |
| `L` | Ballverlust (Fehlpass) | `zaehler` | – |
| `A` | Assist | `zaehler` | – |
| `G` | Ballgewinn | `zaehler` | – |
| `B` | Block | `zaehler` | – |
| `P` | Parade (Torwart) | `zaehler` | – |
| `Z` | Zeitstrafe erhalten | `strafe` | – |
| `Y` | Zeitstrafe herausgeholt | `zaehler` | – |
| `K` | Verwarnung | `karte` | – |
| `R` | Disqualifikation | `karte` | – |
| `W` | Wechsel (Nummer, dann Einwechselnummer, dann Eingabetaste) | `wechsel` | – |

**Ohne Spielernummer (leerer Puffer)**

| Taste | Kategorie |
|---|---|
| Leertaste | Gegentor |
| `+` | Gegentor durch Siebenmeter |
| Umschalt+`Z` | Zeitstrafe des Gegners |
| Eingabetaste | Uhr starten / anhalten |
| `C` | Uhrkorrektur (danach `mm:ss`, Eingabetaste) |
| `N` | Nächster Abschnitt (Halbzeit, Spielende) |
| `O` | Auszeit |
| Rücktaste | Letztes Ereignis löschen |
| Esc | Korrekturmodus |

**Wurfpositionen (optional, direkt nach `T` oder `F`)**

`Q` `W` `E` `R` `T` bilden die Angriffsreihe von links nach rechts ab:
Linksaußen, Rückraum links, Rückraum Mitte, Rückraum rechts, Rechtsaußen.
Darunter `D` für Kreis und `G` für Gegenstoß.

## 7. Eingabegrammatik

Die Grammatik hat genau drei Zustände. Welche Bedeutung eine Taste hat, hängt
allein davon ab, in welchem Zustand der Puffer gerade ist:

1. **Puffer leer** — Ziffern beginnen eine Trikotnummer, Buchstaben sind globale
   Befehle.
2. **Nummer steht an** — jeder Buchstabe schließt die Nummer ab und löst die
   zugehörige Kategorie aus.
3. **Position wird erwartet** (nur nach `T` oder `F`) — ein Buchstabe aus der
   Positionsmenge ergänzt den eben erzeugten Wurf; jede andere Taste beginnt das
   nächste Ereignis, und der Wurf bleibt ohne Position gültig.

Dass Positions- und Aktionstasten sich überschneiden dürfen, ist unproblematisch:
sie sind nie im selben Zustand gültig. Beispiele:

```
7 T          Nr. 7 erzielt ein Tor
7 T W        dasselbe Tor aus Rückraum links
12 F         Nr. 12 vergibt
7 W 12 ⏎     Nr. 7 geht vom Feld, Nr. 12 kommt
Leertaste    Gegentor
```

Der Wechsel ist der einzige Fall, der die Eingabetaste braucht, weil auf `W`
eine Zifferngruppe folgt, die sonst nicht abzugrenzen wäre.

## 8. Uhr

Die Uhr läuft in der Anwendung und wird mit der Eingabetaste gestartet und
angehalten. Alle Zeitstempel `t` beziehen sich auf sie.

Eine Uhrkorrektur (`C`, dann die auf der Hallenuhr abgelesene Zeit) erzeugt ein
Ereignis, das den Versatz **ab diesem Punkt** neu setzt. Bereits erfasste
Ereignisse behalten ihre Spielzeit. Das ist bewusst gewählt: die Hallenuhr ist
maßgeblich, die aufgelaufene Abweichung wird nicht rückwirkend über vergangene
Ereignisse verteilt, weil unbekannt ist, wann sie entstand. Springt die Uhr dabei
vorwärts, wächst die Einsatzzeit der gerade auf dem Feld stehenden Spieler
entsprechend — das entspricht der Realität.

Zeitstrafen laufen über 120 Sekunden *Spielzeit*, also nicht während
Unterbrechungen. Läuft eine Strafe ab, wandert der Spieler auf die Bank, nicht
automatisch aufs Feld; wer nachrückt, entscheidet ein Wechsel-Ereignis.

## 9. Oberfläche

Ein Fenster, kein Scrollen, reine Anzeige. Von oben nach unten:

- **Kopf** — Spielzeit groß, Spielstand, laufender Abschnitt
- **Feld** — sieben Positionen mit Nummer, Name und Kurzzahlen; rot hinterlegt
  bei laufender Zeitstrafe, mit Restzeit
- **Bank** — übrige Spieler des Kaders
- **Eingabezeile** — zeigt den Tastenpuffer im Klartext mit, etwa
  `7 → Tor → Position?`
- **Verlauf** — die letzten fünf Ereignisse

Die Eingabezeile ist der Teil, der Blindbedienung überhaupt trägt: ein
Seitenblick von einer halben Sekunde genügt zur Kontrolle. Die Maus wird nur im
Korrekturmodus verwendet.

Der Kader wird aus `kader.json` geladen. Vor dem Anwurf wird die
Startaufstellung gewählt; das erzeugt die ersten Wechsel-Ereignisse.

## 10. Fehlertoleranz

Prüfungen warnen, sie blockieren nie. Ein Tor eines Spielers, der laut Zustand
auf der Bank sitzt, wird gespeichert **und markiert**. Live darf nichts hängen
bleiben, nur weil ein Wechsel übersehen wurde.

Geprüft wird auf: Aktion eines nicht auf dem Feld stehenden Spielers, mehr als
sieben Spieler auf dem Feld, Wechsel eines gesperrten Spielers, Aktion bei
angehaltener Uhr. Die Markierungen sammelt die Anwendung und zeigt sie zur
Halbzeit und am Spielende als Prüfliste.

Der Korrekturmodus (Esc) zeigt die Ereignisliste; mit den Pfeiltasten wird
ausgewählt, geändert oder gelöscht. Die Rücktaste löscht im Normalbetrieb das
zuletzt erfasste Ereignis.

## 11. Persistenz und Export

Nach jedem Ereignis wird in IndexedDB geschrieben. Ein geschlossener Tab oder ein
leerer Akku kosten damit höchstens die letzte Aktion. Beim Start bietet die
Anwendung an, ein unterbrochenes Spiel fortzusetzen.

Exportiert wird in drei Formen:

- `spiel-JJJJ-MM-TT-<gegner>.jsonl` — die rohen Ereignisse, verlustfrei
- `spiel-JJJJ-MM-TT-<gegner>.csv` — Spielerstatistik: Nummer, Name, Einsatzzeit,
  Tore, Würfe, Wurfquote, Siebenmeter-Tore und -Versuche, Assists, technische
  Fehler, Ballverluste, Ballgewinne, Blocks, Paraden, Zeitstrafen, Karten,
  Plus/Minus
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
heraus, einschließlich der Zustandsübergänge und des Falls, dass die Position
weggelassen wird.

Die Oberfläche bleibt dünn genug, dass sie keine eigenen Tests braucht.

## 14. Nicht im Umfang

Kein Server, keine Cloud, keine Synchronisation, keine Mehrbenutzerfähigkeit,
keine Videoanbindung, keine namentliche Erfassung gegnerischer Spieler, kein
Neun-Felder-Torraster, keine Ligaverwaltung, keine Saisonauswertung über mehrere
Spiele hinweg.

## 15. Werkzeuge

Vite, TypeScript, Vitest. Kein Oberflächen-Framework: die Anzeige ist ein
statisches Layout, dessen Textknoten aktualisiert werden.
