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

const BASE_TITLE = "Study Tracker — Ingeniería en Informática";
const PHASE_TITLE: Record<Phase, string> = {
  focus: "Foco",
  short: "Descanso",
  long: "Descanso largo",
};

interface PomodoroContextValue extends PomodoroController {
  /** Materia a la que se imputan los focos completados. */
  subjectId: string;
  setSubjectId: (id: string) => void;
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

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { settings, subjects, addSession } = useStore();
  const [subjectId, setSubjectId] = useState("");

  // Refs para leer valores actuales dentro de callbacks estables.
  const subjectIdRef = useRef(subjectId);
  subjectIdRef.current = subjectId;
  const soundRef = useRef(settings.soundEnabled);
  soundRef.current = settings.soundEnabled;
  const subjectsRef = useRef(subjects);
  subjectsRef.current = subjects;

  // Selección por defecto: primera materia en curso (o la primera sin terminar).
  useEffect(() => {
    if (subjectId || subjects.length === 0) return;
    const priority = ["cursando", "regular", "recursando"];
    const active = subjects.find((s) => priority.includes(s.state));
    const fallback = subjects.find((s) => !STATE_META[s.state].done);
    const chosen = active ?? fallback ?? subjects[0];
    if (chosen) setSubjectId(chosen.id);
  }, [subjects, subjectId]);

  const handleFocusComplete = useCallback(
    (minutes: number) => {
      if (soundRef.current) beep();
      const sid = subjectIdRef.current;
      if (!sid) {
        toast.warning("Foco completado, pero no había materia seleccionada.");
        return;
      }
      addSession({
        subjectId: sid,
        startedAt: new Date(Date.now() - minutes * 60_000).toISOString(),
        minutes,
        source: "pomodoro",
      });
      const name = subjectsRef.current.find((s) => s.id === sid)?.name ?? "materia";
      toast.success(`+${minutes} min registrados en ${name} 🎉`);
    },
    [addSession],
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
    if (pomo.running) {
      const mm = String(Math.floor(pomo.remaining / 60)).padStart(2, "0");
      const ss = String(pomo.remaining % 60).padStart(2, "0");
      document.title = `${mm}:${ss} · ${PHASE_TITLE[pomo.phase]} — Study Tracker`;
    } else {
      document.title = BASE_TITLE;
    }
    return () => {
      document.title = BASE_TITLE;
    };
  }, [pomo.running, pomo.remaining, pomo.phase]);

  const value = useMemo<PomodoroContextValue>(
    () => ({ ...pomo, subjectId, setSubjectId }),
    [pomo, subjectId],
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
