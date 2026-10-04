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
import { loadState, saveState, syncNow, storageBackend } from "./storage";
import { isFirebaseConfigured } from "./firebase";
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
import { defaultHabits, defaultVices, migrateLife, sameArea } from "./life";
import {
  DEFAULT_AREAS,
  DEFAULT_DAILY_GOAL_MINUTES,
  DEFAULT_POMODORO_SETTINGS,
  type AppState,
  type DailyEntry,
  type FocusArea,
  type Goal,
  type Habit,
  type PlanMeta,
  type PomodoroSettings,
  type StudySession,
  type Subject,
  type TodoItem,
  type Vice,
} from "./types";

const STATE_VERSION = 3;

/** Hábitos, contadores y metas con los que arranca la app (v2). */
function seedSuccess(): Pick<AppState, "habits" | "vices" | "goals"> {
  const now = new Date().toISOString();
  return {
    habits: defaultHabits(now),
    vices: defaultVices(now),
    goals: [
      {
        id: "g-carrera-semana",
        title: "10 h de carrera",
        areaId: "carrera",
        horizon: "semana",
        metric: "minutes",
        target: 600,
        done: false,
        createdAt: now,
      },
      {
        id: "g-trading-semana",
        title: "10 h de trading",
        areaId: "trading",
        horizon: "semana",
        metric: "minutes",
        target: 600,
        done: false,
        createdAt: now,
      },
      {
        id: "g-detox-semana",
        title: "7 días de no fap",
        horizon: "semana",
        metric: "count",
        target: 7,
        progress: 0,
        done: false,
        createdAt: now,
      },
    ],
  };
}

/** Garantiza que las áreas por defecto existan (conserva nombres editados). */
function withDefaultAreas(areas: FocusArea[] | undefined): FocusArea[] {
  const list = [...(areas ?? [])];
  for (const a of DEFAULT_AREAS) {
    if (!list.some((x) => sameArea(x, a))) list.push({ ...a });
  }
  return list;
}

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
    areas: DEFAULT_AREAS.map((a) => ({ ...a })),
    ...seedSuccess(),
    habitLog: {},
    daily: {},
    version: STATE_VERSION,
  };
}

