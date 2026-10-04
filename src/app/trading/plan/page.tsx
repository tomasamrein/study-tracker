"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { newId, useTrading } from "@/lib/trading/store";
import { filterTrades, useNames } from "@/lib/trading/selectors";
import { monthKey, summarize, weekStart } from "@/lib/trading/calc";
import { evaluateGoal, METRIC_LABEL } from "@/lib/trading/goals";
import { day as fmtDay, money, num, pnlClass, rMult, todayInTz } from "@/lib/trading/format";
import type { CriterionMetric, ListItem, PhaseGoal, Review, ReviewKind, TradingPlan } from "@/lib/trading/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const PLAN_FIELDS: [keyof TradingPlan, string][] = [
  ["objective", "Objetivo"],
  ["instruments", "Instrumentos"],
  ["schedule", "Horarios en los que opero"],
  ["allowedSetups", "Setups permitidos"],
  ["never", "Lo que no hago nunca"],
  ["riskPerTrade", "Riesgo por trade"],
  ["dailyStop", "Corte diario"],
  ["notes", "Notas"],
];

export default function PlanPage() {
  return (
    <Tabs defaultValue="plan">
      <TabsList className="flex-wrap">
        <TabsTrigger value="plan">Plan</TabsTrigger>
        <TabsTrigger value="checklists">Checklists</TabsTrigger>
        <TabsTrigger value="revisiones">Revisiones</TabsTrigger>
        <TabsTrigger value="metas">Metas por fase</TabsTrigger>
      </TabsList>
      <TabsContent value="plan" className="mt-6"><PlanEditor /></TabsContent>
      <TabsContent value="checklists" className="mt-6 grid gap-6 md:grid-cols-2">
        <ChecklistEditor k="preChecklist" title="Checklist previo al trade" />
        <ChecklistEditor k="closeChecklist" title="Checklist de cierre del día" />
      </TabsContent>
      <TabsContent value="revisiones" className="mt-6"><Reviews /></TabsContent>
      <TabsContent value="metas" className="mt-6"><PhaseGoals /></TabsContent>
    </Tabs>
  );
}

