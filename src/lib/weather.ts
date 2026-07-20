"use client";

import { VENUES } from "./geo";

/** Clima actual desde Open-Meteo (API abierta, sin key) */
export interface WeatherNow {
  tempC: number;
  windKmh: number;
  /** Grados meteorológicos: dirección DESDE la que sopla (0 = N) */
  windDirDeg: number;
  compass: string;
  isDay: boolean;
  label: string;
  emoji: string;
}

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO",
];

function toCompass(deg: number): string {
  return COMPASS[Math.round(deg / 22.5) % 16];
}

/** Descripción y emoji según el código WMO de Open-Meteo */
function describe(code: number, isDay: boolean): { label: string; emoji: string } {
  if (code === 0) return { label: "Despejado", emoji: isDay ? "☀️" : "🌙" };
  if (code <= 2) return { label: "Parcial nublado", emoji: isDay ? "🌤️" : "☁️" };
  if (code === 3) return { label: "Nublado", emoji: "☁️" };
  if (code <= 48) return { label: "Neblina", emoji: "🌫️" };
  if (code <= 57) return { label: "Llovizna", emoji: "🌦️" };
  if (code <= 67) return { label: "Lluvia", emoji: "🌧️" };
  if (code <= 77) return { label: "Nieve", emoji: "🌨️" };
  if (code <= 82) return { label: "Chaparrones", emoji: "🌧️" };
  if (code <= 99) return { label: "Tormenta", emoji: "⛈️" };
  return { label: "—", emoji: "🌡️" };
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherNow | null> {
  try {
    const la = lat.toFixed(2);
    const lo = lng.toFixed(2);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}` +
      `&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day` +
      `&wind_speed_unit=kmh&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const d = await res.json();
    const c = d.current;
    if (!c) return null;
    const isDay = c.is_day === 1;
    const { label, emoji } = describe(c.weather_code, isDay);
    return {
      tempC: Math.round(c.temperature_2m),
      windKmh: Math.round(c.wind_speed_10m),
      windDirDeg: c.wind_direction_10m,
      compass: toCompass(c.wind_direction_10m),
      isDay,
      label,
      emoji,
    };
  } catch {
    return null;
  }
}

/** Posición del jugador con timeout; null si no hay permiso/soporte */
function currentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  });
}

/**
 * Clima ahora en la ubicación del jugador. Si no hay permiso de GPS,
 * usa el predio del club (El Salvador) como referencia razonable.
 */
export async function weatherNow(): Promise<WeatherNow | null> {
  const pos = await currentPosition();
  const { lat, lng } = pos ?? { lat: VENUES[0].lat, lng: VENUES[0].lng };
  return fetchWeather(lat, lng);
}
