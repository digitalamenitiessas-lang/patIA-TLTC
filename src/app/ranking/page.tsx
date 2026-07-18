"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { usePlayer } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import { rankFor } from "@/lib/gamification";
import type { LeaderboardRow } from "@/lib/types";

type Period = "week" | "season";

interface RawRow {
  player_id: string;
  full_name: string;
  division: string;
  avatar_url: string | null;
  xp: number;
  kicks: number;
  made: number;
  sessions: number;
  effectiveness: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];

function mondayOfWeek(): string {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // lunes = 0
  const monday = new Date(now.getTime() - day * 86_400_000);
  return monday.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
}

export default function RankingPage() {
  const { ready, userId } = usePlayer();
  const [period, setPeriod] = useState<Period>("week");
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async (p: Period) => {
    const supabase = getSupabase();
    if (!supabase) {
      setError(true);
      return;
    }
    setRows(null);
    setError(false);
    const { data, error: err } = await supabase.rpc("get_leaderboard", {
      period: p,
    });
    if (err) {
      setError(true);
      return;
    }
    setRows(
      ((data as RawRow[]) ?? []).map((r) => ({
        playerId: r.player_id,
        fullName: r.full_name,
        division: r.division,
        avatarUrl: r.avatar_url,
        xp: r.xp,
        kicks: r.kicks,
        made: r.made,
        sessions: r.sessions,
        effectiveness: r.effectiveness,
      })),
    );
  }, []);

  useEffect(() => {
    // Sincronización con Supabase (sistema externo)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready) void load(period);
  }, [ready, period, load]);

  const podium = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];
  const myIndex = rows?.findIndex((r) => r.playerId === userId) ?? -1;

  return (
    <main className="flex flex-col gap-5">
      <header className="rise" style={{ "--rise-delay": "0s" } as React.CSSProperties}>
        <p className="tech-label">Competencia de la clínica</p>
        <h1 className="display text-2xl text-chalk">
          {period === "week" ? "Torneo semanal" : "Ranking de temporada"}
        </h1>
        <p className="mt-1 text-xs text-chalk-dim">
          {period === "week"
            ? `Semana del ${mondayOfWeek()} — cada patada suma. El lunes arranca de nuevo.`
            : "Todo el año de la clínica: constancia, volumen y puntería."}
        </p>
      </header>

      {/* Selector de período */}
      <div
        className="rise grid grid-cols-2 gap-2"
        style={{ "--rise-delay": "0.08s" } as React.CSSProperties}
      >
        {(
          [
            { value: "week", label: "🏆 Torneo semanal" },
            { value: "season", label: "📜 Temporada" },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            onClick={() => setPeriod(t.value)}
            className={`rounded-2xl border px-3 py-2.5 font-mono text-[11px] tracking-wide uppercase transition-all ${
              period === t.value
                ? "border-gold-400/60 bg-gold-400/10 text-gold-300"
                : "border-navy-300/20 bg-pitch-800/50 text-chalk-dim"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="tele-card px-5 py-8 text-center text-sm text-chalk-dim">
          No pudimos cargar el ranking. Revisá tu conexión e intentá de nuevo.
        </div>
      ) : rows === null ? (
        <div className="tele-card px-5 py-8 text-center text-sm text-chalk-dim">
          Cargando posiciones…
        </div>
      ) : rows.length === 0 ? (
        <div className="tele-card px-5 py-10 text-center">
          <p className="text-4xl">🏉</p>
          <p className="mt-2 text-sm text-chalk-dim">
            {period === "week"
              ? "Nadie pateó esta semana todavía. Salí a la cancha y quedate con la punta."
              : "Todavía no hay sesiones registradas en la clínica."}
          </p>
        </div>
      ) : (
        <>
          {/* Podio */}
          <section
            className="rise grid grid-cols-3 items-end gap-2"
            style={{ "--rise-delay": "0.16s" } as React.CSSProperties}
          >
            {[1, 0, 2].map((pos) => {
              const row = podium[pos];
              if (!row)
                return <div key={pos} className="min-h-4" aria-hidden />;
              const isMe = row.playerId === userId;
              return (
                <div
                  key={row.playerId}
                  className={`${pos === 0 ? "tele-card-gold pb-5" : "tele-card pb-3"} flex flex-col items-center px-2 pt-4 text-center ${
                    isMe ? "ring-1 ring-gold-400/60" : ""
                  }`}
                >
                  <span className={pos === 0 ? "text-3xl" : "text-2xl"}>
                    {MEDALS[pos]}
                  </span>
                  <Avatar url={row.avatarUrl} size={pos === 0 ? 46 : 38} />
                  <p className="mt-1.5 w-full truncate px-1 text-xs font-medium text-chalk">
                    {row.fullName}
                    {isMe && <span className="text-gold-400"> · vos</span>}
                  </p>
                  <p className="tech-label">{row.division}</p>
                  <p className="tele-num mt-1 text-lg font-semibold text-gold-300">
                    {row.xp}
                    <span className="text-[10px] text-chalk-dim"> XP</span>
                  </p>
                  <p className="tech-label">{row.effectiveness}% efect.</p>
                </div>
              );
            })}
          </section>

          {/* Tabla */}
          <section
            className="rise flex flex-col gap-1.5"
            style={{ "--rise-delay": "0.24s" } as React.CSSProperties}
          >
            {rest.map((row, i) => {
              const isMe = row.playerId === userId;
              return (
                <div
                  key={row.playerId}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
                    isMe
                      ? "border-gold-400/50 bg-gold-400/10"
                      : "border-navy-300/10 bg-pitch-800/40"
                  }`}
                >
                  <span className="tele-num w-6 text-center text-sm text-chalk-faint">
                    {i + 4}
                  </span>
                  <Avatar url={row.avatarUrl} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-chalk">
                      {row.fullName}
                      {isMe && <span className="text-gold-400"> · vos</span>}
                    </p>
                    <p className="tech-label">
                      {row.division} · {row.kicks} patadas · {row.effectiveness}%
                    </p>
                  </div>
                  <p className="tele-num text-sm font-semibold text-chalk">
                    {row.xp}
                    <span className="text-[10px] text-chalk-dim"> XP</span>
                  </p>
                </div>
              );
            })}
          </section>

          {/* Tu posición + rango */}
          {myIndex >= 0 && rows[myIndex] && (
            <section
              className="tele-card-gold rise px-5 py-4 text-center"
              style={{ "--rise-delay": "0.3s" } as React.CSSProperties}
            >
              <p className="tech-label">Tu campaña</p>
              <p className="display mt-1 text-lg text-gold-300">
                #{myIndex + 1} · {rankFor(rows[myIndex].xp).current.name}
              </p>
              <p className="mt-1 text-xs text-chalk-dim">
                {rows[myIndex].kicks} patadas · {rows[myIndex].made} objetivos ·{" "}
                {rows[myIndex].sessions}{" "}
                {rows[myIndex].sessions === 1 ? "sesión" : "sesiones"}
              </p>
            </section>
          )}

          <p className="text-center font-mono text-[10px] text-chalk-faint">
            Los invitados aparecen con el nombre de su perfil.
            <br />
            Vinculá tu Google en Perfil para defender tu lugar desde cualquier
            dispositivo.
          </p>
        </>
      )}
    </main>
  );
}

function Avatar({ url, size }: { url: string | null; size: number }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        style={{ width: size, height: size }}
        className="rounded-full border border-navy-300/25 object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full border border-navy-300/25 bg-pitch-800"
    >
      <Image
        src="/escudo.webp"
        alt=""
        width={Math.round(size * 0.55)}
        height={Math.round(size * 0.6)}
        className="opacity-60"
      />
    </div>
  );
}
