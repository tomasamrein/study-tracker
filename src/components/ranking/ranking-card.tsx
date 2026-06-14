"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Medal, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLeaderboard } from "@/lib/use-leaderboard";
import { formatHours } from "@/lib/stats";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MEDAL_COLORS = ["text-amber-400", "text-slate-300", "text-orange-400"];

/** Tarjeta compacta del podio semanal para el Dashboard. Sólo en modo nube. */
export function RankingCard() {
  const { cloud, user } = useAuth();
  const { entries, loaded } = useLeaderboard();

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.weekMinutes - a.weekMinutes),
    [entries],
  );

  if (!cloud || (loaded && entries.length === 0)) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-amber-400" />
            Ranking semanal
          </CardTitle>
          <CardDescription>Horas estudiadas esta semana</CardDescription>
        </div>
        <Link
          href="/ranking"
          className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
        >
          Ver todo
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {sorted.slice(0, 3).map((e, i) => {
          const isMe = e.uid === user?.uid;
          return (
            <div
              key={e.uid}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2 py-1.5",
                isMe && "bg-primary/5",
              )}
            >
              <Medal className={cn("h-4 w-4 shrink-0", MEDAL_COLORS[i])} />
              {e.photoURL ? (
                <Image
                  src={e.photoURL}
                  alt={e.name}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {e.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {e.name}
                {isMe && <span className="ml-1 text-xs text-primary">(vos)</span>}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatHours(e.weekMinutes)} h
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
