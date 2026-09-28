"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { bestClean, daysClean } from "@/lib/habits";
import type { Vice } from "@/lib/types";
import CountUp from "@/components/react-bits/CountUp";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Contador grande de días limpio con botón de recaída. */
export function ViceCounter({ vice, compact = false }: { vice: Vice; compact?: boolean }) {
  const { relapseVice } = useStore();
  const [confirm, setConfirm] = useState(false);
  const days = daysClean(vice);
  const best = bestClean(vice);

  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm">{vice.name}</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          récord {best}d · {vice.relapses.length} recaída{vice.relapses.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex items-end gap-2">
        <span className={compact ? "display text-4xl tabular-nums" : "display text-6xl tabular-nums"}>
          <CountUp to={days} duration={1} />
          <span className="ml-1 font-sans text-xs text-muted-foreground">días</span>
        </span>
        {!compact && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={() => setConfirm(true)}
            aria-label="Registrar recaída"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Recaíste con {vice.name.toLowerCase()}?</DialogTitle>
            <DialogDescription>
              Pasa. Lo importante es registrarlo con honestidad y volver a
              arrancar hoy. Tu récord de {best} días queda guardado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                relapseVice(vice.id);
                setConfirm(false);
              }}
            >
              Reiniciar contador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
