import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

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
        "flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-400 text-white shadow-md",
        className,
      )}
    >
      <GraduationCap className={cn("h-5 w-5", iconClassName)} />
    </div>
  );
}
