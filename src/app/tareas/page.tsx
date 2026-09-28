"use client";

import { useMemo, useRef, useState } from "react";
import {
  addDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { Check, Plus, Star, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { TodoItem } from "@/lib/types";
import { LoadingScreen } from "@/components/loading-screen";
import { Spark } from "@/components/spark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DAY_KEY = "yyyy-MM-dd";
const WINDOW = 7;
const NO_SUBJECT = "__none__";
const NO_AREA = "__none__";
const NO_FILTER = "__all__";

export default function TodosPage() {
  const {
    loaded,
    subjects,
    areas,
    todos,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    clearCompletedTodos,
  } = useStore();

  const todayKey = format(new Date(), DAY_KEY);
  const [text, setText] = useState("");
  const [day, setDay] = useState(todayKey);
  const [subjectId, setSubjectId] = useState(NO_SUBJECT);
  const [areaId, setAreaId] = useState(NO_AREA);
  const [filterArea, setFilterArea] = useState(NO_FILTER);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  );
  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

  const days = useMemo(() => {
    const base = startOfDay(new Date());
    return Array.from({ length: WINDOW }, (_, i) => {
      const d = addDays(base, i);
      return { key: format(d, DAY_KEY), date: d };
    });
  }, []);

  const filteredTodos = useMemo(() => {
    let filtered = [...todos];
    if (filterArea !== NO_FILTER) {
      filtered = filtered.filter((t) => t.areaId === filterArea);
    }
    const grouped = new Map<string, TodoItem[]>();
    for (const d of days) grouped.set(d.key, []);
    for (const t of filtered) {
      if (!grouped.has(t.day)) grouped.set(t.day, []);
      grouped.get(t.day)!.push(t);
    }
    for (const items of grouped.values()) {
      items.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (!!a.priority !== !!b.priority) return a.priority ? -1 : 1;
        return a.createdAt.localeCompare(b.createdAt);
      });
    }
    return grouped;
  }, [todos, filterArea, days]);

  const startEdit = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const commitEdit = () => {
    if (editingId && editText.trim()) {
      updateTodo(editingId, { text: editText.trim() });
    }
    setEditingId(null);
    setEditText("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    addTodo({
      text: value,
      day,
      areaId: areaId === NO_AREA ? null : areaId,
      subjectId: areaId === "carrera" && subjectId !== NO_SUBJECT ? subjectId : null,
    });
    setText("");
  };

  if (!loaded) return <LoadingScreen />;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">Tareas</p>
        <h1 className="display text-5xl md:text-6xl">Menos lista, más hecho.</h1>
        <p className="max-w-xl text-muted-foreground">
          Organizá tus pendientes día por día. Marcá con ★ tus 3 prioridades.
        </p>
      </header>

      {/* Add form */}
      <Card>
        <CardContent className="p-3">
          <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
            <Input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nueva tarea…"
              className="min-w-48 flex-1"
            />
            <Input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value || todayKey)}
              className="w-36"
            />
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_AREA}>Sin área</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {areaId === "carrera" && (
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Materia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUBJECT}>Sin materia</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button type="submit" size="sm">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filtrar por área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_FILTER}>Todas las áreas</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {todos.length} tarea{todos.length === 1 ? "" : "s"} en total
          · {todos.filter((t) => t.done).length} completada
          {todos.filter((t) => t.done).length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => {
          const isToday = d.key === todayKey;
          const active = d.key === day;
          const dayTodos = filteredTodos.get(d.key) ?? [];
          const pending = dayTodos.filter((t) => !t.done).length;
          return (
            <button
              key={d.key}
              onClick={() => setDay(d.key)}
              className={cn(
                "flex shrink-0 flex-col items-center gap-0.5 rounded-lg border px-4 py-2 text-xs transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted",
                isToday && !active && "border-border",
              )}
            >
              <span className="text-sm font-semibold">
                {format(d.date, "EEE", { locale: es }).slice(0, 3)}
              </span>
              <span className="display text-2xl">{format(d.date, "d")}</span>
              <span className="text-[10px]">
                {isToday
                  ? "Hoy"
                  : format(d.date, "MMM", { locale: es }).slice(0, 3)}
              </span>
              {pending > 0 && (
                <span className="mt-0.5 h-1 w-1 rounded-full bg-current" />
              )}
            </button>
          );
        })}
      </div>

      {/* Day detail */}
      <DayDetail
        dayKey={day}
        todayKey={todayKey}
        items={filteredTodos.get(day) ?? []}
        subjectMap={subjectMap}
        areaMap={areaMap}
        onTogglePriority={(t) => updateTodo(t.id, { priority: !t.priority })}
        editingId={editingId}
        editText={editText}
        onStartEdit={startEdit}
        onEditChange={setEditText}
        onCommitEdit={commitEdit}
        onCancelEdit={() => setEditingId(null)}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
        onClearDone={() => clearCompletedTodos(day)}
      />
    </div>
  );
}

