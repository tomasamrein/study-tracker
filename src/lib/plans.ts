// Resolución del plan de estudios según la identidad del usuario.
// El sistema lo usamos sólo dos personas: Tomás (Ing. en Informática) y
// Constanza (Lic. en Diseño Industrial). Por eso alcanza con mapear por email:
// la cuenta de Tomás recibe Informática y cualquier otra cuenta recibe Diseño
// Industrial. En modo local (sin login) también cae en Informática.

import { PLAN_META, STUDY_PLAN } from "./study-plan";
import { DI_PLAN_META, DISENO_INDUSTRIAL_PLAN } from "./study-plan-di";
import type { PlanMeta, Subject } from "./types";

/** Cuenta de Google del dueño del sistema (plan de Informática). */
const OWNER_EMAIL = "tomasamrein72@gmail.com";

export interface ResolvedPlan {
  subjects: Subject[];
  /** planMeta para guardar en el estado. null = usar el PLAN_META por defecto. */
  meta: PlanMeta | null;
}

interface IdentityLike {
  email?: string | null;
}

function isOwner(user: IdentityLike | null): boolean {
  const email = user?.email?.trim().toLowerCase();
  // Sin email (modo local) => se asume el dueño.
  return !email || email === OWNER_EMAIL;
}

/** Devuelve el plan semilla y su meta según quién está logueado. */
export function resolvePlan(user: IdentityLike | null): ResolvedPlan {
  if (isOwner(user)) {
    return { subjects: STUDY_PLAN.map((s) => ({ ...s })), meta: null };
  }
  return {
    subjects: DISENO_INDUSTRIAL_PLAN.map((s) => ({ ...s })),
    meta: DI_PLAN_META,
  };
}

/** Etiqueta de carrera para mostrar (ranking, encabezados). */
export function careerLabel(
  user: IdentityLike | null,
  planMeta: PlanMeta | null,
): string {
  if (planMeta?.career) return planMeta.career;
  return isOwner(user) ? PLAN_META.career : DI_PLAN_META.career;
}
