import type { BadgeDef, Session, StatsContext } from "./types";

export const XP_PER_KICK = 5;
export const XP_PER_MADE = 5;
export const XP_PER_SESSION = 20;

/** Rangos de la clínica según XP acumulada */
export const RANKS = [
  { min: 0, name: "Botín Nuevo" },
  { min: 150, name: "Aprendiz de la 22" },
  { min: 400, name: "Pateador de Club" },
  { min: 900, name: "Especialista" },
  { min: 1800, name: "Capitán del Tee" },
  { min: 3200, name: "Leyenda del Lawn" },
];

export function rankFor(xp: number) {
  let current = RANKS[0];
  let next: (typeof RANKS)[number] | null = null;
  for (const r of RANKS) {
    if (xp >= r.min) current = r;
    else {
      next = r;
      break;
    }
  }
  const progress = next
    ? (xp - current.min) / (next.min - current.min)
    : 1;
  return { current, next, progress };
}

export function sessionXp(s: Session) {
  const made = s.kicks.filter((k) => k.isMade).length;
  return XP_PER_SESSION + s.kicks.length * XP_PER_KICK + made * XP_PER_MADE;
}

export function totalXp(sessions: Session[]) {
  return sessions.reduce((acc, s) => acc + sessionXp(s), 0);
}

/** Días consecutivos con sesión, terminando hoy o ayer */
export function streakDays(sessions: Session[]): number {
  const days = new Set(sessions.map((s) => s.date));
  if (days.size === 0) return 0;
  const dayMs = 86_400_000;
  const toKey = (t: number) => new Date(t).toISOString().slice(0, 10);
  let cursor = Date.now();
  if (!days.has(toKey(cursor))) {
    cursor -= dayMs;
    if (!days.has(toKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(toKey(cursor))) {
    streak++;
    cursor -= dayMs;
  }
  return streak;
}

export const BADGES: BadgeDef[] = [
  {
    id: "primera-patada",
    name: "Primer Botinazo",
    description: "Registraste tu primera patada en la clínica.",
    icon: "🏉",
    earned: (c) => c.allKicks.length >= 1,
  },
  {
    id: "primera-sesion",
    name: "Debut en el Tee",
    description: "Completaste tu primera sesión de entrenamiento.",
    icon: "⛳",
    earned: (c) => c.sessions.length >= 1,
  },
  {
    id: "cincuenta-patadas",
    name: "Medio Centenar",
    description: "50 patadas registradas. La constancia hace al pateador.",
    icon: "🎯",
    earned: (c) => c.allKicks.length >= 50,
  },
  {
    id: "francotirador",
    name: "Francotirador",
    description: "Una sesión con 80 % de efectividad y al menos 10 intentos.",
    icon: "🏹",
    earned: (c) =>
      c.sessions.some((s) => {
        const made = s.kicks.filter((k) => k.isMade).length;
        return s.kicks.length >= 10 && made / s.kicks.length >= 0.8;
      }),
  },
  {
    id: "racha-tres",
    name: "Fuego Sagrado",
    description: "Tres días seguidos entrenando.",
    icon: "🔥",
    earned: (c) => c.streakDays >= 3,
  },
  {
    id: "larga-distancia",
    name: "Cañón del Lawn",
    description: "Convertiste una patada de 40 metros o más.",
    icon: "💣",
    earned: (c) => c.allKicks.some((k) => k.isMade && k.distance >= 40),
  },
  {
    id: "tecnica-pura",
    name: "Técnica Pura",
    description:
      "Sesión completa con esfuerzo ≤ 40 %: la filosofía Alred de baja carga.",
    icon: "🪶",
    earned: (c) =>
      c.sessions.some(
        (s) => s.kicks.length >= 8 && s.kicks.every((k) => k.effortPct <= 40),
      ),
  },
  {
    id: "mente-fria",
    name: "Mente Fría",
    description: "Cinco sesiones con diario mental completado.",
    icon: "🧊",
    earned: (c) =>
      c.sessions.filter((s) => s.mentalNote.trim().length > 0).length >= 5,
  },
  {
    id: "disciplinado",
    name: "Hierro Forjado",
    description: "Diez sesiones completadas en la clínica.",
    icon: "⚒️",
    earned: (c) => c.sessions.length >= 10,
  },
  {
    id: "angulo-imposible",
    name: "Ángulo Imposible",
    description: "Convertiste desde un ángulo cerrado (más de 35°).",
    icon: "📐",
    earned: (c) => c.allKicks.some((k) => k.isMade && k.angle > 35),
  },
];

export function earnedBadges(ctx: StatsContext) {
  return BADGES.filter((b) => b.earned(ctx));
}
