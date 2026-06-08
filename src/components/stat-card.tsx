import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "text-primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="overflow-hidden transition-colors hover:border-primary/40">
      <CardContent className="flex items-start gap-3 p-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-current/10 ring-1 ring-current/15",
            accent,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="font-heading text-2xl font-semibold leading-tight tabular-nums">
            {value}
          </p>
          {hint && (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
