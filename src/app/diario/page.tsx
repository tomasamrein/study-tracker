"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { dayKey } from "@/lib/stats";
import type { DailyEntry } from "@/lib/types";
import { LoadingScreen } from "@/components/loading-screen";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const PROMPTS = [
  "¿Qué fue lo más importante que hice hoy?",
  "¿Qué me sacó de foco y cómo lo evito mañana?",
  "¿Qué decisión tomé hoy que mi yo de dentro de un año agradecería?",
  "¿Qué aprendí (de la facultad, del mercado o de mí)?",
  "¿Cómo me sentí operando y por qué?",
  "¿Qué haría distinto si repitiera el día?",
  "¿Qué me está preocupando y qué parte depende de mí?",
];

const hasContent = (e?: DailyEntry) => !!(e && (e.journal || e.gratitude || e.intention || e.reviewNote || e.mood || e.energy || e.score));

export default function DiarioPage() {
  const { loaded, daily } = useStore();
  const today = dayKey();
  const [selected, setSelected] = useState(today);
  const [q, setQ] = useState("");

  const entries = useMemo(() => {
    const term = q.trim().toLowerCase();
    return Object.entries(daily)
      .filter(([, e]) => hasContent(e))
      .filter(([, e]) => !term || [e.journal, e.gratitude, e.intention, e.reviewNote].some((t) => t?.toLowerCase().includes(term)))
      .sort((a, b) => b[0].localeCompare(a[0]));
  }, [daily, q]);

  if (!loaded) return <LoadingScreen />;

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-2">
        <p className="eyebrow">Diario</p>
        <h1 className="display text-5xl md:text-6xl">Pensar por escrito.</h1>
        <p className="max-w-xl text-muted-foreground">
          Tu registro de cada día: qué pasó, cómo te sentiste y qué aprendiste. Lo que no se escribe se olvida.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <JournalEditor day={selected} />

        <Card>
          <CardHeader>
            <CardTitle>Entradas</CardTitle>
            <CardDescription>{entries.length} días escritos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Input type="date" value={selected} max={today} onChange={(e) => e.target.value && setSelected(e.target.value)} aria-label="Ir a un día" />
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto text-sm">
              {selected !== today && (
                <li>
                  <button onClick={() => setSelected(today)} className="w-full rounded-md px-2 py-1.5 text-left text-muted-foreground hover:bg-muted">
                    ← Volver a hoy
                  </button>
                </li>
              )}
              {entries.map(([d, e]) => (
                <li key={d}>
                  <button
                    onClick={() => setSelected(d)}
                    className={cn("w-full rounded-md px-2 py-1.5 text-left hover:bg-muted", selected === d && "bg-muted")}
                  >
                    <span className="block capitalize">{format(parseISO(d), "EEE d MMM yyyy", { locale: es })}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {e.journal || e.intention || e.reviewNote || e.gratitude || "Sin texto"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function JournalEditor({ day }: { day: string }) {
  const { daily, setDaily } = useStore();
  const e = daily[day] ?? {};
  const prompt = PROMPTS[parseISO(day).getDate() % PROMPTS.length];
  const set = (p: Partial<DailyEntry>) => setDaily(day, p);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{format(parseISO(day), "EEEE d 'de' MMMM", { locale: es })}</CardTitle>
        <CardDescription>Se guarda solo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Scale label="Ánimo" value={e.mood} onChange={(mood) => set({ mood })} />
          <Scale label="Energía" value={e.energy} onChange={(energy) => set({ energy })} />
        </div>
        <div className="space-y-1.5">
          <Label>Intención del día</Label>
          <Input value={e.intention ?? ""} onChange={(ev) => set({ intention: ev.target.value })} placeholder="Hoy gano si…" />
        </div>
        <div className="space-y-1.5">
          <Label>Journal</Label>
          <p className="text-xs text-muted-foreground">Disparador: {prompt}</p>
          <Textarea rows={10} value={e.journal ?? ""} onChange={(ev) => set({ journal: ev.target.value })} placeholder="Escribí sin filtro…" />
        </div>
        <div className="space-y-1.5">
          <Label>Gratitud</Label>
          <Textarea rows={3} value={e.gratitude ?? ""} onChange={(ev) => set({ gratitude: ev.target.value })} placeholder="Tres cosas por las que estoy agradecido…" />
        </div>
        <div className="space-y-1.5">
          <Label>Cierre del día</Label>
          <Textarea rows={3} value={e.reviewNote ?? ""} onChange={(ev) => set({ reviewNote: ev.target.value })} placeholder="¿Qué salió bien? ¿Qué mejoro mañana?" />
        </div>
      </CardContent>
    </Card>
  );
}

function Scale({ label, value, onChange }: { label: string; value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? undefined : n)}
            className={cn(
              "h-9 flex-1 rounded-md border font-mono text-sm tabular-nums transition-colors",
              value === n ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={value === n}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
