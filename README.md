# Foco — tracker de éxito

Tracker personal para enfocarse en lo que importa: **estudiar la carrera**,
**construir sistemas para la agencia** y **alejarse de la dopamina barata**.
Construido con **Next.js + Tailwind + shadcn/ui + React Bits** y persistencia
opcional en **Firebase**. Diseño minimalista en blanco y negro (Instrument
Serif · Geist · Geist Mono).

## Funcionalidades

- **Hoy**: intención del día, arranque de foco en un toque, Top 3 prioridades,
  hábitos del día, días limpio, método de estudio del día, metas de la semana
  y cierre del día (puntaje + nota). Rachas de enfoque y de ritual.
- **Enfoque**: timer por **área** (Carrera, Agencia o las que agregues), con
  materia o proyecto, método opcional, presets 25/50/90, modo *deep work* a
  pantalla completa y autoevaluación de cada foco.
- **Tareas**: pendientes por día y área, con ★ para marcar las 3 prioridades.
- **Hábitos y detox**: hábitos para construir/evitar con historial tipo
  heatmap, y contadores de **días limpio** con registro de recaídas y récord.
- **Metas**: semanales, mensuales o trimestrales; las de horas se calculan
  solas con tus focos. Meta diaria y gestión de áreas.
- **Estudio**: biblioteca de 14 métodos para ingeniería y ciencias (problemas
  primero, recuperación activa, espaciado, intercalado, Feynman, Pólya…) con
  pasos concretos y cuánto te rinde cada uno; y el **plan de carrera**.
- **Estadísticas**: horas por área y materia, semana/mes/30 días, historial,
  logros, backup y ranking.
- **Tema claro/oscuro** y diseño responsive (sidebar en desktop, barra inferior
  en mobile).

Los datos de la versión anterior (Study Tracker) se migran solos: las sesiones
viejas quedan en el área Carrera. Las rutas viejas (`/pomodoro`, `/todos`,
`/plan`, `/ranking`) redirigen a las nuevas.
