// Importación de un plan de estudios desde una planilla CSV.
// Pensado para que cualquiera arme su plan en Excel/Google Sheets y lo suba,
// sin tener que conocer la estructura interna de `Subject`.

import {
  CATEGORY_LABELS,
  type Subject,
  type SubjectCategory,
  type SubjectState,
} from "./types";

export interface PlanImportResult {
  subjects: Subject[];
  warnings: string[];
}

/** Encabezados de ejemplo + filas, para descargar como plantilla. */
export const PLAN_CSV_TEMPLATE = [
  "codigo,materia,anio,cuatrimestre,categoria,estado,nota",
  "DI101,Dibujo I,1,1,obligatoria,aprobada,8",
  "DI102,Taller de Diseño I,1,1,obligatoria,cursando,",
  "DI103,Historia del Diseño,1,2,obligatoria,pendiente,",
  "DI201,Ergonomía,2,1,obligatoria,pendiente,",
  "DI210,Optativa de Materiales,3,1,optativa,pendiente,",
].join("\n");

// ── Normalización ───────────────────────────────────────────────────
/** minúsculas, sin acentos, sin espacios extra. */
function norm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

const HEADER_ALIASES: Record<string, keyof RawRow> = {
  codigo: "code",
  cod: "code",
  code: "code",
  materia: "name",
  asignatura: "name",
  nombre: "name",
  name: "name",
  anio: "year",
  ano: "year",
  year: "year",
  nivel: "year",
  cuatrimestre: "term",
  cuatri: "term",
  semestre: "term",
  periodo: "term",
  term: "term",
  categoria: "category",
  category: "category",
  tipo: "category",
  estado: "state",
  condicion: "state",
  state: "state",
  nota: "grade",
  calificacion: "grade",
  grade: "grade",
  grupo: "group",
  group: "group",
};

interface RawRow {
  code?: string;
  name?: string;
  year?: string;
  term?: string;
  category?: string;
  state?: string;
  grade?: string;
  group?: string;
}

const CATEGORY_ALIASES: Record<string, SubjectCategory> = {
  ingreso: "ingreso",
  obligatoria: "obligatoria",
  obligatorio: "obligatoria",
  troncal: "obligatoria",
  comun: "obligatoria",
  idioma: "idioma",
  ingles: "idioma",
  "tramo final": "tramo-final",
  "tramo-final": "tramo-final",
  final: "tramo-final",
  optativa: "optativa",
  optativo: "optativa",
  electiva: "electiva",
  electivo: "electiva",
};

const STATE_ALIASES: Record<string, SubjectState> = {
  pendiente: "pendiente",
  cursando: "cursando",
  regular: "regular",
  aprobada: "aprobada",
  aprobado: "aprobada",
  promocionada: "promocionada",
  promocionado: "promocionada",
  recursando: "recursando",
  libre: "libre",
};

function toCategory(value: string | undefined): SubjectCategory {
  return CATEGORY_ALIASES[norm(value ?? "")] ?? "obligatoria";
}

function toState(value: string | undefined): SubjectState {
  return STATE_ALIASES[norm(value ?? "")] ?? "pendiente";
}

function toTerm(value: string | undefined): 1 | 2 | null {
  const n = norm(value ?? "");
  if (/^1|primer/.test(n)) return 1;
  if (/^2|segund/.test(n)) return 2;
  return null;
}

function toYear(value: string | undefined): number | null {
  const n = parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : null;
}

function toGrade(value: string | undefined): number | null {
  const raw = (value ?? "").replace(",", ".").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function slug(value: string): string {
  return (
    norm(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "materia"
  );
}

// ── Parser CSV ──────────────────────────────────────────────────────
/** Detecta el separador más probable mirando la primera línea. */
function detectDelimiter(firstLine: string): string {
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  if (tabs > commas && tabs > semis) return "\t";
  return semis > commas ? ";" : ",";
}

/** Tokeniza CSV respetando comillas dobles y comillas escapadas (""). */
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  // Último campo/fila si el archivo no termina en salto de línea.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Convierte el contenido de un CSV en materias listas para `importPlan`.
 * Lanza un Error con mensaje legible si el formato no es utilizable.
 */
export function parsePlanCsv(text: string): PlanImportResult {
  const clean = text.replace(/^﻿/, "").trim(); // BOM de Excel
  if (!clean) throw new Error("El archivo está vacío.");

  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parseCsv(clean, delimiter).filter((r) =>
    r.some((cell) => cell.trim() !== ""),
  );
  if (rows.length < 2) {
    throw new Error(
      "El CSV necesita una fila de encabezados y al menos una materia.",
    );
  }

  // Mapear índice de columna -> campo conocido.
  const headers = rows[0].map((h) => HEADER_ALIASES[norm(h)]);
  if (!headers.includes("name")) {
    throw new Error(
      'Falta la columna "materia" (o "nombre"). Revisá los encabezados.',
    );
  }

  const warnings: string[] = [];
  const subjects: Subject[] = [];
  const usedIds = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const raw: RawRow = {};
    headers.forEach((field, idx) => {
      if (field) raw[field] = (cells[idx] ?? "").trim();
    });

    const name = raw.name?.trim();
    if (!name) {
      warnings.push(`Fila ${r + 1}: sin nombre de materia, se omitió.`);
      continue;
    }

    const category = toCategory(raw.category);
    const year = toYear(raw.year);
    const term = toTerm(raw.term);

    // id único: código si lo hay, si no un slug del nombre.
    let id = raw.code?.trim() || slug(name);
    while (usedIds.has(id)) id = `${id}-${usedIds.size}`;
    usedIds.add(id);

    const group =
      raw.group?.trim() ||
      (year != null
        ? `Año ${year}${term ? ` · ${term}° Cuatrimestre` : ""}`
        : CATEGORY_LABELS[category]);

    subjects.push({
      id,
      code: raw.code?.trim() || id,
      name,
      state: toState(raw.state),
      grade: toGrade(raw.grade),
      date: null,
      year,
      term,
      category,
      group,
      custom: true,
    });
  }

  if (subjects.length === 0) {
    throw new Error("No se encontró ninguna materia válida en el archivo.");
  }

  return { subjects, warnings };
}
