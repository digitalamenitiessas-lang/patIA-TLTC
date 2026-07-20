"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { usePlayer } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";

interface Row {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  division: string;
  role: string;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
  dni: string | null;
  position: string | null;
  is_anonymous?: boolean;
}

interface FeedbackRow {
  id: string;
  player_id: string;
  coach_id: string;
  body: string;
  focus_next: string | null;
  rating: number | null;
  created_at: string;
}

interface ClinicStats {
  players: number;
  sessions: number;
  kicks: number;
  active7: number;
}

export default function AdminPage() {
  const { ready, account, userId, getAccessToken } = usePlayer();
  const [rows, setRows] = useState<Row[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [coachMap, setCoachMap] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const weekAgo = new Date(Date.now() - 7 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const [
      { data: profiles },
      { data: coaches },
      { data: fb },
      { count: sessionCount },
      { count: kickCount },
      { data: recent },
    ] = await Promise.all([
      supabase
        .from("player_profiles")
        .select(
          "id, full_name, email, avatar_url, division, role, approval_status, created_at, dni, position",
        )
        .order("created_at", { ascending: false }),
      supabase.from("coaches").select("id, full_name"),
      supabase
        .from("coach_feedback")
        .select("id, player_id, coach_id, body, focus_next, rating, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("training_sessions").select("*", { count: "exact", head: true }),
      supabase.from("logged_kicks").select("*", { count: "exact", head: true }),
      supabase.from("training_sessions").select("player_id").gte("session_date", weekAgo),
    ]);

    const list = (profiles as Row[]) ?? [];
    setRows(list);
    setCoachMap(
      Object.fromEntries(((coaches as { id: string; full_name: string }[]) ?? []).map((c) => [c.id, c.full_name])),
    );
    setFeedback((fb as FeedbackRow[]) ?? []);
    setStats({
      players: list.filter((r) => r.approval_status === "approved").length,
      sessions: sessionCount ?? 0,
      kicks: kickCount ?? 0,
      active7: new Set(((recent as { player_id: string }[]) ?? []).map((r) => r.player_id)).size,
    });
    setLoading(false);
  }, []);

  const deleteFeedback = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase || busy) return;
    if (!confirm("¿Borrar esta devolución? El jugador dejará de verla.")) return;
    setBusy(id);
    try {
      const { error } = await supabase.from("coach_feedback").delete().eq("id", id);
      if (!error) setFeedback((prev) => prev.filter((f) => f.id !== id));
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    // Traer el plantel es sincronizar con un sistema externo (Supabase)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready && account.role === "admin") void load();
  }, [ready, account.role, load]);

  const toggleRole = async (playerId: string, current: string) => {
    const supabase = getSupabase();
    if (!supabase || busy) return;
    const next = current === "coach" ? "player" : "coach";
    setBusy(playerId);
    try {
      const { error } = await supabase
        .from("player_profiles")
        .update({ role: next, updated_at: new Date().toISOString() })
        .eq("id", playerId);
      if (!error) {
        setRows((prev) =>
          prev.map((r) => (r.id === playerId ? { ...r, role: next } : r)),
        );
      }
    } finally {
      setBusy(null);
    }
  };

  const decide = async (playerId: string, decision: "approved" | "rejected") => {
    setBusy(playerId);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/decide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ playerId, decision }),
      });
      if (res.ok) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === playerId ? { ...r, approval_status: decision } : r,
          ),
        );
      }
    } finally {
      setBusy(null);
    }
  };

  if (!ready) return null;

  if (account.role !== "admin") {
    return (
      <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-4xl">🔒</p>
        <p className="text-sm text-chalk-dim">
          Esta sección es solo para el administrador de la clínica.
        </p>
      </main>
    );
  }

  const pending = rows.filter((r) => r.approval_status === "pending");
  const others = rows.filter((r) => r.approval_status !== "pending");
  const nameOf = (id: string) => rows.find((r) => r.id === id)?.full_name ?? "Jugador";

  return (
    <main className="flex flex-col gap-5">
      <header className="rise" style={{ "--rise-delay": "0s" } as React.CSSProperties}>
        <p className="tech-label">Panel del entrenador</p>
        <h1 className="display text-2xl text-chalk">Administración</h1>
      </header>

      {/* Panorama de la clínica */}
      {stats && (
        <section
          className="rise grid grid-cols-2 gap-2 lg:grid-cols-4"
          style={{ "--rise-delay": "0.04s" } as React.CSSProperties}
        >
          <Kpi n={stats.players} label="jugadores" />
          <Kpi n={stats.active7} label="activos · 7 días" gold />
          <Kpi n={stats.sessions} label="sesiones" />
          <Kpi n={stats.kicks} label="patadas" />
        </section>
      )}

      {/* Pendientes */}
      <section className="rise flex flex-col gap-2.5" style={{ "--rise-delay": "0.08s" } as React.CSSProperties}>
        <p className="tech-label px-1">
          Esperando aprobación · {pending.length}
        </p>
        {loading ? (
          <div className="tele-card px-5 py-6 text-center text-sm text-chalk-dim">
            Cargando…
          </div>
        ) : pending.length === 0 ? (
          <div className="tele-card px-5 py-6 text-center text-sm text-chalk-dim">
            Nadie en la puerta del club ahora mismo.
          </div>
        ) : (
          pending.map((r) => (
            <div key={r.id} className="tele-card-gold px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Avatar row={r} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-chalk">
                    {r.full_name}
                  </p>
                  <p className="truncate text-[11px] text-chalk-dim">
                    {r.email ?? "sin mail"} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                    })}
                    {r.dni ? ` · DNI ${r.dni}` : ""}
                    {r.position ? ` · ${r.position}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  disabled={busy === r.id}
                  onClick={() => decide(r.id, "approved")}
                  className="flex-1 rounded-xl bg-try-500 py-2.5 text-xs font-bold text-white uppercase active:scale-95 disabled:opacity-50"
                >
                  Aprobar ✓
                </button>
                <button
                  disabled={busy === r.id}
                  onClick={() => decide(r.id, "rejected")}
                  className="flex-1 rounded-xl border border-miss-500/60 py-2.5 text-xs font-bold text-miss-500 uppercase active:scale-95 disabled:opacity-50"
                >
                  Rechazar ✗
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Plantel */}
      <section className="rise flex flex-col gap-2" style={{ "--rise-delay": "0.16s" } as React.CSSProperties}>
        <p className="tech-label px-1">Plantel · {others.length}</p>
        <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
          {others.map((r) => (
            <div key={r.id} className="tele-card flex items-center gap-3 px-4 py-3">
              <Avatar row={r} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-chalk">
                  {r.full_name}
                  {r.role === "admin" && (
                    <span className="ml-1.5 rounded-full border border-gold-400/40 px-1.5 py-0.5 font-mono text-[9px] text-gold-300 uppercase">
                      admin
                    </span>
                  )}
                  {r.role === "coach" && (
                    <span className="ml-1.5 rounded-full border border-navy-300/40 px-1.5 py-0.5 font-mono text-[9px] text-navy-300 uppercase">
                      coach
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] text-chalk-dim">
                  {r.email ?? "invitado anónimo"} · {r.division}
                  {r.position ? ` · ${r.position}` : ""}
                  {r.dni ? ` · DNI ${r.dni}` : ""}
                </p>
              </div>
              {r.approval_status === "rejected" ? (
                <button
                  disabled={busy === r.id}
                  onClick={() => decide(r.id, "approved")}
                  className="shrink-0 rounded-lg border border-try-500/50 px-2.5 py-1.5 font-mono text-[10px] text-try-400 uppercase"
                >
                  Rehabilitar
                </button>
              ) : (
                r.id !== userId &&
                r.email && (
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      disabled={busy === r.id}
                      onClick={() => toggleRole(r.id, r.role)}
                      title={
                        r.role === "coach"
                          ? "Quitar rol de referente"
                          : "Nombrar referente (puede dejar devoluciones)"
                      }
                      className={`rounded-lg border px-2.5 py-1.5 font-mono text-[10px] uppercase ${
                        r.role === "coach"
                          ? "border-navy-300/50 text-navy-300"
                          : "border-navy-300/25 text-chalk-faint hover:text-navy-300"
                      }`}
                    >
                      {r.role === "coach" ? "Coach ✓" : "Coach"}
                    </button>
                    <button
                      disabled={busy === r.id}
                      onClick={() => decide(r.id, "rejected")}
                      className="rounded-lg border border-navy-300/25 px-2.5 py-1.5 font-mono text-[10px] text-chalk-faint uppercase hover:border-miss-500/50 hover:text-miss-500"
                    >
                      Revocar
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Devoluciones enviadas */}
      <section className="rise flex flex-col gap-2" style={{ "--rise-delay": "0.24s" } as React.CSSProperties}>
        <p className="tech-label px-1">Devoluciones enviadas · {feedback.length}</p>
        {feedback.length === 0 ? (
          <div className="tele-card px-5 py-6 text-center text-sm text-chalk-dim">
            Todavía no se enviaron devoluciones. Cargá una desde Clínica.
          </div>
        ) : (
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
            {feedback.map((f) => (
              <article key={f.id} className="tele-card px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-chalk">
                      {nameOf(f.player_id)}
                    </p>
                    <p className="tech-label">
                      {coachMap[f.coach_id] ?? "Referente"} ·{" "}
                      {new Date(f.created_at).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                      })}
                      {f.rating ? ` · ${"⭐".repeat(f.rating)}` : ""}
                    </p>
                  </div>
                  <button
                    disabled={busy === f.id}
                    onClick={() => deleteFeedback(f.id)}
                    aria-label="Borrar devolución"
                    className="shrink-0 rounded-lg border border-navy-300/25 px-2 py-1 font-mono text-[10px] text-chalk-faint uppercase hover:border-miss-500/50 hover:text-miss-500 disabled:opacity-50"
                  >
                    Borrar
                  </button>
                </div>
                <p className="mt-2 line-clamp-3 border-l-2 border-gold-400/30 pl-3 text-xs leading-relaxed text-chalk-dim">
                  {f.body}
                </p>
                {f.focus_next && (
                  <p className="mt-1.5 text-[11px] text-chalk-faint">
                    🎯 {f.focus_next}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Kpi({ n, label, gold }: { n: number; label: string; gold?: boolean }) {
  return (
    <div className={`${gold ? "tele-card-gold" : "tele-card"} px-4 py-3 text-center`}>
      <p className={`tele-num text-2xl font-bold ${gold ? "text-gold-300" : "text-chalk"}`}>
        {n}
      </p>
      <p className="tech-label mt-0.5">{label}</p>
    </div>
  );
}

function Avatar({ row }: { row: Row }) {
  if (row.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={row.avatar_url}
        alt=""
        referrerPolicy="no-referrer"
        className="h-10 w-10 shrink-0 rounded-full border border-navy-300/25 object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-navy-300/25 bg-pitch-800">
      <Image src="/escudo.webp" alt="" width={22} height={24} className="opacity-60" />
    </div>
  );
}
