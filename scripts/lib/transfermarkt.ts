/**
 * Valores de mercado al día, leídos directamente de Transfermarkt.
 *
 * Usa el mismo endpoint JSON que la gráfica de "evolución del valor de mercado"
 * de cada jugador en transfermarkt.com (el que también usaba transfermarkt-datasets).
 * Transfermarkt bloquea las IPs de GitHub Actions, por eso esto se corre desde
 * un computador personal (ver README, "Actualizar con datos al día").
 */
import type { Row } from "./compute";

export const TM_BASE_URL = process.env.TM_BASE_URL ?? "https://www.transfermarkt.com";
const TM_TRANSFERS_URL = process.env.TM_BASE_URL ?? "https://www.transfermarkt.co.uk";
const USER_AGENT = "NextPlayer/2.0 (+https://github.com/gianni28/nextplayer)";

export interface CachedPlayer {
  /** Momento de la consulta (ISO). */
  fetchedAt: string;
  /** Serie completa [fecha ISO, valor EUR], de la más antigua a la más reciente. */
  series: [string, number][];
  /** Club actual: el del último fichaje o, si no hay, el de la última valoración. */
  clubId: number | null;
  clubName: string | null;
  /** true si el club salió del historial de fichajes (más fiable que el del gráfico). */
  clubFromTransfers?: boolean;
}

export interface TmCache {
  version: 1;
  players: Record<string, CachedPlayer>;
}

export const emptyCache = (): TmCache => ({ version: 1, players: {} });

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** "Jun 12, 2026" o "12/06/2026" → "2026-06-12". */
export function parseTmDate(s: string | undefined | null): string | null {
  if (!s) return null;
  const t = s.trim();
  let m = /^([A-Za-z]{3})[a-z]*\.? (\d{1,2}), (\d{4})$/.exec(t);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()];
    if (!mo) return null;
    return iso(Number(m[3]), mo, Number(m[2]));
  }
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(t);
  if (m) return iso(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}

function iso(y: number, m: number, d: number): string | null {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "€90.00m" → 90 000 000 · "€500k" / "€500Th." → 500 000 · "€1.20bn" → 1 200 000 000. */
export function parseMarketValue(s: string | undefined | null): number | null {
  if (!s) return null;
  const m = /([0-9]+(?:[.,][0-9]+)?)\s*(bn|Bn|m|M|Mio|k|K|Th|Tsd)?/.exec(s.replace(/\s+/g, " "));
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] ?? "").toLowerCase();
  const factor = unit === "bn" ? 1e9 : unit === "m" || unit === "mio" ? 1e6 : unit === "k" || unit === "th" || unit === "tsd" ? 1e3 : 1;
  const v = Math.round(n * factor);
  return v > 0 ? v : null;
}

interface CeapiPoint {
  y?: number | string;
  mw?: string;
  datum_mw?: string;
  verein?: string;
  wappen?: string;
}

/**
 * Convierte la respuesta de `/ceapi/marketValueDevelopment/graph/{id}` en una serie.
 * Devuelve null si la respuesta no tiene el formato esperado.
 */
export function parseCeapi(body: unknown, today = new Date().toISOString().slice(0, 10)): Omit<CachedPlayer, "fetchedAt"> | null {
  const list = (body as { list?: CeapiPoint[] } | null)?.list;
  if (!Array.isArray(list)) return null;
  const byDate = new Map<string, number>();
  let clubId: number | null = null;
  let clubName: string | null = null;
  let lastDate = "";
  for (const p of list) {
    let d = parseTmDate(p.datum_mw);
    if (!d) continue;
    if (d > today) d = today; // a veces vienen fechas en el futuro
    const fromY = typeof p.y === "number" ? p.y : typeof p.y === "string" ? Number(p.y) : NaN;
    const value = Number.isFinite(fromY) && fromY > 0 ? Math.round(fromY) : parseMarketValue(p.mw);
    if (!value) continue;
    byDate.set(d, value); // si hay dos el mismo día, gana la última
    if (d >= lastDate) {
      lastDate = d;
      const id = /(\d+)(?:\.\w+)?(?:\?.*)?$/.exec(p.wappen ?? "")?.[1];
      if (id) clubId = Number(id);
      if (p.verein && p.verein.trim()) clubName = p.verein.trim();
    }
  }
  const series = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return { series, clubId, clubName };
}

