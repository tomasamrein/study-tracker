import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Tarjeta chica de métrica. */
export function Mini({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("font-mono text-xl tabular-nums", className)}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Barra de progreso con color por nivel de alerta. */
export function LevelBar({ pct, level }: { pct: number; level: "ok" | "warn" | "danger" }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", level === "danger" ? "bg-red-500" : level === "warn" ? "bg-amber-500" : "bg-emerald-500")}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}