function PlanEditor() {
  const { state, update } = useTrading();
  const set = (k: keyof TradingPlan, v: string) => update((p) => ({ ...p, plan: { ...p.plan, [k]: v } }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan de trading</CardTitle>
        <CardDescription>Se guarda solo. Releelo antes de cada sesión.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {PLAN_FIELDS.map(([k, label]) => (
          <div key={k} className="space-y-1.5">
            <Label>{label}</Label>
            <Textarea rows={3} value={state.plan[k]} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ChecklistEditor({ k, title }: { k: "preChecklist" | "closeChecklist"; title: string }) {
  const { state, upsert, patch, remove } = useTrading();
  const [name, setName] = useState("");
  const list: ListItem[] = state[k];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Lo tildás cada día desde Hoy o el Calendario.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.map((it) => (
          <div key={it.id} className="flex gap-1">
            <Input value={it.name} onChange={(e) => patch(k, it.id, { name: e.target.value })} />
            <Button variant="ghost" size="icon" onClick={() => remove(k, it.id)} aria-label="Borrar"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <form
          className="flex gap-2 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            upsert(k, { id: newId(), name: name.trim() });
            setName("");
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nuevo ítem" />
          <Button type="submit" variant="outline" disabled={!name.trim()}><Plus className="h-4 w-4" /> Agregar</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Reviews() {
  const { state, upsert, remove } = useTrading();
  const today = todayInTz(state.settings.timezone);
  const [kind, setKind] = useState<ReviewKind>("semana");
  const period = kind === "semana" ? weekStart(today) : `${monthKey(today)}-01`;
  const existing = state.reviews.find((r) => r.kind === kind && r.period === period);
  const [selected, setSelected] = useState<string | null>(null);
  const current = state.reviews.find((r) => r.id === selected) ?? existing;
  const sorted = [...state.reviews].sort((a, b) => b.period.localeCompare(a.period));

  const start = () => {
    const r: Review = { id: newId(), kind, period, best: "", worst: "", mistakes: "", improve: "", notes: "" };
    upsert("reviews", r);
    setSelected(r.id);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <Card>
        <CardHeader><CardTitle>Revisiones</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={kind} onValueChange={(v) => { setKind(v as ReviewKind); setSelected(null); }}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semana">Semanal</SelectItem>
                <SelectItem value="mes">Mensual</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => (existing ? setSelected(existing.id) : start())}>
              {existing ? "Abrir la actual" : kind === "semana" ? "Revisar esta semana" : "Revisar este mes"}
            </Button>
          </div>
          <ul className="space-y-1 text-sm">
            {sorted.map((r) => (
              <li key={r.id}>
                <button onClick={() => setSelected(r.id)} className={cn("w-full rounded-md px-2 py-1.5 text-left hover:bg-muted", current?.id === r.id && "bg-muted")}>
                  {r.kind === "semana" ? "Semana del " : "Mes "}
                  {r.kind === "semana" ? fmtDay(r.period, state.settings.dateFormat) : r.period.slice(0, 7)}
                </button>
              </li>
            ))}
            {sorted.length === 0 && <li className="text-muted-foreground">Todavía no hiciste revisiones.</li>}
          </ul>
        </CardContent>
      </Card>
      {current ? <ReviewEditor review={current} onDelete={() => { remove("reviews", current.id); setSelected(null); }} /> : null}
    </div>
  );
}

function ReviewEditor({ review, onDelete }: { review: Review; onDelete: () => void }) {
  const { state, patch } = useTrading();
  const names = useNames();
  const cur = state.settings.currency;
  const end = useMemo(() => {
    const d = new Date(`${review.period}T00:00:00Z`);
    if (review.kind === "semana") d.setUTCDate(d.getUTCDate() + 6);
    else { d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); }
    return d.toISOString().slice(0, 10);
  }, [review]);
  const list = useMemo(() => filterTrades(state, { from: review.period, to: end }), [state, review.period, end]);
  const s = summarize(list);
  const top = [...list].sort((a, b) => b.m.pnl - a.m.pnl);
  const broken = list.filter((x) => !x.trade.followedPlan && x.trade.brokenRule).map((x) => x.trade.brokenRule as string);
  const brokenCount = Object.entries(broken.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r]: (acc[r] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const set = (p: Partial<Review>) => patch("reviews", review.id, p);
  const field = (k: "best" | "worst" | "mistakes" | "improve" | "notes", label: string, hint?: string) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Textarea rows={2} value={review[k]} onChange={(e) => set({ [k]: e.target.value })} />
    </div>
  );
  const describe = (x: (typeof list)[number]) => `${fmtDay(x.day, state.settings.dateFormat)} ${names.setup(x.trade.setupId)} ${money(x.m.pnl, cur, true)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {review.kind === "semana" ? `Semana ${fmtDay(review.period, state.settings.dateFormat)} – ${fmtDay(end, state.settings.dateFormat)}` : `Mes ${review.period.slice(0, 7)}`}
        </CardTitle>
        <CardDescription>
          {s.count} trades · <span className={pnlClass(s.totalPnl)}>{money(s.totalPnl, cur, true)}</span> · expectativa {rMult(s.expectancyR)} · plan {num(s.planPct, 0)}%
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {field("best", "Mejores trades", top.slice(0, 2).map(describe).join(" · ") || undefined)}
        {field("worst", "Peores trades", top.slice(-2).reverse().map(describe).join(" · ") || undefined)}
        {field("mistakes", "Errores repetidos", brokenCount.length ? `Reglas rotas: ${brokenCount.map(([r, n]) => `${r} (${n})`).join(", ")}` : undefined)}
        {field("improve", "Una o dos cosas a mejorar")}
        {field("notes", "Notas")}
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => confirm("¿Borrar esta revisión?") && onDelete()}>
          <Trash2 className="h-4 w-4" /> Borrar revisión
        </Button>
      </CardContent>
    </Card>
  );
}

function PhaseGoals() {
  const { state, upsert, patch, remove } = useTrading();
  const modeName = (id?: string | null) => state.modes.find((m) => m.id === id)?.name ?? "—";
  const add = () =>
    upsert("phaseGoals", { id: newId(), title: "Nueva meta", modeId: state.modes[0]?.id ?? "paper", nextModeId: null, criteria: [{ id: newId(), metric: "trades", target: 50 }] });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Cada meta mide los trades del modo elegido. Cuando todos los criterios están en verde, estás listo para pasar de fase.</p>
      {state.phaseGoals.map((g) => <GoalCard key={g.id} goal={g} modeName={modeName} onPatch={(p) => patch("phaseGoals", g.id, p)} onDelete={() => remove("phaseGoals", g.id)} />)}
      <Button variant="outline" onClick={add}><Plus className="h-4 w-4" /> Nueva meta</Button>
    </div>
  );
}

function GoalCard({ goal, modeName, onPatch, onDelete }: { goal: PhaseGoal; modeName: (id?: string | null) => string; onPatch: (p: Partial<PhaseGoal>) => void; onDelete: () => void }) {
  const { state } = useTrading();
  const progress = evaluateGoal(goal, state);
  const ready = progress.length > 0 && progress.every((p) => p.done);
  const cur = state.settings.currency;
  const fmtVal = (m: CriterionMetric, v: number | null) =>
    v == null ? "—" : m === "expectancy" ? rMult(v) : m === "pnl" ? money(v, cur) : m === "winrate" || m === "planPct" ? `${v.toFixed(0)}%` : m === "profitFactor" ? v.toFixed(2) : String(v);
  const setCrit = (id: string, p: Partial<PhaseGoal["criteria"][number]>) => onPatch({ criteria: goal.criteria.map((c) => (c.id === id ? { ...c, ...p } : c)) });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Input className="max-w-xs font-medium" value={goal.title} onChange={(e) => onPatch({ title: e.target.value })} />
          <Select value={goal.modeId} onValueChange={(v) => onPatch({ modeId: v })}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{state.modes.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">→</span>
          <Select value={goal.nextModeId ?? "__none"} onValueChange={(v) => onPatch({ nextModeId: v === "__none" ? null : v })}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">—</SelectItem>
              {state.modes.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {ready && <span className="text-sm text-emerald-500">Listo para pasar a {modeName(goal.nextModeId)}</span>}
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => confirm("¿Borrar esta meta?") && onDelete()} aria-label="Borrar meta"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {progress.map((p) => (
          <div key={p.id} className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {p.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
              <Select value={p.metric} onValueChange={(v) => setCrit(p.id, { metric: v as CriterionMetric })}>
                <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(METRIC_LABEL) as CriterionMetric[]).map((m) => <SelectItem key={m} value={m}>{METRIC_LABEL[m]}</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-muted-foreground">≥</span>
              <Input className="h-8 w-24" type="number" step="any" value={p.target} onChange={(e) => setCrit(p.id, { target: Number(e.target.value) })} />
              <span className="ml-auto font-mono tabular-nums">{fmtVal(p.metric, p.value)}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPatch({ criteria: goal.criteria.filter((c) => c.id !== p.id) })} aria-label="Quitar criterio"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", p.done ? "bg-emerald-500" : "bg-foreground")} style={{ width: `${p.pct}%` }} />
            </div>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => onPatch({ criteria: [...goal.criteria, { id: newId(), metric: "planPct", target: 90 }] })}>
          <Plus className="h-4 w-4" /> Criterio
        </Button>
      </CardContent>
    </Card>
  );
}
