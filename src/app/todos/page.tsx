"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { Check, Plus, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { TodoItem } from "@/lib/types";
import { LoadingScreen } from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DAY_KEY = "yyyy-MM-dd";
const NO_SUBJECT = "__none__";
/** Cantidad de días futuros (incluido hoy) que se muestran siempre. */
const WINDOW_DAYS = 7;

export default function TodosPage() {
  const { loaded, subjects, todos, addTodo, toggleTodo, deleteTodo, clearCompletedTodos } =
    useStore();

  const todayKey = format(new Date(), DAY_KEY);
  const [text, setText] = useState("");
  const [day, setDay] = useState(todayKey);
  const [subjectId, setSubjectId] = useState<string>(NO_SUBJECT);

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  );

  const activeSubjects = useMemo(() => {
    const priority = ["cursando", "regular", "recursando"];
    const active = subjects.filter((s) => priority.includes(s.state));
    const rest = subjects
      .filter((s) => !priority.includes(s.state))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { active, rest };
  }, [subjects]);

  // Días a mostrar: ventana de hoy..hoy+6 más cualquier día con tareas
  // (incluye días pasados con tareas pendientes/vencidas).
  const groupedDays = useMemo(() => {
    const keys = new Set<string>();
    const today = startOfDay(new Date());
    for (let i = 0; i < WINDOW_DAYS; i++) {
      keys.add(format(addDays(today, i), DAY_KEY));
    }
    for (const t of todos) keys.add(t.day);

    const byDay = new Map<string, TodoItem[]>();
    for (const k of keys) byDay.set(k, []);
    for (const t of todos) {
      if (!byDay.has(t.day)) byDay.set(t.day, []);
      byDay.get(t.day)!.push(t);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({
        key,
        items: items.sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          return a.createdAt.localeCompare(b.createdAt);
        }),
      }));
  }, [todos]);

  if (!loaded) return <LoadingScreen />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    addTodo({
      text: value,
      day,
      subjectId: subjectId === NO_SUBJECT ? null : subjectId,
    });
    setText("");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tareas</h1>
        <p className="text-sm text-muted-foreground">
          Organizá tus pendientes día por día y vas tachando lo que completás.
        </p>
      </div>

      {/* Alta de tarea */}
      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={submit}
            className="flex flex-col gap-3 md:flex-row md:items-end"
          >
            <div className="flex-1">
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Nueva tarea
              </Label>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ej. Terminar TP de Análisis"
              />
            </div>
            <div className="w-full md:w-40">
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Día
              </Label>
              <Input
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value || todayKey)}
              />
            </div>
            <div className="w-full md:w-52">
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Materia (opcional)
              </Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin materia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUBJECT}>Sin materia</SelectItem>
                  {activeSubjects.active.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>En curso</SelectLabel>
                      {activeSubjects.active.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  <SelectGroup>
                    <SelectLabel>Todas</SelectLabel>
                    {activeSubjects.rest.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="shrink-0">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Columnas por día */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groupedDays.map(({ key, items }) => (
          <DayColumn
            key={key}
            dayKey={key}
            todayKey={todayKey}
            items={items}
            subjectMap={subjectMap}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onQuickAdd={(value) => addTodo({ text: value, day: key })}
            onClearDone={() => clearCompletedTodos(key)}
          />
        ))}
      </div>
    </div>
  );
}

function DayColumn({
  dayKey,
  todayKey,
  items,
  subjectMap,
  onToggle,
  onDelete,
  onQuickAdd,
  onClearDone,
}: {
  dayKey: string;
  todayKey: string;
  items: TodoItem[];
  subjectMap: Map<string, { name: string }>;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onQuickAdd: (text: string) => void;
  onClearDone: () => void;
}) {
  const [quick, setQuick] = useState("");
  const date = parseISO(dayKey);
  const isToday = dayKey === todayKey;
  const isPast = isBefore(date, startOfDay(parseISO(todayKey)));
  const done = items.filter((t) => t.done).length;
  const pending = items.length - done;

  const dayName = format(date, "EEEE", { locale: es });
  const dateLabel = format(date, "d 'de' MMM", { locale: es });

  const quickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const value = quick.trim();
    if (!value) return;
    onQuickAdd(value);
    setQuick("");
  };

  return (
    <Card
      className={cn(
        "flex flex-col",
        isToday && "border-primary/50 ring-1 ring-primary/20",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="capitalize">{dayName}</span>
            {isToday && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                Hoy
              </span>
            )}
            {isPast && pending > 0 && (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                Vencido
              </span>
            )}
          </CardTitle>
          <span className="text-xs capitalize text-muted-foreground">
            {dateLabel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {items.length === 0
            ? "Sin tareas"
            : `${pending} pendiente${pending === 1 ? "" : "s"} · ${done} hecha${done === 1 ? "" : "s"}`}
        </p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2">
        <ul className="space-y-1.5">
          {items.map((t) => (
            <TodoRow
              key={t.id}
              todo={t}
              subjectName={t.subjectId ? subjectMap.get(t.subjectId)?.name : undefined}
              onToggle={() => onToggle(t.id)}
              onDelete={() => onDelete(t.id)}
            />
          ))}
        </ul>

        <form onSubmit={quickAdd} className="mt-auto flex items-center gap-2 pt-1">
          <Input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder="Agregar tarea…"
            className="h-8 text-sm"
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            aria-label="Agregar tarea"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {done > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 self-start text-xs text-muted-foreground"
            onClick={onClearDone}
          >
            <X className="h-3.5 w-3.5" />
            Borrar completadas
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function TodoRow({
  todo,
  subjectName,
  onToggle,
  onDelete,
}: {
  todo: TodoItem;
  subjectName?: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50">
      <button
        type="button"
        onClick={onToggle}
        aria-label={todo.done ? "Marcar como pendiente" : "Marcar como hecha"}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
          todo.done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-muted-foreground/40 hover:border-primary",
        )}
      >
        {todo.done && <Check className="h-3.5 w-3.5" />}
      </button>
      <div className="min-w-0 flex-1 leading-tight">
        <p
          className={cn(
            "truncate text-sm",
            todo.done && "text-muted-foreground line-through",
          )}
        >
          {todo.text}
        </p>
        {subjectName && (
          <p className="truncate text-[11px] text-muted-foreground">
            {subjectName}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        onClick={onDelete}
        aria-label="Eliminar tarea"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}
