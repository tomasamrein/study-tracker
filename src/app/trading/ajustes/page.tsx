"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { buildSeed, hasSeed, withoutSeed } from "@/lib/trading/seed";
import { filterTrades } from "@/lib/trading/selectors";
import { downloadText, toCsv, tradesToCsv } from "@/lib/trading/csv";
import { todayInTz } from "@/lib/trading/format";
import { ALL_MODES, type TradingState } from "@/lib/trading/types";
import { ArrowDown, ArrowUp, Database, Download, Eye, EyeOff, Plus, Trash2, Upload } from "lucide-react";
import { newId, useTrading, type TradingCollection } from "@/lib/trading/store";
import type { Instrument, ListItem, PersonalLimits } from "@/lib/trading/types";
import { NumField, TextField } from "@/components/trading/fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function AjustesPage() {
  return (
    <div className="space-y-6">
      <ModesCard />
      <InstrumentsCard />
      <div className="grid gap-6 md:grid-cols-2">
        <ListCard collection="setups" title="Setups" placeholder="Ej. Sweep + FVG" />
        <ListCard collection="sessions" title="Sesiones / horarios" placeholder="Ej. Nueva York AM" />
        <ListCard collection="emotions" title="Emociones" placeholder="Ej. FOMO" />
        <ListCard collection="tags" title="Etiquetas" placeholder="Ej. noticia" />
      </div>
      <LimitsCard />
      <GeneralCard />
      <DataCard />
    </div>
  );
}

