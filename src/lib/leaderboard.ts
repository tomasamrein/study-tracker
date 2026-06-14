import {
  collection,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";

// Tabla de posiciones compartida entre los usuarios del sistema.
// Cada usuario publica un resumen público de sus métricas en leaderboard/{uid}.
// A diferencia de users/{uid} (privado), esta colección es legible por
// cualquier usuario autenticado para poder armar el ranking (ver firestore.rules).
const COLLECTION = "leaderboard";

export interface LeaderboardEntry {
  uid: string;
  name: string;
  photoURL: string | null;
  career: string;
  /** Minutos estudiados en la semana en curso (lunes a domingo). */
  weekMinutes: number;
  /** Minutos acumulados históricos. */
  totalMinutes: number;
  /** Minutos estudiados hoy. */
  todayMinutes: number;
  /** Racha actual de días consecutivos estudiando. */
  currentStreak: number;
  /** Racha histórica más larga. */
  longestStreak: number;
  studiedToday: boolean;
  /** ISO date-time de la última actualización. */
  updatedAt: string;
}

/** Publica/actualiza el resumen público del usuario. No-op en modo local. */
export async function publishLeaderboardEntry(
  uid: string,
  entry: LeaderboardEntry,
): Promise<void> {
  if (!isFirebaseConfigured || uid === "local") return;
  const db = getDb();
  if (!db) return;
  try {
    await setDoc(doc(db, COLLECTION, uid), entry);
  } catch (err) {
    console.error("[leaderboard] Error publicando entrada:", err);
  }
}

/**
 * Se suscribe a la tabla de posiciones en tiempo real.
 * Devuelve una función para cancelar la suscripción.
 */
export function subscribeLeaderboard(
  cb: (entries: LeaderboardEntry[]) => void,
): () => void {
  if (!isFirebaseConfigured) {
    cb([]);
    return () => {};
  }
  const db = getDb();
  if (!db) {
    cb([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, COLLECTION),
    (snap) => cb(snap.docs.map((d) => d.data() as LeaderboardEntry)),
    (err) => {
      console.error("[leaderboard] Error en la suscripción:", err);
      cb([]);
    },
  );
}
