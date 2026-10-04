import { describe, it, expect } from 'vitest';
import { BEISPIEL_EREIGNISSE, BEISPIEL_KADER } from '../domain/beispielspiel';
import type { Ereignis } from '../domain/ereignis';
import { berichtDatei, berichtHtml } from './auswertung';

let n = 1000;
function e(typ: string, t: number, rest: Partial<Ereignis> = {}): Ereignis {
  return { seq: ++n, t, wall: '2026-09-13T15:00:00.000Z', typ, ...rest };
}

const SPIEL = { gegner: 'TSV <Beispiel> & Co', datum: '2026-09-13', ereignisse: BEISPIEL_EREIGNISSE };

describe('Bericht', () => {
  const html = berichtHtml(SPIEL, BEISPIEL_KADER);

  it('listet Notizen mit Zeit und entschärftem Text', () => {
    const h = berichtHtml({ ...SPIEL, ereignisse: [...BEISPIEL_EREIGNISSE, e('#', 1421, { text: 'Abwehr <6:0>' })] }, BEISPIEL_KADER);
    expect(h).toContain('<h2>Notizen</h2>');
    expect(h).toContain('23:41');
    expect(h).toContain('Abwehr &lt;6:0&gt;');
  });

  it('lässt den Abschnitt Notizen ohne Notiz weg', () => {
    expect(html).not.toContain('<h2>Notizen</h2>');
  });

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

  it('zeigt bei der Torhüterin die Gegenstoß-Fangquote, sobald ein Gegenstoß auf sie kam', () => {
    const h = berichtHtml({ ...SPIEL, ereignisse: [
      e('I', 0, { spieler: 1 }), e('UL', 0), e('GTG', 10), e('PG', 20, { spieler: 1 }), e('PG', 30, { spieler: 1 }), e('GT', 40),
    ] }, BEISPIEL_KADER);
    const karte = h.slice(h.indexOf('id="nr-1"'));
    expect(karte).toContain('<dt>Paraden</dt><dd>2</dd>');
    expect(karte).toContain('<dt>Gegenstoß gehalten</dt><dd>2/3 <small>67 %</small></dd>');
    // Im Beispielspiel fiel das Gegentor aus Gegenstoß bei Nr. 1 im Tor
    expect(html).toContain('<dt>Gegenstoß gehalten</dt><dd>0/1 <small>0 %</small></dd>');
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

describe('Bericht — zweite Runde', () => {
  const html = berichtHtml(SPIEL, BEISPIEL_KADER);

  it('formuliert Schlaglichter zu Vorsprung, Rückstand, Führungswechseln und torloser Phase', () => {
    expect(html).toContain('<h2>Schlaglichter</h2>');
    expect(html).toContain('Größter Vorsprung: 1 Tor (1:0, 1. Minute)');
    expect(html).toContain('Größter Rückstand: 1 Tor (2:3, 9. Minute)');
    expect(html).toContain('1 Führungswechsel, 3-mal ausgeglichen');
    expect(html).toContain('Längste Phase ohne eigenes Tor: 7 Minuten (5.–12. Minute)');
    // Serien unter drei Toren sind keine Nachricht
    expect(html).not.toContain('Serie');
  });

  it('nennt Serien ab drei Toren und die Wirkung einer Auszeit', () => {
    const h = berichtHtml({ ...SPIEL, ereignisse: [
      e('I', 0, { spieler: 7 }), e('UL', 0),
      e('GT', 60), e('GT', 120),
      e('AZ', 130),
      e('T', 200, { spieler: 7 }), e('T', 250, { spieler: 7 }), e('T', 300, { spieler: 7 }),
      e('GT', 400),
    ] }, BEISPIEL_KADER);
    expect(h).toContain('Längste eigene Serie: 3 Tore in Folge (4.–5. Minute)');
    expect(h).toContain('Auszeit in der 3. Minute beim 0:2 — danach 3:1 in fünf Minuten');
    expect(h).toContain('1 Führungswechsel, 2-mal ausgeglichen');
  });

  it('sagt ohne Tore, dass es nichts zu berichten gibt', () => {
    const h = berichtHtml({ ...SPIEL, ereignisse: [e('I', 0, { spieler: 7 }), e('UL', 0)] }, BEISPIEL_KADER);
    expect(h).toContain('Kein Tor erfasst.');
  });

  it('stellt die Siebenmeter beider Seiten gegenüber und nennt die Werferinnen', () => {
    const h = berichtHtml({ ...SPIEL, ereignisse: [
      ...BEISPIEL_EREIGNISSE.slice(0, 4),
      e('SH', 50, { spieler: 12 }), e('ST', 60, { spieler: 7 }), e('SF', 120, { spieler: 7 }),
      e('SV', 300, { spieler: 12 }), e('GS', 305),
      e('SV', 400, { spieler: 7 }), e('PS', 405, { spieler: 1 }),
    ] }, BEISPIEL_KADER);
    expect(h).toContain('<h2>Siebenmeter</h2>');
    expect(h).toMatch(/<tr><td>Tore\/Versuche<\/td><td class="zahl">1\/2<\/td><td class="zahl">1\/2<\/td><\/tr>/);
    expect(h).toMatch(/<tr><td>Quote<\/td><td class="zahl">50 %<\/td><td class="zahl">50 %<\/td><\/tr>/);
    expect(h).toContain('Geworfen von: 7 Sieben 1/2');
    expect(h).toContain('Herausgeholt: 12 Zwölf 1×');
    expect(h).toContain('Verursacht: 7 Sieben 1×, 12 Zwölf 1×');
    expect(h).toContain('Gehalten von: 1 Torwart Eins (TW) 1×');
  });

  it('meldet, wenn keine Siebenmeter vorkamen', () => {
    const h = berichtHtml({ ...SPIEL, ereignisse: BEISPIEL_EREIGNISSE.filter((x) => !['ST', 'SF'].includes(x.typ)) }, BEISPIEL_KADER);
    expect(h).toContain('Keine Siebenmeter erfasst.');
  });

  it('zeigt Über- und Unterzahl mit Dauer, Situationen und Toren', () => {
    expect(html).toContain('<h2>Über- und Unterzahl</h2>');
    expect(html).toContain('<tr><td>Unterzahl</td><td class="zahl">02:00</td><td class="zahl">1</td><td class="zahl">0</td><td class="zahl">1</td></tr>');
    expect(html).toContain('<tr><td>Überzahl</td><td class="zahl">00:00</td><td class="zahl">0</td><td class="zahl">0</td><td class="zahl">0</td></tr>');
  });

  it('meldet, wenn keine Zeitstrafen vorkamen', () => {
    const h = berichtHtml({ ...SPIEL, ereignisse: BEISPIEL_EREIGNISSE.filter((x) => x.typ !== 'Z') }, BEISPIEL_KADER);
    expect(h).toContain('Keine Zeitstrafen erfasst.');
  });

  it('zeigt den Leistungsindex in der Karte, unter fünf Minuten Einsatz offen', () => {
    // Nr. 7: 2 Tore − 1 Fehlwurf (SF) in 11 Minuten
    expect(html.slice(html.indexOf('id="nr-7"'), html.indexOf('id="nr-77"'))).toContain('<dt>Leistungsindex</dt><dd>+5,5</dd>');
    expect(html.slice(html.indexOf('id="nr-77"'))).toContain('<dt>Leistungsindex</dt><dd>–</dd>');
  });

  it('vergleicht die Bilanz auf dem Feld je 60 Minuten, erst ab fünf Minuten Einsatz', () => {
    expect(html).toContain('<h2>Bilanz auf dem Feld</h2>');
    const tabelle = html.slice(html.indexOf('<h2>Bilanz auf dem Feld</h2>'), html.indexOf('<h2>Spielerinnen</h2>'));
    // Nr. 7: 11 Minuten, 2 Tore für, 3 gegen → −1, auf 60 Minuten −5,5
    expect(tabelle).toContain('<tr><td>7 Sieben</td><td class="zahl">11:00</td><td class="zahl">2</td><td class="zahl">3</td><td class="zahl">-1</td><td class="zahl">-5,5</td><td class="zahl">+5,5</td></tr>');
    // Nr. 77: nur vier Minuten — normiert wäre Unsinn
    expect(tabelle).toContain('<tr><td>77 Siebenundsiebzig</td><td class="zahl">04:00</td><td class="zahl">1</td><td class="zahl">0</td><td class="zahl">+1</td><td class="zahl">–</td><td class="zahl">–</td></tr>');
    expect(tabelle).not.toContain('99');
  });
});

describe('Bericht — Gegner', () => {
  const GEGNERSPIEL = [
    e('I', 0, { spieler: 1 }), e('UL', 0),
    e('GT', 60), e('GF', 70), e('P', 80, { spieler: 1 }),
    e('GS', 90), e('PS', 100, { spieler: 1 }),
    e('GTG', 110), e('GFG', 120), e('PG', 130, { spieler: 1 }),
    e('HZ', 1800),
    e('GT', 1900),
  ];

  it('stellt Würfe und Quote des Gegners je Halbzeit und nach Wurfart dar', () => {
    const h = berichtHtml({ ...SPIEL, ereignisse: GEGNERSPIEL }, BEISPIEL_KADER);
    expect(h).toContain('<h2>Gegner</h2>');
    expect(h.indexOf('<h2>Gegner</h2>')).toBeGreaterThan(h.indexOf('<h2>Kennzahlen</h2>'));
    expect(h.indexOf('<h2>Gegner</h2>')).toBeLessThan(h.indexOf('<h2>Siebenmeter</h2>'));
    const zeile = (name: string, ...werte: string[]): string =>
      `<tr><td>${name}</td>${werte.map((w) => `<td class="zahl">${w}</td>`).join('')}</tr>`;
    expect(h).toContain(zeile('Tore', '3', '1', '4'));
    expect(h).toContain(zeile('Würfe', '8', '1', '9'));
    expect(h).toContain(zeile('Wurfquote', '38 %', '100 %', '44 %'));
    expect(h).toContain(zeile('Feld (Tore/Würfe)', '1/3 (33 %)', '1/1 (100 %)', '2/4 (50 %)'));
    expect(h).toContain(zeile('Siebenmeter (Tore/Würfe)', '1/2 (50 %)', '0/0 (–)', '1/2 (50 %)'));
    expect(h).toContain(zeile('Gegenstoß (Tore/Würfe)', '1/3 (33 %)', '0/0 (–)', '1/3 (33 %)'));
    expect(h).toContain('nur, wenn GF eingegeben wurde');
  });

  it('meldet, wenn keine Würfe des Gegners erfasst wurden', () => {
    const h = berichtHtml({ ...SPIEL, ereignisse: [e('I', 0, { spieler: 7 }), e('T', 60, { spieler: 7 })] }, BEISPIEL_KADER);
    expect(h).toContain('<h2>Gegner</h2>');
    expect(h).toContain('Keine Würfe des Gegners erfasst.');
  });
});

describe('Berichtsdatei', () => {
  it('bringt eine Druckansicht für A4 mit', () => {
    const datei = berichtDatei(SPIEL, BEISPIEL_KADER);
    expect(datei).toContain('@media print');
    expect(datei).toContain('@page { size: A4;');
  });


  it('ist ein vollständiges HTML-Dokument mit eingebettetem Stil', () => {
    const datei = berichtDatei(SPIEL, BEISPIEL_KADER, new Date('2026-09-13T18:00:00Z'));
    expect(datei.startsWith('<!doctype html>')).toBe(true);
    expect(datei).toContain('<meta charset="utf-8">');
    expect(datei).toContain('<title>Spiel gegen TSV &lt;Beispiel&gt; &amp; Co · 13.09.2026</title>');
    expect(datei).toContain('<style>');
    expect(datei).toContain('Erstellt mit Handball-Tracker am 13.09.2026');
  });

  it('bettet Design-Tokens, Schriften und Logo ein', () => {
    const datei = berichtDatei(SPIEL, BEISPIEL_KADER);
    expect(datei).toContain('--akzent: #e0552b');
    expect(datei).toContain('prefers-color-scheme: dark');
    expect(datei).toContain('font-family: "Saira Condensed";');
    expect(datei).toContain('data:font/woff2;base64,');
    expect(datei).toContain('aria-label="Handball-Tracker"');
    expect(datei).not.toContain('--b-');
  });
});
