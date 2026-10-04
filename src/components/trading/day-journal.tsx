"use client";

import { useTrading } from "@/lib/trading/store";
import type { DayJournal, ListItem } from "@/lib/trading/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

/** Checklist previo, cierre del día, emoción y notas de un día. */
export function DayJournalEditor({ date }: { date: string }) {
  const { state, update } = useTrading();
  const j: DayJournal = state.journal[date] ?? { date, preChecks: [], closeChecks: [] };
  const set = (p: Partial<DayJournal>) =>
    update((prev) => ({ ...prev, journal: { ...prev.journal, [date]: { ...j, ...prev.journal[date], ...p, date } } }));
  const toggle = (key: "preChecks" | "closeChecks", id: string) => {
    const list = j[key] ?? [];
    set({ [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Checks title="Checklist previo" items={state.preChecklist} checked={j.preChecks ?? []} onToggle={(id) => toggle("preChecks", id)} />
        <Checks title="Cierre del día" items={state.closeChecklist} checked={j.closeChecks ?? []} onToggle={(id) => toggle("closeChecks", id)} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch id={`plan-${date}`} checked={j.followedPlan ?? false} onCheckedChange={(v) => set({ followedPlan: v })} />
          <Label htmlFor={`plan-${date}`}>Seguí el plan hoy</Label>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`emo-${date}`}>Emoción del día (1–10)</Label>
          <Input
            id={`emo-${date}`}
            className="w-20"
            type="number"
            min={1}
            max={10}
            value={j.emotion ?? ""}
            onChange={(e) => set({ emotion: e.target.value === "" ? null : Math.min(10, Math.max(1, Number(e.target.value))) })}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Errores</Label>
          <Textarea rows={2} value={j.mistakes ?? ""} onChange={(e) => set({ mistakes: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>¿Qué aprendí?</Label>
          <Textarea rows={2} value={j.learned ?? ""} onChange={(e) => set({ learned: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notas del día</Label>
        <Textarea rows={2} value={j.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
      </div>
    </div>
  );
}

function Checks({ title, items, checked, onToggle }: { title: string; items: ListItem[]; checked: string[]; onToggle: (id: string) => void }) {
  const visible = items.filter((x) => !x.hidden);
  const done = visible.filter((x) => checked.includes(x.id)).length;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {title} <span className="font-mono text-xs text-muted-foreground">{done}/{visible.length}</span>
      </p>
      {visible.map((it) => (
        <label key={it.id} className="flex items-center gap-2 text-sm">
          <Checkbox checked={checked.includes(it.id)} onCheckedChange={() => onToggle(it.id)} />
          {it.name}
        </label>
      ))}
    </div>
  );
}
