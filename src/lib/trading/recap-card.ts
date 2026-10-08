/**
 * Tarjeta de recap de un trade (1080 × 1350, 4:5 para redes) con la
 * identidad de Foco: negro y blanco, serif para lo importante, mono para
 * datos, y el verde/rojo reservado para el resultado. Canvas 2D nativo.
 */
export interface RecapData {
  title: string;
  instrument: string;
  direction: "long" | "short";
  r: number | null;
  pnl: number | null;
  currency: string;
  entry: number;
  stop: number | null;
  target: number | null;
  exit: number;
  contracts: number;
  grade?: string | null;
  quality: number;
  dateLabel: string;
  /** Setup · sesión · modo (línea de contexto). */
  context: string;
  image?: HTMLImageElement | null;
}

export interface RecapFonts {
  sans: string;
  serif: string;
  mono: string;
}

export const RECAP_W = 1080;
export const RECAP_H = 1350;

// Tokens del tema oscuro de la app (globals.css → .dark).
const BG = "#0a0a0a"; // --background
const CARD = "#111111"; // --card
const FG = "#f5f5f5"; // --foreground
const MUTED = "#9a9a9a"; // --muted-foreground
const LINE = "rgba(255,255,255,0.10)"; // --border
const SOFT = "#1f1f1f"; // --muted
const POS = "#10b981"; // emerald-500 (PnL positivo en la app)
const NEG = "#ef4444"; // red-500

const nf = (n: number, d = 2) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function tracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const prev = c.letterSpacing;
  c.letterSpacing = `${spacing}px`;
  ctx.fillText(text, x, y);
  c.letterSpacing = prev ?? "0px";
}

