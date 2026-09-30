import { describe, it, expect } from 'vitest';
import { naechstesThema, themaAttribut, themaKnopfHtml, themaLaden, themaSpeichern } from './thema';

const ablage = (werte: Record<string, string> = {}) => ({
  getItem: (k: string) => werte[k] ?? null,
  setItem: (k: string, v: string) => { werte[k] = v; },
});

describe('Farbmodus', () => {
  it('wechselt reihum System → hell → dunkel → System', () => {
    expect(naechstesThema('system')).toBe('hell');
    expect(naechstesThema('hell')).toBe('dunkel');
    expect(naechstesThema('dunkel')).toBe('system');
  });

  it('setzt das Attribut nur bei einer ausdrücklichen Wahl', () => {
    expect(themaAttribut('system')).toBeNull();
    expect(themaAttribut('hell')).toBe('light');
    expect(themaAttribut('dunkel')).toBe('dark');
  });

  it('merkt sich die Wahl', () => {
    const a = ablage();
    themaSpeichern(a, 'dunkel');
    expect(themaLaden(a)).toBe('dunkel');
  });

  it('fällt bei unbekanntem Wert oder ohne Speicher auf System zurück', () => {
    expect(themaLaden(ablage({ 'handball-tracker:thema': 'lila' }))).toBe('system');
    expect(themaLaden(undefined)).toBe('system');
  });

  it('übersteht einen gesperrten Speicher', () => {
    const gesperrt = {
      getItem: () => { throw new Error('gesperrt'); },
      setItem: () => { throw new Error('gesperrt'); },
    };
    expect(themaLaden(gesperrt)).toBe('system');
    expect(() => themaSpeichern(gesperrt, 'hell')).not.toThrow();
  });

  it('beschriftet den Umschaltknopf mit dem aktuellen Modus', () => {
    const knopf = themaKnopfHtml();
    expect(knopf).toContain('data-thema-knopf');
    expect(knopf).toContain('Farbmodus: wie das System');
  });
});
