import type { DrillDef } from "./types";

/**
 * Currícula de la Clínica de Pateadores "Daniel Tejerizo".
 * Basada en la progresión de 3 niveles del reporte PatIA:
 * 1 Fundamentos biomecánicos · 2 Trayectoria C→J · 3 Consistencia mental.
 * Esfuerzo máximo acotado según la filosofía de Dave Alred: técnica > potencia.
 */
export const LEVELS = [
  {
    level: 1 as const,
    name: "Fundamentos",
    subtitle: "Presentación y pie de apoyo",
    color: "#34d399",
    summary:
      "Dejar caer la pelota con control, pie de apoyo apuntando al objetivo e impacto en el sweet spot con el hueso del empeine. Sin postes: todo se entrena en espacios chicos.",
  },
  {
    level: 2 as const,
    name: "Trayectoria C → J",
    subtitle: "Cadena cinética lineal",
    color: "#ffc400",
    summary:
      "Del swing lateral en 'C' al swing lineal en 'J': el torso viaja hacia el objetivo. Carreras de aproximación cortas y eje de equilibrio del torso.",
  },
  {
    level: 3 as const,
    name: "Mente de Match",
    subtitle: "Presión y decisión táctica",
    color: "#4f7fd6",
    summary:
      "Rutina de pre-pateo cronometrada, simulación de fatiga y decisión de tipo de patada (grubber, chip, box, punt) ante escenarios defensivos.",
  },
];

export const DRILLS: DrillDef[] = [
  // ─── Nivel 1: Fundamentos ───
  {
    id: "n1-drop-controlado",
    level: 1,
    title: "Caída controlada",
    description:
      "Sostené la pelota con las dos manos a la altura de la cadera y dejala caer sobre el empeine sin lanzarla. 10 repeticiones por serie mirando que la costura quede vertical.",
    focus: "Presentación de la pelota",
    maxEffortPct: 30,
    offField: true,
  },
  {
    id: "n1-pie-apoyo",
    level: 1,
    title: "Brújula del pie de apoyo",
    description:
      "Marcá un objetivo en la pared. Colocá el pie de apoyo apuntando al objetivo y pateá a un paso de distancia. El pie de apoyo decide la dirección: revisalo en cada repetición.",
    focus: "Pie de apoyo",
    maxEffortPct: 30,
    offField: true,
  },
  {
    id: "n1-sweet-spot",
    level: 1,
    title: "Sweet spot en el living",
    description:
      "Impacto en el tercio inferior de la pelota con el hueso duro del empeine. Descalzo o en medias para sentir el punto exacto. Sin potencia: solo contacto limpio.",
    focus: "Punto de impacto",
    maxEffortPct: 25,
    offField: true,
  },
  // ─── Nivel 2: C → J ───
  {
    id: "n2-pasillo-j",
    level: 2,
    title: "El pasillo en J",
    description:
      "Armá un pasillo angosto con dos líneas (soga, cinta). Aproximación de 3 pasos manteniendo el torso viajando por el pasillo hacia el objetivo. El swing termina adelante, no cruzado.",
    focus: "Swing lineal",
    maxEffortPct: 40,
    offField: true,
  },
  {
    id: "n2-equilibrio-torso",
    level: 2,
    title: "Estatua de equilibrio",
    description:
      "Pateá y quedate congelado 3 segundos en la posición final. Si te caés hacia el costado, tu swing sigue en 'C'. El eje del torso debe quedar sobre la pierna de apoyo.",
    focus: "Eje de equilibrio",
    maxEffortPct: 40,
    offField: true,
  },
  {
    id: "n2-aproximacion",
    level: 2,
    title: "Carrera corta medida",
    description:
      "Definí tu aproximación (ej: 3 pasos atrás, 2 al costado) y repetila idéntica 15 veces. La consistencia de la carrera es la mitad de la conversión.",
    focus: "Rutina de aproximación",
    maxEffortPct: 40,
    offField: false,
  },
  // ─── Nivel 3: Mental ───
  {
    id: "n3-rutina-cronometrada",
    level: 3,
    title: "Reloj de 60 segundos",
    description:
      "Desde que apoyás el tee tenés 60 segundos (regla de World Rugby para conversiones... ¡y para tu cabeza!). Cronometrá tu rutina completa: respiración, visualización, aproximación, patada.",
    focus: "Rutina pre-pateo",
    maxEffortPct: 60,
    offField: false,
  },
  {
    id: "n3-fatiga-simulada",
    level: 3,
    title: "Patear cansado",
    description:
      "10 burpees o 30 segundos de skipping intenso, después ejecutá tu rutina completa. El objetivo no es la potencia: es que la técnica sobreviva a la fatiga.",
    focus: "Consistencia bajo fatiga",
    maxEffortPct: 60,
    offField: false,
  },
  {
    id: "n3-decision-tactica",
    level: 3,
    title: "Menú de patadas",
    description:
      "Visualizá un escenario: defensa subiendo rápido, espacio atrás. ¿Grubber, chip, box kick o punt? Decidí en 3 segundos y ejecutá. Registrá la decisión en tu diario mental.",
    focus: "Decisión táctica",
    maxEffortPct: 50,
    offField: true,
  },
];

