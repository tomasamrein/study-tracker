"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PomodoroSettings } from "./types";

export type Phase = "focus" | "short" | "long";

interface Options {
  settings: PomodoroSettings;
  /** Se llama cuando termina un foco completo, con los minutos de foco. */
  onFocusComplete: (minutes: number) => void;
  onPhaseChange?: (next: Phase) => void;
}

function phaseDuration(phase: Phase, s: PomodoroSettings): number {
  if (phase === "focus") return s.focusMinutes * 60;
  if (phase === "short") return s.shortBreakMinutes * 60;
  return s.longBreakMinutes * 60;
}

export interface PomodoroController {
  phase: Phase;
  running: boolean;
  /** Segundos restantes en la fase actual. */
  remaining: number;
  /** Duración total de la fase actual en segundos. */
  total: number;
  /** Focos completados en el ciclo actual. */
  completedInCycle: number;
  /** Focos completados en total durante la sesión de la app. */
  totalFocus: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
}

export function usePomodoro({
  settings,
  onFocusComplete,
  onPhaseChange,
}: Options): PomodoroController {
  const [phase, setPhase] = useState<Phase>("focus");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(settings.focusMinutes * 60);
  const [completedInCycle, setCompletedInCycle] = useState(0);
  const [totalFocus, setTotalFocus] = useState(0);

  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs para leer valores actuales dentro del intervalo sin re-suscribir.
  const phaseRef = useRef(phase);
  const settingsRef = useRef(settings);
  const completedRef = useRef(completedInCycle);
  const cbRef = useRef(onFocusComplete);
  const changeRef = useRef(onPhaseChange);
  phaseRef.current = phase;
  settingsRef.current = settings;
  completedRef.current = completedInCycle;
  cbRef.current = onFocusComplete;
  changeRef.current = onPhaseChange;

  // Si cambian los ajustes y el timer está detenido, reflejar la nueva duración.
  useEffect(() => {
    if (!running && endTimeRef.current === null) {
      setRemaining(phaseDuration(phaseRef.current, settings));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.focusMinutes,
    settings.shortBreakMinutes,
    settings.longBreakMinutes,
  ]);

  const goToPhase = useCallback((next: Phase, autoStart: boolean) => {
    setPhase(next);
    const dur = phaseDuration(next, settingsRef.current);
    setRemaining(dur);
    changeRef.current?.(next);
    if (autoStart) {
      endTimeRef.current = Date.now() + dur * 1000;
      setRunning(true);
    } else {
      endTimeRef.current = null;
      setRunning(false);
    }
  }, []);

  const handlePhaseEnd = useCallback(() => {
    const s = settingsRef.current;
    const current = phaseRef.current;
    if (current === "focus") {
      cbRef.current(s.focusMinutes);
      setTotalFocus((n) => n + 1);
      const completed = completedRef.current + 1;
      setCompletedInCycle(completed);
      const longBreak = completed % s.roundsBeforeLongBreak === 0;
      if (longBreak) setCompletedInCycle(0);
      goToPhase(longBreak ? "long" : "short", s.autoStartBreaks);
    } else {
      goToPhase("focus", s.autoStartFocus);
    }
  }, [goToPhase]);

  // Bucle del temporizador basado en timestamps (resistente al throttling).
  useEffect(() => {
    if (!running) return;
    if (endTimeRef.current === null) {
      endTimeRef.current = Date.now() + remaining * 1000;
    }
    intervalRef.current = setInterval(() => {
      const end = endTimeRef.current;
      if (end === null) return;
      const left = Math.round((end - Date.now()) / 1000);
      if (left <= 0) {
        setRemaining(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
        handlePhaseEnd();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, handlePhaseEnd]);

  const start = useCallback(() => {
    if (running) return;
    endTimeRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  }, [running, remaining]);

  const pause = useCallback(() => {
    if (!running) return;
    const end = endTimeRef.current;
    if (end !== null) {
      setRemaining(Math.max(0, Math.round((end - Date.now()) / 1000)));
    }
    endTimeRef.current = null;
    setRunning(false);
  }, [running]);

  const reset = useCallback(() => {
    endTimeRef.current = null;
    setRunning(false);
    setRemaining(phaseDuration(phaseRef.current, settingsRef.current));
  }, []);

  const skip = useCallback(() => {
    // Avanza de fase sin registrar foco (salto manual).
    const s = settingsRef.current;
    const current = phaseRef.current;
    if (current === "focus") {
      const completed = completedRef.current + 1;
      const longBreak = completed % s.roundsBeforeLongBreak === 0;
      setCompletedInCycle(longBreak ? 0 : completed);
      goToPhase(longBreak ? "long" : "short", false);
    } else {
      goToPhase("focus", false);
    }
  }, [goToPhase]);

  return {
    phase,
    running,
    remaining,
    total: phaseDuration(phase, settings),
    completedInCycle,
    totalFocus,
    start,
    pause,
    reset,
    skip,
  };
}
