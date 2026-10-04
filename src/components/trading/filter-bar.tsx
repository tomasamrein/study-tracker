"use client";

import { X } from "lucide-react";
import { useTrading } from "@/lib/trading/store";
import { ALL_MODES } from "@/lib/trading/types";
import type { TradeFilters } from "@/lib/trading/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ANY = "__any";

export function FilterBar({ value, onChange }: { value: TradeFilters; onChange: (f: TradeFilters) => void }) {
  const { state } = useTrading();
  const sel = state.settings.selectedModeId;
  const accounts = state.accounts.filter((a) => sel === ALL_MODES || a.modeId === sel);
  const set = (p: Partial<TradeFilters>) => onChange({ ...value, ...p });
  const active = Object.values(value).some(Boolean);

  const pick = (placeholder: string, v: string | undefined, items: { id: string; name: string }[], key: keyof TradeFilters) => (
    <Select value={v ?? ANY} onValueChange={(x) => set({ [key]: x === ANY ? undefined : x })}>
      <SelectTrigger className="w-full"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{placeholder}</SelectItem>
        {items.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
      {pick("Todas las cuentas", value.accountId, accounts, "accountId")}
      {pick("Todos los setups", value.setupId, state.setups, "setupId")}
      {pick("Todas las sesiones", value.sessionId, state.sessions, "sessionId")}
      {pick("Todos los instrumentos", value.instrumentId, state.instruments.map((i) => ({ id: i.id, name: i.symbol })), "instrumentId")}
      <Input type="date" aria-label="Desde" value={value.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} />
      <Input type="date" aria-label="Hasta" value={value.to ?? ""} onChange={(e) => set({ to: e.target.value || undefined })} />
      <Button variant="ghost" disabled={!active} onClick={() => onChange({})}>
        <X className="h-4 w-4" /> Limpiar
      </Button>
    </div>
  );
}