/**
 * Banco de video de la clínica: catálogo curado, embebido en la app
 * (sin salir a YouTube). Espejado en la tabla youtube_video_mirror.
 */
export interface VideoDef {
  youtubeId: string;
  title: string;
  note: string;
  level: 1 | 2 | 3;
  category: "biomecanica" | "rutina_mental" | "drop_kick" | "salida_22";
}

export const VIDEOS: VideoDef[] = [
  // ─── Nivel 1: Fundamentos biomecánicos ───
  {
    youtubeId: "WfrrD9BbW70",
    title: "Principio biomecánico C to J — Dave Alred",
    note: "Cómo pasar del swing lateral en C al swing lineal en J: toda la energía y el torso viajan hacia el objetivo.",
    level: 1,
    category: "biomecanica",
  },
  {
    youtubeId: "Ye4qvxqJYLc",
    title: "Fuerza y estructura en la patada J-Shape",
    note: "Potencia controlada usando el torso y la inercia del cuerpo, sin sobrecargar la pierna. Ideal para practicar fuera de la cancha.",
    level: 1,
    category: "biomecanica",
  },
  {
    youtubeId: "968A8IduTKg",
    title: "The Walking Kick — el paso básico",
    note: "Caminando y a baja intensidad: contacto con el sweet spot y colocación del pie de apoyo antes de sumar carrera.",
    level: 1,
    category: "biomecanica",
  },
  // ─── Nivel 2: Técnicas específicas ───
  {
    youtubeId: "Jv2KySTvlpM",
    title: "Punt: 3 consejos de colocación y suelta",
    note: "Suelta con una sola mano para evitar desvíos por viento y follow-through de cadera hacia el campo.",
    level: 2,
    category: "biomecanica",
  },
  {
    youtubeId: "XIPSbiXDMG8",
    title: "Drop kick (botepronto / salidas)",
    note: "El ritmo exacto: suelta idéntica, rebote balanceado e impacto en el momento justo para altura y consistencia.",
    level: 2,
    category: "drop_kick",
  },
  {
    youtubeId: "mdTZf34a0TQ",
    title: "Grubber: la patada al rastrón",
    note: "Impacto en el tercio superior y el pie 'volcando' por encima: la pelota rueda de punta impredecible para la defensa.",
    level: 2,
    category: "biomecanica",
  },
  // ─── Nivel 3: Rutinas y destrezas avanzadas ───
  {
    youtubeId: "cKUOO9H5-cA",
    title: "Goal kicking completo: del tee al follow-through",
    note: "Elección del tee, alineación visual, pasos de aproximación y rutina mental bajo presión, paso a paso.",
    level: 3,
    category: "rutina_mental",
  },
  {
    youtubeId: "TVIyZeWIDBM",
    title: "Spiral kick: la patada en espiral",
    note: "Costuras a las 11 y las 5 del reloj e impacto en el centro de la pelota para un vuelo que corta el viento.",
    level: 3,
    category: "biomecanica",
  },
  {
    youtubeId: "MAH6vN1k2AY",
    title: "Balance y follow-through en espiral",
    note: "Disparadores físicos para transferir toda la potencia terminando en equilibrio total.",
    level: 3,
    category: "biomecanica",
  },
  {
    youtubeId: "cNZYDJUmNc0",
    title: "Práctica en parejas: drills combinados",
    note: "Drop punts, drop shunts y espirales en movimiento continuo: recepción, transición de manos a pies y velocidad.",
    level: 3,
    category: "biomecanica",
  },
];
