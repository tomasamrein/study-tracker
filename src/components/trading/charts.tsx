"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EquityPoint } from "@/lib/trading/calc";
import { money } from "@/lib/trading/format";

const axis = { tickLine: false, axisLine: false, tick: { fontSize: 11, fill: "var(--muted-foreground)" } } as const;
const POS = "#10b981";
const NEG = "#ef4444";

function Tip({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{title}</p>
      {lines.map((l) => <p key={l} className="text-muted-foreground">{l}</p>)}
    </div>
  );
}

/** Curva de equity (línea con área) y, debajo, el drawdown desde el pico. */
export function EquityChart({ points, currency }: { points: EquityPoint[]; currency: string }) {
  return (
    <div className="space-y-2">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="i" {...axis} />
            <YAxis {...axis} width={64} tickFormatter={(v) => money(v, currency).replace(/,\d+$/, "")} />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as EquityPoint;
                return <Tip title={`Trade #${p.i} · ${p.day}`} lines={[`Acumulado: ${money(p.equity, currency)}`, `Drawdown: ${money(p.drawdown, currency)}`]} />;
              }}
            />
            <Area type="monotone" dataKey="equity" stroke="var(--foreground)" strokeWidth={2} fill="var(--foreground)" fillOpacity={0.08} dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="i" hide />
            <YAxis {...axis} width={64} tickFormatter={(v) => money(v, currency).replace(/,\d+$/, "")} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as EquityPoint;
                return <Tip title={`Trade #${p.i}`} lines={[`Drawdown: ${money(p.drawdown, currency)}`]} />;
              }}
            />
            <Area type="monotone" dataKey="drawdown" stroke={NEG} strokeWidth={1.5} fill={NEG} fillOpacity={0.2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Barras de PnL por período (verde ganador, rojo perdedor). */
export function PnlBars({ data, currency }: { data: { key: string; label: string; pnl: number; count: number }[]; currency: string }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
          <YAxis {...axis} width={64} tickFormatter={(v) => money(v, currency).replace(/,\d+$/, "")} />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as { label: string; pnl: number; count: number };
              return <Tip title={p.label} lines={[money(p.pnl, currency, true), `${p.count} trades`]} />;
            }}
          />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((d) => <Cell key={d.key} fill={d.pnl >= 0 ? POS : NEG} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
