/** Datos de ejemplo, marcados con `seed: true` para poder borrarlos con un clic. */
import { LUCID_50K_FLEX_EOD } from "./defaults";
import type { Payout, Trade, TradingAccount, TradingState } from "./types";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function buildSeed(state: TradingState, today: string): Pick<TradingState, "accounts" | "trades" | "payouts"> {
  const now = new Date().toISOString();
  const mk = (id: string, name: string, modeId: string, status: TradingAccount["status"]): TradingAccount => ({
    id, name, modeId, firm: modeId === "paper" ? "Simulador" : "Lucid Trading", status, size: 50000,
    startDate: today, cost: modeId === "paper" ? 0 : 90, recurring: false, rules: { ...LUCID_50K_FLEX_EOD }, seed: true, createdAt: now,
  });
  const accounts = [mk("seed-paper", "Ejemplo · Paper", "paper", "activa"), mk("seed-eval", "Ejemplo · Eval", "eval", "activa"), mk("seed-eval-0", "Ejemplo · Eval perdida", "eval", "perdida")];
  const r = rng(42);
  const setups = state.setups.map((s) => s.id);
  const sessions = state.sessions.map((s) => s.id);
  const trades: Trade[] = [];
  const end = new Date(`${today}T00:00:00Z`);
  for (let back = 40; back >= 0; back--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - back);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6 || r() < 0.2) continue;
    const day = d.toISOString().slice(0, 10);
    const n = 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const acc = back > 15 ? "seed-paper" : "seed-eval";
      const long = r() > 0.45;
      const entry = 20000 + Math.round(r() * 800);
      const stopPts = 10 + Math.round(r() * 20);
      const outcome = r();
      const rMult = outcome < 0.42 ? -1 : outcome < 0.5 ? 0 : 1 + r() * 2;
      const move = Math.round(rMult * stopPts * 4) / 4;
      const dir = long ? 1 : -1;
      const hour = 9 + Math.floor(r() * 4);
      const min = String(Math.floor(r() * 60)).padStart(2, "0");
      trades.push({
        id: `seed-t-${day}-${k}`, accountId: acc, modeId: acc === "seed-paper" ? "paper" : "eval", instrumentId: "mnq",
        direction: long ? "long" : "short", entryAt: `${day}T${String(hour).padStart(2, "0")}:${min}`,
        exitAt: `${day}T${String(hour + 1).padStart(2, "0")}:${min}`, entry, stop: entry - dir * stopPts,
        target: entry + dir * stopPts * 2, exit: entry + dir * move, contracts: 1 + Math.floor(r() * 4),
        setupId: setups.length ? setups[Math.floor(r() * setups.length)] : null,
        sessionId: sessions.length ? sessions[Math.floor(r() * sessions.length)] : null,
        followedPlan: r() > 0.15, brokenRule: undefined, emotionBefore: 3 + Math.floor(r() * 6),
        notes: "Trade de ejemplo", tags: [], emotionTags: [], seed: true, createdAt: now,
      });
      if (!trades[trades.length - 1].followedPlan) trades[trades.length - 1].brokenRule = "Entré sin confirmación";
    }
  }
  const payouts: Payout[] = [{ id: "seed-p-1", accountId: "seed-eval", date: today, amount: 500, seed: true }];
  return { accounts, trades, payouts };
}

export function hasSeed(s: TradingState) {
  return s.accounts.some((a) => a.seed) || s.trades.some((t) => t.seed) || s.payouts.some((p) => p.seed);
}

export function withoutSeed(s: TradingState): TradingState {
  return {
    ...s,
    accounts: s.accounts.filter((a) => !a.seed),
    trades: s.trades.filter((t) => !t.seed),
    payouts: s.payouts.filter((p) => !p.seed),
    expenses: s.expenses.filter((e) => !e.seed),
  };
}
