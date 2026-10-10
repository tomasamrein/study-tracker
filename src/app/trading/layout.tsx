"use client";

import { usePathname } from "next/navigation";
import { useTrading } from "@/lib/trading/store";
import { LoadingScreen } from "@/components/loading-screen";
import { ModeToggle, TradingNav } from "@/components/trading/trading-header";

export default function TradingLayout({ children }: { children: React.ReactNode }) {
  const { loaded } = useTrading();
  const pathname = usePathname();
  if (!loaded) return <LoadingScreen />;
  // El backtesting necesita todo el ancho para el gráfico.
  if (pathname.startsWith("/trading/backtest")) {
    return (
      <div className="space-y-4">
        <header className="flex items-baseline gap-3">
          <p className="eyebrow">Trading</p>
          <h1 className="display text-3xl">Backtest</h1>
        </header>
        <TradingNav />
        <div>{children}</div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">Trading</p>
        <h1 className="display text-5xl md:text-6xl">Proceso antes que resultado.</h1>
      </header>
      <ModeToggle />
      <TradingNav />
      <div className="pt-2">{children}</div>
    </div>
  );
}
