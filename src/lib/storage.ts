import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import type { AppState, StudySession } from "./types";

const LOCAL_KEY = "study-tracker:state";
const USERS_COLLECTION = "users";

export const storageBackend: "firebase" | "local" = isFirebaseConfigured
  ? "firebase"
  : "local";

export async function loadState(uid: string): Promise<AppState | null> {
  let firebaseData: AppState | null = null;

  if (isFirebaseConfigured && uid !== "local") {
    const db = getDb();
    if (db) {
      try {
        const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
        if (snap.exists()) {
          const data = snap.data() as AppState & {
            sessionIds?: string[];
          };

          const legacySessions: StudySession[] = data.sessions ?? [];
          let sessions: StudySession[] = [];

          if (data.sessionIds && data.sessionIds.length > 0) {
            try {
              const col = collection(
                db,
                USERS_COLLECTION,
                uid,
                "sessions",
              );
              const snap2 = await getDocs(col);
              const allSub = snap2.docs.map(
                (d) => d.data() as StudySession,
              );
              const map = new Map(allSub.map((s) => [s.id, s]));
              const legacyMap = new Map(
                legacySessions.map((s) => [s.id, s]),
              );
              sessions = data.sessionIds
                .map((id: string) => map.get(id) ?? legacyMap.get(id))
                .filter((s): s is StudySession => !!s);
            } catch {
              sessions = legacySessions;
            }
          } else {
            sessions = legacySessions;
          }

          const { sessions: _, sessionIds: __, ...rest } = data;
          firebaseData = { ...rest, sessions } as AppState;
        }
      } catch (err) {
        console.error("[storage] Error leyendo de Firestore:", err);
      }
    }
  }

  if (firebaseData) {
    const localData = loadLocal();
    if (localData) {
      const localSessions = new Map(
        localData.sessions.map((s) => [s.id, s]),
      );
      const fbIds = new Set(firebaseData.sessions.map((s) => s.id));
      const missing = localData.sessions.filter((s) => !fbIds.has(s.id));
      if (missing.length > 0) {
        console.log(
          `[storage] Merge: ${missing.length} sesión(es) recuperadas de localStorage`,
        );
        return {
          ...firebaseData,
          sessions: [...firebaseData.sessions, ...missing],
        };
      }
    }
    return firebaseData;
  }

  return loadLocal();
}

async function syncToFirebase(
  uid: string,
  state: AppState,
): Promise<boolean> {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const db = getDb();
      if (!db) return false;

      const { sessions, ...mainData } = state;
      const sessionIds = sessions.map((s) => s.id);
      const userRef = doc(db, USERS_COLLECTION, uid);
      const col = collection(db, USERS_COLLECTION, uid, "sessions");

      if (sessions.length < 400) {
        const batch = writeBatch(db);
        batch.set(userRef, { ...mainData, sessionIds });
        for (const session of sessions) {
          batch.set(doc(col, session.id), session);
        }
        await batch.commit();
      } else {
        await setDoc(userRef, { ...mainData, sessionIds });
        await Promise.all(
          sessions.map((s) => setDoc(doc(col, s.id), s)),
        );
      }

      return true;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = 1000 * attempt;
        console.warn(
          `[storage] Reintento ${attempt}/${MAX_RETRIES} en ${delay}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error(
          "[storage] Error escribiendo en Firestore tras",
          MAX_RETRIES,
          "intentos:",
          err,
        );
      }
    }
  }

  return false;
}

export async function saveState(
  uid: string,
  state: AppState,
): Promise<boolean> {
  saveLocal(state);

  if (!isFirebaseConfigured || uid === "local") return true;

  return syncToFirebase(uid, state);
}

export async function syncNow(uid: string, state: AppState): Promise<boolean> {
  return syncToFirebase(uid, state);
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
