import type { PlanMeta, Subject, SubjectCategory, SubjectState } from "./types";

// Plan de Estudios — Licenciatura en Diseño Industrial
// UNL · FADU · Propuesta FADU-04 · Plan 2025
// Datos cargados desde docs/plan_estudios_disenioindustrial.pdf
// (Citino, Constanza · Legajo 43829)

type Seed = {
  code: string;
  name: string;
  state?: SubjectState;
  grade?: number | null;
  year?: number | null;
  term?: 1 | 2 | null;
  category: SubjectCategory;
  group: string;
};

const SEED: Seed[] = [
  // ── Cursos de Ingreso ──────────────────────────────────────────────
  { code: "CG1", name: "Problemática Universitaria", state: "aprobada", category: "ingreso", group: "Cursos Generales" },
  { code: "CG2", name: "Ciencia, Arte y Conocimiento", state: "aprobada", category: "ingreso", group: "Cursos Generales" },
  { code: "C.I.M", name: "Curso Introductorio Matemática", state: "aprobada", category: "ingreso", group: "Cursos Disciplinares" },
  { code: "CI3", name: "Lectura y Escritura de Textos Académicos", state: "aprobada", category: "ingreso", group: "Cursos Disciplinares" },

  // ── Año 1 · 1er Cuatrimestre ───────────────────────────────────────
  { code: "FADUDI028", name: "Proyecto y Representación", state: "promocionada", grade: 6, year: 1, term: 1, category: "obligatoria", group: "Año 1 · 1er Cuatrimestre" },
  { code: "FADUDI029", name: "Diseño, Ciencia y Cultura", state: "promocionada", grade: 7, year: 1, term: 1, category: "obligatoria", group: "Año 1 · 1er Cuatrimestre" },
  { code: "FADUDI006", name: "Tecnología y Diseño Industrial", state: "promocionada", grade: 7, year: 1, term: 1, category: "obligatoria", group: "Año 1 · 1er Cuatrimestre" },

  // ── Año 1 · 2do Cuatrimestre ───────────────────────────────────────
  { code: "FADUDI001", name: "Proyecto de Diseño Industrial I", state: "promocionada", grade: 6, year: 1, term: 2, category: "obligatoria", group: "Año 1 · 2do Cuatrimestre" },
  { code: "FADUDI002", name: "Morfología I", state: "promocionada", grade: 8, year: 1, term: 2, category: "obligatoria", group: "Año 1 · 2do Cuatrimestre" },
  { code: "FADUDI004", name: "Historia del Diseño Industrial I", state: "aprobada", grade: 6, year: 1, term: 2, category: "obligatoria", group: "Año 1 · 2do Cuatrimestre" },
  { code: "FADUDI030", name: "Matemática aplicada al Diseño", state: "cursando", year: 1, term: 2, category: "obligatoria", group: "Año 1 · 2do Cuatrimestre" },

  // ── Año 2 · 1er Cuatrimestre ───────────────────────────────────────
  { code: "FADUDI031", name: "Proyecto de Diseño Industrial II", state: "cursando", year: 2, term: 1, category: "obligatoria", group: "Año 2 · 1er Cuatrimestre" },
  { code: "FADUDI008", name: "Morfología II", state: "cursando", year: 2, term: 1, category: "obligatoria", group: "Año 2 · 1er Cuatrimestre" },
  { code: "FADUDI034", name: "Física aplicada al Diseño", year: 2, term: 1, category: "obligatoria", group: "Año 2 · 1er Cuatrimestre" },
  { code: "FADUDI033", name: "Materiales y procesos I", state: "cursando", year: 2, term: 1, category: "obligatoria", group: "Año 2 · 1er Cuatrimestre" },

  // ── Año 2 · 2do Cuatrimestre ───────────────────────────────────────
  { code: "FADUDI032", name: "Proyecto de Diseño Industrial III", year: 2, term: 2, category: "obligatoria", group: "Año 2 · 2do Cuatrimestre" },
  { code: "FADUDI010", name: "Ergonomía I", year: 2, term: 2, category: "obligatoria", group: "Año 2 · 2do Cuatrimestre" },
  { code: "FADUDI011", name: "Historia del Diseño Industrial II", year: 2, term: 2, category: "obligatoria", group: "Año 2 · 2do Cuatrimestre" },
  { code: "FADUDI037", name: "Materiales y procesos II", year: 2, term: 2, category: "obligatoria", group: "Año 2 · 2do Cuatrimestre" },

  // ── Año 3 · 1er Cuatrimestre ───────────────────────────────────────
  { code: "FADUDI035", name: "Proyecto de Diseño Industrial IV", year: 3, term: 1, category: "obligatoria", group: "Año 3 · 1er Cuatrimestre" },
  { code: "FADUI0302", name: "Ideación y Materialidad Digital", year: 3, term: 1, category: "obligatoria", group: "Año 3 · 1er Cuatrimestre" },
  { code: "FADUDI017", name: "Semiótica aplicada al Diseño", year: 3, term: 1, category: "obligatoria", group: "Año 3 · 1er Cuatrimestre" },
  { code: "FADUDI038", name: "Materiales y procesos III", year: 3, term: 1, category: "obligatoria", group: "Año 3 · 1er Cuatrimestre" },

  // ── Año 3 · 2do Cuatrimestre ───────────────────────────────────────
  { code: "FADUDI036", name: "Proyecto de Diseño Industrial V", year: 3, term: 2, category: "obligatoria", group: "Año 3 · 2do Cuatrimestre" },
  { code: "FADUDI016", name: "Ergonomía II", year: 3, term: 2, category: "obligatoria", group: "Año 3 · 2do Cuatrimestre" },
  { code: "FADUDI023", name: "Teoría y Crítica del Diseño Industrial", year: 3, term: 2, category: "obligatoria", group: "Año 3 · 2do Cuatrimestre" },
  { code: "FADUDI024", name: "Materiales y Procesos IV", year: 3, term: 2, category: "obligatoria", group: "Año 3 · 2do Cuatrimestre" },

  // ── Año 4 · 1er Cuatrimestre ───────────────────────────────────────
  { code: "FADUDI022", name: "Proyecto de Diseño Industrial VI", year: 4, term: 1, category: "obligatoria", group: "Año 4 · 1er Cuatrimestre" },
  { code: "FADUDI019", name: "Economía y Costos", year: 4, term: 1, category: "obligatoria", group: "Año 4 · 1er Cuatrimestre" },

  // ── Año 4 · 2do Cuatrimestre ───────────────────────────────────────
  { code: "FADUDI026", name: "Legislación y Práctica Profesional", year: 4, term: 2, category: "obligatoria", group: "Año 4 · 2do Cuatrimestre" },

  // ── Tramo Final ────────────────────────────────────────────────────
  { code: "FADUDI039", name: "Trabajo Final de Carrera", year: 4, term: 2, category: "tramo-final", group: "Tramo Final" },

  // ── Idiomas (Inglés) ───────────────────────────────────────────────
  { code: "FHUCIDEX0", name: "Idioma Extranjero I (Inglés)", category: "idioma", group: "Idiomas" },
  { code: "FHUCIDEX1", name: "Idioma Extranjero II (Inglés)", category: "idioma", group: "Idiomas" },
  { code: "0901000033", name: "Ciclo Inicial de Idioma Extranjero - Acreditación (Inglés)", category: "idioma", group: "Idiomas" },

  // ── Optativas Transversales (LDI 2024) ─────────────────────────────
  ...(
    [
      ["FIQE0063", "El Urbanismo Ambiental Contemporáneo: El Territorio como Ambiente Dialógico"],
      ["FIQE0282", "Ciudadanía y desarrollo con sostenibilidad"],
      ["OPT77", "Mobiliario Urbano"],
      ["FADUOPT31", "Packaging I"],
      ["FADUOPT37", "Packaging II"],
      ["FADUOPT71", "Taller de Representación Inter-Medios"],
      ["FADUOPT14", "Taller Multimedia"],
      ["FADUOPT83", "Diseño, sustentabilidad y práctica profesional"],
      ["FADUOPT88", "Patrimonio y desarrollo sostenible S. J. Rincón"],
      ["FADUOPT11", "Taller de Gráfica Digital"],
    ] as [string, string][]
  ).map<Seed>(([code, name]) => ({ code, name, category: "optativa", group: "Optativas Transversales" })),

  // ── Optativas de Orientación (LDI 2024) ────────────────────────────
  ...(
    [
      ["FADUOPT64", "Diseño, Cine e Ideología, en contextos de producción y sentido"],
      ["FADUD0326", "Epistemología"],
      ["FADUA0315", "Filosofía"],
      ["FBCBEX269", "Gestión de la innovación a partir de la inteligencia estratégica"],
      ["FADUOPT51", "Historia Social y Política Argentina (1880-1999)"],
      ["FADUOPT78", "ISOTYPE: Educación visual y política residencial en la Viena Roja"],
      ["FADUOPT70", "Percepción y Lectura de la Imagen"],
      ["FIQE0176", "Sociología"],
      ["FADUOPT60", "Taller de Construcción de Problemas en Campos Disciplinares"],
      ["FADUD0313", "Tecnología III"],
      ["FADUD0307", "Tipografía I"],
      ["FADUOPT75", "Inglés III: Inglés orientado a la formación profesional"],
      ["FADUDI025", "Gestión de Proyectos"],
      ["FADUDI018", "Semiótica y Comunicación II"],
      ["FIQE0267", "Iniciación a la lengua y a la cultura japonesa"],
      ["FIQE0096", "Iniciación al Idioma Portugués"],
      ["FHUCE05", "Mediación Cultural: conocer, habitar y construir culturas comunitarias"],
      ["FCJSEL0002", "Arte y tecnología para el desarrollo sostenible"],
      ["FIQE0199", "Códigos del Arte Contemporáneo"],
      ["FIQE0162", "Composición y Creación en Teatro Danza"],
      ["FIQQ0153", "Introducción al Análisis Fílmico"],
      ["FIQE0216", "Pensar la imagen a través de la fotografía analógica y digital"],
      ["FICHEL0001", "Idioma Francés orientado a los estudios universitarios"],
      ["FIQQ0001", "Introducción a las Ingenierías"],
      ["FADUE0319", "Acercamiento al Patrimonio Cultural del Museo Histórico de la UNL"],
      ["FIQE0239", "Iniciación a la Lengua y a la Cultura Francesa"],
      ["FADUOPT77", "Informática orientada al Diseño Industrial"],
      ["FIQE0092", "Iniciación a la Investigación Científica"],
    ] as [string, string][]
  ).map<Seed>(([code, name]) => ({ code, name, category: "electiva", group: "Optativas de Orientación" })),
];

export const DISENO_INDUSTRIAL_PLAN: Subject[] = SEED.map((s) => ({
  id: s.code,
  code: s.code,
  name: s.name,
  state: s.state ?? "pendiente",
  grade: s.grade ?? null,
  date: null,
  year: s.year ?? null,
  term: s.term ?? null,
  category: s.category,
  group: s.group,
}));

export const DI_PLAN_META: PlanMeta = {
  career: "Licenciatura en Diseño Industrial",
  university: "Universidad Nacional del Litoral · FADU",
  subtitle: "Propuesta FADU-04 · Plan 2025",
};
