"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePlayer } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import type { Clinic, Coach, CoachFeedback } from "@/lib/types";

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
          <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className={inputCls}>
            <option value="">Referente que firma…</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Análisis técnico: qué vio el referente en su pateo…"
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
