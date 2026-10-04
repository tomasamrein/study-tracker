"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { newId, useTrading } from "@/lib/trading/store";
import { financeSummary } from "@/lib/trading/accounts";
import { day as fmtDay, money, pnlClass, todayInTz } from "@/lib/trading/format";
import { Mini } from "@/components/trading/mini";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PagosPage() {
  const { state, upsert, remove } = useTrading();
  const cur = state.settings.currency;
  const fmt = state.settings.dateFormat;
  const today = todayInTz(state.settings.timezone);
  const f = financeSummary(state.accounts, state.expenses, state.payouts);
  const accName = (id?: string | null) => state.accounts.find((a) => a.id === id)?.name ?? "—";
  const withPayoutRule = state.accounts.filter((a) => a.rules.payoutsToLive != null && (a.modeId === "pa" || state.payouts.some((p) => p.accountId === a.id)));

  const [p, setP] = useState({ accountId: "", date: today, amount: "" });
  const [e, setE] = useState({ accountId: "", date: today, amount: "", concept: "" });

  return (
    <div className="space-y-6">
      <h2 className="display text-3xl">Pagos y retiros</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="Gastado en cuentas" value={money(f.accountCosts, cur)} hint={`${state.accounts.length} cuentas`} />
        <Mini label="Otros gastos" value={money(f.expenses, cur)} hint="Reactivaciones, renovaciones…" />
        <Mini label="Retirado" value={money(f.withdrawn, cur)} hint={`${state.payouts.length} payouts`} />
        <Mini label="Balance neto" value={money(f.net, cur, true)} className={pnlClass(f.net)} />
      </div>

      {withPayoutRule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payouts hacia Live</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {withPayoutRule.map((a) => {
              const n = state.payouts.filter((x) => x.accountId === a.id).length;
              const goal = a.rules.payoutsToLive as number;
              return (
                <div key={a.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{a.name}</span>
                    <span className="font-mono tabular-nums">{n} de {goal}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={n >= goal ? "h-full bg-emerald-500" : "h-full bg-foreground"} style={{ width: `${Math.min(100, (n / goal) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Retiros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (!p.accountId || !(Number(p.amount) > 0)) return;
                upsert("payouts", { id: newId(), accountId: p.accountId, date: p.date, amount: Number(p.amount) });
                setP({ ...p, amount: "" });
              }}
            >
              <AccountPick value={p.accountId} onChange={(v) => setP({ ...p, accountId: v })} />
              <Input type="date" value={p.date} onChange={(ev) => setP({ ...p, date: ev.target.value })} aria-label="Fecha" />
              <Input inputMode="decimal" placeholder="Monto" value={p.amount} onChange={(ev) => setP({ ...p, amount: ev.target.value })} />
              <Button type="submit" variant="outline" disabled={!p.accountId || !(Number(p.amount) > 0)}><Plus className="h-4 w-4" /></Button>
            </form>
            <ul className="divide-y text-sm">
              {[...state.payouts].sort((a, b) => b.date.localeCompare(a.date)).map((x) => (
                <li key={x.id} className="flex items-center gap-2 py-2">
                  <span className="text-muted-foreground">{fmtDay(x.date, fmt)}</span>
                  <span className="flex-1 truncate">{accName(x.accountId)}{x.seed && " · ejemplo"}</span>
                  <span className="font-mono tabular-nums text-emerald-500">{money(x.amount, cur)}</span>
                  <Button variant="ghost" size="icon" onClick={() => remove("payouts", x.id)} aria-label="Borrar"><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
              {state.payouts.length === 0 && <li className="py-2 text-muted-foreground">Todavía no registraste retiros.</li>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Otros gastos</CardTitle>
            <CardDescription>El costo inicial de cada cuenta ya se suma solo. Acá van reactivaciones y renovaciones mensuales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              className="grid grid-cols-2 gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (!e.concept.trim() || !(Number(e.amount) > 0)) return;
                upsert("expenses", { id: newId(), accountId: e.accountId || null, date: e.date, amount: Number(e.amount), concept: e.concept.trim() });
                setE({ ...e, amount: "", concept: "" });
              }}
            >
              <Input className="col-span-2" placeholder="Concepto (ej. Reactivación)" value={e.concept} onChange={(ev) => setE({ ...e, concept: ev.target.value })} />
              <AccountPick value={e.accountId} onChange={(v) => setE({ ...e, accountId: v })} optional />
              <Input type="date" value={e.date} onChange={(ev) => setE({ ...e, date: ev.target.value })} aria-label="Fecha" />
              <Input inputMode="decimal" placeholder="Monto" value={e.amount} onChange={(ev) => setE({ ...e, amount: ev.target.value })} />
              <Button type="submit" variant="outline" disabled={!e.concept.trim() || !(Number(e.amount) > 0)}><Plus className="h-4 w-4" /> Agregar</Button>
            </form>
            <ul className="divide-y text-sm">
              {[...state.expenses].sort((a, b) => b.date.localeCompare(a.date)).map((x) => (
                <li key={x.id} className="flex items-center gap-2 py-2">
                  <span className="text-muted-foreground">{fmtDay(x.date, fmt)}</span>
                  <span className="flex-1 truncate">{x.concept}{x.accountId ? ` · ${accName(x.accountId)}` : ""}</span>
                  <span className="font-mono tabular-nums">{money(x.amount, cur)}</span>
                  <Button variant="ghost" size="icon" onClick={() => remove("expenses", x.id)} aria-label="Borrar"><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AccountPick({ value, onChange, optional }: { value: string; onChange: (v: string) => void; optional?: boolean }) {
  const { state } = useTrading();
  return (
    <div className="space-y-1">
      <Label className="sr-only">Cuenta</Label>
      <Select value={value || "__none"} onValueChange={(v) => onChange(v === "__none" ? "" : v)}>
        <SelectTrigger className="w-full"><SelectValue placeholder="Cuenta" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">{optional ? "Sin cuenta" : "Elegí cuenta"}</SelectItem>
          {state.accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
