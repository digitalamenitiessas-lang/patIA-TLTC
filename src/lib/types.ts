export type KickCategory =
  | "conversion"
  | "penalty"
  | "drop_kick"
  | "punt"
  | "salida_22"
  | "grubber";

export type WindDirection =
  | "calma"
  | "en_contra"
  | "a_favor"
  | "cruzado_izq"
  | "cruzado_der";

export type Division =
  | "M6-M14"
  | "M15"
  | "M16"
  | "M17"
  | "M19"
  | "Pre-Intermedia"
  | "Primera"
  | "Veteranos";

export interface Kick {
  id: string;
  /** Coordenada X en metros (0–70, ancho de cancha) */
  x: number;
  /** Coordenada Y en metros (0–50, distancia a la línea de meta) */
  y: number;
  distance: number;
  angle: number;
  isMade: boolean;
  category: KickCategory;
  /** Esfuerzo de impacto percibido, 10–100 % */
  effortPct: number;
  createdAt: string;
}

export interface Session {
  id: string;
  date: string; // ISO yyyy-mm-dd
  kicks: Kick[];
  rpe: number | null; // 1–10
  windKmh: number;
  windDirection: WindDirection;
  mentalNote: string;
  /** Confianza post-sesión 1–5 */
  confidence: number | null;
  createdAt: string;
}

export interface PlayerProfile {
  fullName: string;
  division: Division;
  preferredFoot: "derecho" | "izquierdo";
  /** Nivel de la clínica: 1 Fundamentos · 2 Trayectoria C→J · 3 Mental */
  skillLevel: 1 | 2 | 3;
  createdAt: string;
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Devuelve true si el jugador la ganó */
  earned: (ctx: StatsContext) => boolean;
}

export interface StatsContext {
  sessions: Session[];
  allKicks: Kick[];
  profile: PlayerProfile;
  streakDays: number;
  xp: number;
}

export interface DrillDef {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  description: string;
  focus: string;
  /** Esfuerzo máximo recomendado (filosofía Alred: técnica sin desgaste) */
  maxEffortPct: number;
  offField: boolean;
  youtubeId?: string;
}
