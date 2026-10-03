"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { newId, useTrading } from "@/lib/trading/store";
import { attemptSummary } from "@/lib/trading/accounts";
import { EMPTY_RULES, LUCID_50K_FLEX_EOD } from "@/lib/trading/defaults";
import { ALL_MODES, type AccountStatus, type DrawdownType, type TradingAccount } from "@/lib/trading/types";
import { formatMoney, VerifyRulesNote } from "@/components/trading/trading-header";
import { NumField, TextField } from "@/components/trading/fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const STATUS_LABEL: Record<AccountStatus, string> = {
  activa: "Activa",
  aprobada: "Aprobada",
  perdida: "Perdida",
  archivada: "Archivada",
};
const DD_LABEL: Record<DrawdownType, string> = {
  eod: "EOD (cierre del día)",
  intradia: "Intradía (trailing)",
  estatico: "Estático",
};

function blankAccount(modeId: string): TradingAccount {
  return {
    id: newId(),
    name: "Lucid 50K Flex",
    modeId,
    firm: "Lucid Trading",
    status: "activa",
    size: 50000,
    startDate: format(new Date(), "yyyy-MM-dd"),
    cost: 90,
    recurring: false,
    rules: { ...LUCID_50K_FLEX_EOD },
    createdAt: new Date().toISOString(),
  };
}

