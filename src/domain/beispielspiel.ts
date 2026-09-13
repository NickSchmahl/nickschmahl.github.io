import type { Ereignis, Spieler } from './ereignis';

export const BEISPIEL_KADER: Spieler[] = [
  { nummer: 1, name: 'Torwart Eins', torwart: true },
  { nummer: 7, name: 'Sieben', torwart: false },
  { nummer: 12, name: 'Zwölf', torwart: false },
  { nummer: 77, name: 'Siebenundsiebzig', torwart: false },
];

let n = 0;
function e(typ: string, t: number, rest: Partial<Ereignis> = {}): Ereignis {
  return { seq: ++n, t, wall: new Date(1_760_000_000_000 + t * 1000).toISOString(), typ, ...rest };
}

/**
 * Ein kurzes, vollständig durchgerechnetes Spiel: Aufstellung, Tore, Fehlwürfe,
 * Siebenmeter, technischer Fehler, Zeitstrafe mit Ablauf, Wechsel, Gegentore,
 * Fehlwürfe des Gegners, je ein Gegenstoß beider Seiten, Halbzeit und Uhrkorrektur.
 */
export const BEISPIEL_EREIGNISSE: Ereignis[] = [
  e('I', 0, { spieler: 1 }),
  e('I', 0, { spieler: 7 }),
  e('I', 0, { spieler: 12 }),
  e('UL', 0),

  e('T', 60, { spieler: 7, pos: 2 }),
  e('GT', 120),
  e('F', 180, { spieler: 12 }),
  e('P', 200, { spieler: 1 }),
  e('GF', 220),
  e('TF', 240, { spieler: 12 }),
  e('ST', 300, { spieler: 7 }),
  e('SF', 360, { spieler: 7 }),
  e('GT', 420),
  e('GF', 450),

  e('Z', 480, { spieler: 12 }),          // 12 geht runter, Strafe bis 600
  e('GTG', 540),                          // Gegenstoß, fällt in Unterzahl
  e('W', 660, { spieler: 7, ein: 77 }),   // Strafe ist abgelaufen, 7 raus, 77 rein
  e('TG', 720, { spieler: 77 }),

  e('HZ', 900),
  e('U', 900, { zeit: 900 }),
];
