"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Download, ImagePlus, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useTrading } from "@/lib/trading/store";
import { tradeMetrics } from "@/lib/trading/calc";
import { qualityBreakdown } from "@/lib/trading/quality";
import { sizeViolation } from "@/lib/trading/risk";
import { drawRecap } from "@/lib/trading/recap-card";
import type { Trade } from "@/lib/trading/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function RecapDialog({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const { state } = useTrading();
  const names = useMemo(
    () => ({
      setup: state.setups.find((x) => x.id === trade.setupId)?.name,
      session: state.sessions.find((x) => x.id === trade.sessionId)?.name,
      mode: state.modes.find((x) => x.id === trade.modeId)?.name,
    }),
    [state.setups, state.sessions, state.modes, trade.setupId, trade.sessionId, trade.modeId],
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [title, setTitle] = useState("Trade del día");
  const [showMoney, setShowMoney] = useState(true);

  const instrument = state.instruments.find((i) => i.id === trade.instrumentId);
  const account = state.accounts.find((a) => a.id === trade.accountId);
  const m = useMemo(() => tradeMetrics(trade, instrument), [trade, instrument]);
  const parts = useMemo(() => {
    const day = trade.entryAt.slice(0, 10);
    const pre = state.preChecklist.filter((x) => !x.hidden);
    const done = state.journal[day]?.preChecks ?? [];
    const lim = state.settings.limits.maxContracts;
    const sizeBad = (!!account && !!instrument && !!sizeViolation(trade.contracts, instrument.micro, account.rules)) || (lim != null && trade.contracts > lim);
    return qualityBreakdown({
      trade,
      m,
      sizeViolation: sizeBad,
      preChecklist: pre.length ? pre.filter((x) => done.includes(x.id)).length / pre.length : null,
    });
  }, [trade, m, state, account, instrument]);
  const quality = parts.reduce((s, p) => s + p.points, 0);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const css = getComputedStyle(document.documentElement);
    const v = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb;
    const fonts = {
      sans: v("--font-geist", "system-ui, sans-serif"),
      serif: v("--font-instrument-serif", "Georgia, serif"),
      mono: v("--font-geist-mono", "ui-monospace, monospace"),
    };
    let dateLabel = trade.entryAt;
    try {
      dateLabel = format(parseISO(trade.entryAt), "d MMM yyyy · HH:mm", { locale: es });
    } catch {}
    const context = [names.setup, names.session, names.mode].filter(Boolean).join("  ·  ");
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      drawRecap(
      c,
      {
        title,
        context,
        instrument: instrument?.symbol ?? "",
        direction: trade.direction,
        r: m.r,
        pnl: showMoney ? m.pnl : null,
        currency: state.settings.currency,
        entry: trade.entry,
        stop: trade.stop ?? null,
        target: trade.target ?? null,
        exit: trade.exit,
        contracts: trade.contracts,
        grade: trade.grade,
        quality,
        dateLabel,
        image,
      },
      fonts,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [trade, m, image, title, showMoney, quality, instrument, names, state.settings.currency]);

  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("El archivo tiene que ser una imagen.");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
  };

  // Pegar la captura con Ctrl+V.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (f) loadFile(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const toBlob = () => new Promise<Blob | null>((res) => canvasRef.current?.toBlob(res, "image/png") ?? res(null));
  const fileName = `recap-${instrument?.symbol ?? "trade"}-${trade.entryAt.slice(0, 10)}.png`;

  const download = async () => {
    const blob = await toBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const share = async () => {
    const blob = await toBlob();
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${instrument?.symbol} ${trade.direction}` });
      } catch {
        /* cancelado */
      }
    } else {
      await download();
      toast.message("Tu navegador no permite compartir imágenes: la descargué.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Recap del trade</DialogTitle>
          <DialogDescription>Subí o pegá (Ctrl+V) la captura y compartilo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 md:grid-cols-[1fr_15rem]">
          <canvas ref={canvasRef} className="w-full rounded-xl border" style={{ aspectRatio: "4 / 5" }} />
          <div className="space-y-4">
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-4 w-4" /> {image ? "Cambiar captura" : "Subir captura"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadFile(f);
                e.target.value = "";
              }}
            />
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="money" checked={showMoney} onCheckedChange={setShowMoney} />
              <Label htmlFor="money">Mostrar monto en {state.settings.currency}</Label>
            </div>
            <div className="space-y-1 rounded-md border p-3 text-xs">
              <p className="font-medium">Quality score {quality}/100</p>
              {parts.map((p) => (
                <p key={p.label} className="flex justify-between text-muted-foreground">
                  <span>{p.label}</span>
                  <span className="font-mono tabular-nums">{p.points}/{p.max}</span>
                </p>
              ))}
            </div>
            {!trade.grade && <p className="text-xs text-muted-foreground">Tip: poné la nota del setup (A+, A, B, C) editando el trade.</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={download}><Download className="h-4 w-4" /> PNG</Button>
              <Button onClick={share}><Share2 className="h-4 w-4" /> Compartir</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
