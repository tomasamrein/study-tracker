"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";

export function ManualSessionDialog() {
  const { subjects, areas, addSession } = useStore();
  const [open, setOpen] = useState(false);
  const [areaId, setAreaId] = useState("carrera");
  const [subjectId, setSubjectId] = useState("");
  const [label, setLabel] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");
  const [note, setNote] = useState("");

  const active = subjects.filter(
    (s) => s.state === "cursando" || s.state === "regular" || s.state === "recursando",
  );
  const rest = subjects
    .filter((s) => !active.includes(s))
    .sort((a, b) => a.name.localeCompare(b.name));

  const submit = () => {
    const totalMin = Number(hours) * 60 + Number(minutes);
    const isCarrera = areaId === "carrera";
    if (isCarrera && !subjectId) {
      toast.error("Elegí una materia.");
      return;
    }
    if (!Number.isFinite(totalMin) || totalMin <= 0) {
      toast.error("La duración debe ser mayor a 0.");
      return;
    }
    // Registrar a las 12:00 del día elegido para evitar saltos de zona horaria.
    const startedAt = new Date(`${date}T12:00:00`).toISOString();
    const trimmed = note.trim();
    const project = label.trim();
    addSession({
      areaId,
      subjectId: isCarrera ? subjectId : null,
      ...(!isCarrera && project ? { label: project } : {}),
      startedAt,
      minutes: totalMin,
      source: "manual",
      ...(trimmed ? { note: trimmed } : {}),
    });
    toast.success("Sesión registrada");
    setOpen(false);
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4" />
          Cargar foco
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar foco manual</DialogTitle>
          <DialogDescription>
            Registrá tiempo de enfoque que no hiciste con el timer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Área
            </Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {areaId !== "carrera" ? (
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Proyecto o tarea
              </Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej. CRM de turnos"
              />
            </div>
          ) : (
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Materia
            </Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elegí una materia" />
              </SelectTrigger>
              <SelectContent>
                {active.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>En curso</SelectLabel>
                    {active.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                <SelectGroup>
                  <SelectLabel>Todas</SelectLabel>
                  {rest.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Fecha
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Horas
              </Label>
              <Input
                type="number"
                min={0}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Minutos
              </Label>
              <Input
                type="number"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Nota (opcional)
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Repaso para parcial"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
