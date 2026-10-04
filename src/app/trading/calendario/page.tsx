"use client";

import { useMemo, useState } from "react";
import { addMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useTrading } from "@/lib/trading/store";
import { filterTrades, useFilteredTrades, useNames } from "@/lib/trading/selectors";
import { dailyStats, monthKey, weekStart, type DayStat } from "@/lib/trading/calc";
import { payoutDays } from "@/lib/trading/risk";
import { day as fmtDay, money, pnlClass, rMult, todayInTz } from "@/lib/trading/format";
import { ALL_MODES } from "@/lib/trading/types";
import { cn } from "@/lib/utils";
import { DayJournalEditor } from "@/components/trading/day-journal";
import { Mini } from "@/components/trading/mini";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WD = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function monthGrid(month: string): string[][] {
  const first = `${month}-01`;
  const start = weekStart(first);
  const weeks: string[][] = [];
  const d = new Date(`${start}T00:00:00Z`);
  do {
    const w: string[] = [];
    for (let i = 0; i < 7; i++) {
      w.push(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 1);
    }
    weeks.push(w);
  } while (d.toISOString().slice(0, 7) === month);
  return weeks;
}

export default function CalendarioPage() {
  const { state } = useTrading();
  const today = todayInTz(state.settings.timezone);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [accountId, setAccountId] = useState<string | undefined>();
  const [open, setOpen] = useState<string | null>(null);
  const list = useFilteredTrades({ accountId });
  const days = useMemo(() => dailyStats(list), [list]);
  const byDay = new Map(days.map((d) => [d.day, d]));
  const cur = state.settings.currency;
  const sel = state.settings.selectedModeId;

  // Cuenta para el contador de días de retiro: la elegida, o la primera activa con regla.
  const accounts = state.accounts.filter((a) => sel === ALL_MODES || a.modeId === sel);
  const payoutAcc =
    state.accounts.find((a) => a.id === accountId) ??
    accounts.find((a) => a.status === "activa" && a.rules.payoutDays != null);
  const min = payoutAcc?.rules.payoutDayMin ?? null;
  const accDays = payoutAcc ? dailyStats(filterTrades(state, { accountId: payoutAcc.id }, ALL_MODES)) : [];
  const qualifying = new Set(payoutDays(accDays, min).map((d) => d.day));

  const weeks = monthGrid(month);
  const monthDays = days.filter((d) => monthKey(d.day) === month);
  const monthPnl = monthDays.reduce((s, d) => s + d.pnl, 0);
  const monthTrades = monthDays.reduce((s, d) => s + d.count, 0);
  const label = format(new Date(`${month}-15T12:00:00`), "MMMM yyyy", { locale: es });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setMonth(format(addMonths(new Date(`${month}-15T12:00:00`), -1), "yyyy-MM"))} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="display min-w-44 text-center text-3xl capitalize">{label}</h2>
          <Button variant="ghost" size="icon" onClick={() => setMonth(format(addMonths(new Date(`${month}-15T12:00:00`), 1), "yyyy-MM"))} aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {month !== today.slice(0, 7) && <Button variant="ghost" size="sm" onClick={() => setMonth(today.slice(0, 7))}>Hoy</Button>}
        </div>
        <Select value={accountId ?? "__all"} onValueChange={(v) => setAccountId(v === "__all" ? undefined : v)}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todas las cuentas</SelectItem>
            {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Mini label="PnL del mes" value={money(monthPnl, cur, true)} className={pnlClass(monthPnl)} />
        <Mini label="Trades del mes" value={String(monthTrades)} hint={`${monthDays.length} días operados`} />
        {payoutAcc && payoutAcc.rules.payoutDays != null ? (
          <Mini
            label={`Días de retiro · ${payoutAcc.name}`}
            value={`${qualifying.size} de ${payoutAcc.rules.payoutDays}`}
            hint={`Días con ≥ ${money(min, cur)}`}
            className={qualifying.size >= payoutAcc.rules.payoutDays ? "text-emerald-500" : ""}
          />
        ) : (
          <Mini label="Días de retiro" value="—" hint="Elegí una cuenta con esa regla" />
        )}
      </div>

      <Card className="py-0">
        <CardContent className="overflow-x-auto p-0">
          <div className="grid min-w-[640px] grid-cols-[repeat(7,minmax(0,1fr))_96px] text-xs">
            {WD.map((w) => <div key={w} className="border-b px-2 py-2 text-muted-foreground">{w}</div>)}
            <div className="border-b px-2 py-2 text-right text-muted-foreground">Semana</div>
            {weeks.map((w) => {
              const wk = w.map((d) => byDay.get(d)).filter((x): x is DayStat => !!x && monthKey(x.day) === month);
              const wPnl = wk.reduce((s, d) => s + d.pnl, 0);
              return [
                ...w.map((d) => {
                  const st = byDay.get(d);
                  const inMonth = monthKey(d) === month;
                  return (
                    <button
                      key={d}
                      onClick={() => setOpen(d)}
                      className={cn(
                        "relative flex min-h-20 flex-col items-start gap-0.5 border-b border-r p-1.5 text-left transition-colors hover:bg-muted/50",
                        !inMonth && "opacity-35",
                        st && st.pnl > 0 && "bg-emerald-500/15",
                        st && st.pnl < 0 && "bg-red-500/15",
                        st && st.pnl === 0 && "bg-muted",
                        d === today && "ring-1 ring-inset ring-foreground",
                      )}
                    >
                      <span className="text-muted-foreground">{Number(d.slice(8))}</span>
                      {qualifying.has(d) && <Star className="absolute right-1.5 top-1.5 h-3 w-3 fill-amber-400 text-amber-400" aria-label="Cuenta para retiro" />}
                      {st && (
                        <>
                          <span className={cn("font-mono tabular-nums", pnlClass(st.pnl))}>{money(st.pnl, cur, true)}</span>
                          <span className="text-muted-foreground">{st.count} trade{st.count === 1 ? "" : "s"}</span>
                        </>
                      )}
                      {state.journal[d]?.notes && <span className="text-muted-foreground">✎</span>}
                    </button>
                  );
                }),
                <div key={`w-${w[0]}`} className="flex flex-col items-end justify-center border-b px-2 font-mono tabular-nums">
                  {wk.length > 0 && (
                    <>
                      <span className={pnlClass(wPnl)}>{money(wPnl, cur, true)}</span>
                      <span className="text-muted-foreground">{wk.reduce((s, d) => s + d.count, 0)} tr.</span>
                    </>
                  )}
                </div>,
              ];
            })}
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        <Star className="inline h-3 w-3 fill-amber-400 text-amber-400" /> = día que cuenta para el retiro según la regla de la cuenta.
      </p>

      {open && <DayDialog date={open} onClose={() => setOpen(null)} stat={byDay.get(open)} />}
    </div>
  );
}

