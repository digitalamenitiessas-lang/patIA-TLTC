"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PlayerProfile, Session, StatsContext } from "./types";
import { getSupabase } from "./supabase";
import {
  BADGES,
  earnedBadges,
  streakDays,
  totalXp,
} from "./gamification";

const LS_KEY = "patia-tltc-v1";

interface StoreShape {
  profile: PlayerProfile;
  sessions: Session[];
  /** IDs de sesiones aún no confirmadas en la nube (para reintentar) */
  pendingSync?: string[];
}

/** Mapea una fila de la nube (training_sessions + logged_kicks) al shape de la app */
function mapCloudRow(s: Record<string, unknown>): Session {
  return {
    id: s.id as string,
    date: s.session_date as string,
    rpe: (s.rpe_fatigue_index as number) ?? null,
    windKmh: (s.wind_velocity_kmh as number) ?? 0,
    windDirection: s.wind_direction as Session["windDirection"],
    mentalNote: (s.psychological_note as string) ?? "",
    confidence: (s.confidence as number) ?? null,
    venue: (s.venue as string) ?? null,
    venueVerified: (s.venue_verified as boolean) ?? false,
    temperatureC: s.temperature_c != null ? Number(s.temperature_c) : null,
    weatherAuto: (s.weather_auto as boolean) ?? false,
    createdAt: s.created_at as string,
    kicks: ((s.logged_kicks as Record<string, unknown>[]) ?? []).map((k) => ({
      id: k.id as string,
      x: Number(k.x_coord),
      y: Number(k.y_coord),
      distance: k.calculated_distance_m as number,
      angle: k.calculated_angle_deg as number,
      isMade: k.is_made as boolean,
      category: k.kick_category as Session["kicks"][number]["category"],
      effortPct: (k.effort_pct as number) ?? 40,
      endX: k.end_x_coord != null ? Number(k.end_x_coord) : undefined,
      endY: k.end_y_coord != null ? Number(k.end_y_coord) : undefined,
      result: (k.result ?? undefined) as Session["kicks"][number]["result"],
      metersGained: (k.meters_gained ?? undefined) as number | undefined,
      createdAt: k.created_at as string,
    })),
  };
}

/**
 * Sube una sesión a la nube de forma idempotente (upsert por id): reintentar
 * una sesión ya sincronizada es un no-op. Devuelve true si quedó guardada.
 */
