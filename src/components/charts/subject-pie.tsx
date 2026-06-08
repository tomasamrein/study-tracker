"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMinutes, type SubjectHours } from "@/lib/stats";

interface Props {
  data: SubjectHours[];
  /** Cantidad máxima de materias antes de agrupar en "Otras". */
  maxSlices?: number;
}

export function SubjectPie({ data, maxSlices = 8 }: Props) {
  const total = data.reduce((a, d) => a + d.minutes, 0);

  if (total === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <p>Todavía no registraste horas de estudio.</p>
        <p className="text-xs">Hacé un pomodoro o cargá una sesión manual.</p>
      </div>
    );
  }

  // Agrupar las materias menores en "Otras".
  let slices = data;
  if (data.length > maxSlices) {
    const top = data.slice(0, maxSlices - 1);
    const rest = data.slice(maxSlices - 1);
    const restMinutes = rest.reduce((a, d) => a + d.minutes, 0);
    slices = [
      ...top,
      {
        subjectId: "__otras__",
        name: `Otras (${rest.length})`,
        code: "—",
        color: "#64748b",
        minutes: restMinutes,
      },
    ];
  }

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="minutes"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              strokeWidth={0}
            >
              {slices.map((s) => (
                <Cell key={s.subjectId} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as SubjectHours;
                const pct = ((p.minutes / total) * 100).toFixed(0);
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium text-popover-foreground">{p.name}</p>
                    <p className="text-muted-foreground">
                      {formatMinutes(p.minutes)} · {pct}%
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-xl font-semibold">{formatMinutes(total)}</span>
        </div>
      </div>

      <ul className="space-y-2">
        {slices.map((s) => {
          const pct = ((s.minutes / total) * 100).toFixed(0);
          return (
            <li key={s.subjectId} className="flex items-center gap-2 text-sm">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              <span className="flex-1 truncate" title={s.name}>
                {s.name}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatMinutes(s.minutes)}
              </span>
              <span className="w-9 text-right tabular-nums text-xs text-muted-foreground">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
