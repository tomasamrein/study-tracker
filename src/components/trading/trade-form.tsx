"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { newId, useTrading } from "@/lib/trading/store";
import { tradeMetrics, validateTrade } from "@/lib/trading/calc";
import { sizeViolation } from "@/lib/trading/risk";
import { duration, money, nowInTz, pnlClass, rMult } from "@/lib/trading/format";
import type { Direction, Trade } from "@/lib/trading/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const NONE = "__none";

/** Valores del formulario: números como texto para permitir vacío. */
type Draft = Omit<Trade, "entry" | "exit" | "stop" | "target" | "contracts" | "commission"> & {
  entry: string;
  exit: string;
  stop: string;
  target: string;
  contracts: string;
  commission: string;
};

const s = (n: number | null | undefined) => (n == null ? "" : String(n));
const n = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

function toDraft(t: Trade): Draft {
  return { ...t, entry: s(t.entry), exit: s(t.exit), stop: s(t.stop), target: s(t.target), contracts: s(t.contracts), commission: s(t.commission) };
}

/** Trade nuevo con los defaults del último cargado (cuenta, instrumento, setup, sesión). */
export function useBlankTrade() {
  const { state } = useTrading();
  return (): Trade => {
    const last = [...state.trades].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const sel = state.settings.selectedModeId;
    const active = state.accounts.filter((a) => a.status === "activa" && (sel === "all" || a.modeId === sel));
    const lastAcc = last && active.find((a) => a.id === last.accountId);
    const account = lastAcc ?? active[0] ?? state.accounts.find((a) => a.id === state.settings.defaultAccountId) ?? state.accounts[0];
    const now = nowInTz(state.settings.timezone);
    return {
      id: newId(),
      accountId: account?.id ?? "",
      modeId: account?.modeId ?? (sel === "all" ? "paper" : sel),
      instrumentId: last?.instrumentId ?? state.settings.defaultInstrumentId,
      direction: "long",
      entryAt: now,
      exitAt: now,
      entry: NaN,
      exit: NaN,
      stop: null,
      target: null,
      contracts: last?.contracts ?? 1,
      commission: null,
      setupId: last?.setupId ?? null,
      sessionId: last?.sessionId ?? null,
      contextTf: last?.contextTf,
      entryTf: last?.entryTf,
      followedPlan: true,
      tags: [],
      emotionTags: [],
      createdAt: new Date().toISOString(),
    };
  };
}

