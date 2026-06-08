import type { Subject, SubjectCategory, SubjectState } from "./types";

// Plan de Estudios — Ingeniería en Informática
// UNL · FICH · Propuesta FICH-07 · Plan 2020
// Datos cargados desde docs/plan_estudios.docx (Amrein, Tomás Agustín · Legajo 44354)

type Seed = {
  code: string;
  name: string;
  state?: SubjectState;
  grade?: number | null;
  date?: string | null; // ISO yyyy-mm-dd
  year?: number | null;
  term?: 1 | 2 | null;
  category: SubjectCategory;
  group: string;
};

const SEED: Seed[] = [
  // ── Cursos de Ingreso ──────────────────────────────────────────────
  { code: "CG1", name: "Problemática Universitaria", state: "aprobada", category: "ingreso", group: "Cursos Generales" },
  { code: "CG2", name: "Ciencia, Arte y Conocimiento", state: "aprobada", category: "ingreso", group: "Cursos Generales" },
  { code: "CI3", name: "Lectura y Escritura de Textos Académicos", state: "aprobada", category: "ingreso", group: "Cursos Generales" },
  { code: "C.I.M", name: "Curso de Articulación Matemática", state: "aprobada", grade: 7, category: "ingreso", group: "Cursos Disciplinares" },

  // ── Año 1 · 1er Cuatrimestre ───────────────────────────────────────
  { code: "FICHIRH01", name: "Matemática Básica", state: "cursando", year: 1, term: 1, category: "obligatoria", group: "Año 1 · 1er Cuatrimestre" },
  { code: "FHUCMAT11", name: "Fundamentos de Programación", state: "aprobada", grade: 6, date: "2025-08-05", year: 1, term: 1, category: "obligatoria", group: "Año 1 · 1er Cuatrimestre" },
  { code: "FICHIF003", name: "Química General", state: "aprobada", grade: 7, date: "2026-03-06", year: 1, term: 1, category: "obligatoria", group: "Año 1 · 1er Cuatrimestre" },
  { code: "FICHIRH03", name: "Comunicación Técnica I", state: "aprobada", grade: 7, date: "2025-08-05", year: 1, term: 1, category: "obligatoria", group: "Año 1 · 1er Cuatrimestre" },

  // ── Año 1 · 2do Cuatrimestre ───────────────────────────────────────
  { code: "FICHIRH04", name: "Álgebra Lineal", year: 1, term: 2, category: "obligatoria", group: "Año 1 · 2do Cuatrimestre" },
  { code: "FICHIRH05", name: "Cálculo I", year: 1, term: 2, category: "obligatoria", group: "Año 1 · 2do Cuatrimestre" },
  { code: "FICHIF007", name: "Programación Orientada a Objetos", state: "regular", year: 1, term: 2, category: "obligatoria", group: "Año 1 · 2do Cuatrimestre" },
  { code: "FICHIRH06", name: "Comunicación Técnica II", state: "recursando", year: 1, term: 2, category: "obligatoria", group: "Año 1 · 2do Cuatrimestre" },

  // ── Año 2 · 1er Cuatrimestre ───────────────────────────────────────
  { code: "FICHIRH08", name: "Física I", year: 2, term: 1, category: "obligatoria", group: "Año 2 · 1er Cuatrimestre" },
  { code: "FIQQ0006", name: "Cálculo II", year: 2, term: 1, category: "obligatoria", group: "Año 2 · 1er Cuatrimestre" },
  { code: "FICHIF011", name: "Teoría de la Computación", year: 2, term: 1, category: "obligatoria", group: "Año 2 · 1er Cuatrimestre" },
  { code: "FICHIF012", name: "Ingeniería de Software I", state: "cursando", year: 2, term: 1, category: "obligatoria", group: "Año 2 · 1er Cuatrimestre" },

  // ── Año 2 · 2do Cuatrimestre ───────────────────────────────────────
  { code: "FICHIRH12", name: "Física II", year: 2, term: 2, category: "obligatoria", group: "Año 2 · 2do Cuatrimestre" },
  { code: "FICHIRH13", name: "Ecuaciones Diferenciales", year: 2, term: 2, category: "obligatoria", group: "Año 2 · 2do Cuatrimestre" },
  { code: "FICHIF015", name: "Algoritmos y Estructuras de Datos", year: 2, term: 2, category: "obligatoria", group: "Año 2 · 2do Cuatrimestre" },
  { code: "FICHIF016", name: "Ingeniería de Software II", year: 2, term: 2, category: "obligatoria", group: "Año 2 · 2do Cuatrimestre" },

  // ── Año 3 · 1er Cuatrimestre ───────────────────────────────────────
  { code: "FICHIF017", name: "Electrónica Digital", year: 3, term: 1, category: "obligatoria", group: "Año 3 · 1er Cuatrimestre" },
  { code: "FICHIF018", name: "Tecnologías de la Programación", year: 3, term: 1, category: "obligatoria", group: "Año 3 · 1er Cuatrimestre" },
  { code: "FICHIF020", name: "Cálculo Numérico", year: 3, term: 1, category: "obligatoria", group: "Año 3 · 1er Cuatrimestre" },
  { code: "FICHIF023", name: "Organización de Computadoras", year: 3, term: 1, category: "obligatoria", group: "Año 3 · 1er Cuatrimestre" },

  // ── Año 3 · 2do Cuatrimestre ───────────────────────────────────────
  { code: "FCA10009", name: "Estadística", year: 3, term: 2, category: "obligatoria", group: "Año 3 · 2do Cuatrimestre" },
  { code: "FICHIF021", name: "Computación Gráfica", year: 3, term: 2, category: "obligatoria", group: "Año 3 · 2do Cuatrimestre" },
  { code: "FICHIF022", name: "Bases de Datos", year: 3, term: 2, category: "obligatoria", group: "Año 3 · 2do Cuatrimestre" },
  { code: "FICHIF024", name: "Ciencia, Tecnología y Sociedad", year: 3, term: 2, category: "obligatoria", group: "Año 3 · 2do Cuatrimestre" },

  // ── Año 4 · 1er Cuatrimestre ───────────────────────────────────────
  { code: "FICHIF025", name: "Sistemas Operativos", year: 4, term: 1, category: "obligatoria", group: "Año 4 · 1er Cuatrimestre" },
  { code: "FICHIF026", name: "Administración de Proyectos de Software", year: 4, term: 1, category: "obligatoria", group: "Año 4 · 1er Cuatrimestre" },
  { code: "FICHIF027", name: "Procesamiento Digital de Señales", year: 4, term: 1, category: "obligatoria", group: "Año 4 · 1er Cuatrimestre" },
  { code: "FICHIF028", name: "Mecánica del Continuo", year: 4, term: 1, category: "obligatoria", group: "Año 4 · 1er Cuatrimestre" },

  // ── Año 4 · 2do Cuatrimestre ───────────────────────────────────────
  { code: "FICHIF029", name: "Redes y Comunicaciones de Datos I", year: 4, term: 2, category: "obligatoria", group: "Año 4 · 2do Cuatrimestre" },
  { code: "FICHIF030", name: "Mecánica Computacional", year: 4, term: 2, category: "obligatoria", group: "Año 4 · 2do Cuatrimestre" },
  { code: "FICHIF031", name: "Inteligencia Computacional", year: 4, term: 2, category: "obligatoria", group: "Año 4 · 2do Cuatrimestre" },

  // ── Año 5 · 1er Cuatrimestre ───────────────────────────────────────
  { code: "FICHIF032", name: "Procesamiento Digital de Imágenes", year: 5, term: 1, category: "obligatoria", group: "Año 5 · 1er Cuatrimestre" },
  { code: "FICHIF033", name: "Redes y Comunicaciones de Datos II", year: 5, term: 1, category: "obligatoria", group: "Año 5 · 1er Cuatrimestre" },
  { code: "FICHIRH27", name: "Economía y Costos", year: 5, term: 1, category: "obligatoria", group: "Año 5 · 1er Cuatrimestre" },

  // ── Año 5 · 2do Cuatrimestre ───────────────────────────────────────
  { code: "FICHIF035", name: "Auditoría Informática", year: 5, term: 2, category: "obligatoria", group: "Año 5 · 2do Cuatrimestre" },
  { code: "FICHIF036", name: "Gestión de Empresas", year: 5, term: 2, category: "obligatoria", group: "Año 5 · 2do Cuatrimestre" },

  // ── Idiomas ────────────────────────────────────────────────────────
  { code: "FHUCIDEX0", name: "Idioma Extranjero I (Inglés)", state: "promocionada", grade: 9, date: "2025-11-26", category: "idioma", group: "Idiomas" },
  { code: "FHUCIDEX1", name: "Idioma Extranjero II (Inglés)", category: "idioma", group: "Idiomas" },
  { code: "0901000033", name: "Ciclo Inicial Idioma Extranjero - Acreditación (Inglés)", category: "idioma", group: "Idiomas" },

  // ── Tramo Final ────────────────────────────────────────────────────
  { code: "FICHIF039", name: "Práctica Profesional Supervisada (13 créditos)", category: "tramo-final", group: "Tramo Final" },
  { code: "FICHIF040", name: "Proyecto Final de Carrera (17 créditos)", category: "tramo-final", group: "Tramo Final" },

  // ── Asignaturas Optativas (Optativa IF/06) ─────────────────────────
  ...(
    [
      ["FICH00375", "Redes de Alta Velocidad"],
      ["FICH00397", "Sociología"],
      ["FICH00447", "Psicología"],
      ["FICH00514", "Dispositivos Lógicos Programables"],
      ["FIQE0021", "Introducción a los Medios Digitales"],
      ["FHUCGEO02", "Sistemas de Información Geográfica"],
      ["FIQ60056", "Análisis y Desarrollo de las Organizaciones"],
      ["FHUCFIL01", "Introducción a la Problemática Filosófica"],
      ["FIQE0071", "Idioma Catalán"],
      ["FICH00624", "Programación para Dispositivos Móviles"],
      ["00462", "Ingeniería Web"],
      ["FICH00654", "Energía y Medio Ambiente"],
      ["FICH00666", "Diseño Asistido por Computadora Avanzado"],
      ["FICH00710", "Elementos de Gestión Pública"],
      ["FICH00716", "Inteligencia Artificial"],
      ["FICH00725", "Modelos y Herramientas para la Toma de Decisiones en Ingeniería"],
      ["FICH00762", "Tecnología para la Web Semántica"],
      ["FICH00764", "Laboratorio de Ingeniería de Software"],
      ["FICH00769", "Gráficas por Computadoras"],
      ["FICH00770", "Temas Selectos de Bases de Datos"],
      ["FICH00775", "Métodos Avanzados para Análisis y Representación de Imágenes"],
      ["FICH00787", "Temas Avanzados en Ingeniería Informática IV"],
      ["FICH00788", "Diseño y Desarrollo de Videojuegos"],
      ["FICH00795", "Programación Web"],
      ["FICH00822", "Minería de Datos en Bioinformática"],
      ["FIQE0073", "Contabilidad Básica"],
      ["FICH00884", "Seguridad Informática"],
      ["FICH00900", "Desarrollo Ágil de Software"],
      ["FIQQ0210", "Minería de Datos y Aprendizaje Automático"],
      ["FICH00908", "Auditoría de Sistemas"],
      ["FICH00915", "Seminario Gestión de Empresas"],
      ["FICH00916", "Proyecto Pluridisciplinario: Hidrología, Hidrobiología y Ríos"],
      ["FICH00918", "Bases de Datos Avanzados en Sistemas de Información Modernos"],
      ["FICH00933", "Ingeniería Biomédica"],
      ["FICH00934", "Tecnología de Redes II"],
      ["FICH00938", "Diseño de Software"],
      ["FICH00942", "Introducción a la Robótica"],
      ["FICH00945", "Administración de Redes"],
    ] as [string, string][]
  ).map<Seed>(([code, name]) => ({ code, name, category: "optativa", group: "Optativas (IF/06)" })),

  // ── Asignaturas Electivas ──────────────────────────────────────────
  ...(
    [
      ["FICH00952", "Ordenación del Territorio y Medioambiente"],
      ["FICH00984", "Investigación de Operaciones"],
      ["FICH01006", "Aspectos Avanzados de Redes de Computadoras"],
      ["FICH01007", "Fundamentos de Seguridad Informática"],
      ["FICH01021", "Cómputo Evolutivo"],
      ["FICH726", "Sistemas Embebidos Avanzados"],
      ["FICH727", "Sistemas de Información para Negocios"],
      ["FICH752", "Cálculo Paralelo"],
      ["FIQE0090", "Lógica"],
      ["FICHPT010", "Cartografía Digital"],
      ["FICH00260", "Diseño Asistido por Computadora II"],
      ["FICH00140", "Aprendizaje Profundo"],
      ["01088", "Competencias Sociales para Ingenierías"],
      ["FICHOP00001", "Ciudades Inteligentes: Tecnologías para Modelos de Simulación"],
      ["00298", "Geometría Computacional"],
      ["00477", "Modelado y Simulación de Sistemas Biológicos"],
      ["FCAEL00002", "Introducción al Análisis de Datos con R"],
    ] as [string, string][]
  ).map<Seed>(([code, name]) => ({ code, name, category: "electiva", group: "Electivas" })),
];

export const STUDY_PLAN: Subject[] = SEED.map((s) => ({
  id: s.code,
  code: s.code,
  name: s.name,
  state: s.state ?? "pendiente",
  grade: s.grade ?? null,
  date: s.date ?? null,
  year: s.year ?? null,
  term: s.term ?? null,
  category: s.category,
  group: s.group,
}));

export const PLAN_META = {
  career: "Ingeniería en Informática",
  university: "Universidad Nacional del Litoral · FICH",
  proposal: "Propuesta FICH-07 · Plan 2020",
  student: "Amrein, Tomás Agustín",
  legajo: "44354",
};
