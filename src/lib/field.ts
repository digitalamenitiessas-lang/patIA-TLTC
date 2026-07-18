/**
 * Geometría de la media cancha de rugby usada por el mapa táctil.
 * X: 0–70 m (ancho reglamentario). Y: 0 en la línea de meta, crece hacia mitad de cancha.
 * Los postes están centrados en X=35 sobre la línea de meta.
 */
export const FIELD_W = 70;
export const FIELD_H = 50;
export const POSTS_X = 35;
export const POSTS_Y = 0;
/** Separación reglamentaria entre postes: 5,6 m */
export const POSTS_GAP = 5.6;

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
