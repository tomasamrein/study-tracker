"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Study Tracker error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div>
        <h1 className="text-lg font-semibold">Algo salió mal</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {error.message || "Error inesperado"}
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-muted-foreground/60">
            {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset} variant="outline">
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}
