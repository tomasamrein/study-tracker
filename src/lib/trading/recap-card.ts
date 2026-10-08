/**
 * Dibuja la tarjeta de recap de un trade en un <canvas> (1080 × 1350, formato
 * 4:5 para redes). Sin dependencias: Canvas 2D nativo.
 */
export interface RecapData {
  brand: string;
  title: string; // "TRADE DEL DÍA"
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
  image?: HTMLImageElement | null;
}

export const RECAP_W = 1080;
export const RECAP_H = 1350;

const GREEN = "#34d399";
const RED = "#f87171";
const BLUE = "#60a5fa";
const MUTED = "#8b95a5";

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

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  // letterSpacing es soportado en navegadores modernos; si no, dibuja normal.
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const prev = c.letterSpacing;
  c.letterSpacing = `${spacing}px`;
  ctx.fillText(text, x, y);
  c.letterSpacing = prev ?? "0px";
}

export function drawRecap(canvas: HTMLCanvasElement, d: RecapData, fontFamily: string) {
  canvas.width = RECAP_W;
  canvas.height = RECAP_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const F = (w: number, s: number) => `${w} ${s}px ${fontFamily}`;
  const P = 85; // margen interno

  // Fondo
  ctx.fillStyle = "#06090d";
  ctx.fillRect(0, 0, RECAP_W, RECAP_H);
  rounded(ctx, 28, 28, RECAP_W - 56, RECAP_H - 56, 44);
  const bg = ctx.createLinearGradient(0, 0, RECAP_W, RECAP_H);
  bg.addColorStop(0, "#0f1620");
  bg.addColorStop(1, "#0a0e14");
  ctx.fillStyle = bg;
  ctx.fill();
  const glow = ctx.createRadialGradient(RECAP_W - 120, 120, 0, RECAP_W - 120, 120, 520);
  glow.addColorStop(0, "rgba(52,211,153,0.10)");
  glow.addColorStop(1, "rgba(52,211,153,0)");
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textBaseline = "alphabetic";

  // Marca
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.moveTo(P + 18, 78);
  ctx.lineTo(P + 38, 120);
  ctx.lineTo(P + 18, 108);
  ctx.lineTo(P - 2, 120);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f3f5f8";
  ctx.font = F(700, 30);
  spaced(ctx, d.brand.toUpperCase(), P + 58, 116, 4);

  // Nota (A+, A…)
  if (d.grade) {
    ctx.font = F(700, 28);
    const w = Math.max(88, ctx.measureText(d.grade).width + 50);
    rounded(ctx, RECAP_W - P - w, 81, w, 50, 25);
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = BLUE;
    ctx.textAlign = "center";
    ctx.fillText(d.grade, RECAP_W - P - w / 2, 116);
    ctx.textAlign = "left";
  }

  // Título
  ctx.fillStyle = MUTED;
  ctx.font = F(600, 27);
  spaced(ctx, d.title.toUpperCase(), P, 206, 5);
  ctx.fillStyle = "#f3f5f8";
  ctx.font = F(800, 66);
  ctx.fillText(`${d.instrument} · ${d.direction === "long" ? "LONG" : "SHORT"}`, P, 318);

  // Resultado
  const positive = (d.r ?? d.pnl ?? 0) >= 0;
  const color = positive ? GREEN : RED;
  ctx.fillStyle = color;
  ctx.font = F(800, 138);
  const big = d.r != null ? `${d.r > 0 ? "+" : ""}${nf(d.r)}R` : d.pnl != null ? `${d.pnl > 0 ? "+" : ""}${nf(d.pnl)}` : "—";
  ctx.fillText(big, P, 492);
  if (d.r != null && d.pnl != null) {
    ctx.font = F(700, 50);
    ctx.textAlign = "right";
    const sym = d.currency === "USD" ? "$" : `${d.currency} `;
    ctx.fillText(`${d.pnl >= 0 ? "+" : "−"}${sym}${nf(Math.abs(d.pnl))}`, RECAP_W - P, 492);
    ctx.textAlign = "left";
  }

  // Datos
  const cols: [string, string][] = [
    ["ENTRADA", nf(d.entry)],
    ["SL", d.stop != null ? nf(d.stop) : "—"],
    [d.target != null ? "TP" : "SALIDA", nf(d.target ?? d.exit)],
    ["TAMAÑO", `${d.contracts} contrato${d.contracts === 1 ? "" : "s"}`],
  ];
  const colW = (RECAP_W - 2 * P) / 4;
  cols.forEach(([k, v], i) => {
    const x = P + i * colW;
    ctx.fillStyle = MUTED;
    ctx.font = F(600, 23);
    spaced(ctx, k, x, 576, 4);
    ctx.fillStyle = "#f3f5f8";
    ctx.font = F(700, 34);
    ctx.fillText(v, x, 630);
  });

  // Captura
  const ix = P, iy = 688, iw = RECAP_W - 2 * P, ih = 364;
  ctx.save();
  rounded(ctx, ix, iy, iw, ih, 24);
  ctx.clip();
  ctx.fillStyle = "#131a24";
  ctx.fillRect(ix, iy, iw, ih);
  if (d.image) {
    const s = Math.max(iw / d.image.width, ih / d.image.height);
    const w = d.image.width * s, h = d.image.height * s;
    ctx.drawImage(d.image, ix + (iw - w) / 2, iy + (ih - h) / 2, w, h);
  } else {
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let gx = ix; gx < ix + iw; gx += 48) { ctx.beginPath(); ctx.moveTo(gx, iy); ctx.lineTo(gx, iy + ih); ctx.stroke(); }
    for (let gy = iy; gy < iy + ih; gy += 48) { ctx.beginPath(); ctx.moveTo(ix, gy); ctx.lineTo(ix + iw, gy); ctx.stroke(); }
    ctx.fillStyle = MUTED;
    ctx.font = F(500, 28);
    ctx.textAlign = "center";
    ctx.fillText("Subí la captura del trade", ix + iw / 2, iy + ih / 2 + 10);
    ctx.textAlign = "left";
  }
  ctx.restore();

  // Quality score
  ctx.fillStyle = MUTED;
  ctx.font = F(600, 23);
  spaced(ctx, "QUALITY SCORE", P, 1113, 5);
  ctx.fillStyle = "#f3f5f8";
  ctx.font = F(800, 62);
  const qs = String(Math.round(d.quality));
  ctx.fillText(qs, P, 1172);
  const qw = ctx.measureText(qs).width;
  ctx.fillStyle = MUTED;
  ctx.font = F(500, 32);
  ctx.fillText("/100", P + qw + 8, 1172);
  const bx = 344, bw = RECAP_W - P - bx, by = 1152;
  rounded(ctx, bx, by, bw, 12, 6);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  rounded(ctx, bx, by, Math.max(12, (bw * Math.min(100, Math.max(0, d.quality))) / 100), 12, 6);
  ctx.fillStyle = d.quality >= 70 ? BLUE : d.quality >= 40 ? "#fbbf24" : RED;
  ctx.fill();

  // Pie
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(P, 1222, RECAP_W - 2 * P, 2);
  ctx.fillStyle = MUTED;
  ctx.font = F(500, 28);
  ctx.fillText(d.dateLabel, P, 1275);
  ctx.fillStyle = "#f3f5f8";
  ctx.font = F(700, 28);
  ctx.textAlign = "right";
  ctx.fillText(`Powered by ${d.brand}`, RECAP_W - P, 1275);
  ctx.textAlign = "left";
}
