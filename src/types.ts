/** Tipos compartidos entre el pipeline de datos y la app. */

export type Position = "Goalkeeper" | "Defender" | "Midfield" | "Attack" | "Missing";

export interface Player {
  id: number;
  name: string;
  imageUrl: string | null;
  position: Position;
  subPosition: string | null;
  /** Edad en años a la fecha de los datos (`dataAsOf`). */
  age: number | null;
  dateOfBirth: string | null;
  nationality: string | null;
  club: { id: number | null; name: string | null };
  competitionId: string | null;
  foot: string | null;
  heightCm: number | null;
  contractUntil: string | null;
  /** Valor de mercado actual en EUR. */
  value: number;
  /** Valor al inicio de la ventana de comparación. */
  valueBefore: number;
  /** Aumento absoluto en EUR dentro de la ventana. */
  delta: number;
  /** Aumento relativo (0.5 = +50 %). */
  deltaPct: number;
  /** Máximo histórico en EUR. */
  peakValue: number | null;
  /** Serie [fecha ISO, valor EUR], de la más antigua a la más reciente. */
  history: [string, number][];
  transfermarktUrl: string | null;
}

export interface Competition {
  id: string;
  name: string;
  country: string | null;
}

export interface Dataset {
  /** Momento en que se generó el archivo. */
  generatedAt: string;
  /** Fecha de la valoración más reciente del dataset de origen. */
  dataAsOf: string;
  /** Tamaño de la ventana usada para calcular el aumento de valor. */
  windowMonths: number;
  source: { name: string; url: string; license: string };
  /** Cuántos jugadores tienen valores consultados directamente a Transfermarkt. */
  liveUpdated?: number;
  /** true si son datos inventados para desarrollo local. */
  sample?: boolean;
  competitions: Competition[];
  players: Player[];
}
