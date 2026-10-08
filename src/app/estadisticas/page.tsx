"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, CalendarRange, Flame, Sigma, Trash2, Timer, PencilLine } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  areaOf,
  computeStreak,
  formatHours,
  formatMinutes,
  lastNDays,
  minutesByArea,
  minutesBySubject,
  monthlySummary,
  sessionsInArea,
  totalMinutes,
  weeklySummary,
} from "@/lib/stats";
import { CHART_PALETTE } from "@/lib/palette";
import { LoadingScreen } from "@/components/loading-screen";
import { SubjectPie } from "@/components/charts/subject-pie";
import { PeriodBars } from "@/components/charts/period-bars";
import { ManualSessionDialog } from "@/components/stats/manual-session-dialog";
import { DataManagement } from "@/components/stats/data-management";
import { AchievementsGrid } from "@/components/rewards/achievements-grid";
import { RankingView } from "@/components/ranking/ranking-view";
import { StatCard } from "@/components/stat-card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function EstadisticasPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Estadisticas />
    </Suspense>
  );
}

function Estadisticas() {
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") === "ranking" ? "ranking" : "resumen");
  const { loaded } = useStore();
  if (!loaded) return <LoadingScreen />;

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">Estadísticas</p>
          <h1 className="display text-5xl md:text-6xl">Lo que medís, mejora.</h1>
        </div>
        <ManualSessionDialog />
      </header>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen" className="mt-8">
          <Resumen />
        </TabsContent>
        <TabsContent value="ranking" className="mt-8">
          <RankingView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Resumen() {
  const { subjects, sessions: allSessions, areas, deleteSession } = useStore();
  const [areaFilter, setAreaFilter] = useState("all");
  const sessions = useMemo(
    () => sessionsInArea(allSessions, areaFilter),
    [allSessions, areaFilter],
  );

  const data = useMemo(() => {
    const week = weeklySummary(sessions);
    const month = monthlySummary(sessions);
    const last30 = lastNDays(sessions, 30);
    const bySubject = minutesBySubject(sessions, subjects, CHART_PALETTE);
    const byArea = minutesByArea(allSessions, areas);
    const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
    const areaName = new Map(areas.map((a) => [a.id, a.name]));
    const streak = computeStreak(sessions);
    const total = totalMinutes(sessions);
    const recent = [...sessions]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 40);
    return { week, month, last30, bySubject, byArea, subjectName, areaName, streak, total, recent };
  }, [sessions, allSessions, subjects, areas]);

  const maxArea = Math.max(1, ...data.byArea.map((a) => a.minutes));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
        {[{ id: "all", name: "Todas" }, ...areas].map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAreaFilter(a.id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              areaFilter === a.id
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {a.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Sigma} label="Total" value={`${formatHours(data.total)} h`} />
        <StatCard icon={Clock} label="Semana" value={`${formatHours(data.week.totalMinutes)} h`} />
        <StatCard icon={Flame} label="Racha" value={`${data.streak.current} d`} hint={`récord ${data.streak.longest} d`} />
        <StatCard icon={CalendarRange} label="Mes" value={`${formatHours(data.month.totalMinutes)} h`} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Horas por área</CardTitle>
          <CardDescription>Distribución total de tu enfoque</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.byArea.map((a) => (
            <div key={a.areaId} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span>{a.name}</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatHours(a.minutes)} h
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-foreground transition-[width] duration-500"
                  style={{ width: `${(a.minutes / maxArea) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Resúmenes por período */}
      <Tabs defaultValue="week">
        <TabsList>
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mes</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-base">Resumen semanal</CardTitle>
                <CardDescription>{data.week.rangeLabel}</CardDescription>
              </div>
              <PeriodTotals
                total={data.week.totalMinutes}
                average={data.week.dailyAverage}
              />
            </CardHeader>
            <CardContent>
              <PeriodBars data={data.week.points} height={240} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="month" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-base capitalize">
                  {data.month.rangeLabel}
                </CardTitle>
                <CardDescription>Horas por día del mes</CardDescription>
              </div>
              <PeriodTotals
                total={data.month.totalMinutes}
                average={data.month.dailyAverage}
              />
            </CardHeader>
            <CardContent>
              <PeriodBars
                data={data.month.points}
                height={240}
                color="var(--chart-2)"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Horas por materia</CardTitle>
            <CardDescription>Sólo focos de la carrera</CardDescription>
          </CardHeader>
          <CardContent>
            <SubjectPie data={data.bySubject} maxSlices={10} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Últimos 30 días</CardTitle>
            <CardDescription>Constancia diaria de enfoque</CardDescription>
          </CardHeader>
          <CardContent>
            <PeriodBars data={data.last30} height={240} color="var(--chart-1)" />
          </CardContent>
        </Card>
      </div>

      {/* Historial */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Historial de focos</CardTitle>
          <CardDescription>
            {sessions.length} focos registrados · mostrando los últimos{" "}
            {data.recent.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.recent.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Todavía no hay focos. Empezá uno o cargalo a mano.
            </p>
          ) : (
            <ScrollArea className="h-80">
              <ul className="divide-y">
                {data.recent.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 px-6 py-2.5"
                  >
                    {s.source !== "manual" ? (
                      <Timer className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    ) : (
                      <PencilLine className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {data.areaName.get(areaOf(s)) ?? "Área"}
                        {s.subjectId
                          ? ` · ${data.subjectName.get(s.subjectId) ?? "Materia eliminada"}`
                          : s.label
                            ? ` · ${s.label}`
                            : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(s.startedAt), "EEE d MMM yyyy · HH:mm", {
                          locale: es,
                        })}
                        {s.note ? ` · ${s.note}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {formatMinutes(s.minutes)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteSession(s.id)}
                      aria-label="Eliminar sesión"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AchievementsGrid />

      <DataManagement />
    </div>
  );
}

function PeriodTotals({
  total,
  average,
}: {
  total: number;
  average: number;
}) {
  return (
    <div className="flex gap-4 text-right">
      <div>
        <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> Total
        </p>
        <p className="display text-3xl tabular-nums">{formatHours(total)} h</p>
      </div>
      <div>
        <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <CalendarRange className="h-3 w-3" /> Prom/día
        </p>
        <p className="display text-3xl tabular-nums">{formatHours(average)} h</p>
      </div>
    </div>
  );
}