function ModesCard() {
  const { state, update, patch } = useTrading();
  const [name, setName] = useState("");
  const move = (i: number, d: -1 | 1) =>
    update((prev) => {
      const modes = [...prev.modes];
      const j = i + d;
      if (j < 0 || j >= modes.length) return prev;
      [modes[i], modes[j]] = [modes[j], modes[i]];
      return { ...prev, modes };
    });
  const used = (id: string) =>
    state.accounts.some((a) => a.modeId === id) || state.trades.some((t) => t.modeId === id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modos / fases</CardTitle>
        <CardDescription>Renombrá, reordená u ocultá. Un modo oculto conserva sus datos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {state.modes.map((m, i) => (
          <div key={m.id} className="flex flex-wrap items-center gap-2">
            <Input className="min-w-0 flex-1" value={m.name} onChange={(e) => patch("modes", m.id, { name: e.target.value })} />
            <Input
              className="w-28"
              type="number"
              placeholder="Obj. trades"
              aria-label="Objetivo de trades"
              value={m.targetTrades ?? ""}
              onChange={(e) => patch("modes", m.id, { targetTrades: e.target.value === "" ? null : Number(e.target.value) })}
            />
            <Button variant="ghost" size="icon" onClick={() => move(i, -1)} aria-label="Subir"><ArrowUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => move(i, 1)} aria-label="Bajar"><ArrowDown className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => patch("modes", m.id, { hidden: !m.hidden })} aria-label={m.hidden ? "Mostrar" : "Ocultar"}>
              {m.hidden ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={used(m.id)}
              title={used(m.id) ? "Tiene cuentas o trades: ocultalo en vez de borrarlo" : "Borrar"}
              onClick={() => update((prev) => ({ ...prev, modes: prev.modes.filter((x) => x.id !== m.id) }))}
              aria-label="Borrar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <AddRow
          value={name}
          onChange={setName}
          placeholder="Nuevo modo"
          onAdd={() => {
            update((prev) => ({ ...prev, modes: [...prev.modes, { id: newId(), name: name.trim(), hidden: false, targetTrades: null }] }));
            setName("");
          }}
        />
      </CardContent>
    </Card>
  );
}

function InstrumentsCard() {
  const { state, upsert, patch, remove } = useTrading();
  const set = (id: string, p: Partial<Instrument>) => patch("instruments", id, p);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Instrumentos</CardTitle>
        <CardDescription>Valor por punto por contrato y comisión ida y vuelta por contrato, para el PnL automático.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {state.instruments.map((ins) => (
          <div key={ins.id} className="grid grid-cols-2 items-end gap-2 rounded-md border p-3 sm:grid-cols-[1fr_2fr_1fr_1fr_auto_auto]">
            <TextField label="Símbolo" value={ins.symbol} onChange={(v) => set(ins.id, { symbol: v.toUpperCase() })} />
            <TextField label="Nombre" value={ins.name} onChange={(v) => set(ins.id, { name: v })} />
            <NumField label="USD / punto" value={ins.pointValue} onChange={(v) => set(ins.id, { pointValue: v ?? 0 })} />
            <NumField label="Comisión" value={ins.commission} onChange={(v) => set(ins.id, { commission: v ?? 0 })} />
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={ins.micro} onCheckedChange={(v) => set(ins.id, { micro: v })} id={`micro-${ins.id}`} />
              <Label htmlFor={`micro-${ins.id}`}>Micro</Label>
            </div>
            <Button
              variant="ghost"
              size="icon"
              disabled={state.trades.some((t) => t.instrumentId === ins.id)}
              onClick={() => remove("instruments", ins.id)}
              aria-label="Borrar instrumento"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => upsert("instruments", { id: newId(), symbol: "", name: "", pointValue: 1, commission: 0, micro: false })}
        >
          <Plus className="h-4 w-4" /> Agregar instrumento
        </Button>
      </CardContent>
    </Card>
  );
}

function ListCard({
  collection,
  title,
  placeholder,
}: {
  collection: Extract<TradingCollection, "setups" | "sessions" | "emotions" | "tags">;
  title: string;
  placeholder: string;
}) {
  const { state, upsert, patch, remove } = useTrading();
  const [name, setName] = useState("");
  const list = state[collection] as ListItem[];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.map((it) => (
          <div key={it.id} className="flex items-center gap-1">
            <Input value={it.name} onChange={(e) => patch(collection, it.id, { name: e.target.value })} className={it.hidden ? "opacity-50" : ""} />
            <Button variant="ghost" size="icon" onClick={() => patch(collection, it.id, { hidden: !it.hidden })} aria-label={it.hidden ? "Mostrar" : "Ocultar"}>
              {it.hidden ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => remove(collection, it.id)} aria-label="Borrar">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <AddRow
          value={name}
          onChange={setName}
          placeholder={placeholder}
          onAdd={() => {
            upsert(collection, { id: newId(), name: name.trim() });
            setName("");
          }}
        />
      </CardContent>
    </Card>
  );
}

function AddRow({ value, onChange, onAdd, placeholder }: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string }) {
  return (
    <form
      className="flex gap-2 pt-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onAdd();
      }}
    >
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <Button type="submit" variant="outline" disabled={!value.trim()}>
        <Plus className="h-4 w-4" /> Agregar
      </Button>
    </form>
  );
}

function LimitsCard() {
  const { state, updateSettings } = useTrading();
  const l = state.settings.limits;
  const set = (p: Partial<PersonalLimits>) => updateSettings({ limits: { ...l, ...p } });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Límites personales y alertas</CardTitle>
        <CardDescription>Tus reglas, aparte de las de la prop firm. Vacío = sin límite.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <NumField label="Máx. trades por día" value={l.maxTradesPerDay} onChange={(v) => set({ maxTradesPerDay: v })} step="1" />
        <NumField label="Pérdida diaria máx. (USD)" value={l.maxDailyLossUsd} onChange={(v) => set({ maxDailyLossUsd: v })} />
        <NumField label="Pérdida diaria máx. (R)" value={l.maxDailyLossR} onChange={(v) => set({ maxDailyLossR: v })} />
        <NumField label="Máx. contratos" value={l.maxContracts} onChange={(v) => set({ maxContracts: v })} step="1" />
        <NumField label="Alerta amarilla (% consumido)" value={l.warnPct} onChange={(v) => set({ warnPct: v ?? 50 })} />
        <NumField label="Alerta roja (% consumido)" value={l.dangerPct} onChange={(v) => set({ dangerPct: v ?? 80 })} />
      </CardContent>
    </Card>
  );
}

const TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/New_York",
  "America/Chicago",
  "Europe/London",
  "UTC",
];

function GeneralCard() {
  const { state, updateSettings } = useTrading();
  const s = state.settings;
  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <TextField label="Moneda (código ISO)" value={s.currency} onChange={(v) => updateSettings({ currency: v.toUpperCase().slice(0, 3) })} />
        <div className="space-y-1.5">
          <Label>Zona horaria</Label>
          <Select value={s.timezone} onValueChange={(v) => updateSettings({ timezone: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from(new Set([s.timezone, ...TIMEZONES])).map((tz) => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Formato de fecha</Label>
          <Select value={s.dateFormat} onValueChange={(v) => updateSettings({ dateFormat: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["dd/MM/yyyy", "yyyy-MM-dd", "MM/dd/yyyy"].map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Instrumento por defecto</Label>
          <Select value={s.defaultInstrumentId} onValueChange={(v) => updateSettings({ defaultInstrumentId: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {state.instruments.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.symbol || "(sin símbolo)"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Temporalidades (separadas por coma)</Label>
          <Input
            defaultValue={s.timeframes.join(", ")}
            onBlur={(e) => updateSettings({ timeframes: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DataCard() {
  const { state, update, replaceAll } = useTrading();
  const fileRef = useRef<HTMLInputElement>(null);
  const today = todayInTz(state.settings.timezone);
  const seeded = hasSeed(state);
  const accName = (id?: string | null) => state.accounts.find((a) => a.id === id)?.name ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos y backup</CardTitle>
        <CardDescription>Exportá tus datos cuando quieras. El backup completo (JSON) se puede volver a importar.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => downloadText(`trades-${today}.csv`, tradesToCsv(filterTrades(state, {}, ALL_MODES), state))}>
          <Download className="h-4 w-4" /> Trades (CSV)
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            downloadText(
              `retiros-y-gastos-${today}.csv`,
              toCsv([
                ...state.payouts.map((p) => ({ tipo: "retiro", fecha: p.date, cuenta: accName(p.accountId), concepto: p.notes ?? "", monto: p.amount })),
                ...state.expenses.map((e) => ({ tipo: "gasto", fecha: e.date, cuenta: accName(e.accountId), concepto: e.concept, monto: -e.amount })),
                ...state.accounts.map((a) => ({ tipo: "costo cuenta", fecha: a.startDate, cuenta: a.name, concepto: a.firm, monto: -a.cost })),
              ]),
            )
          }
        >
          <Download className="h-4 w-4" /> Pagos (CSV)
        </Button>
        <Button variant="outline" onClick={() => downloadText(`trading-backup-${today}.json`, JSON.stringify(state, null, 2), "application/json")}>
          <Download className="h-4 w-4" /> Backup completo (JSON)
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Restaurar backup
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              const data = JSON.parse(await f.text()) as TradingState;
              if (!Array.isArray(data.trades) || !Array.isArray(data.accounts)) throw new Error("formato");
              if (confirm("Esto reemplaza todos tus datos de Trading por los del backup. ¿Seguir?")) {
                replaceAll(data);
                toast.success("Backup restaurado.");
              }
            } catch {
              toast.error("El archivo no es un backup válido de Trading.");
            }
          }}
        />
        <div className="basis-full" />
        {seeded ? (
          <Button variant="destructive" onClick={() => { update(withoutSeed); toast.success("Datos de ejemplo borrados."); }}>
            <Trash2 className="h-4 w-4" /> Borrar datos de ejemplo
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              update((prev) => {
                const s = buildSeed(prev, today);
                return { ...prev, accounts: [...prev.accounts, ...s.accounts], trades: [...prev.trades, ...s.trades], payouts: [...prev.payouts, ...s.payouts] };
              });
              toast.success("Cargué datos de ejemplo (marcados como “Ejemplo”).");
            }}
          >
            <Database className="h-4 w-4" /> Cargar datos de ejemplo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
