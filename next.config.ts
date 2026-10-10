import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Datos de mercado para el backtesting (se ejecuta en el server, sin bundlear).
  serverExternalPackages: ["dukascopy-node"],
  images: {
    remotePatterns: [
      // Fotos de perfil de Google (Firebase Auth).
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  // Rutas de la versión "Study Tracker" → nuevas secciones de Foco.
  async redirects() {
    return [
      { source: "/pomodoro", destination: "/enfoque", permanent: true },
      { source: "/todos", destination: "/tareas", permanent: true },
      { source: "/plan", destination: "/estudio?tab=plan", permanent: true },
      { source: "/ranking", destination: "/estadisticas?tab=ranking", permanent: true },
    ];
  },
};

export default nextConfig;
