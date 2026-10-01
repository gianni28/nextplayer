/**
 * Descarga el dataset abierto de Transfermarkt (CC0) y genera
 * public/data/players.json con los jugadores que más se revalorizaron.
 *
 * Uso:
 *   npm run data      → usa el dataset y los valores de Transfermarkt ya guardados
 *   npm run data:tm   → además consulta Transfermarkt para ponerse al día
 *                       (correrlo desde un PC: Transfermarkt bloquea GitHub Actions)
 *
 * Variables opcionales: DATASET_BASE_URL, WINDOW_MONTHS, PLAYERS_LIMIT,
 *   TM_BUDGET (jugadores por corrida), TM_MIN_VALUE, TM_MAX_AGE, TM_MAX_AGE_DAYS
 */
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse";
import { computeDataset, type Row } from "./lib/compute";
import { applyCache, BlockedError, emptyCache, pickCandidates, refreshFromTransfermarkt, type TmCache } from "./lib/transfermarkt";

const BASE_URL =
  process.env.DATASET_BASE_URL ?? "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "public/data/players.json");
/** Valores consultados a Transfermarkt. Se sube al repo para que GitHub Actions también los use. */
const CACHE = resolve(ROOT, "data/transfermarkt.json");
const REFRESH = process.argv.includes("--transfermarkt");

async function loadCache(): Promise<TmCache> {
  try {
    const c = JSON.parse(await readFile(CACHE, "utf8")) as TmCache;
    return c.version === 1 && c.players ? c : emptyCache();
  } catch {
    return emptyCache();
  }
}
async function saveCache(c: TmCache) {
  await mkdir(dirname(CACHE), { recursive: true });
  // Ordenado por id y una línea por jugador: los cambios en git quedan legibles.
  const ids = Object.keys(c.players).sort((a, b) => Number(a) - Number(b));
  const body = ids.map((id) => `    ${JSON.stringify(id)}: ${JSON.stringify(c.players[id])}`).join(",\n");
  await writeFile(CACHE, `{\n  "version": 1,\n  "players": {\n${body}\n  }\n}\n`);
}

const PLAYER_COLUMNS = new Set([
  "player_id", "name", "current_club_id", "current_club_name", "country_of_citizenship",
  "date_of_birth", "position", "sub_position", "foot", "height_in_cm",
  "highest_market_value_in_eur", "contract_expiration_date",
  "current_club_domestic_competition_id", "image_url", "url",
]);

async function readCsv(file: string, keep?: Set<string>): Promise<Row[]> {
  const url = `${BASE_URL}/${file}`;
  const started = Date.now();
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`No se pudo descargar ${url}: HTTP ${res.status}`);

  const rows: Row[] = [];
  const parser = Readable.fromWeb(res.body as never)
    .pipe(createGunzip())
    .pipe(parse({ columns: true, skip_empty_lines: true, relax_quotes: true }));

  for await (const record of parser as AsyncIterable<Row>) {
    if (keep) {
      const slim: Row = {};
      for (const k of keep) slim[k] = record[k];
      rows.push(slim);
    } else rows.push(record);
  }
  console.log(`✓ ${file}: ${rows.length.toLocaleString("es")} filas en ${((Date.now() - started) / 1000).toFixed(1)} s`);
  return rows;
}

async function main() {
  console.log("→ Descargando la base de transfermarkt-datasets…");
  const [basePlayers, baseValuations, competitions, clubs] = await Promise.all([
    readCsv("players.csv.gz", PLAYER_COLUMNS),
    readCsv("player_valuations.csv.gz", new Set(["player_id", "date", "market_value_in_eur"])),
    readCsv("competitions.csv.gz"),
    readCsv("clubs.csv.gz", new Set(["club_id", "name", "domestic_competition_id"])),
  ]);

  const cache = await loadCache();
  if (REFRESH) {
    const ids = pickCandidates({ players: basePlayers, valuations: baseValuations }, cache, {
      budget: Number(process.env.TM_BUDGET ?? 4000),
      minValue: Number(process.env.TM_MIN_VALUE ?? 500_000),
      maxAge: Number(process.env.TM_MAX_AGE ?? 32),
      maxAgeDays: Number(process.env.TM_MAX_AGE_DAYS ?? 6),
    });
    console.log(`→ Consultando Transfermarkt: ${ids.length} jugadores (puedes cortar con Ctrl+C y seguir después)`);
    try {
      const r = await refreshFromTransfermarkt(ids, cache, { save: () => saveCache(cache) });
      console.log(`✓ Transfermarkt: ${r.ok} consultados, ${r.failed} fallaron · ${Object.keys(cache.players).length} jugadores al día en total`);
    } catch (err) {
      if (!(err instanceof BlockedError)) throw err;
      console.warn(`⚠ ${err.message} Se guardó lo avanzado; vuelve a intentarlo más tarde.`);
    }
  }

  const merged = applyCache({ players: basePlayers, valuations: baseValuations, clubs }, cache);
  const dataset = computeDataset(
    { players: merged.players, valuations: merged.valuations, competitions },
    {
      windowMonths: Number(process.env.WINDOW_MONTHS ?? 12),
      limit: Number(process.env.PLAYERS_LIMIT ?? 1500),
    },
  );
  if (merged.updated) {
    dataset.source = {
      name: "Transfermarkt + transfermarkt-datasets",
      url: "https://www.transfermarkt.com",
      license: "Valores de Transfermarkt; datos base CC0",
    };
    dataset.liveUpdated = merged.updated;
  }

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(dataset));
  console.log(
    `✓ ${dataset.players.length} jugadores · datos al ${dataset.dataAsOf} · ${OUT.replace(process.cwd() + "/", "")}`,
  );
}

main().catch((err) => {
  console.error("✗ Error generando los datos:", err);
  process.exit(1);
});
