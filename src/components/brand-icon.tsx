import { cn } from "@/lib/utils";

/** Marca de Foco: un punto sólido dentro de un anillo (foco = centro). */
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
        "flex items-center justify-center rounded-lg bg-foreground text-background",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className={cn("h-5 w-5", iconClassName)} aria-hidden>
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3.5" fill="currentColor" />
      </svg>
    </div>
  );
}
