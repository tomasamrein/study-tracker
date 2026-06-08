"use client";

import { useRef } from "react";
import { Download, Upload, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { AppState } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function DataManagement() {
  const { exportState, importState, resetAll, backend } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportState(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Datos exportados");
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        if (!Array.isArray(parsed.subjects) || !Array.isArray(parsed.sessions)) {
          throw new Error("formato inválido");
        }
        importState(parsed);
        toast.success("Datos importados");
      } catch {
        toast.error("El archivo no es un backup válido.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Datos y copias de seguridad</CardTitle>
        <CardDescription>
          {backend === "firebase"
            ? "Tus datos se sincronizan en Firebase."
            : "Tus datos se guardan localmente en este navegador. Configurá Firebase para sincronizar."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={doExport}>
          <Download className="h-4 w-4" />
          Exportar
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Importar
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImport(f);
            e.target.value = "";
          }}
        />

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="text-destructive">
              <Trash2 className="h-4 w-4" />
              Reiniciar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Reiniciar todos los datos?</DialogTitle>
              <DialogDescription>
                Se borrarán todas tus sesiones de estudio y se restaurará el plan
                de estudios original. Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  variant="destructive"
                  onClick={() => {
                    resetAll();
                    toast.success("Datos reiniciados");
                  }}
                >
                  Sí, reiniciar
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
