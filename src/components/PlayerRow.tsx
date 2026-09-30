import { Link } from "react-router-dom";
import type { Player } from "../types";
import { formatDelta, formatMoney, formatPct, positionLabel } from "../lib/format";
import { Avatar, ClubCrest } from "./Media";
import { Sparkline } from "./Charts";
import { FavoriteButton } from "./FavoriteButton";

/** Fila del ranking. En celular se apila; en escritorio es una fila de tabla. */
export function PlayerRow({ player, rank }: { player: Player; rank: number }) {
  return (
    <li className="group relative grid grid-cols-[2.25rem_1fr_auto] items-center gap-x-3 gap-y-2 border-b border-line px-3 py-3 last:border-b-0 hover:bg-surface/60 sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem_6.5rem_6rem_2.5rem] sm:gap-x-4 sm:px-4">
      <span className="num text-center font-display text-lg font-bold text-muted">{rank}</span>

      <div className="flex min-w-0 items-center gap-3">
        <Avatar src={player.imageUrl} name={player.name} size={44} />
        <div className="min-w-0">
          <Link to={`/jugador/${player.id}`} className="block truncate font-semibold after:absolute after:inset-0 after:content-[''] hover:text-brand">
            {player.name}
          </Link>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted">
            <ClubCrest clubId={player.club.id} size={14} />
            <span className="min-w-[3rem] truncate">{player.club.name ?? "Sin club"}</span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="hidden shrink-0 sm:inline">{positionLabel(player.position, player.subPosition)}</span>
            {player.age !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="num shrink-0">{player.age} años</span>
              </>
            )}
          </p>
        </div>
      </div>

      <Sparkline points={player.history} className="hidden h-8 w-28 sm:block" />

      <div className="col-start-2 row-start-2 flex items-baseline gap-2 sm:col-start-auto sm:row-start-auto sm:block sm:text-right">
        <p className="num font-display text-lg font-bold leading-none text-up">{formatDelta(player.delta)}</p>
        <p className="num text-xs text-muted sm:mt-1">{formatPct(player.deltaPct)}</p>
      </div>

      <p className="num col-start-3 row-start-1 text-right font-display text-lg font-semibold leading-none sm:col-start-auto sm:row-start-auto">
        {formatMoney(player.value)}
      </p>

      <div className="relative z-10 col-start-3 row-start-2 justify-self-end sm:col-start-auto sm:row-start-auto">
        <FavoriteButton playerId={player.id} playerName={player.name} />
      </div>
    </li>
  );
}
