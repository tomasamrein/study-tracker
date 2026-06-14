"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Flame, Clock, Medal, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLeaderboard } from "@/lib/use-leaderboard";
import { formatHours } from "@/lib/stats";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";
import { LoadingScreen } from "@/components/loading-screen";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Metric = "week" | "streak";

const MEDAL_COLORS = ["text-amber-400", "text-slate-300", "text-orange-400"];

export default function RankingPage() {
  const { cloud, user } = useAuth();
  const { entries, loaded } = useLeaderboard();
  const [metric, setMetric] = useState<Metric>("week");

  const sorted = useMemo(() => sortBy(entries, metric), [entries, metric]);

  if (!cloud) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              El ranking necesita Firebase configurado e iniciar sesión para
              comparar las horas entre las cuentas. Ahora estás en modo local.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!loaded) return <LoadingScreen />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ranking</h1>
        <p className="text-sm text-muted-foreground">
          Competencia de estudio en tiempo real ⚡
        </p>
      </div>

      <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
        <TabsList className="w-full">
          <TabsTrigger value="week">
            <Clock className="h-4 w-4" />
            Esta semana
          </TabsTrigger>
          <TabsTrigger value="streak">
            <Flame className="h-4 w-4" />
            Racha actual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-4">
          <Podium entries={sorted} metric="week" currentUid={user?.uid} />
        </TabsContent>
        <TabsContent value="streak" className="mt-4">
          <Podium entries={sorted} metric="streak" currentUid={user?.uid} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function sortBy(entries: LeaderboardEntry[], metric: Metric): LeaderboardEntry[] {
  const value = (e: LeaderboardEntry) =>
    metric === "week" ? e.weekMinutes : e.currentStreak;
  return [...entries].sort((a, b) => value(b) - value(a));
}

function metricValue(e: LeaderboardEntry, metric: Metric): string {
  if (metric === "week") return `${formatHours(e.weekMinutes)} h`;
  return `${e.currentStreak} ${e.currentStreak === 1 ? "día" : "días"}`;
}

function Podium({
  entries,
  metric,
  currentUid,
}: {
  entries: LeaderboardEntry[];
  metric: Metric;
  currentUid?: string;
}) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Todavía no hay nadie en el ranking. ¡Registrá estudio para aparecer!
        </CardContent>
      </Card>
    );
  }

  const leaderValue = metric === "week" ? entries[0].weekMinutes : entries[0].currentStreak;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tabla de posiciones</CardTitle>
        <CardDescription>
          {metric === "week"
            ? "Horas estudiadas esta semana"
            : "Días consecutivos estudiando"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((e, i) => {
          const isMe = e.uid === currentUid;
          const value = metric === "week" ? e.weekMinutes : e.currentStreak;
          const pct = leaderValue > 0 ? (value / leaderValue) * 100 : 0;
          return (
            <div
              key={e.uid}
              className={cn(
                "relative overflow-hidden rounded-xl border p-3 transition-colors",
                isMe ? "border-primary/50 bg-primary/5" : "bg-card",
              )}
            >
              {/* Barra de progreso de fondo */}
              <div
                className="absolute inset-y-0 left-0 -z-0 bg-primary/5"
                style={{ width: `${pct}%` }}
                aria-hidden
              />
              <div className="relative flex items-center gap-3">
                <div className="flex w-7 shrink-0 items-center justify-center">
                  {i < 3 ? (
                    <Medal className={cn("h-5 w-5", MEDAL_COLORS[i])} />
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                  )}
                </div>

                {e.photoURL ? (
                  <Image
                    src={e.photoURL}
                    alt={e.name}
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {e.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-semibold">
                    {e.name}
                    {isMe && (
                      <span className="ml-1.5 text-xs font-normal text-primary">
                        (vos)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.career}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-heading text-lg font-semibold tabular-nums">
                    {metricValue(e, metric)}
                  </p>
                  <p className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                    {metric === "week" ? (
                      <>
                        <Flame className="h-3 w-3" />
                        {e.currentStreak}d · {formatHours(e.totalMinutes)} h tot.
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        {formatHours(e.weekMinutes)} h esta sem.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
