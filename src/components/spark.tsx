"use client";

import ClickSpark from "@/components/react-bits/ClickSpark";
import { useTheme } from "@/lib/theme";

/** ClickSpark de React Bits con el color del tema (blanco o negro). */
export function Spark({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { theme } = useTheme();
  return (
    <ClickSpark
      sparkColor={theme === "dark" ? "#fafafa" : "#0a0a0a"}
      sparkSize={8}
      sparkRadius={18}
      sparkCount={8}
      duration={380}
      className={className}
    >
      {children}
    </ClickSpark>
  );
}
