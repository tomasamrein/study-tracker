/** Exportación / importación CSV simple (sin dependencias). */
import type { Enriched } from "./calc";
import type { Trade, TradingState } from "./types";

function esc(v: unknown): string {
  if (v == null) return "";
  const s = Array.isArray(v) ? v.join("|") : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
  const h = headers ?? Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return [h.join(","), ...rows.map((r) => h.map((k) => esc(r[k])).join(","))].join("\n");
}

/** Parser CSV con comillas. Detecta "," o ";" como separador. */
export function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (q) {
      if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim() !== ""));
  if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

export const TRADE_CSV_HEADERS = [
  "id", "fecha_entrada", "fecha_salida", "cuenta", "modo", "instrumento", "direccion", "entrada", "stop", "objetivo",
  "salida", "contratos", "comision", "setup", "sesion", "tf_contexto", "tf_entrada", "siguio_plan", "regla_rota",
  "emocion_antes", "emocion_durante", "emocion_despues", "notas", "leccion", "captura_antes", "captura_despues",
  "etiquetas", "pnl", "riesgo_usd", "r",
];

export function tradesToCsv(list: Enriched[], s: TradingState): string {
  const name = <T extends { id: string }>(l: T[], id: string | null | undefined, k: (x: T) => string) =>
    (id && l.find((x) => x.id === id) ? k(l.find((x) => x.id === id) as T) : "");
  return toCsv(
    list.map(({ trade: t, m }) => ({
      id: t.id,
      fecha_entrada: t.entryAt,
      fecha_salida: t.exitAt ?? "",
      cuenta: name(s.accounts, t.accountId, (x) => x.name),
      modo: name(s.modes, t.modeId, (x) => x.name),
      instrumento: name(s.instruments, t.instrumentId, (x) => x.symbol),
      direccion: t.direction,
      entrada: t.entry,
      stop: t.stop ?? "",
      objetivo: t.target ?? "",
      salida: t.exit,
      contratos: t.contracts,
      comision: t.commission ?? "",
      setup: name(s.setups, t.setupId, (x) => x.name),
      sesion: name(s.sessions, t.sessionId, (x) => x.name),
      tf_contexto: t.contextTf ?? "",
      tf_entrada: t.entryTf ?? "",
      siguio_plan: t.followedPlan ? "si" : "no",
      regla_rota: t.brokenRule ?? "",
      emocion_antes: t.emotionBefore ?? "",
      emocion_durante: t.emotionDuring ?? "",
      emocion_despues: t.emotionAfter ?? "",
      notas: t.notes ?? "",
      leccion: t.lesson ?? "",
      captura_antes: t.shotBefore ?? "",
      captura_despues: t.shotAfter ?? "",
      etiquetas: t.tags ?? [],
      pnl: m.pnl.toFixed(2),
      riesgo_usd: m.riskUsd?.toFixed(2) ?? "",
      r: m.r?.toFixed(2) ?? "",
    })),
    TRADE_CSV_HEADERS,
  );
}

const toNum = (v: string | undefined) => {
  if (v == null || v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

/** Normaliza fechas "dd/MM/yyyy HH:mm" o "yyyy-MM-dd HH:mm" a "yyyy-MM-ddTHH:mm". */
export function normalizeDateTime(v: string): string | null {
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4].padStart(2, "0")}:${m[5]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[T ](\d{1,2}):(\d{2}))?/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T${(m[4] ?? "00").padStart(2, "0")}:${m[5] ?? "00"}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${s}T00:00`;
  return null;
}

export interface ImportResult {
  trades: Omit<Trade, "id" | "createdAt">[];
  errors: string[];
}

/**
 * Convierte filas CSV en trades. Columnas mínimas: fecha_entrada, direccion,
 * entrada, salida, contratos. El resto es opcional. Cuenta, instrumento,
 * setup y sesión se buscan por nombre; si no existen, se usan los defaults.
 */
export function csvToTrades(
  rows: Record<string, string>[],
  s: TradingState,
  defaults: { accountId: string; instrumentId: string },
): ImportResult {
  const find = <T extends { id: string }>(l: T[], v: string | undefined, k: (x: T) => string) =>
    v ? l.find((x) => k(x).toLowerCase() === v.toLowerCase())?.id : undefined;
  const out: ImportResult = { trades: [], errors: [] };
  rows.forEach((r, i) => {
    const line = i + 2;
    const entryAt = normalizeDateTime(r.fecha_entrada ?? r.fecha ?? "");
    const dirRaw = (r.direccion ?? r.direction ?? "").toLowerCase();
    const direction = dirRaw.startsWith("s") || dirRaw.startsWith("v") ? "short" : dirRaw.startsWith("l") || dirRaw.startsWith("c") ? "long" : null;
    const entry = toNum(r.entrada), exit = toNum(r.salida), contracts = toNum(r.contratos) ?? 1;
    const stop = toNum(r.stop), target = toNum(r.objetivo), commission = toNum(r.comision);
    if (!entryAt) return void out.errors.push(`Línea ${line}: fecha_entrada inválida.`);
    if (!direction) return void out.errors.push(`Línea ${line}: direccion tiene que ser long o short.`);
    if (entry == null || exit == null || Number.isNaN(entry) || Number.isNaN(exit))
      return void out.errors.push(`Línea ${line}: entrada/salida inválidas.`);
    if (!(contracts > 0)) return void out.errors.push(`Línea ${line}: contratos inválidos.`);
    const accountId = find(s.accounts, r.cuenta, (x) => x.name) ?? defaults.accountId;
    const account = s.accounts.find((a) => a.id === accountId);
    const yes = (v?: string) => !v || /^(s|si|sí|y|yes|true|1)$/i.test(v);
    const emo = (v?: string) => { const n = toNum(v); return n == null || Number.isNaN(n) ? null : n; };
    out.trades.push({
      accountId,
      modeId: find(s.modes, r.modo, (x) => x.name) ?? account?.modeId ?? "paper",
      instrumentId: find(s.instruments, r.instrumento, (x) => x.symbol) ?? defaults.instrumentId,
      direction,
      entryAt,
      exitAt: r.fecha_salida ? normalizeDateTime(r.fecha_salida) : null,
      entry,
      exit,
      stop: stop == null || Number.isNaN(stop) ? null : stop,
      target: target == null || Number.isNaN(target) ? null : target,
      contracts,
      commission: commission == null || Number.isNaN(commission) ? null : commission,
      setupId: find(s.setups, r.setup, (x) => x.name) ?? null,
      sessionId: find(s.sessions, r.sesion, (x) => x.name) ?? null,
      contextTf: r.tf_contexto || undefined,
      entryTf: r.tf_entrada || undefined,
      followedPlan: yes(r.siguio_plan),
      brokenRule: r.regla_rota || undefined,
      emotionBefore: emo(r.emocion_antes),
      emotionDuring: emo(r.emocion_durante),
      emotionAfter: emo(r.emocion_despues),
      notes: r.notas || undefined,
      lesson: r.leccion || undefined,
      shotBefore: r.captura_antes || undefined,
      shotAfter: r.captura_despues || undefined,
      tags: r.etiquetas ? r.etiquetas.split("|").map((x) => x.trim()).filter(Boolean) : [],
    });
  });
  return out;
}

export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿" + text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
