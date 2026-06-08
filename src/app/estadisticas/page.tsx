"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, CalendarRange, Trash2, Timer, PencilLine } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  formatHours,
  formatMinutes,
  lastNDays,
  minutesBySubject,
  monthlySummary,
  weeklySummary,
} from "@/lib/stats";
import { CHART_PALETTE } from "@/lib/palette";
import { LoadingScreen } from "@/components/loading-screen";
import { SubjectPie } from "@/components/charts/subject-pie";
import { PeriodBars } from "@/components/charts/period-bars";
import { ManualSessionDialog } from "@/components/stats/manual-session-dialog";
import { DataManagement } from "@/components/stats/data-management";
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
  const { loaded, subjects, sessions, deleteSession } = useStore();

  const data = useMemo(() => {
    const week = weeklySummary(sessions);
    const month = monthlySummary(sessions);
    const last30 = lastNDays(sessions, 30);
    const bySubject = minutesBySubject(sessions, subjects, CHART_PALETTE);
    const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
    const recent = [...sessions]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 40);
    return { week, month, last30, bySubject, subjectName, recent };
  }, [sessions, subjects]);

  if (!loaded) return <LoadingScreen />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
          <p className="text-sm text-muted-foreground">
            Resumen semanal, mensual e historial de estudio.
          </p>
        </div>
        <ManualSessionDialog />
      </div>

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
                color="var(--chart-2, #06b6d4)"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Horas por materia</CardTitle>
            <CardDescription>Distribución total acumulada</CardDescription>
          </CardHeader>
          <CardContent>
            <SubjectPie data={data.bySubject} maxSlices={10} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Últimos 30 días</CardTitle>
            <CardDescription>Constancia diaria de estudio</CardDescription>
          </CardHeader>
          <CardContent>
            <PeriodBars data={data.last30} height={240} color="#10b981" />
          </CardContent>
        </Card>
      </div>

      {/* Historial */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Historial de sesiones</CardTitle>
          <CardDescription>
            {sessions.length} sesiones registradas · mostrando las últimas{" "}
            {data.recent.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.recent.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Todavía no hay sesiones. Hacé un pomodoro o cargá una manual.
            </p>
          ) : (
            <ScrollArea className="h-80">
              <ul className="divide-y">
                {data.recent.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 px-6 py-2.5"
                  >
                    {s.source === "pomodoro" ? (
                      <Timer className="h-4 w-4 shrink-0 text-indigo-500" />
                    ) : (
                      <PencilLine className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {data.subjectName.get(s.subjectId) ?? "Materia eliminada"}
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
        <p className="text-lg font-semibold">{formatHours(total)} h</p>
      </div>
      <div>
        <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <CalendarRange className="h-3 w-3" /> Prom/día
        </p>
        <p className="text-lg font-semibold">{formatHours(average)} h</p>
      </div>
    </div>
  );
}
