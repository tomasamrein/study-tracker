"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { loadState, saveState, storageBackend } from "./storage";
import { useAuth, type AuthUser } from "./auth";
import { careerLabel, resolvePlan } from "./plans";
import { publishLeaderboardEntry } from "./leaderboard";
import {
  computeStreak,
  todayMinutes,
  totalMinutes,
  weeklySummary,
} from "./stats";
import { toast } from "sonner";
import {
  DEFAULT_DAILY_GOAL_MINUTES,
  DEFAULT_POMODORO_SETTINGS,
  type AppState,
  type PlanMeta,
  type PomodoroSettings,
  type StudySession,
  type Subject,
  type TodoItem,
} from "./types";

const STATE_VERSION = 1;

function freshState(user?: AuthUser | null): AppState {
  const { subjects, meta } = resolvePlan(user ?? null);
  return {
    subjects,
    sessions: [],
    todos: [],
    settings: { ...DEFAULT_POMODORO_SETTINGS },
    dailyGoalMinutes: DEFAULT_DAILY_GOAL_MINUTES,
    spotifyUri: null,
    lastGoalCelebrated: null,
    customPlan: false,
    planMeta: meta,
    version: STATE_VERSION,
  };
}

/** Combina el estado guardado con el plan por defecto, sumando materias nuevas. */
function mergeWithSeed(saved: AppState, user?: AuthUser | null): AppState {
  const base = {
    sessions: saved.sessions ?? [],
    todos: saved.todos ?? [],
    settings: { ...DEFAULT_POMODORO_SETTINGS, ...(saved.settings ?? {}) },
    dailyGoalMinutes: saved.dailyGoalMinutes ?? DEFAULT_DAILY_GOAL_MINUTES,
    spotifyUri: saved.spotifyUri ?? null,
    lastGoalCelebrated: saved.lastGoalCelebrated ?? null,
    customPlan: saved.customPlan ?? false,
    planMeta: saved.planMeta ?? null,
    version: STATE_VERSION,
  };

  // Si el usuario cargÃ³ su propio plan, respetamos sus materias tal cual
  // (no re-inyectamos el plan por defecto).
  if (saved.customPlan) {
    return { ...base, subjects: saved.subjects ?? [] };
  }

  // Plan por defecto: sumamos materias nuevas del seed (el que corresponda al
  // usuario) que aÃºn no estÃ©n.
  const seedSubjects = resolvePlan(user ?? null).subjects;
  const byId = new Map((saved.subjects ?? []).map((s) => [s.id, s]));
  const merged = [...(saved.subjects ?? [])];
  for (const seed of seedSubjects) {
    if (!byId.has(seed.id)) merged.push({ ...seed });
  }
  return { ...base, subjects: merged };
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface StoreValue {
  loaded: boolean;
  backend: "firebase" | "local";
  subjects: Subject[];
  sessions: StudySession[];
  todos: TodoItem[];
  settings: PomodoroSettings;
  dailyGoalMinutes: number;
  spotifyUri: string | null;
  lastGoalCelebrated: string | null;
  planMeta: PlanMeta | null;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  addSubject: (subject: Omit<Subject, "id"> & { id?: string }) => void;
  deleteSubject: (id: string) => void;
  addSession: (session: Omit<StudySession, "id">) => void;
  deleteSession: (id: string) => void;
  addTodo: (todo: Omit<TodoItem, "id" | "createdAt" | "done"> & { done?: boolean }) => void;
  toggleTodo: (id: string) => void;
  updateTodo: (id: string, patch: Partial<Omit<TodoItem, "id">>) => void;
  deleteTodo: (id: string) => void;
  clearCompletedTodos: (day?: string) => void;
  updateSettings: (patch: Partial<PomodoroSettings>) => void;
  setDailyGoal: (minutes: number) => void;
  setSpotifyUri: (uri: string | null) => void;
  markGoalCelebrated: (dayKey: string) => void;
  resetAll: () => void;
  importState: (state: AppState) => void;
  /** Reemplaza el plan de estudios por uno propio del usuario. */
  importPlan: (subjects: Subject[], meta?: PlanMeta | null) => void;
  exportState: () => AppState;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const currentUid = user?.uid ?? null;

  const [state, setState] = useState<AppState>(freshState);
  const [loaded, setLoaded] = useState(false);
  const skipSave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carga inicial: se dispara cuando hay un usuario (local o autenticado).
  useEffect(() => {
    if (!currentUid) return;
    let cancelled = false;
    skipSave.current = true;
    setLoaded(false);
    loadState(currentUid).then((saved) => {
      if (cancelled) return;
      setState(saved ? mergeWithSeed(saved, user) : freshState(user));
      setLoaded(true);
      // Permitir guardados a partir del prÃ³ximo cambio.
      requestAnimationFrame(() => {
        skipSave.current = false;
      });
    });
    return () => {
      cancelled = true;
    };
    // SÃ³lo recargamos al cambiar de cuenta (uid); `user` se lee dentro y
    // siempre corresponde a ese mismo uid, asÃ­ evitamos recargas por refresh
    // de token que pisarÃ­an ediciones en memoria.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUid]);

  // Persistencia con debounce.
  useEffect(() => {
    if (skipSave.current || !currentUid) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveState(currentUid, state).then((ok) => {
        if (!ok && storageBackend === "firebase") {
          toast.error("Error al sincronizar con la nube. Tus datos están guardados localmente y se reintentará automáticamente.", { duration: 6000 });
        }
      });
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, currentUid]);

  // PublicaciÃ³n del resumen pÃºblico para el ranking (sÃ³lo en modo nube).
  useEffect(() => {
    if (storageBackend !== "firebase") return;
    if (!loaded || !currentUid || currentUid === "local" || !user) return;
    const t = setTimeout(() => {
      const streak = computeStreak(state.sessions);
      const week = weeklySummary(state.sessions);
      void publishLeaderboardEntry(currentUid, {
        uid: currentUid,
        name: user.name ?? user.email ?? "AnÃ³nimo",
        photoURL: user.photoURL ?? null,
        career: careerLabel(user, state.planMeta ?? null),
        weekMinutes: week.totalMinutes,
        totalMinutes: totalMinutes(state.sessions),
        todayMinutes: todayMinutes(state.sessions),
        currentStreak: streak.current,
        longestStreak: streak.longest,
        studiedToday: streak.studiedToday,
        updatedAt: new Date().toISOString(),
      });
    }, 800);
    return () => clearTimeout(t);
  }, [state.sessions, state.planMeta, currentUid, user, loaded]);

  const updateSubject = useCallback((id: string, patch: Partial<Subject>) => {
    setState((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }, []);

  const addSubject = useCallback(
    (subject: Omit<Subject, "id"> & { id?: string }) => {
      setState((prev) => ({
        ...prev,
        subjects: [
          ...prev.subjects,
          { ...subject, id: subject.id ?? uid(), custom: true },
        ],
      }));
    },
    [],
  );

  const deleteSubject = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== id),
      sessions: prev.sessions.filter((s) => s.subjectId !== id),
    }));
  }, []);

  const addSession = useCallback((session: Omit<StudySession, "id">) => {
    setState((prev) => ({
      ...prev,
      sessions: [...prev.sessions, { ...session, id: uid() }],
    }));
  }, []);

  const deleteSession = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
    }));
  }, []);

  const addTodo = useCallback(
    (todo: Omit<TodoItem, "id" | "createdAt" | "done"> & { done?: boolean }) => {
      setState((prev) => ({
        ...prev,
        todos: [
          ...prev.todos,
          {
            done: false,
            ...todo,
            id: uid(),
            createdAt: new Date().toISOString(),
          },
        ],
      }));
    },
    [],
  );

  const toggleTodo = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
      ),
    }));
  }, []);

  const updateTodo = useCallback(
    (id: string, patch: Partial<Omit<TodoItem, "id">>) => {
      setState((prev) => ({
        ...prev,
        todos: prev.todos.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
    },
    [],
  );

  const deleteTodo = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.filter((t) => t.id !== id),
    }));
  }, []);

  const clearCompletedTodos = useCallback((day?: string) => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.filter(
        (t) => !t.done || (day !== undefined && t.day !== day),
      ),
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<PomodoroSettings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const setDailyGoal = useCallback((minutes: number) => {
    setState((prev) => ({ ...prev, dailyGoalMinutes: Math.max(0, minutes) }));
  }, []);

  const setSpotifyUri = useCallback((uri: string | null) => {
    setState((prev) => ({ ...prev, spotifyUri: uri }));
  }, []);

  const markGoalCelebrated = useCallback((dayKey: string) => {
    setState((prev) => ({ ...prev, lastGoalCelebrated: dayKey }));
  }, []);

  const resetAll = useCallback(() => {
    setState(freshState(user));
  }, [user]);

  const importState = useCallback((incoming: AppState) => {
    setState(mergeWithSeed(incoming));
  }, []);

  const importPlan = useCallback(
    (subjects: Subject[], meta?: PlanMeta | null) => {
      setState((prev) => {
        const ids = new Set(subjects.map((s) => s.id));
        return {
          ...prev,
          subjects,
          // Conservamos sÃ³lo las sesiones que apunten a materias que siguen existiendo.
          sessions: prev.sessions.filter((s) => ids.has(s.subjectId)),
          customPlan: true,
          planMeta: meta ?? prev.planMeta ?? null,
        };
      });
    },
    [],
  );

  const exportState = useCallback(() => state, [state]);

  const value = useMemo<StoreValue>(
    () => ({
      loaded,
      backend: storageBackend,
      subjects: state.subjects,
      sessions: state.sessions,
      todos: state.todos,
      settings: state.settings,
      dailyGoalMinutes: state.dailyGoalMinutes,
      spotifyUri: state.spotifyUri,
      lastGoalCelebrated: state.lastGoalCelebrated,
      planMeta: state.planMeta ?? null,
      updateSubject,
      addSubject,
      deleteSubject,
      addSession,
      deleteSession,
      addTodo,
      toggleTodo,
      updateTodo,
      deleteTodo,
      clearCompletedTodos,
      updateSettings,
      setDailyGoal,
      setSpotifyUri,
      markGoalCelebrated,
      resetAll,
      importState,
      importPlan,
      exportState,
    }),
    [
      loaded,
      state,
      updateSubject,
      addSubject,
      deleteSubject,
      addSession,
      deleteSession,
      addTodo,
      toggleTodo,
      updateTodo,
      deleteTodo,
      clearCompletedTodos,
      updateSettings,
      setDailyGoal,
      setSpotifyUri,
      markGoalCelebrated,
      resetAll,
      importState,
      importPlan,
      exportState,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de <StoreProvider>");
  return ctx;
}




