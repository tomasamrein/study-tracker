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
import { toast } from "sonner";
import { useStore } from "./store";
import { STATE_META } from "./types";
import { usePomodoro, type Phase, type PomodoroController } from "./use-pomodoro";

const BASE_TITLE = "Foco — tracker de éxito";
const PHASE_TITLE: Record<Phase, string> = {
  focus: "Foco",
  short: "Descanso",
  long: "Descanso largo",
};
const SELECTION_KEY = "foco:last-selection";
const MODE_KEY = "foco:timer-mode";
const STOPWATCH_KEY = "foco:stopwatch-started-at";

export type TimerMode = "pomodoro" | "cronometro";

export interface StopwatchController {
  running: boolean;
  /** Segundos transcurridos desde que se inició. */
  elapsed: number;
  /** Texto mm:ss (o h:mm:ss) listo para mostrar. */
  clock: string;
  start: () => void;
  /** Frena y registra el tiempo transcurrido como sesión. */
  stop: () => void;
  /** Frena sin registrar nada. */
  discard: () => void;
}

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* almacenamiento no disponible */
  }
}

function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

interface Selection {
  areaId: string;
  subjectId: string;
  label: string;
  methodId: string;
}

interface PomodoroContextValue extends PomodoroController, Selection {
  setAreaId: (id: string) => void;
  /** Materia a la que se imputan los focos del área carrera. */
  setSubjectId: (id: string) => void;
  /** Proyecto / tema libre para las demás áreas. */
  setLabel: (label: string) => void;
  setMethodId: (id: string) => void;
  /** Pomodoro (fases fijas) o cronómetro (libre, se registra al pausar). */
  mode: TimerMode;
  setMode: (mode: TimerMode) => void;
  stopwatch: StopwatchController;
  /** Id de la última sesión registrada por el timer (para autoevaluarla). */
  lastSessionId: string | null;
  clearLastSession: () => void;
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    /* sin audio disponible */
  }
}

