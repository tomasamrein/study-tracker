import { collection, doc, getDoc, getDocs, writeBatch, deleteDoc } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "../firebase";
import type { Trade, TradingState } from "./types";

/**
 * Persistencia de Trading, independiente de la de estudio:
 *  - localStorage: `study-tracker:trading`
 *  - Firestore: `users/{uid}/trading/state` (config) + `users/{uid}/trades/{id}`
 */
const LOCAL_KEY = "study-tracker:trading";

let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next;
  return next;
}

function clean<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(clean) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined) out[k] = clean(v);
  }
  return out as T;
}

const cloudEnabled = (uid: string) => isFirebaseConfigured && uid !== "local";

export async function loadTrading(uid: string): Promise<Partial<TradingState> | null> {
  if (cloudEnabled(uid)) {
    const db = getDb();
    if (db) {
      try {
        const snap = await getDoc(doc(db, "users", uid, "trading", "state"));
        if (snap.exists()) {
          const data = snap.data() as Partial<TradingState>;
          const trades = (await getDocs(collection(db, "users", uid, "trades"))).docs.map(
            (d) => d.data() as Trade,
          );
          return { ...data, trades };
        }
      } catch (err) {
        console.error("[trading] Error leyendo de Firestore:", err);
      }
    }
  }
  return loadLocal();
}

/** Ids de trades que ya están en la nube, para borrar los eliminados. */
let syncedTradeIds: Set<string> | null = null;

export async function saveTrading(uid: string, state: TradingState): Promise<boolean> {
  saveLocal(state);
  if (!cloudEnabled(uid)) return true;
  return enqueue(async () => {
    const db = getDb();
    if (!db) return false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { trades, ...config } = state;
        const col = collection(db, "users", uid, "trades");
        if (!syncedTradeIds) {
          syncedTradeIds = new Set((await getDocs(col)).docs.map((d) => d.id));
        }
        const current = new Set(trades.map((t) => t.id));
        const removed = [...syncedTradeIds].filter((id) => !current.has(id));
        // Firestore admite 500 operaciones por batch.
        const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [
          (b) => b.set(doc(db, "users", uid, "trading", "state"), clean(config)),
          ...trades.map((t) => (b: ReturnType<typeof writeBatch>) => b.set(doc(col, t.id), clean(t))),
        ];
        for (let i = 0; i < ops.length; i += 450) {
          const batch = writeBatch(db);
          ops.slice(i, i + 450).forEach((op) => op(batch));
          await batch.commit();
        }
        await Promise.all(removed.map((id) => deleteDoc(doc(col, id))));
        syncedTradeIds = current;
        return true;
      } catch (err) {
        if (attempt === 3) {
          console.error("[trading] Error escribiendo en Firestore:", err);
          return false;
        }
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    return false;
  });
}

function loadLocal(): Partial<TradingState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as TradingState) : null;
  } catch {
    return null;
  }
}

function saveLocal(state: TradingState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("[trading] Error escribiendo en localStorage:", err);
  }
}
