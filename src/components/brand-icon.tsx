import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

/** Logo de Study Tracker: cuadrado con gradiente azul y birrete. */
export function BrandIcon({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-sky-400 text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-white/10",
        className,
      )}
    >
      <GraduationCap className={cn("h-5 w-5", iconClassName)} />
    </div>
  );
}
