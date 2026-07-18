import type { StatsContext } from "./types";
import { zoneOf, ZONE_LABELS } from "./field";

/** Resumen compacto de telemetría que viaja al chat (sin datos sensibles) */
export interface StatsSummary {
  name: string;
  division: string;
  foot: string;
  level: number;
  totalKicks: number;
  totalSessions: number;
  effPct: number | null;
  avgEffort: number | null;
  avgDistMade: number | null;
  maxDistMade: number | null;
  streak: number;
  weakZone: string | null;
  strongZone: string | null;
  rpeFreshEff: number | null;
  rpeTiredEff: number | null;
  lastNotes: string[];
}

export function buildSummary(stats: StatsContext): StatsSummary {
  const kicks = stats.allKicks;
  const made = kicks.filter((k) => k.isMade);
  const posts = kicks.filter(
    (k) => k.category !== "punt" && k.category !== "grubber",
  );

  // Zonas con al menos 5 intentos
  const zoneMap = new Map<string, { a: number; m: number; d: number; ang: number }>();
  for (const k of posts) {
    const z = zoneOf(k.distance, k.angle);
    const cur = zoneMap.get(z.key) ?? { a: 0, m: 0, d: z.d, ang: z.a };
    cur.a++;
    if (k.isMade) cur.m++;
    zoneMap.set(z.key, cur);
  }
  let weak: string | null = null;
  let strong: string | null = null;
  let weakPct = 1.01;
  let strongPct = -0.01;
  for (const v of zoneMap.values()) {
    if (v.a < 5) continue;
    const pct = v.m / v.a;
    const label = `${ZONE_LABELS.d[v.d]} · ${ZONE_LABELS.a[v.ang]} (${Math.round(pct * 100)}%)`;
    if (pct < weakPct) {
      weakPct = pct;
      weak = label;
    }
    if (pct > strongPct) {
      strongPct = pct;
      strong = label;
    }
  }

  const withRpe = stats.sessions.filter((s) => s.rpe !== null && s.kicks.length >= 5);
  const effOf = (list: typeof withRpe) => {
    const all = list.flatMap((s) => s.kicks);
    return all.length
      ? Math.round((all.filter((k) => k.isMade).length / all.length) * 100)
      : null;
  };

  return {
    name: stats.profile.fullName,
    division: stats.profile.division,
    foot: stats.profile.preferredFoot,
    level: stats.profile.skillLevel,
    totalKicks: kicks.length,
    totalSessions: stats.sessions.length,
    effPct: kicks.length
      ? Math.round((made.length / kicks.length) * 100)
      : null,
    avgEffort: kicks.length
      ? Math.round(kicks.reduce((a, k) => a + k.effortPct, 0) / kicks.length)
      : null,
    avgDistMade: made.length
      ? Math.round(made.reduce((a, k) => a + k.distance, 0) / made.length)
      : null,
    maxDistMade: made.length ? Math.max(...made.map((k) => k.distance)) : null,
    streak: stats.streakDays,
    weakZone: weak,
    strongZone: strong,
    rpeFreshEff: effOf(withRpe.filter((s) => (s.rpe ?? 0) <= 5)),
    rpeTiredEff: effOf(withRpe.filter((s) => (s.rpe ?? 0) > 5)),
    lastNotes: stats.sessions
      .filter((s) => s.mentalNote.trim())
      .slice(0, 3)
      .map((s) => s.mentalNote.slice(0, 140)),
  };
}

/**
 * Entrenador local basado en reglas: responde sin conexión ni API key,
 * siempre sobre los datos reales del jugador.
 */
