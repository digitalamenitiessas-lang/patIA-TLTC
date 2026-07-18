import type { FieldMode, KickCategory, KickResult } from "./types";

/**
 * Geometría táctica de la cancha. Cada modo de patada usa su propio
 * recorte y su propio sistema de referencia, porque patear a los palos,
 * salir de 22, buscar touch y jugar un rastrón son gestos distintos.
 *
 * Convención general: X = ancho (0–70 m reglamentarios), Y crece
 * alejándose del objetivo del modo.
 */
export const FIELD_W = 70;
export const POSTS_X = 35;
export const POSTS_Y = 0;
/** Separación reglamentaria entre postes: 5,6 m */
export const POSTS_GAP = 5.6;

/** Alto del recorte del modo palos (línea de meta → mitad de cancha) */
export const FIELD_H = 50;
/** Modo salida: desde la propia 22 (y=0) hasta la 22 rival (y=56) */
export const SALIDA_H = 56;
/** Modo touch: franja de juego de 60 m + corredores laterales de 6 m */
export const TOUCH_H = 60;
export const TOUCH_MARGIN = 6;
/** Modo rastrón: últimos 28 m de ataque + ingoal de 6 m */
export const RASTRON_H = 28;
export const INGOAL_DEPTH = 6;

export const MODE_OF: Record<KickCategory, FieldMode> = {
  conversion: "palos",
  penalty: "palos",
  drop_kick: "palos",
  salida_22: "salida",
  punt: "touch",
  grubber: "rastron",
};

export interface ModeSpec {
  mode: FieldMode;
  name: string;
  objective: string;
  /** Instrucción del primer toque */
  tapHint: string;
  /** Instrucción del segundo toque (modos de dos toques) */
  tapHint2?: string;
  twoTap: boolean;
}

export const MODE_SPECS: Record<FieldMode, ModeSpec> = {
  palos: {
    mode: "palos",
    name: "A los palos",
    objective: "Convertir entre los postes",
    tapHint: "Tocá desde dónde pateás",
    twoTap: false,
  },
  salida: {
    mode: "salida",
    name: "Salida de 22",
    objective: "Caída contestable o territorio",
    tapHint: "Tocá dónde cayó la pelota",
    twoTap: false,
  },
  touch: {
    mode: "touch",
    name: "Al touch",
    objective: "Ganar metros y sacarla de la cancha",
    tapHint: "1° toque: desde dónde pateás",
    tapHint2: "2° toque: dónde salió (o quedó)",
    twoTap: true,
  },
  rastron: {
    mode: "rastron",
    name: "Rastrón",
    objective: "Quebrar la línea con pelota al piso",
    tapHint: "1° toque: desde dónde pateás",
    tapHint2: "2° toque: dónde terminó",
    twoTap: true,
  },
};

/* ── Palos ──────────────────────────────────────────────── */

export function kickMetrics(x: number, y: number) {
  const dx = x - POSTS_X;
  const dy = y - POSTS_Y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  // Ángulo respecto de la perpendicular a los postes: 0° = de frente
  const angle = Math.abs(Math.atan2(dx, dy) * (180 / Math.PI));
  return {
    distance: Math.round(distance),
    angle: Math.round(angle),
    side: dx < -0.5 ? "izquierda" : dx > 0.5 ? "derecha" : "centro",
  } as const;
}

/**
 * Dificultad estimada de una patada a los palos (heurística de club):
 * castiga distancia y ángulo. Devuelve % esperable de conversión.
 */
export function goalDifficulty(distance: number, angle: number): number {
  const raw = 102 - distance * 1.15 - angle * 0.55;
  return Math.max(4, Math.min(97, Math.round(raw)));
}

/** Zonas de "honestidad" para el mapa de aciertos: 3 bandas de ángulo × 3 de distancia */
export function zoneOf(distance: number, angle: number) {
  const d = distance < 20 ? 0 : distance < 35 ? 1 : 2;
  const a = angle < 15 ? 0 : angle < 35 ? 1 : 2;
  return { d, a, key: `d${d}a${a}` };
}

