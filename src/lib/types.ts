export type KickCategory =
  | "conversion"
  | "penalty"
  | "drop_kick"
  | "punt"
  | "salida_22"
  | "grubber";

/**
 * Modo táctico de la cancha. Patear a los palos, salir de 22 y buscar
 * touch son gestos distintos con objetivos y métricas distintas.
 */
export type FieldMode = "palos" | "salida" | "touch" | "rastron";

/** Resultado específico del modo (los palos usan solo isMade) */
export type KickResult =
  // salida de 22
  | "recuperada"
  | "territorio"
  | "perdida"
  // touch
  | "touch_directo"
  | "touch_pique"
  | "sin_touch"
  // rastrón
  | "try_presion"
  | "forzo_salida"
  | "perdida_rastron";

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
  /** Origen X en metros (coordenadas del modo) */
  x: number;
  /** Origen Y en metros (coordenadas del modo) */
  y: number;
  /** Palos: distancia a los postes · otros modos: metros ganados */
  distance: number;
  /** Solo palos: ángulo respecto de la perpendicular (0° = de frente) */
  angle: number;
  /** Objetivo del gesto cumplido (palos: convertida · touch: salió · etc.) */
  isMade: boolean;
  category: KickCategory;
  /** Esfuerzo de impacto percibido, 10–100 % */
  effortPct: number;
  /** Dónde terminó la pelota (salida / touch / rastrón) */
  endX?: number;
  endY?: number;
  /** Resultado táctico específico del modo */
  result?: KickResult;
  /** Metros netos ganados (modos territoriales) */
  metersGained?: number;
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
  /** Predio del club donde se pateó (el_salvador | sede) */
  venue?: string | null;
  /** true si el GPS confirmó que estaba en el predio */
  venueVerified?: boolean;
  createdAt: string;
}

/** Puestos de rugby (los pateadores suelen ser 10, 12, 15… pero patean todos) */
export const RUGBY_POSITIONS = [
  "Pilar",
  "Hooker",
  "Segunda línea",
  "Ala",
  "Octavo",
  "Medio scrum",
  "Apertura",
  "Centro",
  "Wing",
  "Fullback",
] as const;

export type RugbyPosition = (typeof RUGBY_POSITIONS)[number];

export interface PlayerProfile {
  fullName: string;
  division: Division;
  preferredFoot: "derecho" | "izquierdo";
  /** Nivel de la clínica: 1 Fundamentos · 2 Trayectoria C→J · 3 Mental */
  skillLevel: 1 | 2 | 3;
  /** Ficha de la clínica (onboarding) */
  dni?: string;
  position?: RugbyPosition;
  /** Fecha ISO de aceptación del consentimiento informado */
  consentAt?: string;
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

/* ── Clínica ─────────────────────────────────────────────── */

export interface Coach {
  id: string;
  fullName: string;
  title: string | null;
  active: boolean;
}

export interface Clinic {
  id: string;
  title: string;
  clinicDate: string; // ISO yyyy-mm-dd
  startTime: string | null;
  location: string;
  focus: string | null;
  level: 1 | 2 | 3 | null;
  prep: string[];
  notes: string | null;
}

export interface CoachFeedback {
  id: string;
  playerId: string;
  coachName: string;
  coachTitle: string | null;
  body: string;
  focusNext: string | null;
  rating: number | null;
  createdAt: string;
}

/* ── Ranking ─────────────────────────────────────────────── */

export interface LeaderboardRow {
  playerId: string;
  fullName: string;
  division: string;
  avatarUrl: string | null;
  xp: number;
  kicks: number;
  made: number;
  sessions: number;
  effectiveness: number;
}
