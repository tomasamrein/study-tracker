"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { money, num, pnlClass, rMult } from "@/lib/trading/format";
import { openPoints, sizeForRisk, validateBracket, type PendingOrder, type Position, type Side } from "@/lib/backtest/sim";

export interface OrderRequest {
  side: Side;
  type: "market" | "limit" | "stop";
  price: number | null;
  qty: number;
  sl: number | null;
  tp: number | null;
}

interface Props {
  price: number | null;
  pointValue: number;
  commission: number;
  riskUsd: number;
  defaultSlPts: number;
  defaultTpR: number;
  position: Position | null;
  pending: PendingOrder[];
  currency: string;
  setups: { id: string; name: string }[];
  setupId: string | null;
  onSetup: (id: string | null) => void;
  onOrder: (o: OrderRequest) => string | null;
  onClose: () => void;
  onBreakeven: () => void;
  onCancel: (id: string) => void;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
        {hint && <span className="normal-case tracking-normal">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function OrderPanel(p: Props) {
  const [type, setType] = useState<OrderRequest["type"]>("market");
  const [limit, setLimit] = useState<string>("");
  const [slPts, setSlPts] = useState<number>(p.defaultSlPts);
  const [tpPts, setTpPts] = useState<number>(p.defaultSlPts * p.defaultTpR);
  const [useSl, setUseSl] = useState(true);
  const [useTp, setUseTp] = useState(true);
  const [sizing, setSizing] = useState<"risk" | "manual">("risk");
  const [manualQty, setManualQty] = useState(1);
  const [risk, setRisk] = useState(p.riskUsd);
  const [error, setError] = useState<string | null>(null);

  const entryFor = (): number | null => (type === "market" ? p.price : Number(limit) || null);
  const riskQty = sizeForRisk(risk, slPts, p.pointValue);
  const qty = sizing === "risk" && useSl ? riskQty : Math.max(1, Math.round(manualQty));
  const riskNow = useSl ? slPts * p.pointValue * qty : null;

  const submit = (side: Side) => {
    const entry = entryFor();
    if (entry == null) {
      setError("Poné el precio de la orden.");
      return;
    }
    if (qty < 1) {
      setError("Con ese riesgo y ese stop no alcanza ni para 1 contrato.");
      return;
    }
    const d = side === "long" ? 1 : -1;
    const sl = useSl && slPts > 0 ? r2(entry - d * slPts) : null;
    const tp = useTp && tpPts > 0 ? r2(entry + d * tpPts) : null;
    const err = validateBracket(side, entry, sl, tp) ?? p.onOrder({ side, type, price: type === "market" ? null : entry, qty, sl, tp });
    setError(err);
  };

  const pos = p.position;
  const openPts = pos && p.price != null ? openPoints(pos, p.price) : null;
  const openUsd = pos && openPts != null ? openPts * p.pointValue * pos.qty - p.commission * pos.qty : null;
  const openR = pos && pos.initialSl != null && openPts != null ? openPts / Math.abs(pos.entry - pos.initialSl) : null;

  return (
    <div className="space-y-4">
      {pos && (
        <div className={cn("rounded-lg border p-3", pos.side === "long" ? "border-emerald-500/40" : "border-red-500/40")}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase", pos.side === "long" ? "text-emerald-500" : "text-red-500")}>
              {pos.side === "long" ? "Long" : "Short"} · {pos.qty} ct @ {num(pos.entry)}
            </span>
            <span className={cn("font-mono text-sm tabular-nums", pnlClass(openUsd ?? 0))}>{money(openUsd, p.currency, true)}</span>
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs text-muted-foreground tabular-nums">
            <span>{openPts != null ? `${openPts > 0 ? "+" : ""}${openPts.toFixed(2)} pts` : "—"}</span>
            <span>{rMult(openR)}</span>
          </div>
          <div className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground">
            <span>SL {pos.sl != null ? num(pos.sl) : "—"}</span>
            <span>TP {pos.tp != null ? num(pos.tp) : "—"}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={p.onBreakeven} disabled={pos.sl === pos.entry}>Stop a BE</Button>
            <Button size="sm" variant="destructive" onClick={p.onClose}>Cerrar</Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Arrastrá las líneas SL / TP en el gráfico para moverlas.</p>
        </div>
      )}

      {p.pending.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Órdenes pendientes</p>
          {p.pending.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs">
              <span className={o.side === "long" ? "text-emerald-500" : "text-red-500"}>
                {o.side === "long" ? "Buy" : "Sell"} {o.type === "limit" ? "Limit" : "Stop"} {o.qty} @ {num(o.price)}
              </span>
              <button onClick={() => p.onCancel(o.id)} className="text-muted-foreground hover:text-foreground" aria-label="Cancelar orden">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 rounded-lg border p-3">
        <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-0.5 text-xs">
          {(["market", "limit", "stop"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                if (t !== "market" && !limit && p.price != null) setLimit(String(p.price));
              }}
              className={cn("rounded px-2 py-1 transition-colors", type === t ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              {t === "market" ? "Mercado" : t === "limit" ? "Límite" : "Stop"}
            </button>
          ))}
        </div>

        {type !== "market" && (
          <Field label="Precio" hint={p.price != null ? `actual ${num(p.price)}` : undefined}>
            <Input type="number" step="0.25" value={limit} onChange={(e) => setLimit(e.target.value)} className="h-8 font-mono" />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Field label={useSl ? "Stop (pts)" : "Sin stop"}>
            <div className="flex items-center gap-1">
              <input type="checkbox" checked={useSl} onChange={(e) => setUseSl(e.target.checked)} className="accent-foreground" aria-label="Usar stop" />
              <Input type="number" step="0.25" value={slPts} disabled={!useSl} onChange={(e) => setSlPts(Number(e.target.value))} className="h-8 font-mono" />
            </div>
          </Field>
          <Field label={useTp ? `Objetivo (pts)` : "Sin objetivo"} hint={useSl && slPts > 0 && useTp ? `${(tpPts / slPts).toFixed(1)}R` : undefined}>
            <div className="flex items-center gap-1">
              <input type="checkbox" checked={useTp} onChange={(e) => setUseTp(e.target.checked)} className="accent-foreground" aria-label="Usar objetivo" />
              <Input type="number" step="0.25" value={tpPts} disabled={!useTp} onChange={(e) => setTpPts(Number(e.target.value))} className="h-8 font-mono" />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Tamaño">
            <select value={sizing} onChange={(e) => setSizing(e.target.value as "risk" | "manual")} className="h-8 w-full rounded-md border bg-background px-2 text-sm">
              <option value="risk">Por riesgo</option>
              <option value="manual">Contratos</option>
            </select>
          </Field>
          {sizing === "risk" ? (
            <Field label="Riesgo USD">
              <Input type="number" step="10" value={risk} onChange={(e) => setRisk(Number(e.target.value))} className="h-8 font-mono" />
            </Field>
          ) : (
            <Field label="Contratos">
              <Input type="number" min={1} step="1" value={manualQty} onChange={(e) => setManualQty(Number(e.target.value))} className="h-8 font-mono" />
            </Field>
          )}
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          {qty} ct · riesgo {riskNow != null ? money(riskNow, p.currency) : "sin stop"}
        </p>

        <Field label="Setup">
          <select value={p.setupId ?? ""} onChange={(e) => p.onSetup(e.target.value || null)} className="h-8 w-full rounded-md border bg-background px-2 text-sm">
            <option value="">—</option>
            {p.setups.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => submit("long")} className="bg-emerald-600 text-white hover:bg-emerald-600/90" disabled={p.price == null}>
            Comprar {qty > 0 ? qty : ""}
          </Button>
          <Button onClick={() => submit("short")} className="bg-red-600 text-white hover:bg-red-600/90" disabled={p.price == null}>
            Vender {qty > 0 ? qty : ""}
          </Button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