/** Achica la fuente hasta que el texto entre en `max` px. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (s: number) => string, size: number, max: number) {
  let s = size;
  ctx.font = font(s);
  while (s > 20 && ctx.measureText(text).width > max) {
    s -= 4;
    ctx.font = font(s);
  }
  return s;
}

export function drawRecap(canvas: HTMLCanvasElement, d: RecapData, f: RecapFonts) {
  canvas.width = RECAP_W;
  canvas.height = RECAP_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const serif = (s: number) => `400 ${s}px ${f.serif}`;
  const mono = (w: number, s: number) => `${w} ${s}px ${f.mono}`;
  const P = 72;
  const W = RECAP_W - 2 * P;
  const positive = (d.r ?? d.pnl ?? 0) >= 0;
  const accent = positive ? POS : NEG;

  // Fondo y tarjeta
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, RECAP_W, RECAP_H);
  rounded(ctx, 24, 24, RECAP_W - 48, RECAP_H - 48, 36);
  ctx.fillStyle = CARD;
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textBaseline = "alphabetic";

  // Encabezado: marca Foco + fecha
  rounded(ctx, P, 70, 52, 52, 12);
  ctx.fillStyle = FG;
  ctx.fill();
  ctx.strokeStyle = BG;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(P + 26, 96, 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = BG;
  ctx.beginPath();
  ctx.arc(P + 26, 96, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = FG;
  ctx.font = serif(52);
  ctx.fillText("Foco", P + 70, 113);
  ctx.fillStyle = MUTED;
  ctx.font = mono(500, 22);
  ctx.textAlign = "right";
  tracked(ctx, d.dateLabel.toUpperCase(), RECAP_W - P, 106, 3);
  ctx.textAlign = "left";

  // Título y activo
  ctx.fillStyle = MUTED;
  ctx.font = mono(500, 22);
  tracked(ctx, d.title.toUpperCase(), P, 206, 4);
  ctx.fillStyle = FG;
  ctx.font = serif(84);
  ctx.fillText(`${d.instrument} ${d.direction === "long" ? "Long" : "Short"}`, P, 292);
  // Pastilla de dirección
  const dirW = 26;
  ctx.fillStyle = d.direction === "long" ? POS : NEG;
  ctx.beginPath();
  if (d.direction === "long") {
    ctx.moveTo(RECAP_W - P - dirW / 2, 238);
    ctx.lineTo(RECAP_W - P, 266);
    ctx.lineTo(RECAP_W - P - dirW, 266);
  } else {
    ctx.moveTo(RECAP_W - P - dirW / 2, 266);
    ctx.lineTo(RECAP_W - P, 238);
    ctx.lineTo(RECAP_W - P - dirW, 238);
  }
  ctx.closePath();
  ctx.fill();

  // Resultado: R gigante en serif + PnL
  const big = d.r != null ? `${d.r > 0 ? "+" : d.r < 0 ? "−" : ""}${nf(Math.abs(d.r))}R` : d.pnl != null ? `${d.pnl >= 0 ? "+" : "−"}${nf(Math.abs(d.pnl))}` : "—";
  ctx.fillStyle = accent;
  fit(ctx, big, serif, 205, W * 0.66);
  ctx.fillText(big, P - 6, 500);
  if (d.r != null && d.pnl != null) {
    const sym = d.currency === "USD" ? "US$" : d.currency;
    ctx.textAlign = "right";
    ctx.fillStyle = MUTED;
    ctx.font = mono(500, 20);
    tracked(ctx, "RESULTADO", RECAP_W - P, 436, 4);
    ctx.fillStyle = accent;
    ctx.font = mono(600, 40);
    ctx.fillText(`${d.pnl >= 0 ? "+" : "−"}${sym} ${nf(Math.abs(d.pnl))}`, RECAP_W - P, 490);
    ctx.textAlign = "left";
  }

  // Datos en grilla con líneas finas
  const cells: [string, string][] = [
    ["Entrada", nf(d.entry)],
    ["Stop", d.stop != null ? nf(d.stop) : "—"],
    [d.target != null ? "Objetivo" : "Salida", nf(d.target ?? d.exit)],
    ["Contratos", String(d.contracts)],
  ];
  const gy = 548, gh = 112, cw = W / 4;
  ctx.fillStyle = LINE;
  ctx.fillRect(P, gy, W, 2);
  ctx.fillRect(P, gy + gh, W, 2);
  cells.forEach(([k, v], i) => {
    const x = P + i * cw;
    if (i > 0) ctx.fillRect(x, gy + 22, 2, gh - 44);
    const tx = i === 0 ? x : x + 26;
    ctx.fillStyle = MUTED;
    ctx.font = mono(500, 19);
    tracked(ctx, k.toUpperCase(), tx, gy + 46, 3);
    ctx.fillStyle = FG;
    fit(ctx, v, (s) => mono(500, s), 32, cw - 34);
    ctx.fillText(v, tx, gy + 90);
  });

  // Captura
  const ix = P, iy = 700, iw = W, ih = 400;
  ctx.save();
  rounded(ctx, ix, iy, iw, ih, 20);
  ctx.clip();
  ctx.fillStyle = SOFT;
  ctx.fillRect(ix, iy, iw, ih);
  if (d.image) {
    const s = Math.max(iw / d.image.width, ih / d.image.height);
    const w = d.image.width * s, h = d.image.height * s;
    ctx.drawImage(d.image, ix + (iw - w) / 2, iy + (ih - h) / 2, w, h);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = ix + 24; x < ix + iw; x += 36) for (let y = iy + 24; y < iy + ih; y += 36) ctx.fillRect(x, y, 3, 3);
    ctx.fillStyle = MUTED;
    ctx.font = mono(500, 22);
    ctx.textAlign = "center";
    tracked(ctx, "SUBÍ LA CAPTURA DEL TRADE", ix + iw / 2, iy + ih / 2 + 8, 3);
    ctx.textAlign = "left";
  }
  ctx.restore();
  rounded(ctx, ix, iy, iw, ih, 20);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Calidad: número serif + barra segmentada (como los hábitos) + nota
  const qy = 1150;
  ctx.fillStyle = MUTED;
  ctx.font = mono(500, 19);
  tracked(ctx, "CALIDAD DE EJECUCIÓN", P, qy + 6, 3);
  ctx.fillStyle = FG;
  ctx.font = serif(78);
  const qs = String(Math.round(d.quality));
  ctx.fillText(qs, P, qy + 82);
  const qw = ctx.measureText(qs).width;
  ctx.fillStyle = MUTED;
  ctx.font = mono(500, 22);
  ctx.fillText("/100", P + qw + 10, qy + 82);

  const gradeW = d.grade ? 96 : 0;
  const sx = P + 250, sw = W - 250 - (gradeW ? gradeW + 28 : 0), segs = 20, gap = 6;
  const segW = (sw - gap * (segs - 1)) / segs;
  const filled = Math.round((Math.min(100, Math.max(0, d.quality)) / 100) * segs);
  for (let i = 0; i < segs; i++) {
    rounded(ctx, sx + i * (segW + gap), qy + 52, segW, 30, 4);
    ctx.fillStyle = i < filled ? FG : SOFT;
    ctx.fill();
  }
  if (d.grade) {
    const gx = RECAP_W - P - gradeW;
    rounded(ctx, gx, qy + 30, gradeW, 60, 14);
    ctx.fillStyle = FG;
    ctx.fill();
    ctx.fillStyle = BG;
    ctx.font = serif(48);
    ctx.textAlign = "center";
    ctx.fillText(d.grade, gx + gradeW / 2, qy + 76);
    ctx.textAlign = "left";
  }

  // Contexto
  if (d.context) {
    ctx.fillStyle = MUTED;
    ctx.font = mono(500, 20);
    const s = d.context.toUpperCase();
    fit(ctx, s, (z) => mono(500, z), 20, W);
    tracked(ctx, s, P, RECAP_H - 66, 3);
  }
}
