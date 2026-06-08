"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  STATE_META,
  SUBJECT_STATES,
  type Subject,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

export function EditSubjectDialog({
  subject,
  open,
  onOpenChange,
}: {
  subject: Subject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateSubject, deleteSubject } = useStore();
  const [form, setForm] = useState<Subject | null>(subject);

  useEffect(() => {
    setForm(subject);
  }, [subject]);

  if (!form) return null;

  const save = () => {
    updateSubject(form.id, {
      state: form.state,
      grade: form.grade,
      date: form.date,
    });
    toast.success(`${form.name} actualizada`);
    onOpenChange(false);
  };

  const remove = () => {
    deleteSubject(form.id);
    toast.success(`${form.name} eliminada`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6">{form.name}</DialogTitle>
          <DialogDescription>
            Código {form.code}
            {form.group ? ` · ${form.group}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Estado
            </Label>
            <Select
              value={form.state}
              onValueChange={(v) =>
                setForm({ ...form, state: v as Subject["state"] })
              }
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Nota
              </Label>
              <Input
                type="number"
                min={0}
                max={10}
                step={1}
                placeholder="—"
                value={form.grade ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    grade:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Fecha
              </Label>
              <Input
                type="date"
                value={form.date ?? ""}
                onChange={(e) =>
                  setForm({ ...form, date: e.target.value || null })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {form.custom ? (
            <Button variant="ghost" className="text-destructive" onClick={remove}>
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Guardar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
