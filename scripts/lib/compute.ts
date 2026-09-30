import type { Competition, Dataset, Player, Position } from "../../src/types";
import { addMonthsIso } from "../../src/lib/dates";

/** Filas tal como vienen en los CSV del dataset (todo es texto). */
export type Row = Record<string, string>;

export interface ComputeOptions {
  windowMonths?: number;
  /** Cuántos meses hacia atrás guardar en el historial de cada jugador. */
  historyMonths?: number;
  /** Máximo de puntos por historial (se submuestrea de forma uniforme). */
  maxHistoryPoints?: number;
  /** Un jugador cuenta como activo si tiene una valoración en estos meses. */
  activeMonths?: number;
  /** Cuántos jugadores incluir (los de mayor aumento absoluto). */
  limit?: number;
  generatedAt?: Date;
}

const POSITIONS: Position[] = ["Goalkeeper", "Defender", "Midfield", "Attack", "Missing"];

export { addMonthsIso as addMonths };

export function ageAt(dateOfBirth: string | null, at: string): number | null {
  if (!dateOfBirth) return null;
  const dob = dateOfBirth.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split("-").map(Number);
  const [ay, am, ad] = at.split("-").map(Number);
  let age = ay - y;
  if (am < m || (am === m && ad < d)) age -= 1;
  return age >= 0 && age < 60 ? age : null;
}

/** Reduce una serie a `max` puntos conservando siempre el primero y el último. */
export function downsample<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const out: T[] = [];
  const step = (items.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(items[Math.round(i * step)]);
  return out;
}

const num = (v: string | undefined): number | null => {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: string | undefined): string | null => (v && v.trim() !== "" ? v.trim() : null);
const date = (v: string | undefined): string | null => (v && v.length >= 10 ? v.slice(0, 10) : null);

export function computeDataset(
  input: { players: Row[]; valuations: Row[]; competitions: Row[] },
  opts: ComputeOptions = {},
): Dataset {
  const {
    windowMonths = 12,
    historyMonths = 36,
    maxHistoryPoints = 18,
    activeMonths = 9,
    limit = 1500,
    generatedAt = new Date(),
  } = opts;

  // 1. Agrupar valoraciones por jugador.
  const byPlayer = new Map<number, [string, number][]>();
  let dataAsOf = "";
  for (const r of input.valuations) {
    const id = num(r.player_id);
    const value = num(r.market_value_in_eur);
    const d = date(r.date);
    if (id === null || value === null || value <= 0 || !d) continue;
    let list = byPlayer.get(id);
    if (!list) byPlayer.set(id, (list = []));
    list.push([d, value]);
    if (d > dataAsOf) dataAsOf = d;
  }
  if (!dataAsOf) throw new Error("No hay valoraciones válidas en el dataset.");

  const windowStart = addMonthsIso(dataAsOf, -windowMonths);
  const activeSince = addMonthsIso(dataAsOf, -activeMonths);
  const historySince = addMonthsIso(dataAsOf, -historyMonths);

  // 2. Calcular el aumento de cada jugador.
  const players: Player[] = [];
  for (const r of input.players) {
    const id = num(r.player_id);
    if (id === null) continue;
    const series = byPlayer.get(id);
    if (!series || series.length < 2) continue;
    series.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

    const latest = series[series.length - 1];
    if (latest[0] < activeSince) continue; // sin valoraciones recientes

    // Valor de referencia: la última valoración en o antes del inicio de la ventana.
    let base: [string, number] | undefined;
    for (const point of series) {
      if (point[0] <= windowStart) base = point;
      else break;
    }
    if (!base) continue; // no hay con qué comparar de forma justa

    const value = latest[1];
    const delta = value - base[1];
    if (delta <= 0) continue;

    const position = (POSITIONS as string[]).includes(r.position) ? (r.position as Position) : "Missing";
    const history = downsample(
      series.filter(([d]) => d >= historySince),
      maxHistoryPoints,
    );

    players.push({
      id,
      name: str(r.name) ?? `Jugador ${id}`,
      imageUrl: str(r.image_url),
      position,
      subPosition: str(r.sub_position),
      age: ageAt(date(r.date_of_birth), dataAsOf),
      dateOfBirth: date(r.date_of_birth),
      nationality: str(r.country_of_citizenship),
      club: { id: num(r.current_club_id), name: str(r.current_club_name) },
      competitionId: str(r.current_club_domestic_competition_id),
      foot: str(r.foot),
      heightCm: num(r.height_in_cm),
      contractUntil: date(r.contract_expiration_date),
      value,
      valueBefore: base[1],
      delta,
      deltaPct: delta / base[1],
      peakValue: num(r.highest_market_value_in_eur),
      history,
      transfermarktUrl: str(r.url),
    });
  }

  players.sort((a, b) => b.delta - a.delta || b.value - a.value || a.id - b.id);
  const top = players.slice(0, limit);

  // 3. Solo las competiciones que aparecen en el resultado.
  const used = new Set(top.map((p) => p.competitionId).filter(Boolean));
  const competitions: Competition[] = input.competitions
    .filter((c) => used.has(c.competition_id))
    .map((c) => ({
      id: c.competition_id,
      name: prettifyCompetition(c.name),
      country: str(c.country_name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return {
    generatedAt: generatedAt.toISOString(),
    dataAsOf,
    windowMonths,
    source: {
      name: "transfermarkt-datasets (dcaribou)",
      url: "https://github.com/dcaribou/transfermarkt-datasets",
      license: "CC0-1.0",
    },
    competitions,
    players: top,
  };
}

/** Los nombres vienen como slugs ("premier-league"); los dejamos legibles. */
export function prettifyCompetition(name: string): string {
  if (!name) return name;
  if (/[A-Z ]/.test(name)) return name;
  return name
    .split("-")
    .map((w) => (w.length <= 2 && w !== "de" ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}
