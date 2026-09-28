import { differenceInCalendarDays } from "date-fns";

/**
 * Biblioteca de métodos de estudio pensados para ingeniería y carreras de
 * números/ciencia. Priorizan práctica activa (resolver, recordar, explicar)
 * por sobre releer o subrayar, que es lo que la evidencia muestra que rinde.
 */
export interface StudyMethod {
  id: string;
  name: string;
  /** Una línea: qué es. */
  summary: string;
  /** Para qué tipo de contenido sirve más. */
  bestFor: string;
  /** Pasos concretos para aplicarlo en un foco. */
  steps: string[];
  /** Cómo encajarlo en un pomodoro de 25–50 minutos. */
  focusTip: string;
  /** Por qué funciona (breve). */
  why: string;
}

export const STUDY_METHODS: StudyMethod[] = [
  {
    id: "problemas-primero",
    name: "Problemas primero",
    summary: "Arrancá por los ejercicios y volvé a la teoría sólo cuando te trabás.",
    bestFor: "Análisis, Física, Álgebra, Programación",
    steps: [
      "Elegí 3–5 ejercicios del tema (de la guía o parciales viejos).",
      "Intentá cada uno sin mirar apuntes al menos 8 minutos.",
      "Cuando te trabes, anotá exactamente qué no sabés y buscá sólo eso en la teoría.",
      "Volvé a resolverlo desde cero, sin copiar.",
    ],
    focusTip: "Un foco = 2–3 ejercicios. En el descanso no mires la solución.",
    why: "El esfuerzo previo (productive failure) hace que la teoría se fije mejor cuando llega.",
  },
  {
    id: "blurting",
    name: "Recuperación activa (blurting)",
    summary: "Escribí todo lo que recordás del tema sin mirar, después corregí.",
    bestFor: "Definiciones, teoremas, conceptos de parcial teórico",
    steps: [
      "Leé un apartado corto (10 min máx).",
      "Cerrá todo y escribí en una hoja en blanco todo lo que te acordás: fórmulas, ideas, diagramas.",
      "Abrí el material y marcá con otro color lo que faltó o estaba mal.",
      "Repetí la hoja en blanco sólo con lo que falló.",
    ],
    focusTip: "10 min lectura · 10 min hoja en blanco · 5 min corrección.",
    why: "Recordar es lo que fortalece la memoria; releer da sensación de dominio falsa.",
  },
  {
    id: "espaciado",
    name: "Repetición espaciada",
    summary: "Repasá lo mismo en intervalos crecientes: 1, 3, 7 y 14 días.",
    bestFor: "Fórmulas, propiedades, sintaxis, tablas",
    steps: [
      "Armá tarjetas pregunta → respuesta (una idea por tarjeta).",
      "Repasalas hoy, y agendá repasos a los 1, 3, 7 y 14 días (podés crear tareas acá).",
      "Las que fallás vuelven al día 1.",
      "Usá Anki o papel; lo importante es responder antes de dar vuelta.",
    ],
    focusTip: "Primeros 10 minutos de cada foco: tarjetas pendientes del día.",
    why: "Olvidar un poco entre repasos obliga a reconstruir y consolida a largo plazo.",
  },
  {
    id: "intercalado",
    name: "Práctica intercalada",
    summary: "Mezclá ejercicios de distintos temas en vez de hacer 20 iguales seguidos.",
    bestFor: "Integrales, ecuaciones diferenciales, circuitos, estadística",
    steps: [
      "Juntá ejercicios de 3 temas distintos de la materia.",
      "Mezclalos al azar (o tapá los títulos).",
      "Antes de resolver cada uno, identificá qué método corresponde y por qué.",
      "Recién después resolvelo.",
    ],
    focusTip: "Ideal para el segundo o tercer foco del día, cuando ya calentaste.",
    why: "En el parcial nadie te dice qué método usar: entrenás justamente esa elección.",
  },
  {
    id: "feynman",
    name: "Técnica Feynman",
    summary: "Explicá el concepto con palabras simples como si fuera para alguien de 12 años.",
    bestFor: "Conceptos abstractos: límites, entropía, recursión, transformadas",
    steps: [
      "Escribí el nombre del concepto arriba de una hoja.",
      "Explicalo con palabras simples y un ejemplo concreto, sin jerga.",
      "Donde te trabes o uses jerga para tapar, ahí hay un hueco: volvé a la fuente.",
      "Simplificá y armá una analogía final.",
    ],
    focusTip: "Un concepto por foco. Grabate un audio si te sirve más que escribir.",
    why: "Explicar obliga a organizar el conocimiento y muestra exactamente qué no entendés.",
  },
  {
    id: "ejemplos-fading",
    name: "Ejemplos resueltos con desvanecimiento",
    summary: "Estudiá un ejemplo resuelto, después completá uno a medias, después resolvé solo.",
    bestFor: "Temas nuevos con procedimiento: métodos numéricos, álgebra lineal",
    steps: [
      "Leé un ejemplo resuelto justificando cada paso.",
      "Tapá la segunda mitad de otro ejemplo similar y completala.",
      "Resolvé un tercero completo sin ayuda.",
      "Compará y anotá el paso que más te costó.",
    ],
    focusTip: "Perfecto para el primer contacto con un tema difícil.",
    why: "Reduce la carga cognitiva al principio y la retira gradualmente.",
  },
  {
    id: "polya",
    name: "Método de Pólya",
    summary: "Entender → planear → ejecutar → revisar, para cualquier problema.",
    bestFor: "Problemas largos o de enunciado: Física, Mecánica, Termodinámica",
    steps: [
      "Entender: datos, incógnita, condiciones. Hacé un dibujo.",
      "Planear: ¿viste un problema parecido? ¿qué principio aplica?",
      "Ejecutar: resolvé verificando cada paso.",
      "Revisar: ¿el resultado tiene sentido? ¿se puede resolver de otra forma?",
    ],
    focusTip: "Escribí los 4 títulos en la hoja antes de empezar cada problema.",
    why: "Separa el 'qué hago' del 'cómo lo hago', que es donde más se traba la gente.",
  },
  {
    id: "derivar",
    name: "Derivar en vez de memorizar",
    summary: "Reconstruí las fórmulas desde los principios en lugar de memorizarlas.",
    bestFor: "Física, Cálculo, Probabilidad, Electrotecnia",
    steps: [
      "Elegí 2–3 fórmulas clave del tema.",
      "Intentá deducirlas desde definiciones o leyes básicas.",
      "Anotá qué supuestos usaste (ej. 'rozamiento despreciable').",
      "Compará con el libro y registrá los pasos que no te salieron.",
    ],
    focusTip: "Un foco por fórmula importante; repetí la derivación al día siguiente.",
    why: "Entender de dónde sale algo lo hace más difícil de olvidar y más fácil de adaptar.",
  },
  {
    id: "sanity-check",
    name: "Análisis dimensional y estimación",
    summary: "Chequeá unidades y orden de magnitud antes de dar un resultado por bueno.",
    bestFor: "Física, Química, cualquier cálculo con unidades",
    steps: [
      "Antes de calcular, estimá el orden de magnitud del resultado.",
      "Arrastrá las unidades en cada paso del cálculo.",
      "Verificá que el resultado final tenga las unidades correctas.",
      "Compará con tu estimación: si difiere 100×, buscá el error.",
    ],
    focusTip: "Aplicalo en cada ejercicio del foco; son 30 segundos que salvan parciales.",
    why: "Detecta la mayoría de los errores algebraicos sin rehacer todo.",
  },
  {
    id: "error-log",
    name: "Registro de errores",
    summary: "Llevá un cuaderno de errores: qué fallaste, por qué, y cómo evitarlo.",
    bestFor: "Preparación de parciales y finales",
    steps: [
      "Cada vez que fallás un ejercicio, anotá: tema, error, causa (concepto, cuenta, lectura).",
      "Escribí la corrección y una regla para no repetirlo.",
      "Antes de cada parcial, releé sólo el registro de errores.",
      "Rehacé los ejercicios del registro sin mirar la solución.",
    ],
    focusTip: "Últimos 5 minutos de cada foco: actualizá el registro.",
    why: "Tus errores son el mapa más preciso de lo que te falta estudiar.",
  },
  {
    id: "simulacro",
    name: "Simulacro de parcial",
    summary: "Resolvé un parcial viejo con tiempo y condiciones reales.",
    bestFor: "La semana previa a un examen",
    steps: [
      "Conseguí un parcial anterior con el mismo formato.",
      "Poné un timer con el tiempo real del examen, sin apuntes ni celular.",
      "Corregí con la resolución y puntuá como lo haría la cátedra.",
      "Pasá los errores al registro de errores.",
    ],
    focusTip: "Usá un foco largo (90–120 min) y desactivá el descanso automático.",
    why: "Entrena el recuerdo bajo presión y la gestión del tiempo, no sólo el contenido.",
  },
  {
    id: "autoexplicacion",
    name: "Autoexplicación",
    summary: "Justificá en voz alta o por escrito el porqué de cada paso de una solución.",
    bestFor: "Demostraciones, algoritmos, resoluciones de la cátedra",
    steps: [
      "Tomá una resolución (tuya o de la cátedra).",
      "Al lado de cada línea escribí por qué es válida (qué propiedad o ley usa).",
      "Marcá los pasos que no sabés justificar.",
      "Resolvé esas dudas y reescribí la solución completa.",
    ],
    focusTip: "Ideal para repasar un tema que 'ya viste' pero no sabés si entendés.",
    why: "Convierte la lectura pasiva de soluciones en comprensión activa.",
  },
  {
    id: "mapa-dependencias",
    name: "Mapa de dependencias",
    summary: "Dibujá qué temas necesitás saber antes de cada tema.",
    bestFor: "Planificar una materia nueva o una recuperación",
    steps: [
      "Listá los temas del programa.",
      "Conectá con flechas: 'para entender B necesito A'.",
      "Identificá las bases flojas (temas con muchas flechas salientes).",
      "Armá tareas para reforzar primero esas bases.",
    ],
    focusTip: "Un foco al inicio de la semana; convertí el resultado en tareas.",
    why: "Evita estudiar temas avanzados sobre cimientos débiles.",
  },
  {
    id: "rubber-duck",
    name: "Rubber duck",
    summary: "Explicá tu código o razonamiento línea por línea a un 'pato' (o a nadie).",
    bestFor: "Programación, debugging, sistemas de la agencia",
    steps: [
      "Describí en voz alta qué debería hacer el código o el razonamiento.",
      "Recorrelo línea por línea diciendo qué hace realmente cada una.",
      "La discrepancia entre 'debería' y 'hace' es el bug.",
      "Anotá la causa raíz para no repetirla.",
    ],
    focusTip: "Sirve tanto para la carrera como para los focos de agencia.",
    why: "Verbalizar obliga a no saltear supuestos, que es donde se esconden los errores.",
  },
];

const METHOD_EPOCH = new Date(2026, 0, 1);

/** Método del día: rota de forma determinística según la fecha. */
export function methodOfTheDay(date: Date = new Date()): StudyMethod {
  const n = differenceInCalendarDays(date, METHOD_EPOCH);
  const len = STUDY_METHODS.length;
  return STUDY_METHODS[((n % len) + len) % len];
}

export function findMethod(id: string | null | undefined): StudyMethod | undefined {
  if (!id) return undefined;
  return STUDY_METHODS.find((m) => m.id === id);
}
