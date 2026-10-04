"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useTrading } from "@/lib/trading/store";
import { filterTrades } from "@/lib/trading/selectors";
import { dailyStats, lossesToLimit, positionSize } from "@/lib/trading/calc";
import { alertLevel, computeDll, computeMll, consistency, payoutDays, personalWarnings } from "@/lib/trading/risk";
import { money, pct, pnlClass, todayInTz } from "@/lib/trading/format";
import { ALL_MODES, type TradingAccount } from "@/lib/trading/types";
import { cn } from "@/lib/utils";
import { LevelBar } from "@/components/trading/mini";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Panel de una cuenta: balance, distancia al MLL y al DLL del día. */
export function AccountRiskCard({ account }: { account: TradingAccount }) {
  const { state } = useTrading();
  const today = todayInTz(state.settings.timezone);
  const cur = state.settings.currency;
  const lim = state.settings.limits;
  const data = useMemo(() => {
    const list = filterTrades(state, { accountId: account.id }, ALL_MODES);
    const days = dailyStats(list);
    const todayStat = days.find((d) => d.day === today);
    return {
      mll: computeMll(account.size, account.rules, list),
      dll: computeDll(todayStat?.pnl ?? 0, account.rules.dailyLoss),
      payout: payoutDays(days, account.rules.payoutDayMin).length,
      cons: consistency(days),
      todayStat,
    };
  }, [state, account, today]);
  const { mll, dll } = data;
  const r = account.rules;
  const mllLevel = mll.breached ? "danger" : alertLevel(mll.usedPct, lim);
  const dllLevel = dll.breached ? "danger" : alertLevel(dll.usedPct, lim);
  const profit = mll.balance - account.size;
  const payoutsDone = state.payouts.filter((p) => p.accountId === account.id).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {account.name}
          <Badge variant="secondary">{state.modes.find((m) => m.id === account.modeId)?.name}</Badge>
          {mll.breached && <Badge variant="destructive">Tocó el MLL el {mll.breachedOn}</Badge>}
        </CardTitle>
        <CardDescription>
          Balance <span className="font-mono text-foreground">{money(mll.balance, cur)}</span>{" "}
          (<span className={pnlClass(profit)}>{money(profit, cur, true)}</span>)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {r.maxLoss != null && mll.floor != null && (
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span>MLL {r.drawdownType.toUpperCase()} · piso {money(mll.floor, cur)}</span>
              <span className="font-mono tabular-nums">{money(mll.distance, cur)} de margen</span>
            </div>
            <LevelBar pct={mll.usedPct ?? 0} level={mllLevel} />
            <p className="text-xs text-muted-foreground">{pct(mll.usedPct)} consumido del MLL</p>
          </div>
        )}
        {dll.limit != null && (
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span>DLL de hoy · {money(dll.limit, cur)}</span>
              <span className="font-mono tabular-nums">{money(dll.remaining, cur)} disponibles</span>
            </div>
            <LevelBar pct={dll.usedPct ?? 0} level={dllLevel} />
            <p className="text-xs text-muted-foreground">
              Hoy: <span className={pnlClass(dll.dayPnl)}>{money(dll.dayPnl, cur, true)}</span>
              {dll.breached && " · llegaste al DLL, cortá por hoy"}
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {r.profitTarget != null && <Kv k="Profit target" v={`${money(profit, cur)} / ${money(r.profitTarget, cur)}`} />}
          {r.payoutDays != null && <Kv k="Días de retiro" v={`${data.payout} de ${r.payoutDays}`} />}
          {r.payoutsToLive != null && <Kv k="Payouts a Live" v={`${payoutsDone} de ${r.payoutsToLive}`} />}
          {r.consistencyPct != null && (
            <Kv k="Consistencia" v={`${pct(data.cons)} (máx. ${r.consistencyPct}%)`} warn={data.cons != null && data.cons > r.consistencyPct} />
          )}
        </div>
        {(mllLevel !== "ok" || dllLevel !== "ok") && !mll.breached && (
          <p className={cn("flex items-center gap-2 text-xs", mllLevel === "danger" || dllLevel === "danger" ? "text-red-500" : "text-amber-500")}>
            <AlertTriangle className="h-4 w-4" /> Te estás acercando a un límite de la cuenta.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Kv({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="rounded-md border px-2 py-1.5">
      <p className="text-muted-foreground">{k}</p>
      <p className={cn("font-mono tabular-nums", warn && "text-amber-500")}>{v}</p>
    </div>
  );
}

/** Avisos de tus límites personales para hoy (según el modo elegido). */
export function PersonalLimitsAlert() {
  const { state } = useTrading();
  const today = todayInTz(state.settings.timezone);
  const warnings = useMemo(() => {
    const days = dailyStats(filterTrades(state, { from: today, to: today }));
    return personalWarnings(days[0], state.settings.limits);
  }, [state, today]);
  if (warnings.length === 0) return null;
  return (
    <div className="space-y-1 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-amber-500"><AlertTriangle className="h-4 w-4" /> Límites personales</p>
      {warnings.map((w) => <p key={w}>{w}</p>)}
    </div>
  );
}

/** Calculadora de tamaño de posición + tabla de pérdidas seguidas hasta DLL/MLL. */
export function PositionCalculator() {
  const { state } = useTrading();
  const [risk, setRisk] = useState("200");
  const [stop, setStop] = useState("20");
  const [instrumentId, setInstrumentId] = useState(state.settings.defaultInstrumentId);
  const ins = state.instruments.find((i) => i.id === instrumentId) ?? state.instruments[0];
  const cur = state.settings.currency;
  const riskN = Number(risk), stopN = Number(stop);
  const contracts = ins ? positionSize(riskN, stopN, ins.pointValue) : 0;
  const realRisk = ins ? contracts * stopN * ins.pointValue : 0;
  const sel = state.settings.selectedModeId;
  const acc = state.accounts.find((a) => a.status === "activa" && (sel === ALL_MODES || a.modeId === sel) && (a.rules.dailyLoss != null || a.rules.maxLoss != null));
  const dll = acc?.rules.dailyLoss ?? null;
  const mll = acc?.rules.maxLoss ?? null;
  const base = riskN > 0 ? riskN : 100;
  const levels = Array.from(new Set([base * 0.5, base, base * 1.5, base * 2, 100, 200, 300, 500].map((x) => Math.round(x)))).sort((a, b) => a - b);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculadora de posición</CardTitle>
        <CardDescription>Contratos = riesgo ÷ (puntos de stop × valor por punto).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5"><Label className="text-xs">Riesgo ({cur})</Label><Input inputMode="decimal" value={risk} onChange={(e) => setRisk(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Stop (puntos)</Label><Input inputMode="decimal" value={stop} onChange={(e) => setStop(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label className="text-xs">Instrumento</Label>
            <Select value={ins?.id} onValueChange={setInstrumentId}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{state.instruments.map((i) => <SelectItem key={i.id} value={i.id}>{i.symbol}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="font-mono text-3xl tabular-nums">{contracts} <span className="text-base text-muted-foreground">contratos</span></p>
          <p className="text-xs text-muted-foreground">Riesgo real: {money(realRisk, cur)} ({ins?.symbol}: {money(ins?.pointValue, cur)} por punto)</p>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Pérdidas seguidas hasta el límite{acc ? ` · ${acc.name}` : ""}</p>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground"><th className="font-normal">Riesgo/trade</th><th className="text-right font-normal">Hasta DLL</th><th className="text-right font-normal">Hasta MLL</th></tr></thead>
            <tbody className="font-mono tabular-nums">
              {levels.map((l) => (
                <tr key={l} className={cn("border-t", l === Math.round(base) && "font-semibold")}>
                  <td className="py-1">{money(l, cur)}</td>
                  <td className="text-right">{lossesToLimit(dll, l) ?? "—"}</td>
                  <td className="text-right">{lossesToLimit(mll, l) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