interface TransferEntry {
  dateUnformatted?: string;
  to?: { href?: string; clubName?: string };
}

/**
 * Del historial de fichajes (`/ceapi/transferHistory/list/{id}`), el club del
 * último movimiento ya ocurrido (incluye préstamos). Ignora fichajes futuros.
 */
export function parseTransfers(
  body: unknown,
  today = new Date().toISOString().slice(0, 10),
): { date: string; clubId: number; clubName: string | null } | null {
  const list = (body as { transfers?: TransferEntry[] } | null)?.transfers;
  if (!Array.isArray(list)) return null;
  let best: { date: string; clubId: number; clubName: string | null } | null = null;
  for (const t of list) {
    const d = (t.dateUnformatted ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d === "0000-00-00" || d > today) continue;
    const id = Number(/verein\/(\d+)/.exec(t.to?.href ?? "")?.[1]);
    if (!id) continue;
    if (!best || d >= best.date) best = { date: d, clubId: id, clubName: t.to?.clubName?.trim() || null };
  }
  return best;
}

/**
 * Elige a quién consultar en esta corrida: primero los que nunca se han
 * consultado o llevan más tiempo sin consultarse, y entre ellos los de mayor valor.
 */
export function pickCandidates(
  input: { players: Row[]; valuations: Row[] },
  cache: TmCache,
  opts: { minValue: number; maxAge: number; budget: number; maxAgeDays: number; now?: Date },
): number[] {
  const now = opts.now ?? new Date();
  const latest = new Map<number, [string, number]>();
  for (const r of input.valuations) {
    const id = Number(r.player_id);
    const v = Number(r.market_value_in_eur);
    const d = (r.date ?? "").slice(0, 10);
    if (!id || !v || !d) continue;
    const cur = latest.get(id);
    if (!cur || d > cur[0]) latest.set(id, [d, v]);
  }
  // Los consultados antes pueden haber cambiado de valor: usamos el más reciente.
  for (const [id, c] of Object.entries(cache.players)) {
    const last = c.series[c.series.length - 1];
    if (last) latest.set(Number(id), last);
  }
  let newest = "";
  for (const [d] of latest.values()) if (d > newest) newest = d;
  const activeSince = shiftYears(newest, -1.5);

  const born = new Map<number, string>();
  for (const r of input.players) if (r.date_of_birth) born.set(Number(r.player_id), r.date_of_birth.slice(0, 10));
  const minBirth = shiftYears(now.toISOString().slice(0, 10), -opts.maxAge);

  const fresh = now.getTime() - opts.maxAgeDays * 86_400_000;
  const pool: { id: number; value: number; fetched: number }[] = [];
  for (const [id, [d, v]] of latest) {
    if (d < activeSince || v < opts.minValue) continue;
    const b = born.get(id);
    if (b && b < minBirth) continue;
    const c = cache.players[id];
    // Los consultados antes de leer el historial de fichajes cuentan como pendientes.
    const fetched = c && c.clubFromTransfers !== undefined ? Date.parse(c.fetchedAt) : 0;
    if (fetched > fresh) continue; // consultado hace poco
    pool.push({ id, value: v, fetched });
  }
  pool.sort((a, b) => a.fetched - b.fetched || b.value - a.value || a.id - b.id);
  return pool.slice(0, opts.budget).map((p) => p.id);
}

function shiftYears(isoDate: string, years: number): string {
  if (!isoDate) return "0000-00-00";
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + Math.round(years * 12));
  return d.toISOString().slice(0, 10);
}

/**
 * Reemplaza las valoraciones de los jugadores consultados por su serie de
 * Transfermarkt y actualiza su club (por si se cambió de equipo después del dataset).
 */
