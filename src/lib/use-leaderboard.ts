"use client";

import { useEffect, useState } from "react";
import { subscribeLeaderboard, type LeaderboardEntry } from "./leaderboard";

export interface UseLeaderboard {
  entries: LeaderboardEntry[];
  loaded: boolean;
}

/** Hook que entrega la tabla de posiciones en vivo. */
export function useLeaderboard(): UseLeaderboard {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = subscribeLeaderboard((e) => {
      setEntries(e);
      setLoaded(true);
    });
    return unsub;
  }, []);

  return { entries, loaded };
}
