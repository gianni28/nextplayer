import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { PlayerRow } from "../components/PlayerRow";
import { StatusScreen } from "../components/Status";
import { Heart } from "../components/FavoriteButton";

export function FavoritesPage() {
  const { enabled, user, favorites } = useAuth();
  const state = useData();

  if (!enabled) return <Navigate to="/" replace />;
  if (user === null) return <Navigate to="/entrar" replace state={{ from: "/favoritos" }} />;
  if (state.status !== "ready" || user === undefined) return <StatusScreen state={state.status === "error" ? state : { status: "loading" }} />;

  const list = state.data.players.filter((p) => favorites.has(p.id));
  const missing = favorites.size - list.length;

  return (
    <div className="page pt-10">
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">Tus favoritos</h1>
      <p className="mt-1 text-sm text-muted">Los jugadores que guardaste, con su posición en el ranking.</p>

      {list.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <Heart filled={false} className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 font-semibold">Todavía no guardaste a nadie.</p>
          <p className="mt-1 text-sm text-muted">Toca el corazón de un jugador en el ranking para seguirlo aquí.</p>
          <Link to="/" className="btn-primary mt-5">
            Ir al ranking
          </Link>
        </div>
      ) : (
        <ol className="mt-6 overflow-hidden rounded-2xl border border-line bg-raised">
          {list.map((p) => (
            <PlayerRow key={p.id} player={p} rank={state.rank.get(p.id) ?? 0} />
          ))}
        </ol>
      )}
      {missing > 0 && (
        <p className="mt-4 text-sm text-muted">
          {missing === 1 ? "1 favorito ya no aparece" : `${missing} favoritos ya no aparecen`} en el ranking actual porque su valor dejó de subir.
        </p>
      )}
    </div>
  );
}
