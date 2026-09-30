import { useId, useMemo, useRef, useState } from "react";
import { formatDate, formatMoney } from "../lib/format";

type Point = [string, number];

/** Mini gráfica sin ejes para las filas del ranking. */
export function Sparkline({ points, className = "" }: { points: Point[]; className?: string }) {
  const id = useId();
  const w = 96;
  const h = 32;
  const { line, area, last } = useMemo(() => {
    if (points.length < 2) return { line: "", area: "", last: null };
    const t0 = Date.parse(points[0][0]);
    const t1 = Date.parse(points[points.length - 1][0]);
    const vals = points.map((p) => p[1]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const x = (d: string) => 2 + ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * (w - 6);
    const y = (v: number) => h - 3 - ((v - min) / Math.max(1, max - min)) * (h - 6);
    const coords = points.map(([d, v]) => [x(d), y(v)] as const);
    const line = coords.map(([cx, cy], i) => `${i ? "L" : "M"}${cx.toFixed(1)},${cy.toFixed(1)}`).join("");
    const area = `${line}L${coords[coords.length - 1][0].toFixed(1)},${h}L${coords[0][0].toFixed(1)},${h}Z`;
    return { line, area, last: coords[coords.length - 1] };
  }, [points]);

  if (!last) return null;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgb(var(--up))" stopOpacity="0.28" />
          <stop offset="1" stopColor="rgb(var(--up))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="rgb(var(--up))" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="rgb(var(--up))" />
    </svg>
  );
}

/** Escala "bonita" para el eje Y: 0, 10 M, 20 M… */
function niceTicks(max: number, count = 4): number[] {
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/** Gráfica de la evolución del valor, con ejes y lectura al pasar el dedo o el cursor. */
export function ValueChart({ points, markFrom }: { points: Point[]; markFrom?: string }) {
  const id = useId();
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 260;
  const pad = { l: 56, r: 16, t: 16, b: 30 };

  const geo = useMemo(() => {
    const t0 = Date.parse(points[0][0]);
    const t1 = Date.parse(points[points.length - 1][0]);
    const ticks = niceTicks(Math.max(...points.map((p) => p[1])));
    const yMax = ticks[ticks.length - 1];
    const x = (d: string) => pad.l + ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
    const y = (v: number) => pad.t + (1 - v / yMax) * (H - pad.t - pad.b);
    const coords = points.map(([d, v]) => ({ x: x(d), y: y(v), d, v }));
    const line = coords.map((c, i) => `${i ? "L" : "M"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join("");
    const area = `${line}L${coords[coords.length - 1].x},${y(0)}L${coords[0].x},${y(0)}Z`;
    const years: { x: number; label: string }[] = [];
    const firstYear = new Date(t0).getUTCFullYear() + 1;
    const lastYear = new Date(t1).getUTCFullYear();
    for (let yr = firstYear; yr <= lastYear; yr++) years.push({ x: x(`${yr}-01-01`), label: String(yr) });
    return { coords, line, area, ticks, y, years, markX: markFrom ? x(markFrom) : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, markFrom]);

  const onMove = (e: React.PointerEvent) => {
    const svg = ref.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    geo.coords.forEach((c, i) => {
      if (Math.abs(c.x - px) < Math.abs(geo.coords[best].x - px)) best = i;
    });
    setHover(best);
  };

  const active = geo.coords[hover ?? geo.coords.length - 1];
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y select-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Valor de mercado: de ${formatMoney(first[1])} en ${formatDate(first[0], { month: "short", year: "numeric" })} a ${formatMoney(last[1])} en ${formatDate(last[0], { month: "short", year: "numeric" })}.`}
      >
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--brand))" stopOpacity="0.22" />
            <stop offset="1" stopColor="rgb(var(--brand))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {geo.markX !== null && geo.markX > pad.l && (
          <g>
            <rect x={geo.markX} y={pad.t} width={W - pad.r - geo.markX} height={H - pad.t - pad.b} fill="rgb(var(--up))" opacity="0.06" />
            <text x={geo.markX + 6} y={pad.t + 12} className="fill-muted text-[11px]">Últimos 12 meses</text>
          </g>
        )}

        {geo.ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={geo.y(t)} y2={geo.y(t)} stroke="rgb(var(--line))" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={pad.l - 8} y={geo.y(t) + 4} textAnchor="end" className="num fill-muted text-[11px]">
              {t === 0 ? "0" : formatMoney(t)}
            </text>
          </g>
        ))}
        {geo.years.map((yr) => (
          <text key={yr.label} x={yr.x} y={H - 8} textAnchor="middle" className="num fill-muted text-[11px]">
            {yr.label}
          </text>
        ))}

        <path d={geo.area} fill={`url(#${id})`} />
        <path d={geo.line} fill="none" stroke="rgb(var(--brand))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {geo.coords.map((c) => (
          <circle key={c.d} cx={c.x} cy={c.y} r="2.5" fill="rgb(var(--raised))" stroke="rgb(var(--brand))" strokeWidth="1.5" />
        ))}
        <line x1={active.x} x2={active.x} y1={pad.t} y2={H - pad.b} stroke="rgb(var(--muted))" strokeOpacity="0.4" />
        <circle cx={active.x} cy={active.y} r="5.5" fill="rgb(var(--brand))" stroke="rgb(var(--raised))" strokeWidth="2" />
      </svg>
      <figcaption className="mt-1 flex items-baseline justify-between gap-3 text-sm" aria-live="polite">
        <span className="text-muted">{formatDate(active.d)}</span>
        <span className="num font-display text-xl font-bold">{formatMoney(active.v)}</span>
      </figcaption>
    </figure>
  );
}
