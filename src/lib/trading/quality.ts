/**
 * Quality score (0–100) de un trade: mide el PROCESO, no el resultado.
 * Un trade perdedor bien ejecutado puede tener 100; uno ganador fuera de
 * plan, poco.
 *
 *  - Seguí el plan ............................. 35
 *  - Stop inicial definido ...................... 15
 *  - Objetivo con R planeado ≥ 1,5 (≥ 1 → 5) ... 10
 *  - Tamaño dentro de los límites ............... 10
 *  - Registro completo (setup, sesión, notas) ... 15 (5 c/u)
 *  - Checklist previo del día completado ........ 15 (proporcional)
 */
import type { TradeMetrics } from "./calc";
import type { Trade } from "./types";

export interface QualityInput {
  trade: Trade;
  m: TradeMetrics;
  /** Hay alguna violación de tamaño (cuenta o límite personal). */
  sizeViolation: boolean;
  /** 0–1: proporción del checklist previo tildado ese día (null = sin checklist). */
  preChecklist: number | null;
}

export interface QualityPart {
  label: string;
  points: number;
  max: number;
}

export function qualityBreakdown({ trade: t, m, sizeViolation, preChecklist }: QualityInput): QualityPart[] {
  const planned = m.plannedR ?? 0;
  return [
    { label: "Seguí el plan", points: t.followedPlan ? 35 : 0, max: 35 },
    { label: "Stop definido", points: m.riskUsd != null ? 15 : 0, max: 15 },
    { label: "Objetivo / R planeado", points: planned >= 1.5 ? 10 : planned >= 1 ? 5 : 0, max: 10 },
    { label: "Tamaño dentro de límites", points: sizeViolation ? 0 : 10, max: 10 },
    {
      label: "Registro completo",
      points: (t.setupId ? 5 : 0) + (t.sessionId ? 5 : 0) + (t.notes?.trim() || t.lesson?.trim() ? 5 : 0),
      max: 15,
    },
    { label: "Checklist previo", points: Math.round(15 * Math.min(1, Math.max(0, preChecklist ?? 0))), max: 15 },
  ];
}

export function qualityScore(input: QualityInput): number {
  return qualityBreakdown(input).reduce((s, p) => s + p.points, 0);
}
