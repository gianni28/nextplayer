import type { Position } from "../types";

const nf1 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

/** 45_500_000 → "45,5 M€" · 850_000 → "850 mil €" */
export function formatMoney(eur: number): string {
  const abs = Math.abs(eur);
  if (abs >= 1_000_000) return `${nf1.format(eur / 1_000_000)} M€`;
  if (abs >= 1_000) return `${nf0.format(eur / 1_000)} mil €`;
  return `${nf0.format(eur)} €`;
}

/** Igual que formatMoney pero con signo: "+30 M€". */
export function formatDelta(eur: number): string {
  return `${eur > 0 ? "+" : eur < 0 ? "−" : ""}${formatMoney(Math.abs(eur))}`;
}

/** 0.534 → "+53 %" · 3 → "+300 %" */
export function formatPct(ratio: number): string {
  const pct = ratio * 100;
  return `${pct > 0 ? "+" : ""}${nf0.format(pct)} %`;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("es-ES", { timeZone: "UTC", ...opts });
}

export const POSITION_LABEL: Record<Position, string> = {
  Goalkeeper: "Portero",
  Defender: "Defensa",
  Midfield: "Centrocampista",
  Attack: "Delantero",
  Missing: "Sin posición",
};

const SUB_POSITION: Record<string, string> = {
  Goalkeeper: "Portero",
  "Centre-Back": "Defensa central",
  "Left-Back": "Lateral izquierdo",
  "Right-Back": "Lateral derecho",
  "Defensive Midfield": "Pivote",
  "Central Midfield": "Mediocentro",
  "Attacking Midfield": "Mediapunta",
  "Left Midfield": "Interior izquierdo",
  "Right Midfield": "Interior derecho",
  "Left Winger": "Extremo izquierdo",
  "Right Winger": "Extremo derecho",
  "Second Striker": "Segundo delantero",
  "Centre-Forward": "Delantero centro",
};

export function positionLabel(position: Position, sub: string | null): string {
  return (sub && SUB_POSITION[sub]) || POSITION_LABEL[position];
}

export const FOOT_LABEL: Record<string, string> = { right: "Derecho", left: "Izquierdo", both: "Ambidiestro" };

const COUNTRY: Record<string, string> = {
  Spain: "España", Brazil: "Brasil", Argentina: "Argentina", France: "Francia", Portugal: "Portugal",
  Colombia: "Colombia", England: "Inglaterra", Italy: "Italia", Germany: "Alemania", Netherlands: "Países Bajos",
  Belgium: "Bélgica", Nigeria: "Nigeria", Uruguay: "Uruguay", Croatia: "Croacia", Denmark: "Dinamarca",
  Sweden: "Suecia", Norway: "Noruega", Switzerland: "Suiza", Austria: "Austria", Poland: "Polonia",
  Morocco: "Marruecos", Senegal: "Senegal", "Cote d'Ivoire": "Costa de Marfil", Ghana: "Ghana", Cameroon: "Camerún",
  Mexico: "México", "United States": "Estados Unidos", Ecuador: "Ecuador", Chile: "Chile", Paraguay: "Paraguay",
  Venezuela: "Venezuela", Peru: "Perú", Japan: "Japón", "Korea, South": "Corea del Sur", Turkey: "Turquía",
  Türkiye: "Turquía", Serbia: "Serbia", Scotland: "Escocia", Wales: "Gales", Ireland: "Irlanda", Greece: "Grecia",
  Ukraine: "Ucrania", "Czech Republic": "Chequia", Hungary: "Hungría", Algeria: "Argelia", Egypt: "Egipto",
  Mali: "Malí", Guinea: "Guinea", "DR Congo": "R. D. del Congo", Georgia: "Georgia", Slovenia: "Eslovenia",
  Slovakia: "Eslovaquia", Romania: "Rumanía", Canada: "Canadá", Australia: "Australia", Tunisia: "Túnez",
};

export function countryLabel(name: string | null): string | null {
  return name ? (COUNTRY[name] ?? name) : null;
}
