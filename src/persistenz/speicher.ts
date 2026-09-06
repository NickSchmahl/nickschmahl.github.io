import type { Ereignis, Spieler } from '../domain/ereignis';

export interface Spiel {
  id: string;
  gegner: string;
  /** ISO-Datum, JJJJ-MM-TT. */
  datum: string;
  ereignisse: Ereignis[];
}

const DB_NAME = 'handball-tracker';
const DB_VERSION = 1;
const SPEICHER_KADER = 'kader';
const SPEICHER_SPIELE = 'spiele';
const SPEICHER_META = 'meta';

let offen: Promise<IDBDatabase> | undefined;

function alsPromise<T>(anfrage: IDBRequest<T>): Promise<T> {
  return new Promise((erfuellen, ablehnen) => {
    anfrage.onsuccess = () => erfuellen(anfrage.result);
    anfrage.onerror = () => ablehnen(anfrage.error);
  });
}

function datenbank(): Promise<IDBDatabase> {
  if (offen) return offen;
  offen = new Promise((erfuellen, ablehnen) => {
    const anfrage = indexedDB.open(DB_NAME, DB_VERSION);
    anfrage.onupgradeneeded = () => {
      const db = anfrage.result;
      if (!db.objectStoreNames.contains(SPEICHER_KADER)) db.createObjectStore(SPEICHER_KADER);
      if (!db.objectStoreNames.contains(SPEICHER_SPIELE)) db.createObjectStore(SPEICHER_SPIELE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(SPEICHER_META)) db.createObjectStore(SPEICHER_META);
    };
    anfrage.onsuccess = () => erfuellen(anfrage.result);
    anfrage.onerror = () => ablehnen(anfrage.error);
  });
  return offen;
}

async function lesen<T>(speicher: string, schluessel: IDBValidKey): Promise<T | undefined> {
  const db = await datenbank();
  const tx = db.transaction(speicher, 'readonly');
  return alsPromise<T | undefined>(tx.objectStore(speicher).get(schluessel));
}

async function schreiben(speicher: string, wert: unknown, schluessel?: IDBValidKey): Promise<void> {
  const db = await datenbank();
  const tx = db.transaction(speicher, 'readwrite');
  await alsPromise(schluessel === undefined ? tx.objectStore(speicher).put(wert) : tx.objectStore(speicher).put(wert, schluessel));
}

export async function kaderSpeichern(kader: readonly Spieler[]): Promise<void> {
  await schreiben(SPEICHER_KADER, [...kader], 'aktuell');
}

export async function kaderLaden(): Promise<Spieler[]> {
  return (await lesen<Spieler[]>(SPEICHER_KADER, 'aktuell')) ?? [];
}

export async function spielAnlegen(gegner: string, datum: string): Promise<Spiel> {
  const spiel: Spiel = { id: `${datum}-${Date.now()}`, gegner, datum, ereignisse: [] };
  await schreiben(SPEICHER_SPIELE, spiel);
  await schreiben(SPEICHER_META, spiel.id, 'laufend');
  return spiel;
}

export async function spielLaden(spielId: string): Promise<Spiel | undefined> {
  return lesen<Spiel>(SPEICHER_SPIELE, spielId);
}

export async function ereignisAnhaengen(spielId: string, e: Ereignis): Promise<void> {
  const spiel = await spielLaden(spielId);
  if (!spiel) throw new Error(`Spiel ${spielId} ist nicht gespeichert`);
  spiel.ereignisse.push(e);
  await schreiben(SPEICHER_SPIELE, spiel);
}

export async function ereignisseErsetzen(spielId: string, ereignisse: readonly Ereignis[]): Promise<void> {
  const spiel = await spielLaden(spielId);
  if (!spiel) throw new Error(`Spiel ${spielId} ist nicht gespeichert`);
  spiel.ereignisse = [...ereignisse];
  await schreiben(SPEICHER_SPIELE, spiel);
}

export async function laufendesSpiel(): Promise<Spiel | undefined> {
  const id = await lesen<string>(SPEICHER_META, 'laufend');
  if (!id) return undefined;
  return spielLaden(id);
}

export async function spielBeenden(): Promise<void> {
  await schreiben(SPEICHER_META, undefined, 'laufend');
}

/** Nur für Tests: setzt die Datenbank zurück. */
export async function datenbankLoeschen(): Promise<void> {
  if (offen) (await offen).close();
  offen = undefined;
  await new Promise<void>((erfuellen) => {
    const anfrage = indexedDB.deleteDatabase(DB_NAME);
    anfrage.onsuccess = () => erfuellen();
    anfrage.onerror = () => erfuellen();
    anfrage.onblocked = () => erfuellen();
  });
}
