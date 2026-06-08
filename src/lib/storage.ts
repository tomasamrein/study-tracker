import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import type { AppState } from "./types";

const LOCAL_KEY = "study-tracker:state";
// En modo nube, cada usuario guarda su estado en users/{uid}.
const USERS_COLLECTION = "users";

export const storageBackend: "firebase" | "local" = isFirebaseConfigured
  ? "firebase"
  : "local";

export async function loadState(uid: string): Promise<AppState | null> {
  if (isFirebaseConfigured && uid !== "local") {
    const db = getDb();
    if (db) {
      try {
        const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
        if (snap.exists()) return snap.data() as AppState;
        return null;
      } catch (err) {
        console.error("[storage] Error leyendo de Firestore:", err);
        // Fallback a local si Firestore falla.
      }
    }
  }
  return loadLocal();
}

export async function saveState(uid: string, state: AppState): Promise<void> {
  // Siempre guardamos una copia local como respaldo/offline.
  saveLocal(state);
  if (isFirebaseConfigured && uid !== "local") {
    const db = getDb();
    if (db) {
      try {
        await setDoc(doc(db, USERS_COLLECTION, uid), state);
      } catch (err) {
        console.error("[storage] Error escribiendo en Firestore:", err);
      }
    }
  }
}

function loadLocal(): AppState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as AppState) : null;
  } catch {
    return null;
  }
}

function saveLocal(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("[storage] Error escribiendo en localStorage:", err);
  }
}
