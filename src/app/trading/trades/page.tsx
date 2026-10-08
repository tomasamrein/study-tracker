"use client";

import { useRef, useState } from "react";
import { Copy, Download, ExternalLink, Pencil, Plus, Share2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { newId, useTrading } from "@/lib/trading/store";
import { useFilteredTrades, useNames, type TradeFilters } from "@/lib/trading/selectors";
import { csvToTrades, downloadText, parseCsv, tradesToCsv, TRADE_CSV_HEADERS } from "@/lib/trading/csv";
import { summarize } from "@/lib/trading/calc";
import { day, duration, money, nowInTz, pct, pnlClass, rMult } from "@/lib/trading/format";
import type { Trade } from "@/lib/trading/types";
import { FilterBar } from "@/components/trading/filter-bar";
import { Mini } from "@/components/trading/mini";
import { RecapDialog } from "@/components/trading/recap-dialog";
import { TradeFormDialog, useBlankTrade } from "@/components/trading/trade-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TradesPage() {
  const { state, update, remove } = useTrading();
  const [filters, setFilters] = useState<TradeFilters>({});
  const [editing, setEditing] = useState<Trade | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [recap, setRecap] = useState<Trade | null>(null);
  const list = useFilteredTrades(filters);
  const names = useNames();
  const blank = useBlankTrade();
  const fileRef = useRef<HTMLInputElement>(null);
  const cur = state.settings.currency;
  const fmt = state.settings.dateFormat;
  const s = summarize(list);
  const rows = [...list].reverse();

  const importCsv = async (file: File) => {
    const text = await file.text();
    const b = blank();
    if (!b.accountId) {
      toast.error("Creá una cuenta antes de importar.");
      return;
    }
    const res = csvToTrades(parseCsv(text), state, { accountId: b.accountId, instrumentId: b.instrumentId });
    const now = new Date().toISOString();
    update((prev) => ({ ...prev, trades: [...prev.trades, ...res.trades.map((t) => ({ ...t, id: newId(), createdAt: now }))] }));
    if (res.errors.length) toast.warning(`Importé ${res.trades.length} trades. ${res.errors.length} filas con error: ${res.errors.slice(0, 3).join(" ")}`, { duration: 10000 });
    else toast.success(`Importé ${res.trades.length} trades.`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="display mr-auto text-3xl">Trades</h2>
        <Button variant="outline" size="sm" onClick={() => downloadText(`trades-${nowInTz(state.settings.timezone).slice(0, 10)}.csv`, tradesToCsv(list, state))}>
          <Download className="h-4 w-4" /> CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Importar
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importCsv(f);
            e.target.value = "";
          }}
        />
        <Button
          onClick={() => {
            if (state.accounts.length === 0) return toast.error("Primero creá una cuenta en la pestaña Cuentas.");
            setEditing(blank());
          }}
        >
          <Plus className="h-4 w-4" /> Nuevo trade
        </Button>
      </div>

      <FilterBar value={filters} onChange={setFilters} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="Trades" value={String(s.count)} />
        <Mini label="PnL" value={money(s.totalPnl, cur, true)} className={pnlClass(s.totalPnl)} />
        <Mini label="Winrate" value={pct(s.winrate)} />
        <Mini label="Expectativa" value={rMult(s.expectancyR)} />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 py-8 text-center text-sm text-muted-foreground">
            <p>No hay trades con estos filtros.</p>
            <p className="text-xs">
              Para importar, usá un CSV con columnas <code>fecha_entrada, direccion, entrada, salida, contratos</code> (el resto es opcional:{" "}
              {TRADE_CSV_HEADERS.slice(8, 15).join(", ")}…).
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <ul className="divide-y">
            {rows.map(({ trade: t, m }) => (
              <li key={t.id}>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/40" onClick={() => setOpen(open === t.id ? null : t.id)}>
                  <span className={t.direction === "long" ? "w-12 text-emerald-500" : "w-12 text-red-500"}>{t.direction === "long" ? "Long" : "Short"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      {day(t.entryAt, fmt)} {t.entryAt.slice(11, 16)} · {names.instrument(t.instrumentId)} × {t.contracts}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {names.account(t.accountId)} · {names.setup(t.setupId)}
                      {!t.followedPlan && " · rompí el plan"}
                      {t.seed && " · ejemplo"}
                    </span>
                  </span>
                  <span className="text-right font-mono tabular-nums">
                    <span className={`block ${pnlClass(m.pnl)}`}>{money(m.pnl, cur, true)}</span>
                    <span className="block text-xs text-muted-foreground">{rMult(m.r)}</span>
                  </span>
                </button>
                {open === t.id && (
                  <div className="space-y-3 border-t bg-muted/20 px-4 py-3 text-sm">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                      <D k="Modo" v={names.mode(t.modeId)} />
                      <D k="Entrada / salida" v={`${t.entry} → ${t.exit}`} />
                      <D k="Stop / objetivo" v={`${t.stop ?? "—"} / ${t.target ?? "—"}`} />
                      <D k="Riesgo" v={m.riskUsd != null ? money(m.riskUsd, cur) : "Sin stop"} />
                      <D k="Comisión" v={money(m.commission, cur)} />
                      <D k="Duración" v={duration(m.durationMin)} />
                      <D k="Sesión" v={names.session(t.sessionId)} />
                      <D k="TF" v={`${t.contextTf ?? "—"} / ${t.entryTf ?? "—"}`} />
                      <D k="Emoción" v={[t.emotionBefore, t.emotionDuring, t.emotionAfter].map((x) => x ?? "—").join(" · ")} />
                    </dl>
                    {!t.followedPlan && t.brokenRule && <p><span className="text-muted-foreground">Regla rota:</span> {t.brokenRule}</p>}
                    {t.notes && <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Notas:</span> {t.notes}</p>}
                    {t.lesson && <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Lección:</span> {t.lesson}</p>}
                    <div className="flex flex-wrap gap-1">
                      {[...(t.emotionTags ?? []), ...(t.tags ?? [])].map((x) => <Badge key={x} variant="secondary">{x}</Badge>)}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {t.shotBefore && <Button variant="outline" size="sm" asChild><a href={t.shotBefore} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Antes</a></Button>}
                      {t.shotAfter && <Button variant="outline" size="sm" asChild><a href={t.shotAfter} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Después</a></Button>}
                      <Button variant="secondary" size="sm" onClick={() => setRecap(t)}><Share2 className="h-4 w-4" /> Recap</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(t)}><Pencil className="h-4 w-4" /> Editar</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const now = nowInTz(state.settings.timezone);
                          setEditing({ ...t, id: newId(), seed: undefined, entryAt: now, exitAt: now, createdAt: new Date().toISOString() });
                        }}
                      >
                        <Copy className="h-4 w-4" /> Duplicar
                      </Button>
                      <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => confirm("¿Borrar este trade?") && remove("trades", t.id)}>
                        <Trash2 className="h-4 w-4" /> Borrar
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {recap && <RecapDialog trade={recap} onClose={() => setRecap(null)} />}
      {editing && <TradeFormDialog trade={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function D({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-mono text-xs tabular-nums">{v}</dd>
    </div>
  );
}
