import { describe, expect, it } from "vitest";
import type { Player } from "../types";
import { applyFilters, DEFAULT_FILTERS, filtersFromParams, filtersToParams, normalize } from "./filters";
import { competitionLabels, formatDelta, formatMoney, formatPct, positionLabel } from "./format";

const base: Omit<Player, "id" | "name" | "age" | "delta" | "deltaPct" | "value" | "position" | "competitionId"> = {
  imageUrl: null, subPosition: null, dateOfBirth: null, nationality: null, club: { id: 1, name: "Club" },
  foot: null, heightCm: null, contractUntil: null, valueBefore: 1, peakValue: null, history: [], transfermarktUrl: null,
};
const players: Player[] = [
  { ...base, id: 1, name: "Thomas Müller", age: 30, delta: 10, deltaPct: 0.1, value: 100, position: "Attack", competitionId: "L1" },
  { ...base, id: 2, name: "Lamine Yamal", age: 18, delta: 50, deltaPct: 1, value: 150, position: "Attack", competitionId: "ES1" },
  { ...base, id: 3, name: "Portero Joven", age: 20, delta: 5, deltaPct: 4, value: 20, position: "Goalkeeper", competitionId: "ES1" },
];

describe("applyFilters", () => {
  it("ordena por aumento por defecto", () => {
    expect(applyFilters(players, DEFAULT_FILTERS).map((p) => p.id)).toEqual([2, 1, 3]);
  });
  it("busca sin importar tildes", () => {
    expect(applyFilters(players, { ...DEFAULT_FILTERS, q: "muller" }).map((p) => p.id)).toEqual([1]);
  });
  it("combina posición, liga y edad", () => {
    const f = { ...DEFAULT_FILTERS, competition: "ES1", maxAge: 19 };
    expect(applyFilters(players, f).map((p) => p.id)).toEqual([2]);
    expect(applyFilters(players, { ...DEFAULT_FILTERS, position: "Goalkeeper" as const })).toHaveLength(1);
  });
  it("ordena por porcentaje", () => {
    expect(applyFilters(players, { ...DEFAULT_FILTERS, sort: "deltaPct" })[0].id).toBe(3);
  });
  it("no muta el arreglo original", () => {
    const copy = [...players];
    applyFilters(players, { ...DEFAULT_FILTERS, sort: "age" });
    expect(players).toEqual(copy);
  });
});

describe("parámetros de URL", () => {
  it("ida y vuelta", () => {
    const f = { q: "yamal", position: "Attack" as const, competition: "ES1", maxAge: 21, sort: "value" as const };
    expect(filtersFromParams(filtersToParams(f, 2))).toEqual(f);
    expect(filtersToParams(DEFAULT_FILTERS, 1).toString()).toBe("");
  });
  it("ignora valores inválidos", () => {
    expect(filtersFromParams(new URLSearchParams("orden=hack&posicion=x&edad=200"))).toEqual(DEFAULT_FILTERS);
  });
});

describe("formato", () => {
  it("dinero", () => {
    expect(formatMoney(45_500_000)).toBe("45,5 M€");
    expect(formatMoney(850_000)).toBe("850 mil €");
    expect(formatDelta(30_000_000)).toBe("+30 M€");
    expect(formatPct(3)).toBe("+300 %");
  });
  it("posiciones en español", () => {
    expect(positionLabel("Attack", "Right Winger")).toBe("Extremo derecho");
    expect(positionLabel("Defender", null)).toBe("Defensa");
  });
  it("normalize", () => expect(normalize("  Ødegaard Ñ ")).toBe("ødegaard n"));
});

describe("competitionLabels", () => {
  it("distingue ligas con el mismo nombre", () => {
    const m = competitionLabels([
      { id: "L1", name: "Bundesliga", country: "Germany" },
      { id: "A1", name: "Bundesliga", country: "Austria" },
      { id: "ES1", name: "Laliga", country: "Spain" },
    ]);
    expect(m.get("L1")).toBe("Bundesliga (Alemania)");
    expect(m.get("A1")).toBe("Bundesliga (Austria)");
    expect(m.get("ES1")).toBe("LaLiga");
  });
});
