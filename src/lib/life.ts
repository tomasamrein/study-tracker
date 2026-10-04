/**
 * Hábitos y contadores por defecto del "segundo cerebro" y la migración que
 * los aplica sobre datos guardados sin perder lo que cargó el usuario.
 */
import type { FocusArea, Habit, Vice } from "./types";

export const NOFAP_ID = "v-nofap";

export const DEFAULT_HABITS: Pick<Habit, "id" | "name" | "kind">[] = [
  { id: "h-trading", name: "2 h de trading", kind: "build" },
  { id: "h-ejercicio", name: "Gimnasio", kind: "build" },
  { id: "h-lectura", name: "Leer 20 minutos", kind: "build" },
  { id: "h-dormir", name: "Dormir antes de las 00", kind: "build" },
];

/** Hábitos sugeridos (se agregan con un clic desde Hábitos). */
export const SUGGESTED_HABITS: { name: string; kind: Habit["kind"]; why: string }[] = [
  { name: "Journaling 10 minutos", kind: "build", why: "Ordena la cabeza y deja registro de tus decisiones." },
  { name: "Deep work 2 h", kind: "build", why: "El trabajo que mueve la aguja se hace sin interrupciones." },
  { name: "Planificar el día anterior", kind: "build", why: "Arrancás sabiendo qué hacer, sin gastar voluntad." },
  { name: "Meditar 10 minutos", kind: "build", why: "Mejora la atención y el control emocional (clave al operar)." },
  { name: "Tomar 2 L de agua", kind: "build", why: "Energía y concentración estables." },
  { name: "10.000 pasos", kind: "build", why: "Movimiento diario aparte del gym." },
  { name: "Sol por la mañana", kind: "build", why: "Regula el ritmo circadiano y mejora el sueño." },
  { name: "Ducha fría", kind: "build", why: "Entrena la disciplina de hacer lo incómodo." },
  { name: "Revisar trades del día", kind: "build", why: "Sin revisión no hay mejora." },
  { name: "Sin celular la primera hora", kind: "avoid", why: "La mañana es tuya, no del feed." },
  { name: "Sin redes ni scroll", kind: "avoid", why: "Protege tu atención." },
  { name: "Sin alcohol", kind: "avoid", why: "Mejor sueño y cabeza clara para operar." },
];

export const DEFAULT_VICES: Pick<Vice, "id" | "name">[] = [{ id: NOFAP_ID, name: "No fap" }];

/** Ids de los hábitos de la versión anterior que ya no forman parte del set. */
const RETIRED_HABITS = new Set(["h-no-scroll", "h-no-shorts"]);
const RENAMED: Record<string, string> = { "h-ejercicio": "Gimnasio" };

export function defaultHabits(now: string): Habit[] {
  return DEFAULT_HABITS.map((h) => ({ ...h, createdAt: now }));
}

export function defaultVices(now: string): Vice[] {
  return DEFAULT_VICES.map((v) => ({ ...v, since: now, relapses: [], best: 0 }));
}

/**
 * Migración v2 → v3: deja los hábitos por defecto nuevos (conserva los
 * propios del usuario y el historial), renombra "Ejercicio" a "Gimnasio" y
 * suma el contador No fap si no existe.
 */
export function migrateLife(habits: Habit[], vices: Vice[], now: string): { habits: Habit[]; vices: Vice[] } {
  const kept = habits
    .filter((h) => !RETIRED_HABITS.has(h.id))
    .map((h) => (RENAMED[h.id] && h.name === "Ejercicio" ? { ...h, name: RENAMED[h.id] } : h));
  const ids = new Set(kept.map((h) => h.id));
  const missing = defaultHabits(now).filter((h) => !ids.has(h.id));
  const order = new Map(DEFAULT_HABITS.map((h, i) => [h.id, i]));
  const merged = [...kept, ...missing].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  const hasNofap = vices.some((v) => v.id === NOFAP_ID || /no\s*fap/i.test(v.name));
  return { habits: merged, vices: hasNofap ? vices : [...defaultVices(now), ...vices] };
}

/** El contador No fap (por id o por nombre). */
export function findNofap(vices: Vice[]): Vice | undefined {
  return vices.find((v) => v.id === NOFAP_ID) ?? vices.find((v) => /no\s*fap/i.test(v.name));
}

/** Evita duplicar un área por defecto si el usuario ya creó una con el mismo nombre. */
export function sameArea(a: FocusArea, b: FocusArea): boolean {
  return a.id === b.id || a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
}
