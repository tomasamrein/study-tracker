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
import { STUDY_PLAN } from "./study-plan";
import { loadState, saveState, storageBackend } from "./storage";
import { useAuth } from "./auth";
import {
  DEFAULT_DAILY_GOAL_MINUTES,
  DEFAULT_POMODORO_SETTINGS,
  type AppState,
  type PomodoroSettings,
  type StudySession,
  type Subject,
} from "./types";

const STATE_VERSION = 1;

function freshState(): AppState {
  return {
    subjects: STUDY_PLAN.map((s) => ({ ...s })),
    sessions: [],
    settings: { ...DEFAULT_POMODORO_SETTINGS },
    dailyGoalMinutes: DEFAULT_DAILY_GOAL_MINUTES,
    spotifyUri: null,
    lastGoalCelebrated: null,
    version: STATE_VERSION,
  };
}

/** Combina el plan semillado con el estado guardado, sumando materias nuevas del plan. */
function mergeWithSeed(saved: AppState): AppState {
  const byId = new Map(saved.subjects.map((s) => [s.id, s]));
  const merged = [...saved.subjects];
  for (const seed of STUDY_PLAN) {
    if (!byId.has(seed.id)) merged.push({ ...seed });
  }
  return {
    subjects: merged,
    sessions: saved.sessions ?? [],
    settings: { ...DEFAULT_POMODORO_SETTINGS, ...(saved.settings ?? {}) },
    dailyGoalMinutes: saved.dailyGoalMinutes ?? DEFAULT_DAILY_GOAL_MINUTES,
    spotifyUri: saved.spotifyUri ?? null,
    lastGoalCelebrated: saved.lastGoalCelebrated ?? null,
    version: STATE_VERSION,
  };
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface StoreValue {
  loaded: boolean;
  backend: "firebase" | "local";
  subjects: Subject[];
  sessions: StudySession[];
  settings: PomodoroSettings;
  dailyGoalMinutes: number;
  spotifyUri: string | null;
  lastGoalCelebrated: string | null;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  addSubject: (subject: Omit<Subject, "id"> & { id?: string }) => void;
  deleteSubject: (id: string) => void;
  addSession: (session: Omit<StudySession, "id">) => void;
  deleteSession: (id: string) => void;
  updateSettings: (patch: Partial<PomodoroSettings>) => void;
  setDailyGoal: (minutes: number) => void;
  setSpotifyUri: (uri: string | null) => void;
  markGoalCelebrated: (dayKey: string) => void;
  resetAll: () => void;
  importState: (state: AppState) => void;
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
      setState(saved ? mergeWithSeed(saved) : freshState());
      setLoaded(true);
      // Permitir guardados a partir del próximo cambio.
      requestAnimationFrame(() => {
        skipSave.current = false;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [currentUid]);

  // Persistencia con debounce.
  useEffect(() => {
    if (skipSave.current || !currentUid) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveState(currentUid, state);
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, currentUid]);

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
    setState(freshState());
  }, []);

  const importState = useCallback((incoming: AppState) => {
    setState(mergeWithSeed(incoming));
  }, []);

  const exportState = useCallback(() => state, [state]);

  const value = useMemo<StoreValue>(
    () => ({
      loaded,
      backend: storageBackend,
      subjects: state.subjects,
      sessions: state.sessions,
      settings: state.settings,
      dailyGoalMinutes: state.dailyGoalMinutes,
      spotifyUri: state.spotifyUri,
      lastGoalCelebrated: state.lastGoalCelebrated,
      updateSubject,
      addSubject,
      deleteSubject,
      addSession,
      deleteSession,
      updateSettings,
      setDailyGoal,
      setSpotifyUri,
      markGoalCelebrated,
      resetAll,
      importState,
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
      updateSettings,
      setDailyGoal,
      setSpotifyUri,
      markGoalCelebrated,
      resetAll,
      importState,
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
