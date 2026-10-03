"use client";

import { useTrading } from "@/lib/trading/store";
import { LoadingScreen } from "@/components/loading-screen";
import { ModeToggle, TradingNav } from "@/components/trading/trading-header";

export default function TradingLayout({ children }: { children: React.ReactNode }) {
  const { loaded } = useTrading();
  if (!loaded) return <LoadingScreen />;
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
