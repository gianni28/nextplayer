import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Dataset, Player } from "../types";
import { competitionLabels } from "../lib/format";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Dataset; byId: Map<number, Player>; rank: Map<number, number> };

const DataContext = createContext<State>({ status: "loading" });

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/data/players.json", { signal: ctrl.signal })
      .then((r) => {
        // Un 404, o el index.html que devuelve el hosting como SPA, significa que aún no hay datos.
        if (r.status === 404 || !(r.headers.get("content-type") ?? "").includes("json")) throw new Error("sin-datos");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Dataset>;
      })
      .then((data) => {
        const byId = new Map(data.players.map((p) => [p.id, p]));
        // Ranking global por aumento absoluto (el orden del archivo).
        const rank = new Map(data.players.map((p, i) => [p.id, i + 1]));
        setState({ status: "ready", data, byId, rank });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      });
    return () => ctrl.abort();
  }, []);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);

export function useCompetitionNames(): Map<string, string> {
  const state = useData();
  return useMemo(
    () => competitionLabels(state.status === "ready" ? state.data.competitions : []),
    [state],
  );
}
