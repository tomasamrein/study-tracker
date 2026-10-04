"use client";

import { useMemo, useState } from "react";
import { useTrading } from "@/lib/trading/store";
import { useFilteredTrades, useNames, type TradeFilters } from "@/lib/trading/selectors";
import {
  byTradesPerDay, dailyStats, equityCurve, groupSummary, monthKey, summarize, sumBy, weekdayName, weekStart,
  type Enriched, type Summary,
} from "@/lib/trading/calc";
import { day as fmtDay, money, num, pct, pnlClass, rMult } from "@/lib/trading/format";
import { cn } from "@/lib/utils";
import { EquityChart, PnlBars } from "@/components/trading/charts";
import { FilterBar } from "@/components/trading/filter-bar";
import { Mini } from "@/components/trading/mini";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Period = "dia" | "semana" | "mes";

export default function EstadisticasPage() {
  const { state } = useTrading();
  const [filters, setFilters] = useState<TradeFilters>({});
  const [period, setPeriod] = useState<Period>("dia");
  const list = useFilteredTrades(filters);
  const names = useNames();
  const cur = state.settings.currency;
  const fmt = state.settings.dateFormat;
  const s = useMemo(() => summarize(list), [list]);
  const days = useMemo(() => dailyStats(list), [list]);
  const eq = useMemo(() => equityCurve(list), [list]);

  const periodData = useMemo(() => {
    if (period === "dia") return days.map((d) => ({ key: d.day, label: fmtDay(d.day, fmt).slice(0, 5), pnl: d.pnl, count: d.count }));
    if (period === "semana") return sumBy(days, weekStart).map((g) => ({ key: g.key, label: `Sem ${fmtDay(g.key, fmt).slice(0, 5)}`, pnl: g.pnl, count: g.count }));
    return sumBy(days, monthKey).map((g) => ({ key: g.key, label: g.key, pnl: g.pnl, count: g.count }));
  }, [days, period, fmt]);

  const bestDay = days.reduce<(typeof days)[number] | null>((b, d) => (!b || d.pnl > b.pnl ? d : b), null);
  const worstDay = days.reduce<(typeof days)[number] | null>((b, d) => (!b || d.pnl < b.pnl ? d : b), null);
  const emotionBucket = (x: Enriched) => {
    const e = x.trade.emotionBefore;
    return e == null ? "Sin registrar" : e <= 3 ? "1–3 (baja)" : e <= 7 ? "4–7 (media)" : "8–10 (alta)";
  };
  const emotionTags = useMemo(() => {
    const rows: { key: string; s: Summary }[] = [];
    const tags = new Set(list.flatMap((x) => x.trade.emotionTags ?? []));
    for (const t of tags) rows.push({ key: t, s: summarize(list.filter((x) => x.trade.emotionTags?.includes(t))) });
    return rows.sort((a, b) => b.s.totalPnl - a.s.totalPnl);
  }, [list]);

  return (
    <div className="space-y-6">
      <h2 className="display text-3xl">Estadísticas</h2>
      <FilterBar value={filters} onChange={setFilters} />

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay trades con estos filtros todavía.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini label="PnL total" value={money(s.totalPnl, cur, true)} className={pnlClass(s.totalPnl)} hint={`${s.count} trades · ${days.length} días`} />
            <Mini label="Winrate" value={pct(s.winrate)} hint={`${s.wins} G · ${s.losses} P · ${s.breakeven} BE`} />
            <Mini label="Expectativa" value={rMult(s.expectancyR)} hint={`${money(s.expectancyUsd, cur)} por trade`} />
            <Mini label="Profit factor" value={num(s.profitFactor)} />
            <Mini label="R prom. ganadores" value={rMult(s.avgRWin)} hint={money(s.avgWin, cur)} />
            <Mini label="R prom. perdedores" value={rMult(s.avgRLoss)} hint={money(s.avgLoss, cur)} />
            <Mini label="Máx. drawdown" value={money(eq.maxDrawdown, cur)} className={eq.maxDrawdown < 0 ? "text-red-500" : ""} />
            <Mini label="Rachas máx." value={`${s.maxWinStreak} G / ${s.maxLossStreak} P`} />
            <Mini label="Mejor trade" value={money(s.best?.m.pnl, cur, true)} hint={s.best ? fmtDay(s.best.day, fmt) : ""} />
            <Mini label="Peor trade" value={money(s.worst?.m.pnl, cur, true)} hint={s.worst ? fmtDay(s.worst.day, fmt) : ""} />
            <Mini label="Mejor día" value={money(bestDay?.pnl, cur, true)} hint={bestDay ? fmtDay(bestDay.day, fmt) : ""} />
            <Mini label="Peor día" value={money(worstDay?.pnl, cur, true)} hint={worstDay ? fmtDay(worstDay.day, fmt) : ""} />
          </div>
          {s.noStop > 0 && (
            <p className="text-xs text-muted-foreground">{s.noStop} trade(s) sin stop: cuentan para el PnL pero no para las métricas en R.</p>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Curva de equity y drawdown</CardTitle>
              <CardDescription>PnL acumulado trade a trade; abajo, la caída desde el máximo.</CardDescription>
            </CardHeader>
            <CardContent><EquityChart points={eq.points} currency={cur} /></CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>PnL por período</CardTitle>
              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <TabsList>
                  <TabsTrigger value="dia">Día</TabsTrigger>
                  <TabsTrigger value="semana">Semana</TabsTrigger>
                  <TabsTrigger value="mes">Mes</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent><PnlBars data={periodData} currency={cur} /></CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cumplimiento del plan</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Mini label="Trades con el plan" value={pct(s.planPct)} />
              <Mini label="PnL siguiendo el plan" value={money(s.pnlFollowed, cur, true)} className={pnlClass(s.pnlFollowed)} />
              <Mini label="PnL rompiendo el plan" value={money(s.pnlNotFollowed, cur, true)} className={pnlClass(s.pnlNotFollowed)} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <GroupTable title="Por setup" rows={groupSummary(list, (x) => names.setup(x.trade.setupId))} cur={cur} />
            <GroupTable title="Por sesión / horario" rows={groupSummary(list, (x) => names.session(x.trade.sessionId))} cur={cur} />
            <GroupTable title="Por hora de entrada" rows={groupSummary(list, (x) => `${x.trade.entryAt.slice(11, 13)} h`).sort((a, b) => a.key.localeCompare(b.key))} cur={cur} />
            <GroupTable
              title="Por día de la semana"
              rows={groupSummary(list, (x) => weekdayName(x.day)).sort(
                (a, b) => ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].indexOf(a.key) - ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].indexOf(b.key),
              )}
              cur={cur}
            />
            <GroupTable title="Por emoción antes del trade" rows={groupSummary(list, emotionBucket)} cur={cur} />
            {emotionTags.length > 0 && <GroupTable title="Por etiqueta de emoción" rows={emotionTags} cur={cur} />}
            <GroupTable title="Por instrumento" rows={groupSummary(list, (x) => names.instrument(x.trade.instrumentId))} cur={cur} />
            <Card>
              <CardHeader>
                <CardTitle>Trades por día (sobreoperación)</CardTitle>
                <CardDescription>Cómo te va según cuántos trades hacés en el día.</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleTable
                  head={["Trades/día", "Días", "PnL prom.", "PnL total"]}
                  rows={byTradesPerDay(days).map((r) => [String(r.trades), String(r.days), <Pnl key="a" v={r.avgPnl} cur={cur} />, <Pnl key="b" v={r.totalPnl} cur={cur} />])}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <PhaseTargets />
    </div>
  );
}

