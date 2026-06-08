"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMinutes, type DailyPoint } from "@/lib/stats";

export function PeriodBars({
  data,
  color = "var(--primary)",
  height = 220,
}: {
  data: DailyPoint[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.minutes), 0);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => (v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`)}
            tickLine={false}
            axisLine={false}
            width={42}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as DailyPoint;
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium capitalize text-popover-foreground">
                    {p.label}
                  </p>
                  <p className="text-muted-foreground">
                    {p.minutes > 0 ? formatMinutes(p.minutes) : "Sin estudio"}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="minutes" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((d) => (
              <Cell
                key={d.date}
                fill={color}
                fillOpacity={max > 0 && d.minutes === max ? 1 : 0.65}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
