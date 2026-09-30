import { describe, it, expect } from 'vitest';
import { kopfleiste } from './kopf';

describe('Kopfleiste', () => {
  it('enthält Logo, Titel, eigene Knöpfe und den Farbmodus', () => {
    const html = kopfleiste('Kader', '<button id="x"></button>');
    expect(html).toContain('aria-label="Handball-Tracker"');
    expect(html).toContain('<h1>Kader</h1>');
    expect(html).toContain('<button id="x"></button>');
    expect(html).toContain('data-thema-knopf');
  });
});
