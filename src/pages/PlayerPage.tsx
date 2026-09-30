import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCompetitionNames, useData } from "../context/DataContext";
import { addMonthsIso } from "../lib/dates";
import { countryLabel, formatDate, formatDelta, formatMoney, formatPct, FOOT_LABEL, positionLabel } from "../lib/format";
import { Avatar, ClubCrest } from "../components/Media";
import { ValueChart } from "../components/Charts";
import { FavoriteButton } from "../components/FavoriteButton";
import { NotFoundPage, StatusScreen } from "../components/Status";

export function PlayerPage() {
  const { id } = useParams();
  const state = useData();
  const navigate = useNavigate();
  const compNames = useCompetitionNames();
  const player = state.status === "ready" ? state.byId.get(Number(id)) : undefined;

  useEffect(() => {
    if (player) document.title = `${player.name} · NextPlayer`;
  }, [player]);

  if (state.status !== "ready") return <StatusScreen state={state} />;
  if (!player) return <NotFoundPage />;
  const rank = state.rank.get(player.id);

  const facts: [string, string | null][] = [
    ["Posición", positionLabel(player.position, player.subPosition)],
    ["Edad", player.age !== null ? `${player.age} años` : null],
    ["Nacionalidad", countryLabel(player.nationality)],
    ["Liga", player.competitionId ? (compNames.get(player.competitionId) ?? null) : null],
    ["Pie hábil", player.foot ? (FOOT_LABEL[player.foot] ?? player.foot) : null],
    ["Altura", player.heightCm ? `${player.heightCm} cm` : null],
    ["Contrato hasta", player.contractUntil ? formatDate(player.contractUntil, { month: "long", year: "numeric" }) : null],
    ["Valor máximo", player.peakValue ? formatMoney(player.peakValue) : null],
  ];

  return (
    <article className="page pt-6 sm:pt-10">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Volver al ranking
      </button>

      <header className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-5">
          <Avatar src={player.imageUrl} name={player.name} size={112} className="ring-4 ring-raised" />
          <div className="min-w-0">
            {rank && <p className="num text-sm font-semibold text-muted">Puesto {rank} del ranking</p>}
            <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl">{player.name}</h1>
            <p className="mt-2 flex items-center gap-2 font-semibold">
              <ClubCrest clubId={player.club.id} size={20} />
              {player.club.name ?? "Sin club"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <FavoriteButton playerId={player.id} playerName={player.name} variant="full" />
          {player.transfermarktUrl && (
            <a href={player.transfermarktUrl} target="_blank" rel="noreferrer" className="btn-quiet">
              Ver en Transfermarkt
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          )}
        </div>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="chart-title" className="rounded-2xl border border-line bg-raised p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="chart-title" className="text-sm font-semibold text-muted">
                Aumento en {state.data.windowMonths} meses
              </h2>
              <p className="num mt-1 font-display text-5xl font-extrabold leading-none text-up">{formatDelta(player.delta)}</p>
            </div>
            <dl className="num flex gap-6 text-right text-sm">
              <div>
                <dt className="text-muted">Antes</dt>
                <dd className="font-display text-2xl font-bold">{formatMoney(player.valueBefore)}</dd>
              </div>
              <div>
                <dt className="text-muted">Ahora</dt>
                <dd className="font-display text-2xl font-bold">{formatMoney(player.value)}</dd>
              </div>
              <div>
                <dt className="text-muted">Cambio</dt>
                <dd className="font-display text-2xl font-bold text-up">{formatPct(player.deltaPct)}</dd>
              </div>
            </dl>
          </div>
          <div className="mt-6">
            {player.history.length >= 2 ? (
              <ValueChart points={player.history} markFrom={addMonthsIso(state.data.dataAsOf, -state.data.windowMonths)} />
            ) : (
              <p className="text-sm text-muted">No hay suficiente historial para dibujar la gráfica.</p>
            )}
          </div>
        </section>

        <section aria-labelledby="facts-title" className="rounded-2xl border border-line bg-raised p-5 sm:p-6">
          <h2 id="facts-title" className="text-sm font-semibold text-muted">
            Ficha
          </h2>
          <dl className="mt-3 divide-y divide-line">
            {facts
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
          </dl>
          <p className="mt-4 text-xs text-muted">Datos al {formatDate(state.data.dataAsOf)}.</p>
        </section>
      </div>

      <p className="mt-8 text-sm">
        <Link to="/" className="font-semibold text-brand hover:underline">
          Ver todo el ranking
        </Link>
      </p>
    </article>
  );
}
