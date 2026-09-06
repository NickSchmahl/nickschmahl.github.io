import type { Ereignis } from '../domain/ereignis';
import type { Analyse } from './grammatik';

/** Aus einer fertigen Analyse ein Ereignis. Alles andere ergibt nichts. */
export function baueEreignis(a: Analyse, seq: number, t: number, wall: string): Ereignis | undefined {
  if (a.art !== 'bereit') return undefined;
  const e: Ereignis = { seq, t, wall, typ: a.eintrag.code };
  if (a.spieler !== undefined) e.spieler = a.spieler;
  if (a.pos !== undefined) e.pos = a.pos;
  if (a.ein !== undefined) e.ein = a.ein;
  if (a.zeit !== undefined) e.zeit = a.zeit;
  return e;
}
