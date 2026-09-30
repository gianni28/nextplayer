import { useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCompetitionNames, useData } from "../context/DataContext";
import { applyFilters, filtersFromParams, filtersToParams, PAGE_SIZE, SORT_LABEL, type Filters, type SortKey } from "../lib/filters";
import { formatDate, formatDelta, formatMoney, formatPct, POSITION_LABEL, positionLabel } from "../lib/format";
import type { Dataset, Player, Position } from "../types";
import { PlayerRow } from "../components/PlayerRow";
import { Pagination } from "../components/Pagination";
import { Avatar, ClubCrest } from "../components/Media";
import { Sparkline } from "../components/Charts";
import { SampleBanner, StatusScreen } from "../components/Status";

export function ExplorePage() {
  const state = useData();
  if (state.status !== "ready") return <StatusScreen state={state} />;
  return <Explore data={state.data} />;
}

function Explore({ data }: { data: Dataset }) {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const page = Math.max(1, Number(params.get("pagina")) || 1);
  const listTop = useRef<HTMLDivElement>(null);
  const compNames = useCompetitionNames();

  const results = useMemo(() => applyFilters(data.players, filters), [data.players, filters]);
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const isDefault = filtersToParams(filters, 1).toString() === "";

  const update = (patch: Partial<Filters>) => setParams(filtersToParams({ ...filters, ...patch }, 1), { replace: true });
  const goTo = (p: number) => {
    setParams(filtersToParams(filters, p));
    listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    document.title = "NextPlayer · Los futbolistas que más se revalorizan";
  }, []);

  return (
    <div className="page pt-8 sm:pt-12">
      {data.sample && <SampleBanner />}
      <Spotlight data={data} compNames={compNames} />

      <section aria-labelledby="ranking-title" className="mt-12" ref={listTop} style={{ scrollMarginTop: "5rem" }}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="ranking-title" className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
              Ranking de revalorización
            </h2>
            <p className="mt-1 text-sm text-muted">
              Aumento de valor en los {data.windowMonths} meses previos al {formatDate(data.dataAsOf)}.
            </p>
          </div>
          <p className="num text-sm text-muted" aria-live="polite">
            {results.length.toLocaleString("es-ES")} {results.length === 1 ? "jugador" : "jugadores"}
          </p>
        </div>

        <FilterBar filters={filters} update={update} data={data} canReset={!isDefault} reset={() => setParams({}, { replace: true })} />

        {visible.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
            <p className="font-semibold">Ningún jugador cumple esos filtros.</p>
            <p className="mt-1 text-sm text-muted">Prueba con otra liga, una edad máxima mayor o borra la búsqueda.</p>
            <button type="button" className="btn-quiet mt-5" onClick={() => setParams({}, { replace: true })}>
              Quitar filtros
            </button>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-raised">
            <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_7rem_6.5rem_6rem_2.5rem] gap-x-4 border-b border-line px-4 py-2.5 text-xs font-semibold text-muted sm:grid">
              <span className="text-center">#</span>
              <span>Jugador</span>
              <span>Últimos 3 años</span>
              <span className="text-right">Aumento</span>
              <span className="text-right">Valor actual</span>
              <span />
            </div>
            <ol>
              {visible.map((p, i) => (
                <PlayerRow key={p.id} player={p} rank={(current - 1) * PAGE_SIZE + i + 1} />
              ))}
            </ol>
          </div>
        )}

        <div className="mt-6">
          <Pagination page={current} pages={pages} onChange={goTo} />
        </div>
      </section>
    </div>
  );
}

/** El jugador que más subió, presentado como protagonista. */
function Spotlight({ data, compNames }: { data: Dataset; compNames: Map<string, string> }) {
  const top: Player | undefined = data.players[0];
  const runnersUp = data.players.slice(1, 4);
  if (!top) return null;
  return (
    <section aria-labelledby="spotlight-title" className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
      <div>
        <p className="text-sm font-semibold text-muted">El que más subió en el último año</p>
        <h1 id="spotlight-title" className="mt-2 font-display text-6xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-8xl">
          <Link to={`/jugador/${top.id}`} className="hover:text-brand">
            {top.name}
          </Link>
        </h1>
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
          <ClubCrest clubId={top.club.id} size={20} />
          <span className="font-semibold text-ink">{top.club.name}</span>
          {top.competitionId && compNames.get(top.competitionId) && <span>· {compNames.get(top.competitionId)}</span>}
          <span>· {positionLabel(top.position, top.subPosition)}</span>
          {top.age !== null && <span className="num">· {top.age} años</span>}
        </p>

        <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="num font-display text-7xl font-extrabold leading-none text-up sm:text-8xl">{formatDelta(top.delta)}</p>
            <p className="num mt-2 text-sm text-muted">
              de {formatMoney(top.valueBefore)} a <span className="font-semibold text-ink">{formatMoney(top.value)}</span> ({formatPct(top.deltaPct)})
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Avatar src={top.imageUrl} name={top.name} size={88} className="ring-4 ring-raised" />
            <Sparkline points={top.history} className="h-16 w-44" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-raised p-2">
        <p className="px-3 pb-1 pt-2 text-sm font-semibold text-muted">Le siguen</p>
        <ol>
          {runnersUp.map((p, i) => (
            <li key={p.id} className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface">
              <span className="num w-5 font-display text-lg font-bold text-muted">{i + 2}</span>
              <Avatar src={p.imageUrl} name={p.name} size={36} />
              <Link to={`/jugador/${p.id}`} className="min-w-0 flex-1 truncate font-semibold after:absolute after:inset-0 after:content-['']">
                {p.name}
              </Link>
              <span className="num font-display text-lg font-bold text-up">{formatDelta(p.delta)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const POSITIONS: Position[] = ["Goalkeeper", "Defender", "Midfield", "Attack"];
const AGES = [19, 21, 23, 25, 28];

function FilterBar({ filters, update, data, canReset, reset }: { filters: Filters; update: (p: Partial<Filters>) => void; data: Dataset; canReset: boolean; reset: () => void }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-raised p-3 sm:gap-3 lg:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))_auto]">
      <label className="relative col-span-2 lg:col-span-1">
        <span className="sr-only">Buscar jugador o club</span>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={filters.q}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Buscar jugador o club"
          className="field pl-10"
        />
      </label>
      <Select label="Posición" value={filters.position} onChange={(v) => update({ position: v as Position | "" })}>
        <option value="">Posición: todas</option>
        {POSITIONS.map((p) => (
          <option key={p} value={p}>
            {POSITION_LABEL[p]}
          </option>
        ))}
      </Select>
      <Select label="Liga" value={filters.competition} onChange={(v) => update({ competition: v })}>
        <option value="">Liga: todas</option>
        {data.competitions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Select label="Edad" value={filters.maxAge === null ? "" : String(filters.maxAge)} onChange={(v) => update({ maxAge: v ? Number(v) : null })}>
        <option value="">Edad: cualquiera</option>
        {AGES.map((a) => (
          <option key={a} value={a}>
            Hasta {a} años
          </option>
        ))}
      </Select>
      <Select label="Ordenar" value={filters.sort} onChange={(v) => update({ sort: v as SortKey })}>
        {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
          <option key={k} value={k}>
            {SORT_LABEL[k]}
          </option>
        ))}
      </Select>
      <button type="button" className="btn-quiet col-span-2 lg:col-span-1" onClick={reset} disabled={!canReset}>
        Limpiar
      </button>
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field cursor-pointer" aria-label={label}>
        {children}
      </select>
    </label>
  );
}