export function localCoach(message: string, s: StatsSummary): string {
  const q = message.toLowerCase();

  if (s.totalKicks === 0) {
    return `¡Hola ${s.name.split(" ")[0]}! Todavía no tengo datos tuyos para analizar. Cargá tu primera sesión desde el botón dorado y empiezo a estudiar tu pateo. Mientras tanto: Nivel ${s.level} de la Academia tiene ejercicios para hacer en casa con esfuerzo bajo (≤40 %), que es donde de verdad se construye la técnica. 🏉`;
  }

  const intro = `Miré tus números, ${s.name.split(" ")[0]}: ${s.totalKicks} ${s.totalKicks === 1 ? "patada" : "patadas"} en ${s.totalSessions} ${s.totalSessions === 1 ? "sesión" : "sesiones"}, ${s.effPct}% de efectividad.`;

  if (q.includes("efectividad") || q.includes("mejorar") || q.includes("falla") || q.includes("fallo") || q.includes("erro")) {
    const parts = [intro];
    if (s.weakZone)
      parts.push(
        `Tu zona más floja es ${s.weakZone}. Ahí conviene volver al básico: pie de apoyo apuntando al blanco y contacto en el sweet spot, sin buscar potencia.`,
      );
    if (s.avgEffort && s.avgEffort > 55)
      parts.push(
        `Además estás pateando a ${s.avgEffort}% de esfuerzo promedio. La metodología Alred de la clínica es clara: por encima del 40-50 % la técnica se enmascara y el swing vuelve a la "C". Probá una sesión entera al 40 %.`,
      );
    if (s.strongZone)
      parts.push(`La buena: en ${s.strongZone} estás sólido. Esa mecánica es tu referencia.`);
    if (!s.weakZone && s.totalKicks < 20)
      parts.push(
        `Con ${s.totalKicks} ${s.totalKicks === 1 ? "patada registrada" : "patadas registradas"} todavía no puedo mapear tus zonas débiles: cargá un par de sesiones más (ideal 10+ patadas por sesión) y te digo exactamente desde dónde fallás. Mientras tanto, el fundamento que más efectividad regala es el pie de apoyo apuntando al blanco.`,
      );
    return parts.join(" ");
  }

  if (q.includes("cansa") || q.includes("fatiga") || q.includes("rpe") || q.includes("fin de semana") || q.includes("partido")) {
    if (s.rpeFreshEff !== null && s.rpeTiredEff !== null) {
      const drop = s.rpeFreshEff - s.rpeTiredEff;
      if (drop >= 8)
        return `${intro} Encontré un patrón claro: descansado convertís el ${s.rpeFreshEff}%, cansado caés al ${s.rpeTiredEff}% (${drop} puntos menos). La desaceleración de la cadena cinética con fatiga desvía la patada. Sugerencia: bajá el volumen 48 h antes del partido y practicá el drill "Patear cansado" del Nivel 3 para robustecer la rutina.`;
      return `${intro} Tu efectividad se mantiene estable con fatiga (${s.rpeFreshEff}% fresco vs ${s.rpeTiredEff}% cansado). Buena señal de rutina consolidada. Seguí registrando el RPE para monitorearlo.`;
    }
    return `${intro} Todavía no tengo suficientes sesiones con RPE cargado para cruzar fatiga y puntería. Completá el cansancio al cerrar cada sesión y en unas semanas te muestro el patrón.`;
  }

  if (q.includes("distancia") || q.includes("largo") || q.includes("potencia") || q.includes("lejos")) {
    return `${intro} Tu promedio de acierto es de ${s.avgDistMade ?? "?"} m y tu récord ${s.maxDistMade ?? "?"} m. La distancia no se gana pateando más fuerte: se gana con un swing en "J" más limpio y el torso viajando al objetivo. Trabajá "El pasillo en J" (Nivel 2) al 40 % y la distancia aparece sola.`;
  }

  if (q.includes("mental") || q.includes("presión") || q.includes("nervio") || q.includes("rutina") || q.includes("confianza")) {
    const base = `La consistencia mental se entrena igual que el empeine. Armá una rutina fija: respiración, visualización del vuelo, aproximación medida, y el reloj de 60 segundos del Nivel 3.`;
    if (s.lastNotes.length)
      return `${base} Leí tu diario mental — está buenísimo que lo uses: ahí es donde los pateadores de verdad encuentran sus patrones. Seguí anotando después de cada sesión.`;
    return `${base} Tip: empezá a usar el diario mental al cerrar cada sesión; en unas semanas vas a ver patrones entre lo que sentís y lo que convertís.`;
  }

  if (q.includes("viento")) {
    return `Con viento cruzado, apuntá dando margen hacia el lado del viento y bajá la altura del vuelo: pelota más tendida sufre menos deriva. En contra: más cuerpo sobre la pelota y contacto más abajo. A favor: dejá que el viento trabaje, no le pegues de más. Registrá el viento en cada sesión así te muestro tu efectividad por condición.`;
  }

  // Respuesta general
  const tips = [
    s.weakZone ? `zona a trabajar: ${s.weakZone}` : null,
    s.avgEffort ? `esfuerzo promedio ${s.avgEffort}% ${s.avgEffort > 50 ? "(alto — bajalo a ≤40 %)" : "(bien controlado)"}` : null,
    s.streak > 0 ? `racha de ${s.streak} días 🔥` : null,
  ].filter(Boolean);
  return `${intro} ${tips.length ? "Panorama: " + tips.join(" · ") + "." : ""} Preguntame por tu efectividad, la fatiga, la distancia, el viento o la rutina mental y te doy el análisis fino.`;
}
