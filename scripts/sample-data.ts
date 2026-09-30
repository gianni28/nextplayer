/**
 * Genera datos INVENTADOS para desarrollo local, cuando no hay acceso al
 * dataset real. Nunca se publica: el archivo queda marcado con `sample: true`
 * y la app muestra un aviso.  Uso: npm run data:sample
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { computeDataset, type Row } from "./lib/compute";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/data/players.json");

let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];

const first = ["Mateo", "Lucas", "Iker", "Thiago", "Luca", "Noah", "Hugo", "Leo", "Enzo", "Adrián", "Nico", "Samuel", "Dani", "Bruno", "Gael", "Álex", "Marco", "Tomás", "Iván", "Joel"];
const last = ["Ferreira", "Moretti", "Castaño", "Duarte", "Ribeiro", "Salas", "Varga", "Okafor", "Lindqvist", "Navarro", "Bianchi", "Rojas", "Kowalski", "Mendes", "Arias", "Dubois", "Herrera", "Nkemdiche", "Silva", "Ortega"];
const comps = [
  ["GB1", "premier-league", "England"], ["ES1", "laliga", "Spain"], ["IT1", "serie-a", "Italy"],
  ["L1", "bundesliga", "Germany"], ["FR1", "ligue-1", "France"], ["PO1", "liga-portugal", "Portugal"],
];
const clubs: Record<string, string[]> = {
  GB1: ["Club Ejemplo del Norte", "Real Muestra FC", "Atlético Demo"], ES1: ["CD Ficticio", "Unión Prueba"],
  IT1: ["AC Esempio", "Sporting Finto"], L1: ["FC Beispiel", "SV Muster"], FR1: ["FC Exemple"], PO1: ["SC Amostra"],
};
const positions: [string, string[]][] = [
  ["Goalkeeper", ["Goalkeeper"]], ["Defender", ["Centre-Back", "Left-Back", "Right-Back"]],
  ["Midfield", ["Central Midfield", "Attacking Midfield", "Defensive Midfield"]],
  ["Attack", ["Centre-Forward", "Left Winger", "Right Winger"]],
];
const nations = ["Spain", "Brazil", "Argentina", "France", "Portugal", "Colombia", "England", "Italy", "Nigeria", "Netherlands"];

const players: Row[] = [];
const valuations: Row[] = [];
for (let i = 1; i <= 400; i++) {
  const [compId] = pick(comps);
  const [pos, subs] = pick(positions);
  const year = 1996 + Math.floor(rand() * 12);
  players.push({
    player_id: String(i),
    name: `${pick(first)} ${pick(last)}`,
    current_club_id: String(1000 + i),
    current_club_name: pick(clubs[compId]),
    country_of_citizenship: pick(nations),
    date_of_birth: `${year}-0${1 + Math.floor(rand() * 9)}-1${Math.floor(rand() * 9)}`,
    position: pos,
    sub_position: pick(subs),
    foot: pick(["right", "left", "both"]),
    height_in_cm: String(170 + Math.floor(rand() * 25)),
    highest_market_value_in_eur: "",
    contract_expiration_date: `${2027 + Math.floor(rand() * 4)}-06-30`,
    current_club_domestic_competition_id: compId,
    image_url: "",
    url: "",
  });
  let v = (0.3 + rand() * 15) * 1_000_000;
  const growth = rand() < 0.2 ? 1.25 : 1.06;
  for (let m = 0; m < 40; m += 4 + Math.floor(rand() * 3)) {
    const d = new Date(Date.UTC(2023, 1 + m, 12)).toISOString().slice(0, 10);
    if (d > "2026-06-12") break;
    valuations.push({ player_id: String(i), date: d, market_value_in_eur: String(Math.round(v / 100000) * 100000) });
    v *= growth + (rand() - 0.45) * 0.3;
  }
  valuations.push({ player_id: String(i), date: "2026-06-12", market_value_in_eur: String(Math.round(v / 100000) * 100000) });
}

const competitions = comps.map(([id, name, country]) => ({ competition_id: id, name, country_name: country }));
const ds = { ...computeDataset({ players, valuations, competitions }), sample: true };
ds.players.forEach((p) => (p.peakValue = Math.max(...p.history.map(([, v]) => v))));
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(ds));
console.log(`✓ Datos de EJEMPLO: ${ds.players.length} jugadores inventados → public/data/players.json`);