export default function CuentasPage() {
  const { state, upsert, update } = useTrading();
  const [editing, setEditing] = useState<TradingAccount | null>(null);
  const sel = state.settings.selectedModeId;
  const cur = state.settings.currency;
  const list = state.accounts.filter((a) => sel === ALL_MODES || a.modeId === sel);
  const modeName = (id: string) => state.modes.find((m) => m.id === id)?.name ?? id;
  const visible = state.modes.filter((m) => !m.hidden);
  const defaultMode = sel === ALL_MODES ? ((visible.find((m) => m.id === "eval") ?? visible[0])?.id ?? "eval") : sel;

  const historyModes = state.modes.filter((m) => state.accounts.some((a) => a.modeId === m.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="display text-3xl">Cuentas</h2>
        <Button onClick={() => setEditing(blankAccount(defaultMode))}>
          <Plus className="h-4 w-4" /> Nueva cuenta
        </Button>
      </div>

      {list.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay cuentas en este modo todavía.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {a.name}
                <Badge variant="secondary">{modeName(a.modeId)}</Badge>
                <Badge variant={a.status === "perdida" ? "destructive" : "outline"}>{STATUS_LABEL[a.status]}</Badge>
                {a.seed && <Badge variant="outline">Ejemplo</Badge>}
              </CardTitle>
              <CardDescription>
                {a.firm} · {formatMoney(a.size, cur)} · desde {a.startDate}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                <Rule k="MLL" v={a.rules.maxLoss != null ? `${formatMoney(a.rules.maxLoss, cur)} · ${a.rules.drawdownType.toUpperCase()}` : "—"} />
                <Rule k="DLL" v={a.rules.dailyLoss != null ? formatMoney(a.rules.dailyLoss, cur) : "—"} />
                <Rule k="Tamaño máx." v={`${a.rules.maxMinis ?? "—"} minis / ${a.rules.maxMicros ?? "—"} micros`} />
                <Rule k="Profit target" v={a.rules.profitTarget != null ? formatMoney(a.rules.profitTarget, cur) : "Sin cargar"} />
                <Rule k="Días de retiro" v={a.rules.payoutDays != null ? `${a.rules.payoutDays} × ${formatMoney(a.rules.payoutDayMin ?? 0, cur)}` : "—"} />
                <Rule k="Costo" v={`${formatMoney(a.cost, cur)}${a.recurring ? " / mes" : ""}`} />
              </dl>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(structuredClone(a))}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditing({ ...structuredClone(a), id: newId(), name: `${a.name} (nuevo intento)`, status: "activa", seed: undefined, startDate: format(new Date(), "yyyy-MM-dd"), createdAt: new Date().toISOString() })
                  }
                >
                  <Copy className="h-4 w-4" /> Nuevo intento
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-muted-foreground"
                  onClick={() => {
                    const n = state.trades.filter((t) => t.accountId === a.id).length;
                    if (confirm(n ? `La cuenta tiene ${n} trades. Borrarla borra también esos trades. ¿Seguir?` : `¿Borrar ${a.name}?`)) {
                      update((prev) => ({
                        ...prev,
                        accounts: prev.accounts.filter((x) => x.id !== a.id),
                        trades: prev.trades.filter((t) => t.accountId !== a.id),
                      }));
                    }
                  }}
                  aria-label="Borrar cuenta"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {historyModes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de intentos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-normal">Modo</th>
                  <th className="font-normal">Cuentas</th>
                  <th className="font-normal">Activas</th>
                  <th className="font-normal">Aprobadas</th>
                  <th className="font-normal">Perdidas</th>
                  <th className="text-right font-normal">Gastado</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {historyModes.map((m) => {
                  const s = attemptSummary(state.accounts, m.id);
                  return (
                    <tr key={m.id} className="border-t">
                      <td className="py-1.5 font-sans">{m.name}</td>
                      <td>{s.total}</td>
                      <td>{s.active}</td>
                      <td>{s.passed}</td>
                      <td>{s.lost}</td>
                      <td className="text-right">{formatMoney(s.spent, cur)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {editing && (
        <AccountDialog
          account={editing}
          onClose={() => setEditing(null)}
          onSave={(a) => {
            upsert("accounts", a);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Rule({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-mono tabular-nums">{v}</dd>
    </>
  );
}

function AccountDialog({
  account,
  onClose,
  onSave,
}: {
  account: TradingAccount;
  onClose: () => void;
  onSave: (a: TradingAccount) => void;
}) {
  const { state } = useTrading();
  const [a, setA] = useState(account);
  const set = (p: Partial<TradingAccount>) => setA((x) => ({ ...x, ...p }));
  const setRule = (p: Partial<TradingAccount["rules"]>) => setA((x) => ({ ...x, rules: { ...x.rules, ...p } }));
  const valid = a.name.trim() !== "" && a.size > 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{state.accounts.some((x) => x.id === a.id) ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Nombre" value={a.name} onChange={(v) => set({ name: v })} />
          <TextField label="Firm o broker" value={a.firm} onChange={(v) => set({ firm: v })} />
          <div className="space-y-1.5">
            <Label>Modo / fase</Label>
            <Select value={a.modeId} onValueChange={(v) => set({ modeId: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {state.modes.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={a.status} onValueChange={(v) => set({ status: v as AccountStatus })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as AccountStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NumField label="Tamaño (balance inicial)" value={a.size} onChange={(v) => set({ size: v ?? 0 })} />
          <TextField label="Fecha de inicio" type="date" value={a.startDate} onChange={(v) => set({ startDate: v })} />
          <NumField label="Costo pagado" value={a.cost} onChange={(v) => set({ cost: v ?? 0 })} />
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={a.recurring} onCheckedChange={(v) => set({ recurring: v })} id="recurring" />
            <Label htmlFor="recurring">Pago recurrente (mensual)</Label>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">Reglas</h3>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => set({ rules: { ...LUCID_50K_FLEX_EOD } })}>Lucid 50K Flex EOD</Button>
              <Button variant="ghost" size="sm" onClick={() => set({ rules: { ...EMPTY_RULES } })}>Sin reglas</Button>
            </div>
          </div>
          <VerifyRulesNote />
          <div className="grid gap-4 sm:grid-cols-2">
            <NumField label="Max Loss Limit (MLL)" value={a.rules.maxLoss} onChange={(v) => setRule({ maxLoss: v })} />
            <div className="space-y-1.5">
              <Label>Tipo de MLL</Label>
              <Select value={a.rules.drawdownType} onValueChange={(v) => setRule({ drawdownType: v as DrawdownType })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DD_LABEL) as DrawdownType[]).map((d) => (
                    <SelectItem key={d} value={d}>{DD_LABEL[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <NumField
              label="El piso del MLL se congela en (opcional)"
              value={a.rules.mllLockAt}
              onChange={(v) => setRule({ mllLockAt: v })}
              hint="Ej. el balance inicial. Vacío = el piso nunca deja de subir. Verificar con la firm."
            />
            <NumField label="Daily Loss Limit (DLL)" value={a.rules.dailyLoss} onChange={(v) => setRule({ dailyLoss: v })} />
            <NumField label="Máximo de minis" value={a.rules.maxMinis} onChange={(v) => setRule({ maxMinis: v })} step="1" />
            <NumField label="Máximo de micros" value={a.rules.maxMicros} onChange={(v) => setRule({ maxMicros: v })} step="1" />
            <NumField label="Consistencia (% máx. del mejor día)" value={a.rules.consistencyPct} onChange={(v) => setRule({ consistencyPct: v })} hint="Vacío = sin regla de consistencia." />
            <NumField label="Profit target" value={a.rules.profitTarget} onChange={(v) => setRule({ profitTarget: v })} hint="Completalo cuando cargues las reglas de la eval." />
            <NumField label="Días de profit para retiro" value={a.rules.payoutDays} onChange={(v) => setRule({ payoutDays: v })} step="1" />
            <NumField label="Profit mínimo por día de retiro" value={a.rules.payoutDayMin} onChange={(v) => setRule({ payoutDayMin: v })} />
            <NumField label="Payouts para pasar a Live" value={a.rules.payoutsToLive} onChange={(v) => setRule({ payoutsToLive: v })} step="1" />
          </div>
          <div className="space-y-1.5">
            <Label>Plan de escalado / notas</Label>
            <Textarea value={a.rules.scalingNotes} onChange={(e) => setRule({ scalingNotes: e.target.value })} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={!valid} onClick={() => onSave(a)}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
