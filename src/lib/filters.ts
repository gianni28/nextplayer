import type { Player, Position } from "../types";

export type SortKey = "delta" | "deltaPct" | "value" | "age";

export interface Filters {
  q: string;
  position: Position | "";
  competition: string;
  maxAge: number | null;
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = { q: "", position: "", competition: "", maxAge: null, sort: "delta" };
export const PAGE_SIZE = 25;

export const SORT_LABEL: Record<SortKey, string> = {
  delta: "Mayor aumento",
  deltaPct: "Mayor aumento %",
  value: "Mayor valor",
  age: "Más jóvenes",
};

/** Quita tildes y pasa a minúsculas para buscar "Müller" escribiendo "muller". */
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function applyFilters(players: Player[], f: Filters): Player[] {
  const q = normalize(f.q);
  const out = players.filter(
    (p) =>
      (!q || normalize(p.name).includes(q) || (p.club.name !== null && normalize(p.club.name).includes(q))) &&
      (!f.position || p.position === f.position) &&
      (!f.competition || p.competitionId === f.competition) &&
      (f.maxAge === null || (p.age !== null && p.age <= f.maxAge)),
  );
  const cmp: Record<SortKey, (a: Player, b: Player) => number> = {
    delta: (a, b) => b.delta - a.delta,
    deltaPct: (a, b) => b.deltaPct - a.deltaPct,
    value: (a, b) => b.value - a.value,
    age: (a, b) => (a.age ?? 99) - (b.age ?? 99) || b.delta - a.delta,
  };
  return out.sort((a, b) => cmp[f.sort](a, b) || a.id - b.id);
}

const SORTS: SortKey[] = ["delta", "deltaPct", "value", "age"];
const POSITIONS: Position[] = ["Goalkeeper", "Defender", "Midfield", "Attack"];

export function filtersFromParams(sp: URLSearchParams): Filters {
  const sort = sp.get("orden") as SortKey;
  const pos = sp.get("posicion") as Position;
  const age = Number(sp.get("edad"));
  return {
    q: sp.get("q") ?? "",
    position: POSITIONS.includes(pos) ? pos : "",
    competition: sp.get("liga") ?? "",
    maxAge: Number.isInteger(age) && age >= 16 && age <= 45 ? age : null,
    sort: SORTS.includes(sort) ? sort : "delta",
  };
}

export function filtersToParams(f: Filters, page: number): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.position) sp.set("posicion", f.position);
  if (f.competition) sp.set("liga", f.competition);
  if (f.maxAge !== null) sp.set("edad", String(f.maxAge));
  if (f.sort !== "delta") sp.set("orden", f.sort);
  if (page > 1) sp.set("pagina", String(page));
  return sp;
}
