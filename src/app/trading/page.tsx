"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTrading } from "@/lib/trading/store";
import { useFilteredTrades } from "@/lib/trading/selectors";
import { dailyStats, monthKey, summarize } from "@/lib/trading/calc";
import { money, pct, pnlClass, rMult, todayInTz } from "@/lib/trading/format";
import { ALL_MODES, type Trade } from "@/lib/trading/types";
import { AccountRiskCard, PersonalLimitsAlert, PositionCalculator } from "@/components/trading/risk-panel";
import { DayJournalEditor } from "@/components/trading/day-journal";
import { Mini } from "@/components/trading/mini";
import { TradeFormDialog, useBlankTrade } from "@/components/trading/trade-form";
import { VerifyRulesNote } from "@/components/trading/trading-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TradingHoy() {
  const { state } = useTrading();
  const [editing, setEditing] = useState<Trade | null>(null);
  const blank = useBlankTrade();
  const today = todayInTz(state.settings.timezone);
  const cur = state.settings.currency;
  const sel = state.settings.selectedModeId;
  const all = useFilteredTrades();
  const todayList = all.filter((x) => x.day === today);
  const monthList = all.filter((x) => monthKey(x.day) === today.slice(0, 7));
  const t = summarize(todayList);
  const mo = summarize(monthList);
  const accounts = state.accounts.filter((a) => a.status === "activa" && (sel === ALL_MODES || a.modeId === sel));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="display mr-auto text-3xl">Hoy</h2>
        <Button
          onClick={() => {
            if (state.accounts.length === 0) return toast.error("Primero creá una cuenta en la pestaña Cuentas.");
            setEditing(blank());
          }}
        >
          <Plus className="h-4 w-4" /> Cargar trade
        </Button>
      </div>

      <PersonalLimitsAlert />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="PnL de hoy" value={money(t.totalPnl, cur, true)} className={pnlClass(t.totalPnl)} hint={`${t.count} trades · ${rMult(todayList.reduce((s, x) => s + (x.m.r ?? 0), 0))}`} />
        <Mini label="PnL del mes" value={money(mo.totalPnl, cur, true)} className={pnlClass(mo.totalPnl)} hint={`${dailyStats(monthList).length} días operados`} />
        <Mini label="Winrate del mes" value={pct(mo.winrate)} />
        <Mini label="Expectativa del mes" value={rMult(mo.expectancyR)} />
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6 text-sm text-muted-foreground">
            No tenés cuentas activas en este modo.
            <Button asChild size="sm"><Link href="/trading/cuentas">Crear cuenta</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-4 lg:grid-cols-2">
            {accounts.map((a) => <AccountRiskCard key={a.id} account={a} />)}
          </div>
          <VerifyRulesNote />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Diario de hoy</CardTitle></CardHeader>
          <CardContent><DayJournalEditor date={today} /></CardContent>
        </Card>
        <PositionCalculator />
      </div>

      {editing && <TradeFormDialog trade={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