function Pnl({ v, cur }: { v: number; cur: string }) {
  return <span className={pnlClass(v)}>{money(v, cur, true)}</span>;
}

function SimpleTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            {head.map((h, i) => <th key={h} className={cn("py-1 font-normal", i > 0 && "text-right")}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((c, j) => <td key={j} className={cn("py-1.5", j > 0 && "text-right font-mono tabular-nums")}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupTable({ title, rows, cur }: { title: string; rows: { key: string; s: Summary }[]; cur: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <SimpleTable
          head={["", "Trades", "Winrate", "Expect.", "PnL"]}
          rows={rows.map((r) => [r.key, String(r.s.count), pct(r.s.winrate), rMult(r.s.expectancyR), <Pnl key="p" v={r.s.totalPnl} cur={cur} />])}
        />
      </CardContent>
    </Card>
  );
}

/** Trades registrados vs. objetivo de cada fase (ignora el toggle de modo). */
function PhaseTargets() {
  const { state } = useTrading();
  const rows = state.modes.filter((m) => !m.hidden);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trades por fase vs. objetivo</CardTitle>
        <CardDescription>Los objetivos se editan en Ajustes → Modos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((m) => {
          const n = state.trades.filter((t) => t.modeId === m.id).length;
          const target = m.targetTrades;
          return (
            <div key={m.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{m.name}</span>
                <span className="font-mono tabular-nums text-muted-foreground">{n}{target ? ` / ${target}` : ""}</span>
              </div>
              {target ? (
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, (n / target) * 100)}%` }} />
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