function readSelection(): Partial<Selection> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SELECTION_KEY);
    return raw ? (JSON.parse(raw) as Partial<Selection>) : {};
  } catch {
    return {};
  }
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { settings, subjects, areas, addSession } = useStore();
  // Recupera la última selección (arranque sin fricción).
  const [rawSel, setSel] = useState<Selection>(() => ({
    areaId: "carrera",
    subjectId: "",
    label: "",
    methodId: "",
    ...readSelection(),
  }));
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  // Materia por defecto: primera en curso (o la primera sin terminar).
  const sel = useMemo<Selection>(() => {
    if (subjects.length === 0) return rawSel;
    if (rawSel.subjectId && subjects.some((s) => s.id === rawSel.subjectId)) return rawSel;
    const priority = ["cursando", "regular", "recursando"];
    const chosen =
      subjects.find((s) => priority.includes(s.state)) ??
      subjects.find((s) => !STATE_META[s.state].done) ??
      subjects[0];
    return { ...rawSel, subjectId: chosen?.id ?? "" };
  }, [rawSel, subjects]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SELECTION_KEY, JSON.stringify(rawSel));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [rawSel]);

  // Refs para leer valores actuales dentro de callbacks estables.
  const selRef = useRef(sel);
  const soundRef = useRef(settings.soundEnabled);
  const subjectsRef = useRef(subjects);
  const areasRef = useRef(areas);
  useEffect(() => {
    selRef.current = sel;
    soundRef.current = settings.soundEnabled;
    subjectsRef.current = subjects;
    areasRef.current = areas;
  });

  const handleFocusComplete = useCallback(
    (minutes: number) => {
      if (soundRef.current) beep();
      const { areaId, subjectId, label, methodId } = selRef.current;
      const isCarrera = areaId === "carrera";
      const trimmed = label.trim();
      const id = addSession({
        areaId,
        subjectId: isCarrera && subjectId ? subjectId : null,
        ...(trimmed && !isCarrera ? { label: trimmed } : {}),
        ...(methodId ? { methodId } : {}),
        startedAt: new Date(Date.now() - minutes * 60_000).toISOString(),
        minutes,
        source: "pomodoro",
      });
      setLastSessionId(id);
      const target = isCarrera
        ? subjectsRef.current.find((s) => s.id === subjectId)?.name
        : trimmed || areasRef.current.find((a) => a.id === areaId)?.name;
      toast.success(`+${minutes} min de enfoque${target ? ` · ${target}` : ""}`);
    },
    [addSession],
  );

  // ── Cronómetro ──────────────────────────────────────────────
  const [mode, setModeState] = useState<TimerMode>(() =>
    readStorage(MODE_KEY) === "cronometro" ? "cronometro" : "pomodoro",
  );
  const setMode = useCallback((m: TimerMode) => {
    setModeState(m);
    writeStorage(MODE_KEY, m);
  }, []);

  // Inicio persistido: sobrevive a recargas y cambios de página.
  const [swStartedAt, setSwStartedAt] = useState<number | null>(() => {
    const n = Number(readStorage(STOPWATCH_KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (swStartedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [swStartedAt]);
  const swElapsed =
    swStartedAt === null ? 0 : Math.max(0, Math.floor((now - swStartedAt) / 1000));

  const swStart = useCallback(() => {
    const t = Date.now();
    setSwStartedAt((prev) => prev ?? t);
    setNow(t);
    if (readStorage(STOPWATCH_KEY) === null) writeStorage(STOPWATCH_KEY, String(t));
  }, []);

  const swDiscard = useCallback(() => {
    setSwStartedAt(null);
    writeStorage(STOPWATCH_KEY, null);
  }, []);

  const swStop = useCallback(() => {
    if (swStartedAt === null) return;
    const minutes = Math.round((Date.now() - swStartedAt) / 60_000);
    swDiscard();
    if (minutes < 1) {
      toast.info("Menos de un minuto: no se registró.");
      return;
    }
    const { areaId, subjectId, label, methodId } = selRef.current;
    const isCarrera = areaId === "carrera";
    const trimmed = label.trim();
    const id = addSession({
      areaId,
      subjectId: isCarrera && subjectId ? subjectId : null,
      ...(trimmed && !isCarrera ? { label: trimmed } : {}),
      ...(methodId ? { methodId } : {}),
      startedAt: new Date(swStartedAt).toISOString(),
      minutes,
      source: "cronometro",
    });
    setLastSessionId(id);
    const target = isCarrera
      ? subjectsRef.current.find((s) => s.id === subjectId)?.name
      : trimmed || areasRef.current.find((a) => a.id === areaId)?.name;
    toast.success(`+${minutes} min registrados${target ? ` · ${target}` : ""}`);
  }, [swStartedAt, swDiscard, addSession]);

  const stopwatch = useMemo<StopwatchController>(
    () => ({
      running: swStartedAt !== null,
      elapsed: swElapsed,
      clock: formatClock(swElapsed),
      start: swStart,
      stop: swStop,
      discard: swDiscard,
    }),
    [swStartedAt, swElapsed, swStart, swStop, swDiscard],
  );

  const handlePhaseChange = useCallback((next: Phase) => {
    if (soundRef.current && next !== "focus") beep();
  }, []);

  const pomo = usePomodoro({
    settings,
    onFocusComplete: handleFocusComplete,
    onPhaseChange: handlePhaseChange,
  });

  // Refleja el tiempo restante en el título de la pestaña del navegador.
  useEffect(() => {
    if (stopwatch.running) {
      document.title = `${stopwatch.clock} · Cronómetro — Foco`;
    } else if (pomo.running) {
      const mm = String(Math.floor(pomo.remaining / 60)).padStart(2, "0");
      const ss = String(pomo.remaining % 60).padStart(2, "0");
      document.title = `${mm}:${ss} · ${PHASE_TITLE[pomo.phase]} — Foco`;
    } else {
      document.title = BASE_TITLE;
    }
    return () => {
      document.title = BASE_TITLE;
    };
  }, [pomo.running, pomo.remaining, pomo.phase, stopwatch.running, stopwatch.clock]);

  const setAreaId = useCallback((areaId: string) => setSel((p) => ({ ...p, areaId })), []);
  const setSubjectId = useCallback(
    (subjectId: string) => setSel((p) => ({ ...p, subjectId })),
    [],
  );
  const setLabel = useCallback((label: string) => setSel((p) => ({ ...p, label })), []);
  const setMethodId = useCallback(
    (methodId: string) => setSel((p) => ({ ...p, methodId })),
    [],
  );
  const clearLastSession = useCallback(() => setLastSessionId(null), []);

  const value = useMemo<PomodoroContextValue>(
    () => ({
      ...pomo,
      ...sel,
      setAreaId,
      setSubjectId,
      setLabel,
      setMethodId,
      mode,
      setMode,
      stopwatch,
      lastSessionId,
      clearLastSession,
    }),
    [
      pomo,
      sel,
      setAreaId,
      setSubjectId,
      setLabel,
      setMethodId,
      mode,
      setMode,
      stopwatch,
      lastSessionId,
      clearLastSession,
    ],
  );

  return (
    <PomodoroContext.Provider value={value}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoroContext(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx)
    throw new Error("usePomodoroContext debe usarse dentro de <PomodoroProvider>");
  return ctx;
}
