import { describe, expect, it } from "vitest";
import { addMonths, ageAt, computeDataset, downsample, prettifyCompetition, type Row } from "./compute";

const players: Row[] = [
  { player_id: "1", name: "Joven Promesa", position: "Attack", date_of_birth: "2006-08-01 00:00:00", market_value_in_eur: "40000000", current_club_domestic_competition_id: "ES1", country_of_citizenship: "Spain" },
  { player_id: "2", name: "Veterano", position: "Defender", date_of_birth: "1990-01-01", current_club_domestic_competition_id: "GB1" },
  { player_id: "3", name: "Sin Historial", position: "Midfield" },
  { player_id: "4", name: "Inactivo", position: "Goalkeeper" },
  { player_id: "5", name: "Recién Llegado", position: "Attack" },
];

const valuations = [
  // Sube de 5 M a 40 M
  { player_id: "1", date: "2025-01-10", market_value_in_eur: "5000000" },
  { player_id: "1", date: "2025-06-01", market_value_in_eur: "10000000" },
  { player_id: "1", date: "2026-06-12", market_value_in_eur: "40000000" },
  // Baja: no debe aparecer
  { player_id: "2", date: "2025-05-01", market_value_in_eur: "20000000" },
  { player_id: "2", date: "2026-05-01", market_value_in_eur: "15000000" },
  // Una sola valoración: no se puede comparar
  { player_id: "3", date: "2026-06-01", market_value_in_eur: "1000000" },
  // Sube, pero su última valoración es muy vieja
  { player_id: "4", date: "2024-01-01", market_value_in_eur: "1000000" },
  { player_id: "4", date: "2025-01-01", market_value_in_eur: "3000000" },
  // Todas sus valoraciones son posteriores al inicio de la ventana
  { player_id: "5", date: "2026-01-01", market_value_in_eur: "1000000" },
  { player_id: "5", date: "2026-06-01", market_value_in_eur: "9000000" },
];

const competitions = [
  { competition_id: "ES1", name: "laliga", country_name: "Spain" },
  { competition_id: "GB1", name: "premier-league", country_name: "England" },
];

describe("computeDataset", () => {
  const ds = computeDataset({ players, valuations, competitions }, { generatedAt: new Date("2026-09-30T00:00:00Z") });

  it("usa la valoración más reciente como fecha de los datos", () => {
    expect(ds.dataAsOf).toBe("2026-06-12");
  });

  it("solo incluye jugadores activos que subieron y tienen con qué compararse", () => {
    expect(ds.players.map((p) => p.id)).toEqual([1]);
  });

  it("compara contra la última valoración antes del inicio de la ventana", () => {
    const p = ds.players[0];
    expect(p.valueBefore).toBe(10_000_000); // 2025-06-01 <= 2025-06-12
    expect(p.value).toBe(40_000_000);
    expect(p.delta).toBe(30_000_000);
    expect(p.deltaPct).toBe(3);
    expect(p.age).toBe(19);
  });

  it("solo devuelve las competiciones usadas", () => {
    expect(ds.competitions).toEqual([{ id: "ES1", name: "Laliga", country: "Spain" }]);
  });

  it("falla si no hay valoraciones", () => {
    expect(() => computeDataset({ players, valuations: [], competitions })).toThrow();
  });
});

describe("utilidades", () => {
  it("addMonths respeta fin de mes", () => {
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2026-06-12", -12)).toBe("2025-06-12");
  });
  it("ageAt calcula la edad cumplida", () => {
    expect(ageAt("2000-06-13", "2026-06-12")).toBe(25);
    expect(ageAt("2000-06-12", "2026-06-12")).toBe(26);
    expect(ageAt(null, "2026-06-12")).toBeNull();
  });
  it("downsample conserva extremos", () => {
    const out = downsample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4);
    expect(out[0]).toBe(1);
    expect(out[out.length - 1]).toBe(10);
    expect(out).toHaveLength(4);
  });
  it("prettifyCompetition", () => {
    expect(prettifyCompetition("premier-league")).toBe("Premier League");
    expect(prettifyCompetition("Serie A")).toBe("Serie A");
  });
});
