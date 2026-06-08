# Study Tracker 🎓

Tracker de estudio personal para la carrera de **Ingeniería en Informática**
(UNL · FICH · Plan 2020). Construido con **Next.js + Tailwind + shadcn/ui** y
persistencia opcional en **Firebase**.

## Funcionalidades

- **Dashboard** con rachas de estudio (actual y máxima), resumen semanal y
  mensual, gráfico circular de horas por materia y avance de la carrera.
- **Pomodoro personalizable**: foco, descanso corto/largo, focos por ciclo,
  auto-inicio y sonido. Cada foco completado suma horas a la materia elegida.
- **Plan de estudios editable**: cambiá el estado de cada materia
  (Pendiente · En curso · Regular · Aprobada · Promocionada · Recursando ·
  Libre), nota y fecha. Buscador y filtros por estado y categoría. Podés
  agregar optativas/electivas.
- **Estadísticas**: resúmenes semanal/mensual, últimos 30 días, gráfico
  circular, historial de sesiones y backup (exportar/importar/reiniciar).
- **Tema claro/oscuro** y diseño responsive (sidebar en desktop, barra inferior
  en mobile).

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrí <http://localhost:3000>. **Funciona inmediatamente** guardando los datos
en el navegador (localStorage), sin necesidad de configurar nada.

## Conectar Firebase (opcional)

Para sincronizar los datos en la nube entre dispositivos:

1. Creá un proyecto en <https://console.firebase.google.com/>.
2. Agregá una **Web App** (`</>`) y copiá el `firebaseConfig`.
3. Activá **Firestore Database**.
4. Copiá `.env.example` a `.env.local` y completá las claves
   `NEXT_PUBLIC_FIREBASE_*`.
5. Reiniciá `npm run dev`.

La app detecta las claves automáticamente: cuando están presentes guarda en
Firestore (con respaldo local), y si no, usa sólo localStorage. El estado de la
conexión se muestra en la barra lateral.

> Los datos se guardan en un único documento `studyTracker/state`. Para una app
> personal de un solo usuario, ajustá las reglas de Firestore según tu nivel de
> privacidad deseado.

## Estructura

```
src/
├─ app/                 # Rutas: dashboard, pomodoro, plan, estadisticas
├─ components/          # UI (shell, charts, plan, stats, shadcn/ui)
└─ lib/
   ├─ study-plan.ts     # Plan de estudios semillado (desde docs/plan_estudios.docx)
   ├─ types.ts          # Modelo de datos y estados
   ├─ stats.ts          # Rachas, resúmenes y horas por materia
   ├─ store.tsx         # Estado global (React Context) + persistencia
   ├─ storage.ts        # Firestore con fallback a localStorage
   └─ use-pomodoro.ts   # Lógica del temporizador
docs/plan_estudios.docx # Plan original
```

## Build de producción

```bash
npm run build && npm start
```
