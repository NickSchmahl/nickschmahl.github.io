import { describe, it, expect } from 'vitest';
import { BEISPIEL_EREIGNISSE, BEISPIEL_KADER } from '../domain/beispielspiel';
import { berichtDatei, berichtHtml } from './auswertung';

const SPIEL = { gegner: 'TSV <Beispiel> & Co', datum: '2026-09-13', ereignisse: BEISPIEL_EREIGNISSE };

describe('Bericht', () => {
  const html = berichtHtml(SPIEL, BEISPIEL_KADER);

  it('nennt Gegner, Datum, Endstand und Halbzeitstand — mit entschärftem Gegnernamen', () => {
    expect(html).toContain('Spiel gegen TSV &lt;Beispiel&gt; &amp; Co');
    expect(html).not.toContain('<Beispiel>');
    expect(html).toContain('13.09.2026');
    expect(html).toContain('class="endstand">3:3<');
    expect(html).toContain('Halbzeit 3:3');
  });

  it('enthält alle vier Abschnitte der Mannschaft', () => {
    for (const titel of ['Verlauf', 'Kennzahlen', 'Phasen', 'Aufstellungen']) {
      expect(html).toContain(`<h2>${titel}</h2>`);
    }
    expect(html).toContain('class="diagramm verlaufskurve"');
    expect(html).toContain('class="diagramm phasenbalken"');
  });

  it('hat je Spielerin eine Karte mit Einsatzleiste und Ereignisliste', () => {
    for (const s of BEISPIEL_KADER) expect(html).toContain(`id="nr-${s.nummer}"`);
    expect(html.match(/class="diagramm einsatzleiste"/g)).toHaveLength(BEISPIEL_KADER.length);
    expect(html).toContain('<summary>5 Ereignisse</summary>'); // Nr. 7: I, T, ST, SF, W
    expect(html).toContain('Rückraum links'); // Position am Tor der Nr. 7
  });

  it('zeigt bei der Torhüterin Paraden und Fangquote statt Würfen', () => {
    const karte = html.slice(html.indexOf('id="nr-1"'), html.indexOf('id="nr-7"'));
    expect(karte).toContain('<dt>Paraden</dt><dd>1</dd>');
    expect(karte).toContain('<dt>Fangquote</dt><dd>25 %</dd>'); // 1 Parade, 3 Gegentore
    expect(karte).not.toContain('<dt>Tore</dt>');
  });

  it('zeigt bei einer Torhüterin mit eigenem Wurf zusätzlich die Tore', () => {
    const mitTwTor = berichtHtml(
      { ...SPIEL, ereignisse: [...BEISPIEL_EREIGNISSE, { seq: 99, t: 950, wall: '', typ: 'T', spieler: 1 }] },
      BEISPIEL_KADER,
    );
    const karte = mitTwTor.slice(mitTwTor.indexOf('id="nr-1"'), mitTwTor.indexOf('id="nr-7"'));
    expect(karte).toContain('<dt>Paraden</dt>');
    expect(karte).toContain('<dt>Tore</dt><dd>1/1');
  });

  it('zeigt die Aufstellung mit der längsten Einsatzzeit zuerst', () => {
    const abschnitt = html.slice(html.indexOf('<h2>Aufstellungen</h2>'), html.indexOf('<h2>Spielerinnen</h2>'));
    expect(abschnitt.indexOf('08:00')).toBeLessThan(abschnitt.indexOf('04:00'));
  });

  it('listet die Zähler ungleich null je Spielerin', () => {
    const karte = html.slice(html.indexOf('id="nr-12"'), html.indexOf('id="nr-77"'));
    expect(karte).toContain('1× Technischer Fehler');
    expect(karte).toContain('1× Zeitstrafe');
    expect(karte).not.toContain('Assist');
  });

  it('meldet, wenn es keine Prüfhinweise gibt', () => {
    expect(html).toContain('Keine Auffälligkeiten');
  });

  it('zählt Prüfhinweise und nennt sie mit Spielzeit', () => {
    const mitFehler = berichtHtml(
      { ...SPIEL, ereignisse: [{ seq: 1, t: 65, wall: '', typ: 'T', spieler: 9 }] },
      BEISPIEL_KADER,
    );
    expect(mitFehler).toContain('2 Punkte zum Prüfen'); // Uhr steht, Nr. 9 nicht auf dem Feld
    expect(mitFehler).toContain('01:05 — Nr. 9 steht nicht auf dem Feld');
  });

  it('legt auch für Nummern ohne Kadereintrag eine Karte an', () => {
    const ohneKader = berichtHtml(SPIEL, []);
    for (const nummer of [1, 7, 12, 77]) expect(ohneKader).toContain(`id="nr-${nummer}"`);
    expect(ohneKader).toContain('<span class="nr">7</span> Nr. 7');
  });

  it('lässt offene Einsatzphasen beim letzten Ereignis enden, nicht am Achsenende', () => {
    // Beispielspiel: letztes Ereignis bei 900, Achse bis 1800. Nr. 1 steht durchgehend auf dem Feld.
    const karte = html.slice(html.indexOf('id="nr-1"'), html.indexOf('id="nr-7"'));
    expect(karte).toContain('class="el-feld" x="0" y="9" width="360"'); // 900/1800 × 720
    expect(karte).toContain('<dt>Einsatz</dt><dd>15:00 <small>100 %</small></dd>');
  });

  it('kennzeichnet Spielerinnen ohne Einsatz', () => {
    const html2 = berichtHtml(SPIEL, [...BEISPIEL_KADER, { nummer: 99, name: 'Bank', torwart: false }]);
    const karte = html2.slice(html2.indexOf('id="nr-99"'));
    expect(karte).toContain('Nicht eingesetzt.');
  });
});

describe('Berichtsdatei', () => {
  it('ist ein vollständiges HTML-Dokument mit eingebettetem Stil', () => {
    const datei = berichtDatei(SPIEL, BEISPIEL_KADER, new Date('2026-09-13T18:00:00Z'));
    expect(datei.startsWith('<!doctype html>')).toBe(true);
    expect(datei).toContain('<meta charset="utf-8">');
    expect(datei).toContain('<title>Spiel gegen TSV &lt;Beispiel&gt; &amp; Co · 13.09.2026</title>');
    expect(datei).toContain('<style>');
    expect(datei).toContain('--b-grund: #ffffff');
    expect(datei).toContain('Erstellt mit Handball-Tracker am 13.09.2026');
  });
});
