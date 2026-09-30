/**
 * Descarga el dataset abierto de Transfermarkt (CC0) y genera
 * public/data/players.json con los jugadores que más se revalorizaron.
 *
 * Uso: npm run data
 * Variables opcionales: DATASET_BASE_URL, WINDOW_MONTHS, PLAYERS_LIMIT
 */
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse";
import { computeDataset, type Row } from "./lib/compute";

const BASE_URL =
  process.env.DATASET_BASE_URL ?? "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/data/players.json");

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
  const [players, valuations, competitions] = await Promise.all([
    readCsv("players.csv.gz", PLAYER_COLUMNS),
    readCsv("player_valuations.csv.gz", new Set(["player_id", "date", "market_value_in_eur"])),
    readCsv("competitions.csv.gz"),
  ]);

  const dataset = computeDataset(
    { players, valuations, competitions },
    {
      windowMonths: Number(process.env.WINDOW_MONTHS ?? 12),
      limit: Number(process.env.PLAYERS_LIMIT ?? 1500),
    },
  );

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
