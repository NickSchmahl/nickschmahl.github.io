import { describe, it, expect } from 'vitest';
import { einsatzleiste, phasenbalken, verlaufskurve } from './diagramme';

describe('Verlaufskurve', () => {
  const v = {
    punkte: [{ t: 0, eigen: 0, gegner: 0 }, { t: 60, eigen: 1, gegner: 0 }, { t: 120, eigen: 1, gegner: 1 }],
    marken: [
      { t: 100, art: 'auszeit' as const, text: 'Auszeit bei 1:0' },
      { t: 110, art: 'strafe' as const, text: 'Zeitstrafe Nr. 7' },
      { t: 1800, art: 'halbzeit' as const, text: 'Halbzeit 1:1' },
    ],
    endeT: 3600,
  };
  const svg = verlaufskurve(v);

  it('ist ein SVG mit Titel und Treppenlinie', () => {
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<title>Verlauf der Tordifferenz</title>');
    expect(svg).toContain('class="vk-linie"');
  });

  it('zeichnet jede Marke mit ihrer Klasse und Beschreibung', () => {
    expect(svg).toContain('class="vk-auszeit"');
    expect(svg).toContain('class="vk-strafe"');
    expect(svg).toContain('class="vk-halbzeit"');
    expect(svg).toContain('<title>Auszeit bei 1:0</title>');
  });

  it('beschriftet die Zeitachse alle zehn Minuten', () => {
    // 0, 10, …, 60 auf der X-Achse plus drei Werte an der Y-Achse
    expect(svg.match(/class="vk-achse-text"/g)).toHaveLength(7 + 3);
  });
});

describe('Phasenbalken', () => {
  it('zeichnet je Block zwei Balken und eine Beschriftung', () => {
    const svg = phasenbalken([
      { von: 0, bis: 600, tore: 3, gegentore: 2, wuerfe: 6, fehler: 1 },
      { von: 600, bis: 1200, tore: 0, gegentore: 4, wuerfe: 3, fehler: 3 },
    ]);
    expect(svg.match(/class="pb-tore"/g)).toHaveLength(2);
    expect(svg.match(/class="pb-gegentore"/g)).toHaveLength(2);
    expect(svg).toContain('>0–10<');
    expect(svg).toContain('>10–20<');
  });
});

describe('Einsatzleiste', () => {
  it('zeichnet Feld- und Strafphasen, Tore und die Halbzeit', () => {
    const svg = einsatzleiste(
      { phasen: [{ von: 0, bis: 480, art: 'feld' }, { von: 480, bis: 600, art: 'strafe' }], tore: [60, 300] },
      1800, 900,
    );
    expect(svg.match(/class="el-feld"/g)).toHaveLength(1);
    expect(svg.match(/class="el-strafe"/g)).toHaveLength(1);
    expect(svg.match(/class="el-tor"/g)).toHaveLength(2);
    expect(svg).toContain('class="el-halbzeit"');
  });

  it('kommt ohne Halbzeit aus', () => {
    expect(einsatzleiste({ phasen: [], tore: [] }, 600)).not.toContain('el-halbzeit');
  });
});
