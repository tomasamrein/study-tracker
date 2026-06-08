import { cn } from "@/lib/utils";
import { STATE_META, type SubjectState } from "@/lib/types";

export function StateBadge({
  state,
  className,
}: {
  state: SubjectState;
  className?: string;
}) {
  const meta = STATE_META[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        meta.badge,
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      {meta.label}
    </span>
  );
}