/** Combina el estado guardado con el plan por defecto, sumando materias nuevas. */
function mergeWithSeed(saved: AppState, user?: AuthUser | null): AppState {
  // Migración v1 → v2: el tracker pasa a ser de enfoque por áreas. Las
  // sesiones viejas eran todas de la carrera.
  const isLegacy = (saved.version ?? 1) < 2;
  const seeds = isLegacy ? seedSuccess() : null;
  const base = {
    sessions: (saved.sessions ?? []).map((s) =>
      s.areaId ? s : { ...s, areaId: "carrera" },
    ),
    todos: saved.todos ?? [],
    settings: { ...DEFAULT_POMODORO_SETTINGS, ...(saved.settings ?? {}) },
    dailyGoalMinutes: saved.dailyGoalMinutes ?? DEFAULT_DAILY_GOAL_MINUTES,
    spotifyUri: saved.spotifyUri ?? null,
    lastGoalCelebrated: saved.lastGoalCelebrated ?? null,
    customPlan: saved.customPlan ?? false,
    planMeta: saved.planMeta ?? null,
    areas: withDefaultAreas(saved.areas),
    goals: saved.goals ?? seeds?.goals ?? [],
    ...((saved.version ?? 1) < 3
      ? migrateLife(saved.habits ?? seeds?.habits ?? [], saved.vices ?? seeds?.vices ?? [], new Date().toISOString())
      : { habits: saved.habits ?? [], vices: saved.vices ?? [] }),
    habitLog: saved.habitLog ?? {},
    daily: saved.daily ?? {},
    version: STATE_VERSION,
  };

  // Si el usuario cargó su propio plan, respetamos sus materias tal cual
  // (no re-inyectamos el plan por defecto).
  if (saved.customPlan) {
    return { ...base, subjects: saved.subjects ?? [] };
  }

  // Plan por defecto: sumamos materias nuevas del seed (el que corresponda al
  // usuario) que aún no estén.
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
  areas: FocusArea[];
  goals: Goal[];
  habits: Habit[];
  habitLog: Record<string, string[]>;
  vices: Vice[];
  daily: Record<string, DailyEntry>;
  addArea: (name: string) => void;
  updateArea: (id: string, patch: Partial<Omit<FocusArea, "id">>) => void;
  deleteArea: (id: string) => void;
  addGoal: (goal: Omit<Goal, "id" | "createdAt" | "done">) => void;
  updateGoal: (id: string, patch: Partial<Omit<Goal, "id">>) => void;
  deleteGoal: (id: string) => void;
  addHabit: (name: string, kind: Habit["kind"]) => void;
  updateHabit: (id: string, patch: Partial<Omit<Habit, "id">>) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (day: string, id: string) => void;
  addVice: (name: string) => void;
  relapseVice: (id: string) => void;
  deleteVice: (id: string) => void;
  setDaily: (day: string, patch: Partial<DailyEntry>) => void;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  addSubject: (subject: Omit<Subject, "id"> & { id?: string }) => void;
  deleteSubject: (id: string) => void;
  /** Agrega una sesión y devuelve su id. */
  addSession: (session: Omit<StudySession, "id">) => string;
  updateSession: (id: string, patch: Partial<Omit<StudySession, "id">>) => void;
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
      const merged = saved ? mergeWithSeed(saved, user) : freshState(user);
      setState(merged);
      setLoaded(true);
      if (isFirebaseConfigured && currentUid !== "local") {
        syncNow(currentUid, merged);
      }
      requestAnimationFrame(() => {
        skipSave.current = false;
      });
    });
    return () => {
      cancelled = true;
    };
    // Sólo recargamos al cambiar de cuenta (uid); `user` se lee dentro y
    // siempre corresponde a ese mismo uid, así evitamos recargas por refresh
    // de token que pisarían ediciones en memoria.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUid]);

  // Persistencia con debounce.
  useEffect(() => {
    if (skipSave.current || !currentUid) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveState(currentUid, state).then((ok) => {
        if (!ok && storageBackend === "firebase") {
          toast.error("Error al guardar en la nube. Tus datos están seguros en localStorage.", { duration: 6000 });
        }
      });
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, currentUid]);

  // Publicación del resumen público para el ranking (sólo en modo nube).
  useEffect(() => {
    if (storageBackend !== "firebase") return;
    if (!loaded || !currentUid || currentUid === "local" || !user) return;
    const t = setTimeout(() => {
      const streak = computeStreak(state.sessions);
      const week = weeklySummary(state.sessions);
      void publishLeaderboardEntry(currentUid, {
        uid: currentUid,
        name: user.name ?? user.email ?? "Anónimo",
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
    const id = uid();
    setState((prev) => ({
      ...prev,
      sessions: [...prev.sessions, { ...session, id }],
    }));
    return id;
  }, []);

  const updateSession = useCallback(
    (id: string, patch: Partial<Omit<StudySession, "id">>) => {
      setState((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }));
    },
    [],
  );

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

  const addArea = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      areas: [...prev.areas, { id: uid(), name, kind: "custom" }],
    }));
  }, []);

  const updateArea = useCallback(
    (id: string, patch: Partial<Omit<FocusArea, "id">>) => {
      setState((prev) => ({
        ...prev,
        areas: prev.areas.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }));
    },
    [],
  );

  const deleteArea = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      // Las áreas por defecto no se borran; las sesiones se conservan.
      areas: prev.areas.filter((a) => a.id !== id || a.kind !== "custom"),
    }));
  }, []);

  const addGoal = useCallback(
    (goal: Omit<Goal, "id" | "createdAt" | "done">) => {
      setState((prev) => ({
        ...prev,
        goals: [
          ...prev.goals,
          { ...goal, id: uid(), done: false, createdAt: new Date().toISOString() },
        ],
      }));
    },
    [],
  );

  const updateGoal = useCallback((id: string, patch: Partial<Omit<Goal, "id">>) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setState((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }));
  }, []);

  const addHabit = useCallback((name: string, kind: Habit["kind"]) => {
    setState((prev) => ({
      ...prev,
      habits: [
        ...prev.habits,
        { id: uid(), name, kind, createdAt: new Date().toISOString() },
      ],
    }));
  }, []);

  const updateHabit = useCallback(
    (id: string, patch: Partial<Omit<Habit, "id">>) => {
      setState((prev) => ({
        ...prev,
        habits: prev.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      }));
    },
    [],
  );

  const deleteHabit = useCallback((id: string) => {
    setState((prev) => {
      const habitLog: Record<string, string[]> = {};
      for (const [day, ids] of Object.entries(prev.habitLog)) {
        const rest = ids.filter((x) => x !== id);
        if (rest.length) habitLog[day] = rest;
      }
      return { ...prev, habits: prev.habits.filter((h) => h.id !== id), habitLog };
    });
  }, []);

  const toggleHabit = useCallback((day: string, id: string) => {
    setState((prev) => {
      const current = prev.habitLog[day] ?? [];
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      const habitLog = { ...prev.habitLog };
      if (next.length) habitLog[day] = next;
      else delete habitLog[day];
      return { ...prev, habitLog };
    });
  }, []);

  const addVice = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      vices: [
        ...prev.vices,
        { id: uid(), name, since: new Date().toISOString(), relapses: [], best: 0 },
      ],
    }));
  }, []);

  const relapseVice = useCallback((id: string) => {
    const now = new Date();
    setState((prev) => ({
      ...prev,
      vices: prev.vices.map((v) => {
        if (v.id !== id) return v;
        const streak = Math.floor(
          (now.getTime() - new Date(v.since).getTime()) / 86_400_000,
        );
        return {
          ...v,
          best: Math.max(v.best, streak),
          since: now.toISOString(),
          relapses: [...v.relapses, now.toISOString()],
        };
      }),
    }));
  }, []);

  const deleteVice = useCallback((id: string) => {
    setState((prev) => ({ ...prev, vices: prev.vices.filter((v) => v.id !== id) }));
  }, []);

  const setDaily = useCallback((day: string, patch: Partial<DailyEntry>) => {
    setState((prev) => ({
      ...prev,
      daily: { ...prev.daily, [day]: { ...(prev.daily[day] ?? {}), ...patch } },
    }));
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
          // Conservamos las sesiones de otras áreas y las que apunten a
          // materias que siguen existiendo.
          sessions: prev.sessions.filter(
            (s) => !s.subjectId || ids.has(s.subjectId),
          ),
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
      areas: state.areas,
      goals: state.goals,
      habits: state.habits,
      habitLog: state.habitLog,
      vices: state.vices,
      daily: state.daily,
      addArea,
      updateArea,
      deleteArea,
      addGoal,
      updateGoal,
      deleteGoal,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabit,
      addVice,
      relapseVice,
      deleteVice,
      setDaily,
      updateSubject,
      addSubject,
      deleteSubject,
      addSession,
      updateSession,
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
      addArea,
      updateArea,
      deleteArea,
      addGoal,
      updateGoal,
      deleteGoal,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabit,
      addVice,
      relapseVice,
      deleteVice,
      setDaily,
      updateSubject,
      addSubject,
      deleteSubject,
      addSession,
      updateSession,
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