export function TradeFormDialog({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const { state, upsert } = useTrading();
  const isEdit = state.trades.some((t) => t.id === trade.id);
  const [d, setD] = useState<Draft>(() => {
    const draft = toDraft(trade);
    if (Number.isNaN(trade.entry)) draft.entry = "";
    if (Number.isNaN(trade.exit)) draft.exit = "";
    return draft;
  });
  const [more, setMore] = useState(isEdit);
  const [touched, setTouched] = useState(false);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  const parsed: Trade = useMemo(
    () => ({
      ...d,
      entry: n(d.entry) ?? NaN,
      exit: n(d.exit) ?? NaN,
      stop: n(d.stop),
      target: n(d.target),
      contracts: n(d.contracts) ?? NaN,
      commission: n(d.commission),
      exitAt: d.exitAt || null,
    }),
    [d],
  );
  const errors = validateTrade(parsed);
  const instrument = state.instruments.find((i) => i.id === d.instrumentId);
  const account = state.accounts.find((a) => a.id === d.accountId);
  const valid = Object.keys(errors).length === 0;
  const m = valid || (Number.isFinite(parsed.entry) && Number.isFinite(parsed.exit)) ? tradeMetrics(parsed, instrument) : null;
  const sizeWarn = account && instrument && Number.isFinite(parsed.contracts) ? sizeViolation(parsed.contracts, instrument.micro, account.rules) : null;
  const err = (k: string) => touched && errors[k] ? <p className="text-xs text-red-500">{errors[k]}</p> : null;
  const cur = state.settings.currency;

  const save = () => {
    setTouched(true);
    if (!valid) return;
    upsert("trades", parsed);
    onClose();
  };

  const toggleIn = (list: string[] | undefined, v: string) =>
    list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar trade" : "Nuevo trade"}</DialogTitle>
          <DialogDescription>Lo esencial arriba; el resto es opcional.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Cuenta</Label>
              <Select
                value={d.accountId || undefined}
                onValueChange={(v) => set({ accountId: v, modeId: state.accounts.find((a) => a.id === v)?.modeId ?? d.modeId })}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Elegí una cuenta" /></SelectTrigger>
                <SelectContent>
                  {state.accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} · {state.modes.find((x) => x.id === a.modeId)?.name}
                      {a.status !== "activa" ? ` (${a.status})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {err("accountId")}
            </div>
            <div className="space-y-1.5">
              <Label>Modo</Label>
              <Select value={d.modeId} onValueChange={(v) => set({ modeId: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {state.modes.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Instrumento</Label>
              <Select value={d.instrumentId} onValueChange={(v) => set({ instrumentId: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {state.instruments.map((i) => <SelectItem key={i.id} value={i.id}>{i.symbol}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["long", "short"] as Direction[]).map((dir) => (
              <button
                type="button"
                key={dir}
                onClick={() => set({ direction: dir })}
                className={cn(
                  "rounded-md border py-2 text-sm font-medium transition-colors",
                  d.direction === dir
                    ? dir === "long" ? "border-emerald-500 bg-emerald-500/15 text-emerald-500" : "border-red-500 bg-red-500/15 text-red-500"
                    : "text-muted-foreground",
                )}
              >
                {dir === "long" ? "Long" : "Short"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Field label="Entrada" error={err("entry")}><Input inputMode="decimal" value={d.entry} onChange={(e) => set({ entry: e.target.value })} autoFocus /></Field>
            <Field label="Stop inicial" error={err("stop")}><Input inputMode="decimal" value={d.stop} onChange={(e) => set({ stop: e.target.value })} placeholder="opcional" /></Field>
            <Field label="Objetivo" error={err("target")}><Input inputMode="decimal" value={d.target} onChange={(e) => set({ target: e.target.value })} placeholder="opcional" /></Field>
            <Field label="Salida" error={err("exit")}><Input inputMode="decimal" value={d.exit} onChange={(e) => set({ exit: e.target.value })} /></Field>
            <Field label="Contratos" error={err("contracts")}><Input inputMode="numeric" value={d.contracts} onChange={(e) => set({ contracts: e.target.value })} /></Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Entrada (fecha y hora)" error={err("entryAt")}>
              <Input type="datetime-local" value={d.entryAt} onChange={(e) => set({ entryAt: e.target.value })} />
            </Field>
            <Field label="Salida (fecha y hora)" error={err("exitAt")}>
              <Input type="datetime-local" value={d.exitAt ?? ""} onChange={(e) => set({ exitAt: e.target.value })} />
            </Field>
          </div>

          {/* Resultado en vivo */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-5">
            <Metric label="PnL" value={m ? money(m.pnl, cur, true) : "—"} className={m ? pnlClass(m.pnl) : ""} />
            <Metric label="Riesgo" value={m?.riskUsd != null ? money(m.riskUsd, cur) : "Sin stop"} />
            <Metric label="Resultado" value={rMult(m?.r)} />
            <Metric label="R planeado" value={rMult(m?.plannedR)} />
            <Metric label="Duración" value={duration(m?.durationMin)} />
          </div>
          {sizeWarn && <p className="text-xs text-amber-500">{sizeWarn}</p>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Setup">
              <ListSelect value={d.setupId} items={state.setups} onChange={(v) => set({ setupId: v })} />
            </Field>
            <Field label="Sesión">
              <ListSelect value={d.sessionId} items={state.sessions} onChange={(v) => set({ sessionId: v })} />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="plan" checked={d.followedPlan} onCheckedChange={(v) => set({ followedPlan: v })} />
            <Label htmlFor="plan">Seguí el plan</Label>
          </div>
          {!d.followedPlan && (
            <Field label="¿Qué regla rompí?">
              <Input value={d.brokenRule ?? ""} onChange={(e) => set({ brokenRule: e.target.value })} />
            </Field>
          )}

          <button type="button" onClick={() => setMore((x) => !x)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronDown className={cn("h-4 w-4 transition-transform", more && "rotate-180")} /> Más detalles
          </button>

          {more && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="TF de contexto">
                  <TfSelect value={d.contextTf} options={state.settings.timeframes} onChange={(v) => set({ contextTf: v })} />
                </Field>
                <Field label="TF de entrada">
                  <TfSelect value={d.entryTf} options={state.settings.timeframes} onChange={(v) => set({ entryTf: v })} />
                </Field>
                <Field label={`Comisión total (vacío = ${money((instrument?.commission ?? 0) * (Number(d.contracts) || 0), cur)})`}>
                  <Input inputMode="decimal" value={d.commission} onChange={(e) => set({ commission: e.target.value })} />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {([["emotionBefore", "Emoción antes"], ["emotionDuring", "Durante"], ["emotionAfter", "Después"]] as const).map(([k, label]) => (
                  <Field key={k} label={`${label} (1–10)`}>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={d[k] ?? ""}
                      onChange={(e) => set({ [k]: e.target.value === "" ? null : Math.min(10, Math.max(1, Number(e.target.value))) })}
                    />
                  </Field>
                ))}
              </div>
              <Chips label="Emociones" items={state.emotions.filter((x) => !x.hidden).map((x) => x.name)} selected={d.emotionTags ?? []} onToggle={(v) => set({ emotionTags: toggleIn(d.emotionTags, v) })} />
              <Chips label="Etiquetas" items={state.tags.filter((x) => !x.hidden).map((x) => x.name)} selected={d.tags ?? []} onToggle={(v) => set({ tags: toggleIn(d.tags, v) })} />

              <Field label="Notas"><Textarea rows={2} value={d.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} /></Field>
              <Field label="Lección aprendida"><Textarea rows={2} value={d.lesson ?? ""} onChange={(e) => set({ lesson: e.target.value })} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Captura antes (link)"><Input type="url" placeholder="https://www.tradingview.com/x/…" value={d.shotBefore ?? ""} onChange={(e) => set({ shotBefore: e.target.value })} /></Field>
                <Field label="Captura después (link)"><Input type="url" placeholder="https://…" value={d.shotAfter ?? ""} onChange={(e) => set({ shotAfter: e.target.value })} /></Field>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar trade</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error}
    </div>
  );
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-mono tabular-nums", className)}>{value}</p>
    </div>
  );
}

function ListSelect({ value, items, onChange }: { value?: string | null; items: { id: string; name: string; hidden?: boolean }[]; onChange: (v: string | null) => void }) {
  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>—</SelectItem>
        {items.filter((x) => !x.hidden || x.id === value).map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function TfSelect({ value, options, onChange }: { value?: string; options: string[]; onChange: (v: string | undefined) => void }) {
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? undefined : v)}>
      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>—</SelectItem>
        {Array.from(new Set([...options, ...(value ? [value] : [])])).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Chips({ label, items, selected, onToggle }: { label: string; items: string[]; selected: string[]; onToggle: (v: string) => void }) {
  const all = Array.from(new Set([...items, ...selected]));
  if (all.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {all.map((x) => (
          <button
            type="button"
            key={x}
            onClick={() => onToggle(x)}
            className={cn("rounded-full border px-2.5 py-1 text-xs", selected.includes(x) ? "border-foreground bg-foreground text-background" : "text-muted-foreground")}
          >
            {x}
          </button>
        ))}
      </div>
    </div>
  );
}
