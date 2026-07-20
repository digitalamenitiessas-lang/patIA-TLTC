"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePlayer } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import { buildSummary, type StatsSummary } from "@/lib/coach";
import { totalXp, streakDays } from "@/lib/gamification";
import {
  GOAL_CATEGORIES,
  zoneOf,
  ZONE_LABELS,
  POSTS_X,
  POSTS_GAP,
} from "@/lib/field";
import type { Clinic, Coach, CoachFeedback, Kick, Session } from "@/lib/types";

interface PlayerOption {
  id: string;
  full_name: string;
  email: string | null;
  division: string;
}

function daysUntil(dateIso: string): number {
  const target = new Date(dateIso + "T00:00:00").getTime();
  const today = new Date(new Date().toDateString()).getTime();
  return Math.round((target - today) / 86_400_000);
}

function formatDate(dateIso: string): string {
  return new Date(dateIso + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function ClinicaPage() {
  const { ready, account, getAccessToken } = usePlayer();
  const isStaff = account.role === "admin" || account.role === "coach";

  const [nextClinic, setNextClinic] = useState<Clinic | null | "loading">("loading");
  const [pastClinics, setPastClinics] = useState<Clinic[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [feedback, setFeedback] = useState<CoachFeedback[]>([]);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setNextClinic(null);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: upcoming }, { data: past }, { data: coachRows }, { data: fb }] =
      await Promise.all([
        supabase
          .from("clinics")
          .select("*")
          .gte("clinic_date", today)
          .order("clinic_date", { ascending: true })
          .limit(1),
        supabase
          .from("clinics")
          .select("*")
          .lt("clinic_date", today)
          .order("clinic_date", { ascending: false })
          .limit(3),
        supabase
          .from("coaches")
          .select("*")
          .eq("active", true)
          .order("sort_order"),
        supabase
          .from("coach_feedback")
          .select("*, coaches(full_name, title)")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

    const mapClinic = (c: Record<string, unknown>): Clinic => ({
      id: c.id as string,
      title: c.title as string,
      clinicDate: c.clinic_date as string,
      startTime: (c.start_time as string) ?? null,
      location: c.location as string,
      focus: (c.focus as string) ?? null,
      level: (c.level as 1 | 2 | 3) ?? null,
      prep: Array.isArray(c.prep) ? (c.prep as string[]) : [],
      notes: (c.notes as string) ?? null,
    });

    setNextClinic(upcoming?.[0] ? mapClinic(upcoming[0]) : null);
    setPastClinics((past ?? []).map(mapClinic));
    setCoaches(
      (coachRows ?? []).map((c) => ({
        id: c.id,
        fullName: c.full_name,
        title: c.title,
        active: c.active,
      })),
    );
    setFeedback(
      (fb ?? []).map((f) => ({
        id: f.id,
        playerId: f.player_id,
        coachName:
          (f.coaches as { full_name?: string })?.full_name ?? "Referente",
        coachTitle: (f.coaches as { title?: string })?.title ?? null,
        body: f.body,
        focusNext: f.focus_next,
        rating: f.rating,
        createdAt: f.created_at,
      })),
    );
  }, []);

  useEffect(() => {
    // Sincronización con Supabase (sistema externo)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready) void load();
  }, [ready, load]);

  return (
    <main className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <header className="rise lg:col-span-2" style={{ "--rise-delay": "0s" } as React.CSSProperties}>
        <p className="tech-label">Clínica de Pateadores · Daniel Tejerizo</p>
        <h1 className="display text-2xl text-chalk">La Clínica</h1>
        <p className="mt-1 text-xs text-chalk-dim">
          La app te acompaña todo el año; las clínicas son los hitos donde el
          trabajo se valida con los referentes del club.
        </p>
      </header>

      <div className="flex flex-col gap-5">
        {/* Próxima clínica */}
        <section className="rise" style={{ "--rise-delay": "0.08s" } as React.CSSProperties}>
          {nextClinic === "loading" ? (
            <div className="tele-card px-5 py-8 text-center text-sm text-chalk-dim">
              Cargando calendario…
            </div>
          ) : nextClinic === null ? (
            <div className="tele-card px-5 py-6">
              <p className="tech-label">Próxima clínica</p>
              <p className="mt-2 text-sm text-chalk-dim">
                Fecha a confirmar. Mientras tanto, el plan es simple: sesiones
                cortas, esfuerzo ≤ 40 % y constancia — el{" "}
                <Link href="/ranking" className="text-gold-400">
                  torneo semanal
                </Link>{" "}
                no descansa.
              </p>
            </div>
          ) : (
            <div className="tele-card-gold px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="tech-label">Próxima clínica</p>
                  <p className="display mt-0.5 text-xl text-gold-300">
                    {nextClinic.title}
                  </p>
                  <p className="mt-1 text-sm text-chalk capitalize">
                    {formatDate(nextClinic.clinicDate)}
                    {nextClinic.startTime ? ` · ${nextClinic.startTime} h` : ""}
                  </p>
                  <p className="text-xs text-chalk-dim">{nextClinic.location}</p>
                </div>
                <div className="shrink-0 rounded-2xl border border-gold-400/40 bg-pitch-950/60 px-3 py-2 text-center">
                  <p className="tele-num text-2xl font-semibold text-gold-300">
                    {daysUntil(nextClinic.clinicDate)}
                  </p>
                  <p className="tech-label">días</p>
                </div>
              </div>

              {nextClinic.focus && (
                <p className="mt-3 rounded-xl border border-navy-300/15 bg-pitch-950/50 px-3.5 py-2.5 text-xs text-chalk-dim">
                  🎯 <span className="text-chalk">Foco:</span> {nextClinic.focus}
                </p>
              )}

              {nextClinic.prep.length > 0 && (
                <div className="mt-3">
                  <p className="tech-label mb-1.5">Ir practicando hasta esa fecha</p>
                  <ul className="flex flex-col gap-1.5">
                    {nextClinic.prep.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-chalk-dim">
                        <span className="mt-0.5 text-gold-400">▸</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Link
                href="/academia"
                className="mt-4 block rounded-xl border border-gold-400/40 bg-gold-400/10 py-2.5 text-center font-mono text-[11px] tracking-wider text-gold-300 uppercase"
              >
                Preparate en la Academia →
              </Link>
            </div>
          )}
        </section>

        {/* Referentes */}
        <section className="rise" style={{ "--rise-delay": "0.16s" } as React.CSSProperties}>
          <p className="tech-label mb-2 px-1">Referentes pateadores del club</p>
          <div className="flex flex-col gap-2">
            {coaches.map((c) => (
              <div key={c.id} className="tele-card flex items-center gap-3 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-400/30 bg-pitch-800 font-mono text-xs text-gold-300">
                  {c.fullName
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-chalk">{c.fullName}</p>
                  {c.title && <p className="truncate text-[11px] text-chalk-dim">{c.title}</p>}
                </div>
                <span className="text-lg">🏉</span>
              </div>
            ))}
            {coaches.length === 0 && nextClinic !== "loading" && (
              <div className="tele-card px-4 py-4 text-center text-xs text-chalk-dim">
                Sin conexión con la nube del club.
              </div>
            )}
          </div>
        </section>

        {/* Clínicas pasadas */}
        {pastClinics.length > 0 && (
          <section className="rise" style={{ "--rise-delay": "0.2s" } as React.CSSProperties}>
            <p className="tech-label mb-2 px-1">Clínicas anteriores</p>
            <div className="flex flex-col gap-1.5">
              {pastClinics.map((c) => (
                <div key={c.id} className="tele-card flex items-center gap-3 px-4 py-2.5">
                  <p className="min-w-0 flex-1 truncate text-sm text-chalk">{c.title}</p>
                  <p className="tech-label shrink-0 capitalize">
                    {new Date(c.clinicDate + "T12:00:00").toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {/* Devoluciones */}
        <section className="rise" style={{ "--rise-delay": "0.24s" } as React.CSSProperties}>
          <p className="tech-label mb-2 px-1">
            {isStaff ? "Devoluciones recientes de la clínica" : "Tus devoluciones"}
          </p>
          {feedback.length === 0 ? (
            <div className="tele-card px-5 py-6 text-center">
              <p className="text-3xl">📝</p>
              <p className="mt-2 text-xs leading-relaxed text-chalk-dim">
                Todavía no tenés devoluciones. En cada clínica, los referentes
                analizan tu técnica y te dejan acá su análisis personal.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {feedback.map((f) => (
                <article key={f.id} className="tele-card px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold-400/30 bg-pitch-800 font-mono text-[10px] text-gold-300">
                      {f.coachName
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gold-300">
                        {f.coachName}
                      </p>
                      <p className="tech-label">
                        {new Date(f.createdAt).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "long",
                        })}
                        {f.rating ? ` · ${"⭐".repeat(f.rating)}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2.5 border-l-2 border-gold-400/30 pl-3 text-xs leading-relaxed text-chalk-dim">
                    {f.body}
                  </p>
                  {f.focusNext && (
                    <p className="mt-2 rounded-lg bg-pitch-950/50 px-3 py-2 text-[11px] text-chalk-dim">
                      🎯 <span className="text-chalk">Para la próxima:</span>{" "}
                      {f.focusNext}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Panel del staff */}
        {isStaff && (
          <StaffPanel
            coaches={coaches}
            onDone={load}
            getAccessToken={getAccessToken}
          />
        )}
      </div>
    </main>
  );
}

/* ── Herramientas del staff (admin y coaches) ─────────────── */

/** Convierte una fila de training_sessions (con logged_kicks) al shape de la app */
function mapSessionRow(s: Record<string, unknown>): Session {
  return {
    id: s.id as string,
    date: s.session_date as string,
    rpe: (s.rpe_fatigue_index as number) ?? null,
    windKmh: (s.wind_velocity_kmh as number) ?? 0,
    windDirection: (s.wind_direction as Session["windDirection"]) ?? "calma",
    mentalNote: (s.psychological_note as string) ?? "",
    confidence: (s.confidence as number) ?? null,
    createdAt: (s.created_at as string) ?? "",
    kicks: ((s.logged_kicks as Record<string, unknown>[]) ?? []).map((k) => ({
      id: k.id as string,
      x: Number(k.x_coord),
      y: Number(k.y_coord),
      distance: k.calculated_distance_m as number,
      angle: k.calculated_angle_deg as number,
      isMade: k.is_made as boolean,
      category: k.kick_category as Kick["category"],
      effortPct: (k.effort_pct as number) ?? 40,
    })),
  };
}

/**
 * Telemetría del jugador para el referente: al elegir un jugador en el
 * formulario de devolución, el staff ve sus números y su mapa de patadas
 * para que el análisis esté fundado en datos reales.
 */
function PlayerTelemetry({
  playerId,
  onSummary,
}: {
  playerId: string;
  onSummary: (s: StatsSummary | null) => void;
}) {
  const [sessions, setSessions] = useState<Session[] | null>(null);

  useEffect(() => {
    if (!playerId) {
      setSessions(null);
      onSummary(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      setSessions(null);
      const [{ data: prof }, { data: rows }] = await Promise.all([
        supabase
          .from("player_profiles")
          .select("full_name, division, preferred_foot, skill_level")
          .eq("id", playerId)
          .single(),
        supabase
          .from("training_sessions")
          .select("*, logged_kicks(*)")
          .eq("player_id", playerId)
          .order("session_date", { ascending: false }),
      ]);
      if (cancelled) return;
      const mapped = (rows ?? []).map(mapSessionRow);
      setSessions(mapped);
      const profile = {
        fullName: prof?.full_name ?? "Jugador",
        division: prof?.division ?? "M15",
        preferredFoot: (prof?.preferred_foot ?? "derecho") as "derecho" | "izquierdo",
        skillLevel: (prof?.skill_level ?? 1) as 1 | 2 | 3,
        createdAt: "",
      };
      onSummary(
        buildSummary({
          sessions: mapped,
          allKicks: mapped.flatMap((s) => s.kicks),
          profile,
          streakDays: streakDays(mapped),
          xp: totalXp(mapped),
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const stats = useMemo(() => {
    if (!sessions) return null;
    const kicks = sessions.flatMap((s) => s.kicks);
    const made = kicks.filter((k) => k.isMade);
    const goal = kicks.filter((k) => GOAL_CATEGORIES.includes(k.category));
    const goalMade = goal.filter((k) => k.isMade);
    const eff = kicks.length ? Math.round((made.length / kicks.length) * 100) : 0;
    const record = goalMade.length ? Math.max(...goalMade.map((k) => k.distance)) : 0;

    // Grid de honestidad 3×3 (solo a los palos)
    const grid: { a: number; m: number }[][] = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => ({ a: 0, m: 0 })),
    );
    for (const k of goal) {
      const z = zoneOf(k.distance, k.angle);
      grid[z.d][z.a].a++;
      if (k.isMade) grid[z.d][z.a].m++;
    }

    // Fatiga
    const withRpe = sessions.filter((s) => s.rpe !== null && s.kicks.length >= 5);
    const effOf = (list: Session[]) => {
      const all = list.flatMap((s) => s.kicks);
      return all.length ? Math.round((all.filter((k) => k.isMade).length / all.length) * 100) : null;
    };
    const fatigue =
      withRpe.length >= 3
        ? { fresh: effOf(withRpe.filter((s) => (s.rpe ?? 0) <= 5)), tired: effOf(withRpe.filter((s) => (s.rpe ?? 0) > 5)) }
        : null;

    return {
      total: kicks.length,
      sessions: sessions.length,
      eff,
      record,
      avg: goalMade.length ? Math.round(goalMade.reduce((a, k) => a + k.distance, 0) / goalMade.length) : 0,
      grid,
      goalKicks: goal.slice(-30),
      fatigue,
    };
  }, [sessions]);

  if (!playerId) return null;
  if (!stats) {
    return (
      <div className="rounded-xl border border-navy-300/15 bg-pitch-950/40 px-3.5 py-3 text-center text-[11px] text-chalk-dim">
        Cargando telemetría…
      </div>
    );
  }
  if (stats.total === 0) {
    return (
      <div className="rounded-xl border border-navy-300/15 bg-pitch-950/40 px-3.5 py-3 text-center text-[11px] text-chalk-dim">
        Este jugador todavía no cargó patadas.
      </div>
    );
  }

  const gx = POSTS_X - POSTS_GAP / 2;

  return (
    <div className="rounded-xl border border-navy-300/20 bg-pitch-950/50 p-3.5">
      <p className="tech-label mb-2">📊 Telemetría del jugador</p>
      <div className="mb-3 grid grid-cols-4 gap-2 text-center">
        <Stat n={`${stats.eff}%`} l="efect." />
        <Stat n={String(stats.total)} l="patadas" />
        <Stat n={`${stats.avg}m`} l="prom." />
        <Stat n={`${stats.record}m`} l="récord" gold />
      </div>

      <div className="flex gap-3">
        {/* Mini mapa de patadas a los palos */}
        <div className="w-[46%] shrink-0">
          <svg
            viewBox="0 0 70 50"
            className="w-full rounded-lg border border-navy-300/15"
            style={{ background: "linear-gradient(180deg, rgba(6,30,20,0.9), rgba(5,16,12,0.95))" }}
          >
            <line x1="0" y1="1.5" x2="70" y2="1.5" stroke="#eef2fa" strokeWidth="0.5" opacity="0.8" />
            <line x1="0" y1="23.5" x2="70" y2="23.5" stroke="#eef2fa" strokeWidth="0.3" opacity="0.4" />
            <g>
              <line x1={gx} y1="0" x2={gx} y2="3" stroke="#ffd100" strokeWidth="0.8" strokeLinecap="round" />
              <line x1={gx + POSTS_GAP} y1="0" x2={gx + POSTS_GAP} y2="3" stroke="#ffd100" strokeWidth="0.8" strokeLinecap="round" />
              <line x1={gx} y1="1.5" x2={gx + POSTS_GAP} y2="1.5" stroke="#ffd100" strokeWidth="0.6" />
            </g>
            {stats.goalKicks.map((k) =>
              k.isMade ? (
                <circle key={k.id} cx={k.x} cy={k.y} r="1.2" fill="#10b981" opacity="0.9" stroke="#03060e" strokeWidth="0.2" />
              ) : (
                <g key={k.id} stroke="#f0464b" strokeWidth="0.45" opacity="0.9" strokeLinecap="round">
                  <line x1={k.x - 0.9} y1={k.y - 0.9} x2={k.x + 0.9} y2={k.y + 0.9} />
                  <line x1={k.x - 0.9} y1={k.y + 0.9} x2={k.x + 0.9} y2={k.y - 0.9} />
                </g>
              ),
            )}
          </svg>
          <p className="mt-1 text-center text-[9px] text-chalk-faint">Dónde patea a los palos</p>
        </div>

        {/* Grid de honestidad por zona */}
        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-3 gap-1">
            {stats.grid.flatMap((row, d) =>
              row.map((cell, a) => {
                const pct = cell.a ? Math.round((cell.m / cell.a) * 100) : null;
                const bg =
                  pct === null
                    ? "rgba(74,84,104,0.12)"
                    : pct >= 70
                      ? "rgba(16,185,129,0.4)"
                      : pct >= 40
                        ? "rgba(255,209,0,0.35)"
                        : "rgba(240,70,75,0.35)";
                return (
                  <div
                    key={`${d}-${a}`}
                    className="flex h-8 items-center justify-center rounded"
                    style={{ background: bg }}
                    title={`${ZONE_LABELS.d[d]} · ${ZONE_LABELS.a[a]}`}
                  >
                    <span className="tele-num text-[10px] font-semibold text-chalk">
                      {pct === null ? "—" : `${pct}%`}
                    </span>
                  </div>
                );
              }),
            )}
          </div>
          <p className="mt-1 text-center text-[9px] text-chalk-faint">
            Zonas: distancia ↓ · ángulo →
          </p>
        </div>
      </div>

      {stats.fatigue && stats.fatigue.fresh !== null && stats.fatigue.tired !== null && (
        <p className="mt-2.5 rounded-lg bg-pitch-900/60 px-3 py-2 text-[11px] text-chalk-dim">
          🫁 Fatiga: <span className="text-try-400">{stats.fatigue.fresh}%</span> descansado vs{" "}
          <span className="text-miss-500">{stats.fatigue.tired}%</span> cansado
        </p>
      )}
    </div>
  );
}

function Stat({ n, l, gold }: { n: string; l: string; gold?: boolean }) {
  return (
    <div>
      <p className={`tele-num text-base font-semibold ${gold ? "text-gold-300" : "text-chalk"}`}>{n}</p>
      <p className="tech-label">{l}</p>
    </div>
  );
}

function StaffPanel({
  coaches,
  onDone,
  getAccessToken,
}: {
  coaches: Coach[];
  onDone: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}) {
  const [tab, setTab] = useState<"feedback" | "clinic" | null>(null);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Devolución
  const [playerId, setPlayerId] = useState("");
  const [coachId, setCoachId] = useState("");
  const [body, setBody] = useState("");
  const [focusNext, setFocusNext] = useState("");
  const [playerSummary, setPlayerSummary] = useState<StatsSummary | null>(null);
  const [drafting, setDrafting] = useState(false);

  const suggestDraft = async () => {
    if (!playerSummary || drafting) return;
    const coachName = coaches.find((c) => c.id === coachId)?.fullName ?? "el referente";
    setDrafting(true);
    try {
      const res = await fetch("/api/patia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Sos ${coachName}, referente pateador de la clínica. Redactá una devolución breve (3-4 oraciones) para este jugador basada en su telemetría real, hablándole de vos a él: un punto técnico concreto a mejorar (según sus zonas flojas y su fatiga) y un refuerzo positivo. Sin saludos largos ni firma; es un borrador para revisar.`,
          summary: playerSummary,
          history: [],
        }),
      });
      const d = await res.json();
      if (d.text) setBody(d.text);
    } finally {
      setDrafting(false);
    }
  };

  // Clínica
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [focus, setFocus] = useState("");
  const [prep, setPrep] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from("player_profiles")
        .select("id, full_name, email, division")
        .eq("approval_status", "approved")
        .order("full_name");
      setPlayers((data as PlayerOption[]) ?? []);
    })();
  }, []);

  const submitFeedback = async () => {
    if (!playerId || !coachId || !body.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/clinica/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ playerId, coachId, body, focusNext }),
      });
      if (res.ok) {
        setBody("");
        setFocusNext("");
        setMsg("Devolución enviada: el jugador recibió el aviso ✓");
        await onDone();
      } else {
        setMsg("No se pudo enviar. Probá de nuevo.");
      }
    } finally {
      setBusy(false);
    }
  };

  const submitClinic = async () => {
    if (!title.trim() || !date || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const prepItems = prep
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const { data, error } = await supabase
        .from("clinics")
        .insert({
          title: title.trim(),
          clinic_date: date,
          start_time: time || null,
          focus: focus.trim() || null,
          prep: prepItems,
        })
        .select("id")
        .single();
      if (error || !data) {
        setMsg("No se pudo crear la clínica.");
        return;
      }
      // Anunciar por push a todos
      const token = await getAccessToken();
      await fetch("/api/clinica/announce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clinicId: data.id }),
      }).catch(() => {});
      setTitle("");
      setDate("");
      setTime("");
      setFocus("");
      setPrep("");
      setMsg("Clínica publicada y anunciada ✓");
      await onDone();
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-navy-300/20 bg-pitch-800 px-3.5 py-2.5 text-sm text-chalk placeholder:text-chalk-faint focus:border-gold-400/50 focus:outline-none";

  return (
    <section className="tele-card rise px-5 py-4" style={{ "--rise-delay": "0.3s" } as React.CSSProperties}>
      <p className="tech-label mb-3">Panel del staff</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTab(tab === "feedback" ? null : "feedback")}
          className={`rounded-xl border py-2.5 font-mono text-[11px] tracking-wider uppercase ${
            tab === "feedback"
              ? "border-gold-400/60 bg-gold-400/10 text-gold-300"
              : "border-navy-300/20 text-chalk-dim"
          }`}
        >
          ✍️ Devolución
        </button>
        <button
          onClick={() => setTab(tab === "clinic" ? null : "clinic")}
          className={`rounded-xl border py-2.5 font-mono text-[11px] tracking-wider uppercase ${
            tab === "clinic"
              ? "border-gold-400/60 bg-gold-400/10 text-gold-300"
              : "border-navy-300/20 text-chalk-dim"
          }`}
        >
          📅 Nueva clínica
        </button>
      </div>

      {tab === "feedback" && (
        <div className="mt-4 flex flex-col gap-2.5">
          <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} className={inputCls}>
            <option value="">Jugador…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} · {p.division}
                {p.email ? "" : " (invitado)"}
              </option>
            ))}
          </select>
          {/* Telemetría del jugador seleccionado */}
          <PlayerTelemetry playerId={playerId} onSummary={setPlayerSummary} />

          <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className={inputCls}>
            <option value="">Referente que firma…</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-between">
            <label className="tech-label">Devolución</label>
            {playerSummary && playerSummary.totalKicks > 0 && (
              <button
                type="button"
                onClick={() => void suggestDraft()}
                disabled={drafting}
                className="rounded-lg border border-gold-400/40 bg-gold-400/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-gold-300 uppercase disabled:opacity-50"
              >
                {drafting ? "◌ redactando…" : "🤖 sugerir con PatIA"}
              </button>
            )}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Análisis técnico: qué vio el referente en su pateo… (o generá un borrador con PatIA y editalo)"
            className={inputCls}
          />
          <input
            value={focusNext}
            onChange={(e) => setFocusNext(e.target.value)}
            placeholder="Qué trabajar hasta la próxima (opcional)"
            className={inputCls}
          />
          <button
            onClick={() => void submitFeedback()}
            disabled={busy || !playerId || !coachId || !body.trim()}
            className="btn-gold rounded-xl py-3 text-xs font-bold tracking-wide uppercase disabled:opacity-40"
          >
            Enviar devolución
          </button>
        </div>
      )}

      {tab === "clinic" && (
        <div className="mt-4 flex flex-col gap-2.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (p. ej. Clínica de invierno · Nivel 2)"
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-2.5">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
          </div>
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Foco técnico (p. ej. salidas de 22 con viento)"
            className={inputCls}
          />
          <textarea
            value={prep}
            onChange={(e) => setPrep(e.target.value)}
            rows={3}
            placeholder={"Qué practicar hasta esa fecha (un ítem por línea)\nRutina de 3 pasos frente al espejo\n20 salidas de 22 por semana"}
            className={inputCls}
          />
          <button
            onClick={() => void submitClinic()}
            disabled={busy || !title.trim() || !date}
            className="btn-gold rounded-xl py-3 text-xs font-bold tracking-wide uppercase disabled:opacity-40"
          >
            Publicar y anunciar
          </button>
        </div>
      )}

      {msg && <p className="mt-3 text-center text-xs text-try-400">{msg}</p>}
    </section>
  );
}
