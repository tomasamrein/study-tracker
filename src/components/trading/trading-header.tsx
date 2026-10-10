"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTrading, useVisibleModes } from "@/lib/trading/store";
import { ALL_MODES } from "@/lib/trading/types";

const TABS = [
  { href: "/trading", label: "Hoy" },
  { href: "/trading/backtest", label: "Backtest" },
  { href: "/trading/trades", label: "Trades" },
  { href: "/trading/calendario", label: "Calendario" },
  { href: "/trading/estadisticas", label: "Estadísticas" },
  { href: "/trading/plan", label: "Plan" },
  { href: "/trading/pagos", label: "Pagos" },
  { href: "/trading/cuentas", label: "Cuentas" },
  { href: "/trading/ajustes", label: "Ajustes" },
];

/** Selector de modo/fase: filtra toda la sección. */
export function ModeToggle() {
  const { state, updateSettings } = useTrading();
  const modes = useVisibleModes();
  const selected = state.settings.selectedModeId;
  const options = [{ id: ALL_MODES, name: "Todos" }, ...modes];
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Modo">
      {options.map((m) => (
        <button
          key={m.id}
          role="tab"
          aria-selected={selected === m.id}
          onClick={() => updateSettings({ selectedModeId: m.id })}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
            selected === m.id
              ? "border-foreground bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {m.name}
        </button>
      ))}
    </div>
  );
}

export function TradingNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-4 overflow-x-auto border-b text-sm">
      {TABS.map((t) => {
        const active = t.href === "/trading" ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px shrink-0 border-b-2 py-2 transition-colors",
              active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Aviso fijo: las reglas de la prop firm se verifican en la web oficial. */
export function VerifyRulesNote({ className }: { className?: string }) {
  return (
    <p className={cn("rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground", className)}>
      Los valores de las reglas son editables y vienen cargados como punto de partida.
      Verificalos con la web oficial de Lucid Trading antes de confiar en ellos.
    </p>
  );
}

export function formatMoney(n: number, currency = "USD") {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
}
