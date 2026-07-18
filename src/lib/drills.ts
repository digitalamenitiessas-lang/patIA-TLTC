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
 * Banco de video de la clínica. Cuando el club cargue videos en su canal
 * de YouTube quedan indexados en la tabla youtube_video_mirror y se
 * embeben acá. Mientras tanto se ofrecen búsquedas curadas.
 */
export const VIDEO_SEARCHES = [
  {
    id: "v1",
    query: "jonny wilkinson kicking technique dave alred",
    title: "Jonny Wilkinson: técnica de conversión",
    level: 1,
    note: "El alumno más famoso de Dave Alred: mirá la posición del pie de apoyo y las manos.",
  },
  {
    id: "v2",
    query: "C to J rugby kicking technique",
    title: "C to J: cómo cambiar el swing",
    level: 2,
    note: "El concepto central del Nivel 2 explicado con ejemplos de elite.",
  },
  {
    id: "v3",
    query: "rugby goal kicking pre kick routine pressure",
    title: "Rutina mental de pre-pateo",
    level: 3,
    note: "Cómo construir una rutina que aguante la presión del partido.",
  },
];
