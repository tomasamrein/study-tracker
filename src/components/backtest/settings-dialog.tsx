"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DARK_COLORS, DEFAULT_BT_SETTINGS, LIGHT_COLORS, type BtSettings, type MaLine } from "@/lib/backtest/settings";

const TZS = [
  { id: "America/New_York", label: "Nueva York" },
  { id: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
  { id: "America/Chicago", label: "Chicago" },
  { id: "UTC", label: "UTC" },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <Label className="text-sm font-normal">{label}</Label>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Color({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // <input type=color> solo acepta #rrggbb; si viene rgba se muestra el texto.
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#888888";
  return (
    <span className="flex items-center gap-1.5">
      <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer rounded border bg-transparent" />
    </span>
  );
}

function Num({ value, onChange, step = "1", w = "w-20" }: { value: number; onChange: (v: number) => void; step?: string; w?: string }) {
  return (
    <Input type="number" step={step} value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(Number(e.target.value))} className={`h-8 ${w}`} />
  );
}

/** Convierte #rrggbb a rgba con alpha (para rellenos de zonas). */
const alpha = (hex: string, a: number) => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
};
const toHex = (c: string) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
  if (!m) return c;
  return `#${[m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("")}`;
};

export function SettingsDialog({
  open,
  onOpenChange,
  settings: s,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  settings: BtSettings;
  onChange: (s: BtSettings) => void;
}) {
  const set = (patch: Partial<BtSettings>) => onChange({ ...s, ...patch });
  const setMa = (id: string, patch: Partial<MaLine>) => set({ mas: s.mas.map((m) => (m.id === id ? { ...m, ...patch } : m)) });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Configuración del backtesting</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="ind">
          <TabsList className="w-full">
            <TabsTrigger value="ind">Indicadores</TabsTrigger>
            <TabsTrigger value="chart">Gráfico</TabsTrigger>
            <TabsTrigger value="ops">Operativa</TabsTrigger>
          </TabsList>

          <TabsContent value="ind" className="space-y-5 pt-3">
            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">FVG / iFVG</h3>
                <Switch checked={s.fvg.enabled} onCheckedChange={(v) => set({ fvg: { ...s.fvg, enabled: v } })} />
              </div>
              <div className="mt-1 divide-y">
                <Row label="Mostrar FVG">
                  <Switch checked={s.fvg.showFvg} onCheckedChange={(v) => set({ fvg: { ...s.fvg, showFvg: v } })} />
                </Row>
                <Row label="Mostrar iFVG (inversiones)">
                  <Switch checked={s.fvg.showIfvg} onCheckedChange={(v) => set({ fvg: { ...s.fvg, showIfvg: v } })} />
                </Row>
                <Row label="Mostrar zonas ya invalidadas">
                  <Switch checked={s.fvg.showDead} onCheckedChange={(v) => set({ fvg: { ...s.fvg, showDead: v } })} />
                </Row>
                <Row label="Tamaño mínimo (puntos)">
                  <Num value={s.fvg.minSize} step="0.25" onChange={(v) => set({ fvg: { ...s.fvg, minSize: v } })} />
                </Row>
                <Row label="Máximo de zonas vivas">
                  <Num value={s.fvg.maxZones} onChange={(v) => set({ fvg: { ...s.fvg, maxZones: v } })} />
                </Row>
                <Row label="Colores FVG alcista / bajista">
                  <Color value={toHex(s.fvg.bull)} onChange={(v) => set({ fvg: { ...s.fvg, bull: alpha(v, 0.18) } })} />
                  <Color value={toHex(s.fvg.bear)} onChange={(v) => set({ fvg: { ...s.fvg, bear: alpha(v, 0.18) } })} />
                </Row>
                <Row label="Colores iFVG alcista / bajista">
                  <Color value={toHex(s.fvg.ibull)} onChange={(v) => set({ fvg: { ...s.fvg, ibull: alpha(v, 0.22) } })} />
                  <Color value={toHex(s.fvg.ibear)} onChange={(v) => set({ fvg: { ...s.fvg, ibear: alpha(v, 0.22) } })} />
                </Row>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Sesiones (hora de Nueva York)</h3>
                <Switch checked={s.sessionsEnabled} onCheckedChange={(v) => set({ sessionsEnabled: v })} />
              </div>
              <div className="mt-2 space-y-2">
                {s.sessions.map((x) => (
                  <div key={x.id} className="flex items-center gap-2">
                    <Switch checked={x.enabled} onCheckedChange={(v) => set({ sessions: s.sessions.map((y) => (y.id === x.id ? { ...y, enabled: v } : y)) })} />
                    <Input value={x.name} onChange={(e) => set({ sessions: s.sessions.map((y) => (y.id === x.id ? { ...y, name: e.target.value } : y)) })} className="h-8 w-24" />
                    <Input type="time" value={x.start} onChange={(e) => set({ sessions: s.sessions.map((y) => (y.id === x.id ? { ...y, start: e.target.value } : y)) })} className="h-8 w-28" />
                    <Input type="time" value={x.end} onChange={(e) => set({ sessions: s.sessions.map((y) => (y.id === x.id ? { ...y, end: e.target.value } : y)) })} className="h-8 w-28" />
                    <Color value={x.color} onChange={(v) => set({ sessions: s.sessions.map((y) => (y.id === x.id ? { ...y, color: v } : y)) })} />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-medium">Niveles</h3>
              <div className="mt-1 divide-y">
                <Row label="Máximo / mínimo del día anterior (PDH/PDL)">
                  <Switch checked={s.levels.pdhl} onCheckedChange={(v) => set({ levels: { ...s.levels, pdhl: v } })} />
                </Row>
                <Row label="Apertura de medianoche NY">
                  <Switch checked={s.levels.midnight} onCheckedChange={(v) => set({ levels: { ...s.levels, midnight: v } })} />
                </Row>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Medias móviles</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => set({ mas: [...s.mas, { id: `ma${Date.now()}`, type: "ema", length: 50, color: "#00bcd4", enabled: true }] })}
                >
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                {s.mas.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Switch checked={m.enabled} onCheckedChange={(v) => setMa(m.id, { enabled: v })} />
                    <select value={m.type} onChange={(e) => setMa(m.id, { type: e.target.value as MaLine["type"] })} className="h-8 rounded-md border bg-background px-2 text-sm">
                      <option value="ema">EMA</option>
                      <option value="sma">SMA</option>
                    </select>
                    <Num value={m.length} onChange={(v) => setMa(m.id, { length: Math.max(1, Math.round(v)) })} />
                    <Color value={m.color} onChange={(v) => setMa(m.id, { color: v })} />
                    <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => set({ mas: s.mas.filter((x) => x.id !== m.id) })} aria-label="Quitar">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Switch checked={s.vwap.enabled} onCheckedChange={(v) => set({ vwap: { ...s.vwap, enabled: v } })} />
                <span className="text-sm">VWAP (reinicia a las 18:00 NY)</span>
                <span className="ml-auto">
                  <Color value={s.vwap.color} onChange={(v) => set({ vwap: { ...s.vwap, color: v } })} />
                </span>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="chart" className="space-y-4 pt-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => set({ colors: DARK_COLORS })}>Oscuro (TradingView)</Button>
              <Button variant="outline" size="sm" onClick={() => set({ colors: LIGHT_COLORS })}>Claro</Button>
            </div>
            <div className="divide-y">
              <Row label="Zona horaria del gráfico">
                <select value={s.displayTz} onChange={(e) => set({ displayTz: e.target.value })} className="h-8 rounded-md border bg-background px-2 text-sm">
                  {TZS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </Row>
              <Row label="Vela alcista (cuerpo / mecha)">
                <Color value={s.colors.up} onChange={(v) => set({ colors: { ...s.colors, up: v } })} />
                <Color value={s.colors.wickUp} onChange={(v) => set({ colors: { ...s.colors, wickUp: v } })} />
              </Row>
              <Row label="Vela bajista (cuerpo / mecha)">
                <Color value={s.colors.down} onChange={(v) => set({ colors: { ...s.colors, down: v } })} />
                <Color value={s.colors.wickDown} onChange={(v) => set({ colors: { ...s.colors, wickDown: v } })} />
              </Row>
              <Row label="Fondo">
                <Color value={s.colors.background} onChange={(v) => set({ colors: { ...s.colors, background: v } })} />
              </Row>
              <Row label="Grilla">
                <Switch checked={s.colors.grid} onCheckedChange={(v) => set({ colors: { ...s.colors, grid: v } })} />
              </Row>
            </div>
          </TabsContent>

          <TabsContent value="ops" className="space-y-1 pt-3">
            <div className="divide-y">
              <Row label="Riesgo por trade (USD)">
                <Num value={s.riskUsd} onChange={(v) => set({ riskUsd: v })} />
              </Row>
              <Row label="Stop por defecto (puntos)">
                <Num value={s.defaultSlPts} step="0.25" onChange={(v) => set({ defaultSlPts: v })} />
              </Row>
              <Row label="Objetivo por defecto (R)">
                <Num value={s.defaultTpR} step="0.5" onChange={(v) => set({ defaultTpR: v })} />
              </Row>
              <Row label="Velocidad de reproducción (ms por vela)">
                <Num value={s.speedMs} step="50" onChange={(v) => set({ speedMs: Math.max(20, v) })} />
              </Row>
            </div>
            <div className="pt-4">
              <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_BT_SETTINGS)}>Restablecer todo</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
