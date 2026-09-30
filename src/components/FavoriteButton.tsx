import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Heart({ filled, className = "h-5 w-5" }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 20.5s-7.5-4.6-9.3-9.3C1.4 7.9 3.6 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.7-1.8 4.7-9.3 9.3-9.3 9.3z" />
    </svg>
  );
}

/** Botón de favorito. Sin sesión, lleva a iniciar sesión y vuelve aquí después. */
export function FavoriteButton({ playerId, playerName, variant = "icon" }: { playerId: number; playerName: string; variant?: "icon" | "full" }) {
  const { enabled, user, favorites, toggleFavorite } = useAuth();
  const location = useLocation();
  if (!enabled) return null;

  const isFav = favorites.has(playerId);
  const label = isFav ? `Quitar a ${playerName} de favoritos` : `Guardar a ${playerName} en favoritos`;
  const cls =
    variant === "icon"
      ? `grid h-10 w-10 place-items-center rounded-full transition-colors ${isFav ? "text-danger" : "text-muted hover:text-ink"}`
      : `btn-quiet ${isFav ? "text-danger" : ""}`;

  if (!user) {
    return (
      <Link to="/entrar" state={{ from: location.pathname + location.search }} className={cls} aria-label={label} title="Inicia sesión para guardar favoritos">
        <Heart filled={false} />
        {variant === "full" && "Guardar"}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => void toggleFavorite(playerId)} className={cls} aria-pressed={isFav} aria-label={label} title={label}>
      <Heart filled={isFav} />
      {variant === "full" && (isFav ? "Guardado" : "Guardar")}
    </button>
  );
}
