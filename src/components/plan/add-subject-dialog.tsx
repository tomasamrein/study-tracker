"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  CATEGORY_LABELS,
  STATE_META,
  SUBJECT_STATES,
  type SubjectCategory,
  type SubjectState,
} from "@/lib/types";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORIES: SubjectCategory[] = [
  "optativa",
  "electiva",
  "obligatoria",
  "idioma",
  "tramo-final",
  "ingreso",
];

export function AddSubjectDialog() {
  const { addSubject } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<SubjectCategory>("optativa");
  const [state, setState] = useState<SubjectState>("pendiente");

  const reset = () => {
    setName("");
    setCode("");
    setCategory("optativa");
    setState("pendiente");
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error("Ingresá el nombre de la materia.");
      return;
    }
    addSubject({
      code: code.trim() || "—",
      name: name.trim(),
      state,
      grade: null,
      date: null,
      year: null,
      term: null,
      category,
      group: CATEGORY_LABELS[category],
    });
    toast.success(`${name.trim()} agregada al plan`);
    reset();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Agregar materia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar materia</DialogTitle>
          <DialogDescription>
            Sumá optativas o electivas a tu plan a medida que las elegís.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Nombre
            </Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Seguridad Informática"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Código
              </Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="FICH00884"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Categoría
              </Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as SubjectCategory)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Estado
            </Label>
            <Select
              value={state}
              onValueChange={(v) => setState(v as SubjectState)}
            >
              <SelectTrigger className="w-full">
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Agregar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
