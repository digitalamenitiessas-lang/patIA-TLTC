"use client";

/**
 * Geolocalización de los predios del Tucumán Lawn Tennis Club.
 * El rugby entrena normalmente en el Anexo El Salvador.
 */
export interface Venue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Radio de tolerancia en metros (los predios son grandes) */
  radiusM: number;
}

export const VENUES: Venue[] = [
  {
    id: "el_salvador",
    name: "Anexo El Salvador",
    lat: -26.8105988,
    lng: -65.1822362,
    radiusM: 450,
  },
  {
    id: "sede",
    name: "Sede Parque 9 de Julio",
    lat: -26.8212798,
    lng: -65.189108,
    radiusM: 350,
  },
];

export const VENUE_NAMES: Record<string, string> = Object.fromEntries(
  VENUES.map((v) => [v.id, v.name]),
);

/** Distancia haversine en metros */
export function distanceM(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

export interface VenueMatch {
  venue: Venue;
  distanceM: number;
  inside: boolean;
}

/** Predio más cercano a la posición dada, indicando si está adentro */
export function resolveVenue(lat: number, lng: number): VenueMatch {
  let best: VenueMatch | null = null;
  for (const venue of VENUES) {
    const d = distanceM(lat, lng, venue.lat, venue.lng);
    if (!best || d < best.distanceM) {
      best = { venue, distanceM: d, inside: d <= venue.radiusM };
    }
  }
  return best!;
}

export type CheckinStatus =
  | { state: "idle" }
  | { state: "locating" }
  | { state: "unsupported" }
  | { state: "denied" }
  | { state: "verified"; venueId: string; venueName: string; distanceM: number }
  | { state: "far"; venueName: string; distanceM: number };

/** Pide la ubicación y la contrasta contra los predios del club */
export function checkIn(): Promise<CheckinStatus> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ state: "unsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const m = resolveVenue(pos.coords.latitude, pos.coords.longitude);
        if (m.inside) {
          resolve({
            state: "verified",
            venueId: m.venue.id,
            venueName: m.venue.name,
            distanceM: m.distanceM,
          });
        } else {
          resolve({
            state: "far",
            venueName: m.venue.name,
            distanceM: m.distanceM,
          });
        }
      },
      () => resolve({ state: "denied" }),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  });
}