function DayDetail({
  dayKey,
  todayKey,
  items,
  subjectMap,
  areaMap,
  onTogglePriority,
  editingId,
  editText,
  onStartEdit,
  onEditChange,
  onCommitEdit,
  onCancelEdit,
  onToggle,
  onDelete,
  onClearDone,
}: {
  dayKey: string;
  todayKey: string;
  items: TodoItem[];
  subjectMap: Map<string, { name: string }>;
  areaMap: Map<string, { name: string }>;
  onTogglePriority: (todo: TodoItem) => void;
  editingId: string | null;
  editText: string;
  onStartEdit: (todo: TodoItem) => void;
  onEditChange: (text: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClearDone: () => void;
}) {
  const date = parseISO(dayKey);
  const isToday = dayKey === todayKey;
  const isPast = isBefore(date, startOfDay(parseISO(todayKey)));
  const done = items.filter((t) => t.done).length;
  const pending = items.length - done;

  return (
    <Card
      className={cn(
        isPast && pending > 0 && "ring-foreground/25 ring-dashed",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            {isToday ? "Hoy" : format(date, "EEEE", { locale: es })}
            <span className="text-sm font-normal text-muted-foreground">
              {format(date, "d MMM", { locale: es })}
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {items.length === 0
              ? "Sin tareas"
              : `${done}/${items.length} completada${done === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {done > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={onClearDone}
            >
              Limpiar hechas
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay tareas para este día.
          </p>
        ) : (
          <Spark>
          <ul className="space-y-1">
            {items.map((t) => (
              <li
                key={t.id}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
              >
                <button
                  type="button"
                  onClick={() => onToggle(t.id)}
                  aria-label={t.done ? "Pendiente" : "Completada"}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    t.done
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/30 hover:border-foreground",
                  )}
                >
                  {t.done && <Check className="h-3 w-3" />}
                </button>

                <div className="min-w-0 flex-1">
                  {editingId === t.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onCommitEdit();
                      }}
                      className="flex items-center gap-2"
                    >
                      <Input
                        value={editText}
                        onChange={(e) => onEditChange(e.target.value)}
                        onBlur={onCommitEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") onCancelEdit();
                        }}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStartEdit(t)}
                      className="block w-full text-left"
                    >
                      <p
                        className={cn(
                          "truncate text-sm",
                          t.done && "text-muted-foreground line-through",
                        )}
                      >
                        {t.text}
                      </p>
                    </button>
                  )}
                </div>

                {(t.subjectId || t.areaId) && (
                  <span className="hidden max-w-40 shrink-0 truncate rounded-md border px-2 py-0.5 text-[10px] text-muted-foreground sm:inline">
                    {t.subjectId
                      ? subjectMap.get(t.subjectId)?.name ?? "?"
                      : areaMap.get(t.areaId ?? "")?.name ?? "?"}
                  </span>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 shrink-0",
                    t.priority ? "text-foreground" : "text-muted-foreground/50 hover:text-foreground",
                  )}
                  onClick={() => onTogglePriority(t)}
                  aria-label={t.priority ? "Quitar de prioridades" : "Marcar como prioridad"}
                >
                  <Star className={cn("h-3.5 w-3.5", t.priority && "fill-current")} />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground transition-opacity sm:opacity-0 sm:group-hover:opacity-100 hover:text-foreground"
                  onClick={() => onDelete(t.id)}
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          </Spark>
        )}
      </CardContent>
    </Card>
  );
}
