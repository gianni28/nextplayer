import { Link } from "react-router-dom";

export function StatusScreen({ state }: { state: { status: "loading" } | { status: "error"; message: string } }) {
  if (state.status === "loading") {
    return (
      <div className="page pt-12" aria-busy="true" aria-label="Cargando jugadores">
        <div className="h-5 w-56 animate-pulse rounded bg-line" />
        <div className="mt-4 h-20 w-3/4 animate-pulse rounded-xl bg-line" />
        <div className="mt-10 space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-line/70" />
          ))}
        </div>
      </div>
    );
  }
  if (state.message === "sin-datos") {
    return (
      <div className="page max-w-xl py-24 text-center">
        <h1 className="font-display text-4xl font-bold uppercase">Todavía no hay datos publicados</h1>
        <p className="mt-3 text-muted">
          El ranking se genera con el workflow «Actualizar datos» de GitHub Actions. Ejecútalo una vez y esta página se llenará sola.
        </p>
      </div>
    );
  }
  return (
    <div className="page max-w-xl py-24 text-center">
      <h1 className="font-display text-4xl font-bold uppercase">No se pudieron cargar los datos</h1>
      <p className="mt-3 text-muted">
        El archivo de jugadores no respondió ({state.message}). Revisa tu conexión y recarga la página.
      </p>
      <button type="button" className="btn-primary mt-6" onClick={() => window.location.reload()}>
        Recargar
      </button>
    </div>
  );
}

export function SampleBanner() {
  return (
    <p role="note" className="mb-8 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
      <strong>Datos de ejemplo:</strong> estos jugadores son inventados para desarrollo local. Ejecuta <code className="font-semibold">npm run data</code> para
      descargar los reales.
    </p>
  );
}

export function NotFoundPage() {
  return (
    <div className="page max-w-xl py-24 text-center">
      <p className="font-display text-8xl font-extrabold text-muted">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold uppercase">Esta página no existe</h1>
      <Link to="/" className="btn-primary mt-6">
        Ir al ranking
      </Link>
    </div>
  );
}
