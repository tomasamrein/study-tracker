"use client";

import Link from "next/link";
import { useTrading } from "@/lib/trading/store";
import { attemptSummary } from "@/lib/trading/accounts";
import { ALL_MODES } from "@/lib/trading/types";
import { formatMoney } from "@/components/trading/trading-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TradingResumen() {
  const { state } = useTrading();
  const sel = state.settings.selectedModeId;
  const modeId = sel === ALL_MODES ? undefined : sel;
  const accounts = state.accounts.filter((a) => !modeId || a.modeId === modeId);
  const active = accounts.filter((a) => a.status === "activa");
  const evals = attemptSummary(state.accounts, "eval");
  const cur = state.settings.currency;
  const modeName = (id: string) => state.modes.find((m) => m.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cuentas activas" value={String(active.length)} />
        <Stat label="Evals pagadas" value={String(evals.total)} />
        <Stat label="Aprobadas / perdidas" value={`${evals.passed} / ${evals.lost}`} />
        <Stat label="Gastado en evals" value={formatMoney(evals.spent, cur)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas activas</CardTitle>
          <CardDescription>El registro de trades, calendario y estadísticas llegan en las próximas etapas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {active.length === 0 ? (
            <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
              No tenés cuentas activas en este modo.
              <Button asChild size="sm">
                <Link href="/trading/cuentas">Crear cuenta</Link>
              </Button>
            </div>
          ) : (
            active.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>
                  {a.name} <span className="text-muted-foreground">· {modeName(a.modeId)} · {a.firm}</span>
                </span>
                <span className="font-mono tabular-nums">{formatMoney(a.size, cur)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-2xl tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
