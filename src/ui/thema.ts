export type Thema = 'system' | 'hell' | 'dunkel';

type Ablage = Pick<Storage, 'getItem' | 'setItem'>;

const SCHLUESSEL = 'handball-tracker:thema';
const REIHE: readonly Thema[] = ['system', 'hell', 'dunkel'];
const NAME: Record<Thema, string> = { system: 'wie das System', hell: 'hell', dunkel: 'dunkel' };

/** Der zuletzt angewandte Modus; nur `themaEinrichten` ändert ihn. */
let aktuell: Thema = 'system';

export function naechstesThema(t: Thema): Thema {
  return REIHE[(REIHE.indexOf(t) + 1) % REIHE.length]!;
}

/** Das Attribut am Wurzelelement; `null` heißt: dem System folgen. */
export function themaAttribut(t: Thema): 'light' | 'dark' | null {
  if (t === 'hell') return 'light';
  if (t === 'dunkel') return 'dark';
  return null;
}

/** Ein gesperrter oder fehlender Speicher (privates Fenster) darf den Start nie verhindern. */
export function themaLaden(ablage: Ablage | undefined): Thema {
  try {
    const wert = ablage?.getItem(SCHLUESSEL);
    return REIHE.find((t) => t === wert) ?? 'system';
  } catch {
    return 'system';
  }
}

export function themaSpeichern(ablage: Ablage | undefined, t: Thema): void {
  try {
    ablage?.setItem(SCHLUESSEL, t);
  } catch {
    // Dann gilt die Wahl eben nur bis zum Neuladen.
  }
}

const beschriftung = (t: Thema): string => `Farbmodus: ${NAME[t]}`;

export function themaKnopfHtml(): string {
  const text = beschriftung(aktuell);
  return `<button type="button" class="knopf symbol" data-thema-knopf title="${text}" aria-label="${text}">◐</button>`;
}

function lokaleAblage(): Ablage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function anwenden(t: Thema): void {
  aktuell = t;
  const attribut = themaAttribut(t);
  if (attribut) document.documentElement.setAttribute('data-theme', attribut);
  else document.documentElement.removeAttribute('data-theme');
  for (const knopf of document.querySelectorAll<HTMLElement>('[data-thema-knopf]')) {
    knopf.title = beschriftung(t);
    knopf.setAttribute('aria-label', beschriftung(t));
  }
}

/**
 * Einmal beim Start: gespeicherte Wahl anwenden und jeden Umschaltknopf
 * bedienen, egal auf welchem Bildschirm er gerade steht.
 */
export function themaEinrichten(): void {
  anwenden(themaLaden(lokaleAblage()));
  document.addEventListener('click', (ereignis) => {
    const knopf = (ereignis.target as Element | null)?.closest<HTMLElement>('[data-thema-knopf]');
    if (!knopf) return;
    const neu = naechstesThema(aktuell);
    themaSpeichern(lokaleAblage(), neu);
    anwenden(neu);
    // Der Fokus muss weg: sonst löst die Leertaste der Erfassung den Knopf ein zweites Mal aus.
    knopf.blur();
  });
}
