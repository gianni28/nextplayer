import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { formatDate } from "../lib/format";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="NextPlayer, inicio">
      <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="rgb(var(--ink))" />
        <path d="M18 14l18 18-18 18" fill="none" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M33 14l18 18-18 18" fill="none" stroke="rgb(var(--surface))" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-2xl font-extrabold uppercase leading-none tracking-tight">
        Next<span className="text-brand">Player</span>
      </span>
    </Link>
  );
}

const navCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isActive ? "bg-raised text-ink shadow-sm" : "text-muted hover:text-ink"}`;

export function Header() {
  const { enabled, user, logout } = useAuth();
  return (
    <header className="border-b border-line bg-surface/85 backdrop-blur supports-[backdrop-filter]:sticky supports-[backdrop-filter]:top-0 supports-[backdrop-filter]:z-30">
      <div className="page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Principal" className="flex items-center gap-1">
          <NavLink to="/" end className={navCls}>
            Ranking
          </NavLink>
          {enabled && (
            <NavLink to="/favoritos" className={navCls}>
              Favoritos
            </NavLink>
          )}
          <NavLink to="/datos" className={(a) => `${navCls(a)} hidden sm:inline-flex`}>
            Sobre los datos
          </NavLink>
          {enabled &&
            (user ? (
              <button type="button" onClick={() => void logout()} className="ml-1 rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink" title={user.email ?? undefined}>
                Salir
              </button>
            ) : user === null ? (
              <Link to="/entrar" className="btn-primary ml-1 h-9 px-3">
                Entrar
              </Link>
            ) : null)}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  const state = useData();
  return (
    <footer className="mt-16 border-t border-line">
      <div className="page flex flex-col gap-2 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Valores de mercado de Transfermarkt · base de{" "}
          <a className="underline decoration-line underline-offset-2 hover:text-ink" href="https://github.com/dcaribou/transfermarkt-datasets" target="_blank" rel="noreferrer">
            transfermarkt-datasets
          </a>{" "}
          (CC0)
          {state.status === "ready" && <> · actualizados al {formatDate(state.data.dataAsOf)}</>}.
        </p>
        <p>
          Hecho por{" "}
          <a className="font-semibold text-ink hover:text-brand" href="https://giovanniraffa.netlify.app" target="_blank" rel="noreferrer">
            Giovanni Raffa
          </a>
        </p>
      </div>
    </footer>
  );
}
