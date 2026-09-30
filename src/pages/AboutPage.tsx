import { useData } from "../context/DataContext";
import { formatDate } from "../lib/format";

export function AboutPage() {
  const state = useData();
  const ds = state.status === "ready" ? state.data : null;

  return (
    <div className="page max-w-3xl pt-10">
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">Sobre los datos</h1>

      <div className="mt-6 space-y-4 leading-relaxed text-ink/90">
        <p>
          NextPlayer muestra a los futbolistas cuyo valor de mercado más subió en los últimos {ds?.windowMonths ?? 12} meses. Los valores son las estimaciones de
          Transfermarkt, tomadas del dataset abierto{" "}
          <a className="font-semibold text-brand hover:underline" href="https://github.com/dcaribou/transfermarkt-datasets" target="_blank" rel="noreferrer">
            transfermarkt-datasets
          </a>
          , publicado con licencia CC0.
        </p>

        <h2 className="pt-4 font-display text-2xl font-bold uppercase">Cómo se calcula</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Se toma la valoración más reciente de cada jugador.</li>
          <li>Se compara con su última valoración anterior al inicio de la ventana de {ds?.windowMonths ?? 12} meses.</li>
          <li>Se descartan los jugadores sin valoraciones en los últimos 9 meses y los que no tienen una valoración previa con la cual comparar.</li>
          <li>Se ordenan por aumento en euros y se publican los primeros {ds ? ds.players.length.toLocaleString("es-ES") : "1.500"}.</li>
        </ol>

        <h2 className="pt-4 font-display text-2xl font-bold uppercase">Actualización</h2>
        <p>
          Un proceso automático en GitHub Actions descarga el dataset cada semana, recalcula el ranking y publica el resultado como un archivo estático. Por eso la
          página carga al instante y no depende de ningún servidor.
        </p>
        {ds && (
          <dl className="num grid gap-3 rounded-2xl border border-line bg-raised p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Valoración más reciente</dt>
              <dd className="font-semibold">{formatDate(ds.dataAsOf)}</dd>
            </div>
            <div>
              <dt className="text-muted">Última vez procesado</dt>
              <dd className="font-semibold">{formatDate(ds.generatedAt)}</dd>
            </div>
          </dl>
        )}
        <p className="text-sm text-muted">
          El dataset de origen pausó sus actualizaciones a mediados de 2026. Mientras siga así, el ranking refleja la última información disponible; si se reanuda,
          NextPlayer se pondrá al día solo.
        </p>
      </div>
    </div>
  );
}
