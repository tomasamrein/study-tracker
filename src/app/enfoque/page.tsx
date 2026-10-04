"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  SkipForward,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { usePomodoroContext } from "@/lib/pomodoro-context";
import { type Phase } from "@/lib/use-pomodoro";
import { STATE_META } from "@/lib/types";
import { areaOf, dayKey, formatMinutes } from "@/lib/stats";
import { STUDY_METHODS, findMethod, methodOfTheDay } from "@/lib/methods";
import { LoadingScreen } from "@/components/loading-screen";
import { SpotifyPlayer } from "@/components/spotify/spotify-player";
import { ManualSessionDialog } from "@/components/stats/manual-session-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

const PHASE_LABEL: Record<Phase, string> = {
  focus: "Foco",
  short: "Descanso corto",
  long: "Descanso largo",
};

const PRESETS = [25, 50, 90];
const NO_METHOD = "__none__";

export default function EnfoquePage() {
  const { loaded, subjects, sessions, areas, settings, updateSettings } = useStore();
  const pomo = usePomodoroContext();
  const [deep, setDeep] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const sortedSubjects = useMemo(() => {
    const priority = ["cursando", "regular", "recursando"];
    const active = subjects.filter((s) => priority.includes(s.state));
    const rest = subjects
      .filter((s) => !priority.includes(s.state) && !STATE_META[s.state].done)
      .sort((a, b) => a.name.localeCompare(b.name));
    return { active, rest };
  }, [subjects]);

  // Proyectos usados antes en el área elegida (autocompletado).
  const recentLabels = useMemo(() => {
    const set = new Set<string>();
    for (const s of [...sessions].reverse()) {
      if (areaOf(s) === pomo.areaId && s.label) set.add(s.label);
      if (set.size >= 8) break;
    }
    return [...set];
  }, [sessions, pomo.areaId]);

  const today = useMemo(() => {
    const key = dayKey();
    const list = sessions
      .filter((s) => format(parseISO(s.startedAt), "yyyy-MM-dd") === key)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return { list, total: list.reduce((a, s) => a + s.minutes, 0) };
  }, [sessions]);

  // Escape sale del modo deep work.
  useEffect(() => {
    if (!deep) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeep(false);
      if (e.key === " ") {
        e.preventDefault();
        if (pomo.running) pomo.pause();
        else pomo.start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deep, pomo]);

  if (!loaded) return <LoadingScreen />;

  const progress = pomo.total > 0 ? 1 - pomo.remaining / pomo.total : 0;
  const mm = Math.floor(pomo.remaining / 60).toString().padStart(2, "0");
  const ss = (pomo.remaining % 60).toString().padStart(2, "0");
  const areaName = areas.find((a) => a.id === pomo.areaId)?.name ?? "Área";
  const subjectName = subjects.find((s) => s.id === pomo.subjectId)?.name;
  const target = pomo.areaId === "carrera" ? subjectName : pomo.label.trim() || undefined;
  const method = findMethod(pomo.methodId);
  const suggested = methodOfTheDay();

  if (deep) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-background px-6">
        <p className="eyebrow">
          {PHASE_LABEL[pomo.phase]} · {areaName}
          {target ? ` · ${target}` : ""}
        </p>
        <span className="font-mono text-[22vw] leading-none font-light tracking-tighter tabular-nums md:text-[14rem]">
          {mm}:{ss}
        </span>
        <div className="h-px w-full max-w-md bg-border">
          <div
            className="h-px bg-foreground transition-[width] duration-300 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {method && (
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {method.name} — {method.focusTip}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button size="lg" onClick={pomo.running ? pomo.pause : pomo.start} className="min-w-32">
            {pomo.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {pomo.running ? "Pausar" : "Seguir"}
          </Button>
          <Button size="lg" variant="outline" onClick={() => setDeep(false)}>
            <Minimize2 className="h-4 w-4" />
            Salir
          </Button>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          Espacio: pausar · Esc: salir
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">Deep work</p>
          <h1 className="display text-5xl md:text-6xl">Una cosa a la vez.</h1>
        </div>
        <ManualSessionDialog />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Timer */}
        <Card>
          <CardContent className="flex flex-col items-center gap-8 py-6">
            <div className="flex w-full items-center justify-between">
              <span className="eyebrow">
                {PHASE_LABEL[pomo.phase]} · {pomo.completedInCycle}/{settings.roundsBeforeLongBreak}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeep(true)}
                className="text-muted-foreground"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Deep work
              </Button>
            </div>

            <div className="flex flex-col items-center gap-5">
              <span className="font-mono text-7xl leading-none font-light tracking-tighter tabular-nums sm:text-8xl">
                {mm}:{ss}
              </span>
              <div className="h-px w-64 bg-border">
                <div
                  className="h-px bg-foreground transition-[width] duration-300 ease-linear"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {areaName}
                {target ? ` · ${target}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button size="lg" onClick={pomo.running ? pomo.pause : pomo.start} className="min-w-36">
                {pomo.running ? (
                  <>
                    <Pause className="h-4 w-4" /> Pausar
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Empezar
                  </>
                )}
              </Button>
              <Button size="lg" variant="outline" onClick={pomo.reset} aria-label="Reiniciar">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={pomo.skip} aria-label="Saltar fase">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {!pomo.running && pomo.phase === "focus" && (
              <div className="flex items-center gap-1.5">
                {PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateSettings({ focusMinutes: m })}
                    className={cn(
                      "rounded-full border px-3 py-1 font-mono text-xs tabular-nums transition-colors",
                      settings.focusMinutes === m
                        ? "border-foreground bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m}′
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Qué vas a hacer */}
        <div className="space-y-6">
          <QualityPrompt />

          <Card>
            <CardHeader>
              <CardTitle>¿En qué te enfocás?</CardTitle>
              <CardDescription>El tiempo se imputa a esta área al terminar cada foco.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {areas.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => pomo.setAreaId(a.id)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      pomo.areaId === a.id
                        ? "border-foreground bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {a.name}
                  </button>
                ))}
              </div>

              {pomo.areaId === "carrera" ? (
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">Materia</Label>
                  <Select value={pomo.subjectId} onValueChange={pomo.setSubjectId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Elegí una materia" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedSubjects.active.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>En curso</SelectLabel>
                          {sortedSubjects.active.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      <SelectGroup>
                        <SelectLabel>Otras materias</SelectLabel>
                        {sortedSubjects.rest.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Proyecto o tarea
                  </Label>
                  <Input
                    value={pomo.label}
                    onChange={(e) => pomo.setLabel(e.target.value)}
                    placeholder="Ej. CRM de turnos, landing de cliente…"
                    list="focus-labels"
                  />
                  <datalist id="focus-labels">
                    {recentLabels.map((l) => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
                </div>
              )}

              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Método (opcional)
                </Label>
                <Select
                  value={pomo.methodId || NO_METHOD}
                  onValueChange={(v) => pomo.setMethodId(v === NO_METHOD ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_METHOD}>Sin método</SelectItem>
                    <SelectGroup>
                      <SelectLabel>Método del día</SelectLabel>
                      <SelectItem value={suggested.id}>{suggested.name}</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Todos</SelectLabel>
                      {STUDY_METHODS.filter((m) => m.id !== suggested.id).map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {method && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {method.focusTip}{" "}
                    <Link href={`/estudio#${method.id}`} className="underline underline-offset-2">
                      Ver pasos
                    </Link>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Focos de hoy */}
        <Card>
          <CardHeader>
            <CardTitle>Hoy</CardTitle>
            <CardDescription>
              {today.list.length} foco{today.list.length === 1 ? "" : "s"} · {formatMinutes(today.total)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {today.list.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Todavía no hay focos hoy. El primero es el más difícil: 25 minutos alcanzan.
              </p>
            ) : (
              <ul className="divide-y">
                {today.list.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="w-12 font-mono text-xs text-muted-foreground tabular-nums">
                      {format(parseISO(s.startedAt), "HH:mm")}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {areas.find((a) => a.id === areaOf(s))?.name ?? "Área"}
                      {(() => {
                        const detail = s.subjectId
                          ? subjects.find((x) => x.id === s.subjectId)?.name
                          : s.label;
                        return detail ? ` · ${detail}` : "";
                      })()}
                    </span>
                    {s.quality && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {"●".repeat(s.quality)}
                        {"○".repeat(5 - s.quality)}
                      </span>
                    )}
                    <span className="font-mono text-xs tabular-nums">{formatMinutes(s.minutes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Ajustes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Ajustes</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings((v) => !v)}
              className="text-muted-foreground"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {showSettings ? "Ocultar" : "Mostrar"}
            </Button>
          </CardHeader>
          {showSettings && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <NumberField
                  label="Foco"
                  value={settings.focusMinutes}
                  min={1}
                  max={180}
                  onChange={(v) => updateSettings({ focusMinutes: v })}
                />
                <NumberField
                  label="Descanso"
                  value={settings.shortBreakMinutes}
                  min={1}
                  max={60}
                  onChange={(v) => updateSettings({ shortBreakMinutes: v })}
                />
                <NumberField
                  label="Largo"
                  value={settings.longBreakMinutes}
                  min={1}
                  max={60}
                  onChange={(v) => updateSettings({ longBreakMinutes: v })}
                />
              </div>
              <NumberField
                label="Focos antes del descanso largo"
                value={settings.roundsBeforeLongBreak}
                min={1}
                max={12}
                onChange={(v) => updateSettings({ roundsBeforeLongBreak: v })}
              />
              <div className="space-y-3 pt-1">
                <ToggleRow
                  label="Iniciar descansos automáticamente"
                  checked={settings.autoStartBreaks}
                  onChange={(v) => updateSettings({ autoStartBreaks: v })}
                />
                <ToggleRow
                  label="Iniciar foco automáticamente"
                  checked={settings.autoStartFocus}
                  onChange={(v) => updateSettings({ autoStartFocus: v })}
                />
                <ToggleRow
                  label="Sonido al cambiar de fase"
                  checked={settings.soundEnabled}
                  onChange={(v) => updateSettings({ soundEnabled: v })}
                />
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      <SpotifyPlayer />
    </div>
  );
}

/** Autoevaluación del último foco completado. */
function QualityPrompt() {
  const { updateSession } = useStore();
  const { lastSessionId, clearLastSession } = usePomodoroContext();
  if (!lastSessionId) return null;
  const rate = (q: number) => {
    updateSession(lastSessionId, { quality: q });
    clearLastSession();
  };
  return (
    <Card className="ring-foreground/40">
      <CardHeader>
        <CardTitle>¿Qué tan profundo fue ese foco?</CardTitle>
        <CardDescription>1 = disperso · 5 = flow total. Te ayuda a ver qué te rinde.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((q) => (
          <Button key={q} variant="outline" size="sm" className="w-10 font-mono" onClick={() => rate(q)}>
            {q}
          </Button>
        ))}
        <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={clearLastSession}>
          Omitir
        </Button>
      </CardContent>
    </Card>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
