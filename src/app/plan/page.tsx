"use client";

import { useMemo, useState } from "react";
import { Search, Pencil, Clock } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  CATEGORY_LABELS,
  STATE_META,
  SUBJECT_STATES,
  type Subject,
  type SubjectCategory,
  type SubjectState,
} from "@/lib/types";
import { PLAN_META } from "@/lib/study-plan";
import { formatMinutes } from "@/lib/stats";
import { LoadingScreen } from "@/components/loading-screen";
import { StateBadge } from "@/components/state-badge";
import { PlanProgress } from "@/components/plan-progress";
import { AddSubjectDialog } from "@/components/plan/add-subject-dialog";
import { EditSubjectDialog } from "@/components/plan/edit-subject-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORY_ORDER: SubjectCategory[] = [
  "ingreso",
  "obligatoria",
  "idioma",
  "tramo-final",
  "optativa",
  "electiva",
];

export default function PlanPage() {
  const { loaded, subjects, sessions } = useStore();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<SubjectState | "all">("all");
  const [catFilter, setCatFilter] = useState<SubjectCategory | "all">("all");
  const [editing, setEditing] = useState<Subject | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const minutesById = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions)
      map.set(s.subjectId, (map.get(s.subjectId) ?? 0) + s.minutes);
    return map;
  }, [sessions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subjects.filter((s) => {
      if (stateFilter !== "all" && s.state !== stateFilter) return false;
      if (catFilter !== "all" && s.category !== catFilter) return false;
      if (
        q &&
        !s.name.toLowerCase().includes(q) &&
        !s.code.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [subjects, search, stateFilter, catFilter]);

  // Agrupar: categoría -> grupo -> materias
  const grouped = useMemo(() => {
    const byCat = new Map<SubjectCategory, Map<string, Subject[]>>();
    for (const s of filtered) {
      if (!byCat.has(s.category)) byCat.set(s.category, new Map());
      const groups = byCat.get(s.category)!;
      if (!groups.has(s.group)) groups.set(s.group, []);
      groups.get(s.group)!.push(s);
    }
    return byCat;
  }, [filtered]);

  if (!loaded) return <LoadingScreen />;

  const openEdit = (s: Subject) => {
    setEditing(s);
    setEditOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plan de estudios</h1>
          <p className="text-sm text-muted-foreground">
            {PLAN_META.career} · {PLAN_META.university}
          </p>
          <p className="text-xs text-muted-foreground">
            {PLAN_META.proposal} · Legajo {PLAN_META.legajo}
          </p>
        </div>
        <AddSubjectDialog />
      </div>

      <PlanProgress subjects={subjects} />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar materia o código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={stateFilter}
          onValueChange={(v) => setStateFilter(v as SubjectState | "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {SUBJECT_STATES.map((st) => (
              <SelectItem key={st} value={st}>
                {STATE_META[st].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={catFilter}
          onValueChange={(v) => setCatFilter(v as SubjectCategory | "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORY_ORDER.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No hay materias que coincidan con los filtros.
        </p>
      ) : (
        <div className="space-y-8">
          {CATEGORY_ORDER.filter((c) => grouped.has(c)).map((cat) => (
            <section key={cat} className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </h2>
              {[...grouped.get(cat)!.entries()].map(([group, items]) => (
                <div key={group} className="space-y-2">
                  {group !== CATEGORY_LABELS[cat] && (
                    <h3 className="text-xs font-medium text-muted-foreground/80">
                      {group}
                    </h3>
                  )}
                  <Card>
                    <CardContent className="divide-y p-0">
                      {items.map((s) => {
                        const min = minutesById.get(s.id) ?? 0;
                        return (
                          <div
                            key={s.id}
                            className="flex items-center gap-3 px-4 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {s.name}
                              </p>
                              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-mono">{s.code}</span>
                                {s.grade != null && (
                                  <span>· Nota {s.grade}</span>
                                )}
                                {min > 0 && (
                                  <span className="inline-flex items-center gap-1">
                                    · <Clock className="h-3 w-3" />
                                    {formatMinutes(min)}
                                  </span>
                                )}
                              </p>
                            </div>

                            <div className="hidden sm:block">
                              <StateBadge state={s.state} />
                            </div>

                            <InlineStateSelect subject={s} />

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(s)}
                              aria-label="Editar materia"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <EditSubjectDialog
        subject={editing}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}

function InlineStateSelect({ subject }: { subject: Subject }) {
  const { updateSubject } = useStore();
  return (
    <Select
      value={subject.state}
      onValueChange={(v) => updateSubject(subject.id, { state: v as SubjectState })}
    >
      <SelectTrigger className="hidden w-40 md:flex" aria-label="Cambiar estado">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUBJECT_STATES.map((st) => (
          <SelectItem key={st} value={st}>
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: STATE_META[st].color }}
              />
              {STATE_META[st].label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
