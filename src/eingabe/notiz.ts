import type { Ereignis } from '../domain/ereignis';
import { alsUhrzeit } from './grammatik';

/**
 * Der Code der Notiz. Die Grammatik nimmt nur Buchstaben als Code an, deshalb
 * kann `#` nie versehentlich als Aktion getippt werden.
 */
export const NOTIZ_CODE = '#';

export interface Notizentwurf {
  /** Spielzeit beim Öffnen — nicht beim Speichern, sonst verrutscht sie ums Tippen. */
  t: number;
  text: string;
}

export type Notizschritt =
  | { art: 'weiter'; entwurf: Notizentwurf }
  | { art: 'speichern'; t: number; text: string }
  | { art: 'abbrechen' };

/** Verarbeitet einen Tastendruck im Notizfeld. Jedes einzelne Zeichen ist Text. */
export function notizTaste(entwurf: Notizentwurf, taste: string): Notizschritt {
  switch (taste) {
    case 'Enter': {
      const text = entwurf.text.trim();
      return text === '' ? { art: 'abbrechen' } : { art: 'speichern', t: entwurf.t, text };
    }
    case 'Escape':
      return { art: 'abbrechen' };
    case 'Backspace':
      return { art: 'weiter', entwurf: { ...entwurf, text: entwurf.text.slice(0, -1) } };
    default:
      if (taste.length !== 1) return { art: 'weiter', entwurf };
      return { art: 'weiter', entwurf: { ...entwurf, text: entwurf.text + taste } };
  }
}

export function notizZeile(entwurf: Notizentwurf): string {
  return `📝 ${alsUhrzeit(entwurf.t)} ${entwurf.text}▏`;
}

export function baueNotiz(t: number, text: string, seq: number, wall: string): Ereignis {
  return { seq, t, wall, typ: NOTIZ_CODE, text };
}

export function notizen(ereignisse: readonly Ereignis[]): { t: number; text: string }[] {
  return ereignisse
    .filter((e) => e.typ === NOTIZ_CODE)
    .map((e) => ({ t: e.t, text: e.text ?? '' }));
}