export function applyCache(
  input: { players: Row[]; valuations: Row[]; clubs: Row[] },
  cache: TmCache,
): { players: Row[]; valuations: Row[]; updated: number } {
  const ids = new Set(Object.keys(cache.players));
  if (!ids.size) return { players: input.players, valuations: input.valuations, updated: 0 };

  const valuations = input.valuations.filter((r) => !ids.has(String(Number(r.player_id))));
  for (const [id, c] of Object.entries(cache.players)) {
    for (const [date, value] of c.series) valuations.push({ player_id: id, date, market_value_in_eur: String(value) });
  }

  const clubComp = new Map(input.clubs.map((c) => [String(c.club_id), c.domestic_competition_id ?? ""]));
  // Clubes que no están en clubs.csv: deducimos la liga de otros jugadores de ese club.
  for (const r of input.players) {
    if (r.current_club_id && r.current_club_domestic_competition_id && !clubComp.get(r.current_club_id)) {
      clubComp.set(r.current_club_id, r.current_club_domestic_competition_id);
    }
  }
  const players = input.players.map((r) => {
    const c = cache.players[String(Number(r.player_id))];
    if (!c || !c.clubId || String(c.clubId) === r.current_club_id) return r;
    return {
      ...r,
      current_club_id: String(c.clubId),
      current_club_name: c.clubName ?? r.current_club_name,
      // Si el club nuevo no está en el dataset no sabemos su liga.
      current_club_domestic_competition_id: clubComp.get(String(c.clubId)) ?? "",
    };
  });
  return { players, valuations, updated: ids.size };
}

export class BlockedError extends Error {}

/**
 * Consulta Transfermarkt para cada jugador, con pocas peticiones en paralelo
 * y pausas cortas. Va guardando en `cache` y llama a `save` cada tanto, para
 * que una corrida interrumpida no pierda lo avanzado.
 */
export async function refreshFromTransfermarkt(
  ids: number[],
  cache: TmCache,
  opts: { concurrency?: number; delayMs?: number; save: () => Promise<void>; log?: (s: string) => void },
): Promise<{ ok: number; failed: number }> {
  const { concurrency = 3, delayMs = 400, save, log = console.log } = opts;
  let next = 0;
  let ok = 0;
  let failed = 0;
  let streak = 0; // fallos seguidos
  let sinceSave = 0;
  let blocked: BlockedError | null = null;
  const started = Date.now();

  const getJson = async (url: string): Promise<unknown | null | undefined> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20_000),
        });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch {
        await sleep(1000 * 2 ** attempt);
      }
    }
    return undefined; // falló de verdad
  };

  const one = async (id: number) => {
    const graph = await getJson(`${TM_BASE_URL}/ceapi/marketValueDevelopment/graph/${id}`);
    if (graph === undefined) return undefined;
    if (graph === null) return null;
    const parsed = parseCeapi(graph);
    if (!parsed) return undefined;
    // El club del gráfico es el de la última valoración: si se cambió de equipo
    // después (p. ej. en el mercado de verano), el historial de fichajes lo corrige.
    const tr = await getJson(`${TM_TRANSFERS_URL}/ceapi/transferHistory/list/${id}`);
    const last = tr ? parseTransfers(tr) : null;
    const lastValuation = parsed.series[parsed.series.length - 1]?.[0] ?? "";
    if (last && last.date >= lastValuation) {
      return { ...parsed, clubId: last.clubId, clubName: last.clubName ?? parsed.clubName, clubFromTransfers: true };
    }
    return { ...parsed, clubFromTransfers: tr !== undefined };
  };

  const worker = async () => {
    while (!blocked && next < ids.length) {
      const id = ids[next++];
      const r = await one(id);
      if (r === undefined) {
        failed++;
        streak++;
        if (streak >= 25) {
          blocked = new BlockedError("Transfermarkt rechazó 25 consultas seguidas: probablemente bloqueó la conexión.");
          return;
        }
      } else {
        streak = 0;
        ok++;
        if (r && r.series.length) cache.players[id] = { fetchedAt: new Date().toISOString(), ...r };
        else if (cache.players[id]) cache.players[id].fetchedAt = new Date().toISOString();
      }
      const done = ok + failed;
      if (done % 100 === 0 || done === ids.length) {
        const mins = (Date.now() - started) / 60000;
        const eta = done ? (mins / done) * (ids.length - done) : 0;
        log(`  ${done}/${ids.length} jugadores · ${failed} fallos · faltan ~${Math.ceil(eta)} min`);
      }
      if (++sinceSave >= 100) {
        sinceSave = 0;
        await save();
      }
      await sleep(delayMs);
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
  } finally {
    await save();
  }
  if (blocked) throw blocked;
  return { ok, failed };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
