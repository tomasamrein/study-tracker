"use client";

import { useCallback, useMemo, useRef } from "react";
import { Pause, Play, RotateCcw, SkipForward, Coffee, Brain } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { usePomodoro, type Phase } from "@/lib/use-pomodoro";
import { STATE_META } from "@/lib/types";
import { LoadingScreen } from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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

const PHASE_META: Record<Phase, { label: string; color: string; icon: typeof Brain }> = {
  focus: { label: "Foco", color: "#6366f1", icon: Brain },
  short: { label: "Descanso corto", color: "#10b981", icon: Coffee },
  long: { label: "Descanso largo", color: "#06b6d4", icon: Coffee },
};

function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    /* sin audio disponible */
  }
}

export default function PomodoroPage() {
  const { loaded, subjects, settings, updateSettings, addSession } = useStore();
  const selectedRef = useRef<string>("");

  const sortedSubjects = useMemo(() => {
    const priority = ["cursando", "regular", "recursando"];
    const active = subjects.filter((s) => priority.includes(s.state));
    const rest = subjects
      .filter((s) => !priority.includes(s.state) && !STATE_META[s.state].done)
      .sort((a, b) => a.name.localeCompare(b.name));
    return { active, rest };
  }, [subjects]);

  const defaultSubject =
    sortedSubjects.active[0]?.id ?? sortedSubjects.rest[0]?.id ?? "";
  if (!selectedRef.current) selectedRef.current = defaultSubject;

  const handleFocusComplete = useCallback(
    (minutes: number) => {
      const subjectId = selectedRef.current;
      if (settings.soundEnabled) beep();
      if (!subjectId) {
        toast.warning("Foco completado, pero no había materia seleccionada.");
        return;
      }
      addSession({
        subjectId,
        startedAt: new Date(Date.now() - minutes * 60_000).toISOString(),
        minutes,
        source: "pomodoro",
      });
      const name = subjects.find((s) => s.id === subjectId)?.name ?? "materia";
      toast.success(`+${minutes} min registrados en ${name} 🎉`);
    },
    [addSession, settings.soundEnabled, subjects],
  );

  const handlePhaseChange = useCallback(
    (next: Phase) => {
      if (settings.soundEnabled && next !== "focus") beep();
    },
    [settings.soundEnabled],
  );

  const pomo = usePomodoro({
    settings,
    onFocusComplete: handleFocusComplete,
    onPhaseChange: handlePhaseChange,
  });

  if (!loaded) return <LoadingScreen />;

  const meta = PHASE_META[pomo.phase];
  const progress = pomo.total > 0 ? 1 - pomo.remaining / pomo.total : 0;
  const mm = Math.floor(pomo.remaining / 60)
    .toString()
    .padStart(2, "0");
  const ss = (pomo.remaining % 60).toString().padStart(2, "0");

  // Anillo SVG.
  const R = 130;
  const C = 2 * Math.PI * R;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pomodoro</h1>
        <p className="text-sm text-muted-foreground">
          Personalizá los tiempos y registrá horas por materia automáticamente.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Timer */}
        <Card>
          <CardContent className="flex flex-col items-center gap-6 p-6">
            <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium">
              <meta.icon className="h-4 w-4" style={{ color: meta.color }} />
              {meta.label}
            </div>

            <div className="relative">
              <svg width="300" height="300" viewBox="0 0 300 300">
                <circle
                  cx="150"
                  cy="150"
                  r={R}
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth="14"
                />
                <circle
                  cx="150"
                  cy="150"
                  r={R}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - progress)}
                  transform="rotate(-90 150 150)"
                  style={{ transition: "stroke-dashoffset 0.3s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-6xl font-bold tabular-nums">
                  {mm}:{ss}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  Foco {pomo.completedInCycle}/{settings.roundsBeforeLongBreak} ·{" "}
                  {pomo.totalFocus} hoy
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="lg"
                onClick={pomo.running ? pomo.pause : pomo.start}
                className="min-w-32"
              >
                {pomo.running ? (
                  <>
                    <Pause className="h-4 w-4" /> Pausar
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Iniciar
                  </>
                )}
              </Button>
              <Button size="lg" variant="outline" onClick={pomo.reset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={pomo.skip}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="w-full max-w-sm">
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Materia que estás estudiando
              </Label>
              <Select
                defaultValue={selectedRef.current}
                onValueChange={(v) => (selectedRef.current = v)}
              >
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
          </CardContent>
        </Card>

        {/* Ajustes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ajustes del pomodoro</CardTitle>
            <CardDescription>
              Se guardan automáticamente y aplican al detener el timer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <NumberField
                label="Foco (min)"
                value={settings.focusMinutes}
                min={1}
                max={120}
                onChange={(v) => updateSettings({ focusMinutes: v })}
              />
              <NumberField
                label="Descanso (min)"
                value={settings.shortBreakMinutes}
                min={1}
                max={60}
                onChange={(v) => updateSettings({ shortBreakMinutes: v })}
              />
              <NumberField
                label="Largo (min)"
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

            <div className="space-y-3 pt-2">
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

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              Cada foco completo suma{" "}
              <span className="font-medium text-foreground">
                {settings.focusMinutes} min
              </span>{" "}
              a la materia seleccionada. Los descansos no cuentan como estudio.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
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
      <Label className="mb-1.5 block text-xs text-muted-foreground">
        {label}
      </Label>
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
    <label className={cn("flex cursor-pointer items-center justify-between gap-3")}>
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
