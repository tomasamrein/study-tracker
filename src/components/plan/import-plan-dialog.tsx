"use client";

import { useRef, useState } from "react";
import { Upload, FileDown, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  parsePlanCsv,
  PLAN_CSV_TEMPLATE,
  type PlanImportResult,
} from "@/lib/plan-import";
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
import { toast } from "sonner";

export function ImportPlanDialog() {
  const { importPlan } = useStore();
  const [open, setOpen] = useState(false);
  const [career, setCareer] = useState("");
  const [parsed, setParsed] = useState<PlanImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setCareer("");
    setParsed(null);
    setError(null);
  };

  const downloadTemplate = () => {
    const blob = new Blob([PLAN_CSV_TEMPLATE], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-plan-de-estudios.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parsePlanCsv(String(reader.result));
        setParsed(result);
        setError(null);
      } catch (err) {
        setParsed(null);
        setError(err instanceof Error ? err.message : "No se pudo leer el CSV.");
      }
    };
    reader.readAsText(file);
  };

  const confirm = () => {
    if (!parsed) return;
    importPlan(
      parsed.subjects,
      career.trim() ? { career: career.trim() } : null,
    );
    toast.success(
      `Plan cargado: ${parsed.subjects.length} materias importadas.`,
    );
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
        <Button variant="outline">
          <Upload className="h-4 w-4" />
          Importar plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar plan de estudios</DialogTitle>
          <DialogDescription>
            Subí una planilla CSV con las materias de tu carrera. Esto reemplaza
            por completo el plan actual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            Columnas: <span className="font-mono">materia</span> (obligatoria),
            y opcionalmente <span className="font-mono">codigo</span>,{" "}
            <span className="font-mono">anio</span>,{" "}
            <span className="font-mono">cuatrimestre</span>,{" "}
            <span className="font-mono">categoria</span>,{" "}
            <span className="font-mono">estado</span>,{" "}
            <span className="font-mono">nota</span>.
            <Button
              variant="link"
              size="sm"
              className="h-auto px-1 py-0 text-xs"
              onClick={downloadTemplate}
            >
              <FileDown className="h-3.5 w-3.5" />
              Descargar plantilla
            </Button>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Nombre de la carrera (opcional)
            </Label>
            <Input
              value={career}
              onChange={(e) => setCareer(e.target.value)}
              placeholder="Ej. Diseño Industrial"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Archivo CSV
            </Label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Elegir archivo…
            </Button>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {parsed && (
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">
                {parsed.subjects.length} materias detectadas
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {parsed.subjects
                  .slice(0, 4)
                  .map((s) => s.name)
                  .join(", ")}
                {parsed.subjects.length > 4 ? "…" : ""}
              </p>
              {parsed.warnings.length > 0 && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  {parsed.warnings.length} fila(s) con avisos (se omitieron filas
                  sin nombre).
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={!parsed}>
            Reemplazar plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
