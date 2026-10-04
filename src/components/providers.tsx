"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { PomodoroProvider } from "@/lib/pomodoro-context";
import { TradingProvider } from "@/lib/trading/store";
import { AuthGate } from "@/components/auth-gate";
import { RewardsWatcher } from "@/components/rewards/rewards-watcher";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate>
          <StoreProvider>
            <TradingProvider>
              <PomodoroProvider>
                <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
                <RewardsWatcher />
              </PomodoroProvider>
            </TradingProvider>
          </StoreProvider>
        </AuthGate>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}
