import { describe, expect, it } from "vitest";
import { applyCache, emptyCache, parseCeapi, parseMarketValue, parseTmDate, pickCandidates, type TmCache } from "./transfermarkt";

describe("lectura de Transfermarkt", () => {
  it("fechas en inglés y en formato día/mes/año", () => {
    expect(parseTmDate("Jun 12, 2026")).toBe("2026-06-12");
    expect(parseTmDate("Sep 3, 2026")).toBe("2026-09-03");
    expect(parseTmDate("03/09/2026")).toBe("2026-09-03");
    expect(parseTmDate("-")).toBeNull();
  });

  it("valores con m, k, Th. y bn", () => {
    expect(parseMarketValue("€90.00m")).toBe(90_000_000);
    expect(parseMarketValue("€500k")).toBe(500_000);
    expect(parseMarketValue("€500Th.")).toBe(500_000);
    expect(parseMarketValue("€1.20bn")).toBe(1_200_000_000);
    expect(parseMarketValue("-")).toBeNull();
  });

  it("convierte la respuesta del gráfico en una serie y toma el club más reciente", () => {
    const body = {
      list: [
        { y: 1500000, mw: "€1.50m", datum_mw: "Jun 12, 2025", verein: "Leganés", wappen: "https://tmssl.akamaized.net/images/wappen/verysmall/1244.png?lm=1" },
        { y: 90000000, mw: "€90.00m", datum_mw: "Jun 12, 2026", verein: "RB Leipzig", wappen: "https://tmssl.akamaized.net/images/wappen/verysmall/23826.png" },
        { mw: "€110.00m", datum_mw: "Sep 20, 2026", verein: "Real Madrid", wappen: "https://tmssl.akamaized.net/images/wappen/verysmall/418.png" },
        { mw: "-", datum_mw: "-" },
      ],
    };
    const r = parseCeapi(body, "2026-09-30")!;
    expect(r.series).toEqual([
      ["2025-06-12", 1_500_000],
      ["2026-06-12", 90_000_000],
      ["2026-09-20", 110_000_000],
    ]);
    expect(r.clubId).toBe(418);
    expect(r.clubName).toBe("Real Madrid");
    expect(parseCeapi({ error: "x" })).toBeNull();
  });
});

describe("uso de los valores consultados", () => {
  const players = [
    { player_id: "1", name: "A", date_of_birth: "2006-01-01", current_club_id: "10", current_club_name: "Viejo", current_club_domestic_competition_id: "ES1" },
    { player_id: "2", name: "B", date_of_birth: "1980-01-01", current_club_id: "10", current_club_name: "Viejo", current_club_domestic_competition_id: "ES1" },
    { player_id: "3", name: "C", date_of_birth: "2004-01-01", current_club_id: "11", current_club_name: "Otro", current_club_domestic_competition_id: "GB1" },
  ];
  const valuations = [
    { player_id: "1", date: "2025-06-01", market_value_in_eur: "1000000" },
    { player_id: "1", date: "2026-06-01", market_value_in_eur: "5000000" },
    { player_id: "2", date: "2026-06-01", market_value_in_eur: "50000000" },
    { player_id: "3", date: "2026-06-01", market_value_in_eur: "20000000" },
  ];
  const clubs = [{ club_id: "418", name: "Real Madrid", domestic_competition_id: "ES1" }];

  it("elige primero a los nunca consultados de mayor valor y respeta la edad máxima", () => {
    const cache: TmCache = emptyCache();
    const ids = pickCandidates({ players, valuations }, cache, { budget: 10, minValue: 500_000, maxAge: 32, maxAgeDays: 6, now: new Date("2026-09-30") });
    expect(ids).toEqual([3, 1]); // el 2 tiene más de 32 años
  });

  it("no repite a los consultados hace poco", () => {
    const cache: TmCache = { version: 1, players: { "3": { fetchedAt: "2026-09-29T00:00:00Z", series: [["2026-06-01", 20_000_000]], clubId: 11, clubName: "Otro" } } };
    const ids = pickCandidates({ players, valuations }, cache, { budget: 10, minValue: 500_000, maxAge: 32, maxAgeDays: 6, now: new Date("2026-09-30") });
    expect(ids).toEqual([1]);
  });

  it("reemplaza la serie y actualiza el club si cambió de equipo", () => {
    const cache: TmCache = {
      version: 1,
      players: { "1": { fetchedAt: "2026-09-30T00:00:00Z", series: [["2025-06-01", 1_000_000], ["2026-09-20", 30_000_000]], clubId: 418, clubName: "Real Madrid" } },
    };
    const out = applyCache({ players, valuations, clubs }, cache);
    expect(out.updated).toBe(1);
    expect(out.valuations.filter((v) => v.player_id === "1").map((v) => v.market_value_in_eur)).toEqual(["1000000", "30000000"]);
    expect(out.valuations.filter((v) => v.player_id === "2")).toHaveLength(1);
    const p1 = out.players.find((p) => p.player_id === "1")!;
    expect(p1.current_club_name).toBe("Real Madrid");
    expect(p1.current_club_domestic_competition_id).toBe("ES1");
  });

  it("deduce la liga de un club nuevo a partir de otros jugadores de ese club", () => {
    const cache: TmCache = {
      version: 1,
      players: { "1": { fetchedAt: "2026-09-30T00:00:00Z", series: [["2026-09-20", 30_000_000]], clubId: 11, clubName: "Otro" } },
    };
    const out = applyCache({ players, valuations, clubs: [] }, cache);
    expect(out.players.find((p) => p.player_id === "1")!.current_club_domestic_competition_id).toBe("GB1");
  });
});
