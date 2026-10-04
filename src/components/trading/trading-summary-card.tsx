"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatMinutes } from "@/lib/stats";
import { useTrading } from "@/lib/trading/store";
import { filterTrades } from "@/lib/trading/selectors";
import { dailyStats, monthKey, summarize, weekStart } from "@/lib/trading/calc";
import { payoutDays } from "@/lib/trading/risk";
import { money, pnlClass, todayInTz } from "@/lib/trading/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Resumen chico de Trading para el dashboard "Hoy". */
export function TradingSummaryCard() {
  const { state, loaded } = useTrading();
  const { sessions, areas, addArea } = useStore();
  const tradingArea = areas.find((a) => /trading/i.test(a.name));
  const today = todayInTz(state.settings.timezone);

  const data = useMemo(() => {
    const month = filterTrades(state, { from: `${monthKey(today)}-01`, to: today });
    const acc = state.accounts.find((a) => a.status === "activa" && a.rules.payoutDays != null);
    const accDays = acc ? dailyStats(filterTrades(state, { accountId: acc.id }, "all")) : [];
    return {
      pnl: summarize(month).totalPnl,
      count: month.length,
      acc,
      payout: acc ? payoutDays(accDays, acc.rules.payoutDayMin).length : 0,
    };
  }, [state, today]);

  const weekMin = useMemo(() => {
    if (!tradingArea) return 0;
    const ws = weekStart(today);
    return sessions.filter((s) => s.areaId === tradingArea.id && s.startedAt.slice(0, 10) >= ws).reduce((t, s) => t + s.minutes, 0);
  }, [sessions, tradingArea, today]);

  if (!loaded) return null;
  if (state.trades.length === 0 && state.accounts.length === 0) return null;
  const mode = state.modes.find((m) => m.id === state.settings.selectedModeId)?.name ?? "Todos";
  const cur = state.settings.currency;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Trading</CardTitle>
          <CardDescription>Modo: {mode}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/trading">Abrir <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">PnL del mes</p>
          <p className={`font-mono text-lg tabular-nums ${pnlClass(data.pnl)}`}>{money(data.pnl, cur, true)}</p>
          <p className="text-xs text-muted-foreground">{data.count} trades</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Días de retiro</p>
          <p className="font-mono text-lg tabular-nums">{data.acc ? `${data.payout} de ${data.acc.rules.payoutDays}` : "—"}</p>
          <p className="truncate text-xs text-muted-foreground">{data.acc?.name ?? "Sin cuenta con la regla"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Estudio de trading</p>
          {tradingArea ? (
            <>
              <p className="font-mono text-lg tabular-nums">{formatMinutes(weekMin)}</p>
              <p className="text-xs text-muted-foreground">esta semana</p>
            </>
          ) : (
            <Button variant="outline" size="sm" className="mt-1" onClick={() => addArea("Trading")}>
              <Plus className="h-4 w-4" /> Crear área
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
