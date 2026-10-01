import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Si una página falla al dibujarse, muestra el error en lugar de dejar la
 * pantalla en blanco: el encabezado sigue visible y se puede volver o recargar.
 * App la monta con `key={pathname}`, así que al navegar a otra página se reinicia.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[NextPlayer] Error al mostrar la página", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="page max-w-xl py-24 text-center" role="alert">
        <h1 className="font-display text-4xl font-bold uppercase">Algo salió mal al abrir esta página</h1>
        <p className="mt-3 text-muted">Recarga para intentarlo de nuevo. Si vuelve a pasar, este detalle ayuda a encontrar el problema:</p>
        <p className="mt-3 break-words rounded-lg bg-raised px-3 py-2 font-mono text-xs text-muted">{error.message || String(error)}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Recargar
          </button>
          <a href="/" className="btn-quiet">
            Ir al ranking
          </a>
        </div>
      </div>
    );
  }
}