async function pushSession(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  uid: string,
  s: Session,
): Promise<boolean> {
  try {
    const { error: e1 } = await supabase.from("training_sessions").upsert(
      {
        id: s.id,
        player_id: uid,
        session_date: s.date,
        rpe_fatigue_index: s.rpe,
        wind_velocity_kmh: s.windKmh,
        wind_direction: s.windDirection,
        psychological_note: s.mentalNote || null,
        confidence: s.confidence,
        venue: s.venue ?? null,
        venue_verified: s.venueVerified ?? false,
        temperature_c: s.temperatureC ?? null,
        weather_auto: s.weatherAuto ?? false,
      },
      { onConflict: "id" },
    );
    if (e1) return false;
    if (s.kicks.length) {
      const { error: e2 } = await supabase.from("logged_kicks").upsert(
        s.kicks.map((k) => ({
          id: k.id,
          session_id: s.id,
          player_id: uid,
          x_coord: k.x,
          y_coord: k.y,
          calculated_distance_m: k.distance,
          calculated_angle_deg: k.angle,
          is_made: k.isMade,
          kick_category: k.category,
          effort_pct: k.effortPct,
          end_x_coord: k.endX ?? null,
          end_y_coord: k.endY ?? null,
          result: k.result ?? null,
          meters_gained: k.metersGained ?? null,
        })),
        { onConflict: "id" },
      );
      if (e2) return false;
    }
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_PROFILE: PlayerProfile = {
  fullName: "Pateador/a",
  division: "M15",
  preferredFoot: "derecho",
  skillLevel: 1,
  createdAt: new Date().toISOString(),
};

export interface AccountInfo {
  /** guest = sesión anónima · google = cuenta vinculada · none = sin nube */
  kind: "guest" | "google" | "none";
  email: string | null;
  role: "player" | "coach" | "admin";
  approvalStatus: "approved" | "pending" | "rejected";
}

const DEFAULT_ACCOUNT: AccountInfo = {
  kind: "none",
  email: null,
  role: "player",
  approvalStatus: "approved",
};

interface PlayerCtx {
  ready: boolean;
  cloud: "syncing" | "online" | "offline";
  profile: PlayerProfile;
  sessions: Session[];
  stats: StatsContext;
  account: AccountInfo;
  userId: string | null;
  addSession: (s: Session) => void;
  updateProfile: (p: Partial<PlayerProfile>) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Token de acceso actual para llamar rutas API autenticadas */
  getAccessToken: () => Promise<string | null>;
}

const Ctx = createContext<PlayerCtx | null>(null);

function loadLocal(): StoreShape {
  if (typeof window === "undefined")
    return { profile: DEFAULT_PROFILE, sessions: [] };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { profile: DEFAULT_PROFILE, sessions: [] };
    return JSON.parse(raw) as StoreShape;
  } catch {
    return { profile: DEFAULT_PROFILE, sessions: [] };
  }
}

function saveLocal(data: StoreShape) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // sin espacio o modo privado: la app sigue en memoria
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cloud, setCloud] = useState<PlayerCtx["cloud"]>("syncing");
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [account, setAccount] = useState<AccountInfo>(DEFAULT_ACCOUNT);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState<string[]>([]);
  const userIdRef = useRef<string | null>(null);
  const sessionsRef = useRef<Session[]>([]);
  const pendingRef = useRef<string[]>([]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);
  useEffect(() => {
    pendingRef.current = pendingSync;
  }, [pendingSync]);

  // Reintenta subir las sesiones que quedaron pendientes (offline / error)
  const flushPending = useCallback(async () => {
    const supabase = getSupabase();
    const uid = userIdRef.current;
    if (!supabase || !uid || pendingRef.current.length === 0) return;
    const toPush = sessionsRef.current.filter((s) =>
      pendingRef.current.includes(s.id),
    );
    const done: string[] = [];
    for (const s of toPush) {
      if (await pushSession(supabase, uid, s)) done.push(s.id);
    }
    if (done.length) {
      setPendingSync((prev) => prev.filter((id) => !done.includes(id)));
    }
  }, []);

  const hydrateFromCloud = useCallback(async (localFallback: StoreShape) => {
    const supabase = getSupabase();
    if (!supabase) {
      setCloud("offline");
      return;
    }
    try {
      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.session) throw error ?? new Error("sin sesión");
        sessionData = { session: data.session };
      }
      const user = sessionData.session!.user;
      const uid = user.id;
      userIdRef.current = uid;
      setUserId(uid);

      // El trigger de la BD crea el perfil; el upsert cubre proyectos sin trigger
      await supabase.from("player_profiles").upsert(
        {
          id: uid,
          full_name: localFallback.profile.fullName,
          division: localFallback.profile.division,
          preferred_foot: localFallback.profile.preferredFoot,
          skill_level: localFallback.profile.skillLevel,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );

      const [{ data: prof }, { data: cloudSessions }] = await Promise.all([
        supabase.from("player_profiles").select("*").eq("id", uid).single(),
        supabase
          .from("training_sessions")
          .select("*, logged_kicks(*)")
          .eq("player_id", uid)
          .order("session_date", { ascending: false }),
      ]);

      if (prof) {
        setProfile((p) => ({
          ...p,
          fullName: prof.full_name,
          division: prof.division,
          preferredFoot: prof.preferred_foot,
          skillLevel: prof.skill_level,
          dni: prof.dni ?? p.dni,
          position: prof.position ?? p.position,
          consentAt: prof.consent_accepted_at ?? p.consentAt,
        }));
        setAccount({
          kind: user.is_anonymous ? "guest" : "google",
          email: prof.email ?? user.email ?? null,
          role:
            prof.role === "admin" || prof.role === "coach"
              ? prof.role
              : "player",
          approvalStatus:
            prof.approval_status === "pending" ||
            prof.approval_status === "rejected"
              ? prof.approval_status
              : "approved",
        });
      } else {
        setAccount({
          kind: user.is_anonymous ? "guest" : "google",
          email: user.email ?? null,
          role: "player",
          approvalStatus: "approved",
        });
      }

      // Fusión sin pérdida: todo lo de la nube + las sesiones locales que
      // todavía no llegaron a la nube (por id). Nunca se descarta lo local.
      const cloudMapped = (
        (cloudSessions as Record<string, unknown>[]) ?? []
      ).map(mapCloudRow);
      const cloudIds = new Set(cloudMapped.map((s) => s.id));
      // Referencia viva (incluye lo agregado mientras la hidratación estaba en vuelo)
      const localNow = sessionsRef.current.length
        ? sessionsRef.current
        : localFallback.sessions;
      const localOnly = localNow.filter((s) => !cloudIds.has(s.id));
      const merged = [...cloudMapped, ...localOnly].sort((a, b) =>
        (b.createdAt || b.date).localeCompare(a.createdAt || a.date),
      );
      setSessions(merged);
      setCloud("online");

      // Reintentar las locales que no están en la nube
      if (localOnly.length) {
        const done: string[] = [];
        for (const s of localOnly) {
          if (await pushSession(supabase, uid, s)) done.push(s.id);
        }
        setPendingSync((prev) => {
          const stillPending = localOnly
            .filter((s) => !done.includes(s.id))
            .map((s) => s.id);
          return Array.from(new Set([...prev.filter((id) => !done.includes(id)), ...stillPending]));
        });
      } else {
        // limpiar pendientes que ya estén confirmados en la nube
        setPendingSync((prev) => prev.filter((id) => !cloudIds.has(id)));
      }
    } catch {
      setCloud("offline");
    }
  }, []);

  // Carga instantánea desde localStorage, luego hidrata desde Supabase.
  // localStorage solo existe en el cliente: hidratar acá evita el mismatch con el SSR.
  useEffect(() => {
    const local = loadLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(local.profile);
    setSessions(local.sessions);
    setPendingSync(local.pendingSync ?? []);
    setReady(true);
    void hydrateFromCloud(local);
  }, [hydrateFromCloud]);

  // Persistencia local ante cada cambio (incluye la cola de pendientes)
  useEffect(() => {
    if (ready) saveLocal({ profile, sessions, pendingSync });
  }, [ready, profile, sessions, pendingSync]);

  // Al recuperar conexión, reintentar lo pendiente
  useEffect(() => {
    const onOnline = () => void flushPending();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushPending]);

  const addSession = useCallback((s: Session) => {
    // Guardado local instantáneo + marca como pendiente hasta confirmar en la nube
    setSessions((prev) => [s, ...prev]);
    setPendingSync((prev) => [...prev, s.id]);

    const supabase = getSupabase();
    const uid = userIdRef.current;
    if (!supabase || !uid) return; // queda pendiente: se reintenta al reconectar/recargar
    pushSession(supabase, uid, s).then((ok) => {
      if (ok) setPendingSync((prev) => prev.filter((id) => id !== s.id));
    });
  }, []);

  const updateProfile = useCallback((patch: Partial<PlayerProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      const supabase = getSupabase();
      const uid = userIdRef.current;
      if (supabase && uid) {
        supabase
          .from("player_profiles")
          .update({
            full_name: next.fullName,
            division: next.division,
            preferred_foot: next.preferredFoot,
            skill_level: next.skillLevel,
            dni: next.dni ?? null,
            position: next.position ?? null,
            consent_accepted_at: next.consentAt ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", uid)
          .then(() => {});
      }
      return next;
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const redirectTo = `${window.location.origin}/login`;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.is_anonymous) {
      // Invitado que vincula su Google: conserva todos sus datos
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo },
      });
      if (!error) return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    // Al recargar, el store abre una sesión de invitado nueva
    window.location.href = "/";
  }, []);

  const getAccessToken = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return null;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const stats: StatsContext = useMemo(() => {
    const allKicks = sessions.flatMap((s) => s.kicks);
    return {
      sessions,
      allKicks,
      profile,
      streakDays: streakDays(sessions),
      xp: totalXp(sessions),
    };
  }, [sessions, profile]);

  // Si hay sesiones pendientes de subir, el indicador muestra "sync"
  const cloudStatus: PlayerCtx["cloud"] =
    cloud === "online" && pendingSync.length > 0 ? "syncing" : cloud;

  const value = useMemo(
    () => ({
      ready,
      cloud: cloudStatus,
      profile,
      sessions,
      stats,
      account,
      userId,
      addSession,
      updateProfile,
      signInWithGoogle,
      signOut,
      getAccessToken,
    }),
    [
      ready,
      cloudStatus,
      profile,
      sessions,
      stats,
      account,
      userId,
      addSession,
      updateProfile,
      signInWithGoogle,
      signOut,
      getAccessToken,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlayer debe usarse dentro de PlayerProvider");
  return ctx;
}

export function useBadges() {
  const { stats } = usePlayer();
  const earned = earnedBadges(stats);
  return { earned, all: BADGES };
}