function DayDialog({ date, stat, onClose }: { date: string; stat?: DayStat; onClose: () => void }) {
  const { state } = useTrading();
  const list = useFilteredTrades({ from: date, to: date });
  const names = useNames();
  const cur = state.settings.currency;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{fmtDay(date, state.settings.dateFormat)}</DialogTitle>
          <DialogDescription>
            {stat ? (
              <span className={pnlClass(stat.pnl)}>{money(stat.pnl, cur, true)} · {stat.count} trades · {rMult(stat.r)}</span>
            ) : "Sin trades este día."}
          </DialogDescription>
        </DialogHeader>
        {list.length > 0 && (
          <ul className="divide-y rounded-md border text-sm">
            {list.map(({ trade: t, m }) => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2">
                <span className="font-mono text-xs text-muted-foreground">{t.entryAt.slice(11, 16)}</span>
                <span className={t.direction === "long" ? "text-emerald-500" : "text-red-500"}>{t.direction === "long" ? "L" : "S"}</span>
                <span className="min-w-0 flex-1 truncate">{names.instrument(t.instrumentId)} × {t.contracts} · {names.setup(t.setupId)}{!t.followedPlan && " · rompí el plan"}</span>
                <span className={cn("font-mono tabular-nums", pnlClass(m.pnl))}>{money(m.pnl, cur, true)}</span>
              </li>
            ))}
          </ul>
        )}
        <DayJournalEditor date={date} />
      </DialogContent>
    </Dialog>
  );
}
