export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const list = [...nums].sort((a, b) => a - b);

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-center gap-1.5">
      <button type="button" className="btn-quiet h-10 px-3" disabled={page === 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      {list.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - list[i - 1] > 1 && <span className="px-1 text-muted" aria-hidden="true">…</span>}
          <button
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            className={`num h-10 min-w-10 rounded-lg px-3 text-sm font-semibold ${n === page ? "bg-ink text-surface" : "text-muted hover:bg-raised hover:text-ink"}`}
          >
            {n}
          </button>
        </span>
      ))}
      <button type="button" className="btn-quiet h-10 px-3" disabled={page === pages} onClick={() => onChange(page + 1)}>
        Siguiente
      </button>
    </nav>
  );
}