export const ZONE_LABELS = {
  d: ["Corta (<20 m)", "Media (20–35 m)", "Larga (>35 m)"],
  a: ["Frontal (<15°)", "Diagonal (15–35°)", "Cerrada (>35°)"],
};

/** Categorías que apuntan a los postes (para stats y récords) */
export const GOAL_CATEGORIES: KickCategory[] = [
  "conversion",
  "penalty",
  "drop_kick",
];

/* ── Salida de 22 ───────────────────────────────────────── */

/** Punto de pateo fijo: centro de la propia línea de 22 */
export const SALIDA_ORIGIN = { x: POSTS_X, y: 0 };

export type SalidaZone = "corta" | "contestable" | "territorial";

export function salidaMetrics(endX: number, endY: number) {
  const meters = Math.round(endY);
  const zone: SalidaZone =
    endY < 10 ? "corta" : endY <= 25 ? "contestable" : "territorial";
  const side =
    endX < FIELD_W / 3 ? "izquierda" : endX > (2 * FIELD_W) / 3 ? "derecha" : "centro";
  return { meters, zone, side } as const;
}

export const SALIDA_ZONE_INFO: Record<
  SalidaZone,
  { label: string; note: string }
> = {
  corta: { label: "Corta", note: "Muy poca profundidad: regalo de posesión" },
  contestable: { label: "Contestable", note: "Zona de aire: tus forwards la disputan" },
  territorial: { label: "Territorial", note: "Larga: cedés posesión por territorio" },
};

/* ── Touch ──────────────────────────────────────────────── */

export function touchMetrics(
  origin: { x: number; y: number },
  end: { x: number; y: number },
) {
  const meters = Math.max(0, Math.round(end.y - origin.y));
  const foundTouch = end.x < 0 || end.x > FIELD_W;
  const sideOut = end.x < 0 ? "izquierdo" : "derecho";
  return { meters, foundTouch, sideOut } as const;
}

/* ── Rastrón ────────────────────────────────────────────── */

export function rastronMetrics(
  origin: { x: number; y: number },
  end: { x: number; y: number },
) {
  // Y crece alejándose del ingoal: avanzar es reducir Y
  const meters = Math.max(0, Math.round(origin.y - end.y));
  const inGoal = end.y < 0;
  return { meters, inGoal } as const;
}

/* ── Resultados por modo ────────────────────────────────── */

export interface ResultOption {
  value: KickResult;
  label: string;
  /** Cuenta como objetivo cumplido (isMade) */
  made: boolean;
  tone: "try" | "gold" | "miss";
}

export const SALIDA_RESULTS: ResultOption[] = [
  { value: "recuperada", label: "Recuperada", made: true, tone: "try" },
  { value: "territorio", label: "Territorio ganado", made: true, tone: "gold" },
  { value: "perdida", label: "Posesión regalada", made: false, tone: "miss" },
];

export const TOUCH_RESULTS: ResultOption[] = [
  { value: "touch_directo", label: "Touch directo", made: true, tone: "try" },
  { value: "touch_pique", label: "Touch con pique", made: true, tone: "gold" },
  { value: "sin_touch", label: "No salió", made: false, tone: "miss" },
];

export const RASTRON_RESULTS: ResultOption[] = [
  { value: "try_presion", label: "Recuperada / try", made: true, tone: "try" },
  { value: "forzo_salida", label: "Forzó salida rival", made: true, tone: "gold" },
  { value: "perdida_rastron", label: "La perdimos", made: false, tone: "miss" },
];

export const RESULTS_BY_MODE: Partial<Record<FieldMode, ResultOption[]>> = {
  salida: SALIDA_RESULTS,
  touch: TOUCH_RESULTS,
  rastron: RASTRON_RESULTS,
};

export function resultLabel(result: KickResult): string {
  for (const list of [SALIDA_RESULTS, TOUCH_RESULTS, RASTRON_RESULTS]) {
    const hit = list.find((r) => r.value === result);
    if (hit) return hit.label;
  }
  return result;
}
