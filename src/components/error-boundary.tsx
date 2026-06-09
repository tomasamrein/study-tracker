"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** UI a mostrar si los hijos fallan en render. */
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Aísla una sección de la UI: si sus hijos lanzan durante el render, muestra
 * `fallback` en lugar de propagar el error al `error.tsx` de la ruta (que
 * tumbaría la página entera). Útil para módulos opcionales como Spotify.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
