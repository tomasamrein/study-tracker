"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Flame, Clock, CalendarRange, Trophy, BookOpen, Timer } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { RankingCard } from "@/components/ranking/ranking-card";
import {
  computeStreak,
  formatHours,
  formatMinutes,
  minutesBySubject,
  monthlySummary,
  totalMinutes,
  weeklySummary,
} from "@/lib/stats";
import { CHART_PALETTE } from "@/lib/palette";
import { STATE_META } from "@/lib/types";
import { LoadingScreen } from "@/components/loading-screen";
import { StatCard } from "@/components/stat-card";
import { PlanProgress } from "@/components/plan-progress";
import { DailyGoalCard } from "@/components/rewards/daily-goal-card";
import { SubjectPie } from "@/components/charts/subject-pie";
import { PeriodBars } from "@/components/charts/period-bars";
import { StateBadge } from "@/components/state-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  const { loaded, subjects, sessions } = useStore();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? null;

  const data = useMemo(() => {
    const streak = computeStreak(sessions);
    const week = weeklySummary(sessions);
    const month = monthlySummary(sessions);
    const bySubject = minutesBySubject(sessions, subjects, CHART_PALETTE);
    const total = totalMinutes(sessions);
    const enCurso = subjects.filter(
      (s) => s.state === "cursando" || s.state === "regular",
    );
    return { streak, week, month, bySubject, total, enCurso };
  }, [sessions, subjects]);

  if (!loaded) return <LoadingScreen />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {firstName ? `Hola, ${firstName}` : "Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.streak.studiedToday
              ? "Ya estudiaste hoy. Seguí así."
              : "Todavía no registraste estudio hoy."}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/pomodoro">
            <Timer className="h-4 w-4" />
            Pomodoro
          </Link>
        </Button>
      </div>

      <DailyGoalCard />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Racha actual"
          value={`${data.streak.current} ${data.streak.current === 1 ? "día" : "días"}`}
          hint={data.streak.studiedToday ? "Incluye hoy" : "Estudiá hoy para sumar"}
        />
        <StatCard
          icon={Trophy}
          label="Racha máxima"
          value={`${data.streak.longest} ${data.streak.longest === 1 ? "día" : "días"}`}
        />
        <StatCard
          icon={Clock}
          label="Esta semana"
          value={`${formatHours(data.week.totalMinutes)} h`}
          hint={data.week.rangeLabel}
        />
        <StatCard
          icon={CalendarRange}
          label="Este mes"
          value={`${formatHours(data.month.totalMinutes)} h`}
          hint={`${formatHours(data.month.dailyAverage)} h/día prom.`}
        />
      </div>

      <RankingCard />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Horas por materia</CardTitle>
            <CardDescription>
              Distribución total de tu tiempo de estudio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubjectPie data={data.bySubject} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumen semanal</CardTitle>
            <CardDescription>{data.week.rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <PeriodBars data={data.week.points} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <PlanProgress subjects={subjects} />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cursando ahora</CardTitle>
            <CardDescription>
              Materias en curso o pendientes de final
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.enCurso.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No tenés materias marcadas en curso.{" "}
                <Link href="/plan" className="text-primary underline">
                  Editá tu plan
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-border/50">
                {data.enCurso.map((s) => {
                  const min =
                    data.bySubject.find((b) => b.subjectId === s.id)?.minutes ??
                    0;
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {s.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatMinutes(min)} estudiadas
                          </p>
                        </div>
                      </div>
                      <StateBadge state={s.state} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {STATE_META.aprobada.label} y {STATE_META.promocionada.label} cuentan como
        materia terminada · Total acumulado:{" "}
        <span className="font-medium text-foreground">
          {formatHours(data.total)} h
        </span>
      </p>
    </div>
  );
}
