"use client";

import Image from "next/image";
import Link from "next/link";
import { usePlayer, useBadges } from "@/lib/store";
import { rankFor } from "@/lib/gamification";
import { LEVELS, DRILLS } from "@/lib/drills";
import { EffRing } from "@/components/EffRing";

function weeklyKicks(sessions: ReturnType<typeof usePlayer>["sessions"]) {
  const weekAgo = Date.now() - 7 * 86_400_000;
  return sessions
    .filter((s) => new Date(s.date + "T12:00:00").getTime() >= weekAgo)
    .flatMap((s) => s.kicks);
}

export default function Dashboard() {
  const { profile, sessions, stats, cloud, ready } = usePlayer();
  const { earned } = useBadges();
  const rank = rankFor(stats.xp);

  const week = weeklyKicks(sessions);
  const made = week.filter((k) => k.isMade).length;
  const eff = week.length ? (made / week.length) * 100 : 0;
  const avgDist = made
    ? Math.round(
        week.filter((k) => k.isMade).reduce((a, k) => a + k.distance, 0) / made,
      )
    : 0;
  const avgEffort = week.length
    ? Math.round(week.reduce((a, k) => a + k.effortPct, 0) / week.length)
    : 0;

  const level = LEVELS[profile.skillLevel - 1];
  const nextDrill = DRILLS.find((d) => d.level === profile.skillLevel);

  if (!ready) return null;

  return (
    <main className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      {/* Cabecera heráldica */}
      <header className="rise flex items-center gap-4 lg:col-span-2" style={{ "--rise-delay": "0s" } as React.CSSProperties}>
        <Image
          src="/escudo.webp"
          alt="Escudo Tucumán Lawn Tennis Club"
          width={52}
          height={56}
          className="drop-shadow-[0_0_18px_rgba(255,196,0,0.25)]"
          priority
        />
        <div className="min-w-0 flex-1">
          <p className="tech-label">Clínica de Pateadores · D. Tejerizo</p>
          <h1 className="display truncate text-2xl font-medium text-chalk">
            {profile.fullName}
          </h1>
        </div>
        <Link
          href="/perfil"
          aria-label="Perfil"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-navy-300/25 bg-pitch-800 text-gold-400"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="8.5" r="3.5" />
            <path d="M4.5 20c1.5-3.4 4.2-5 7.5-5s6 1.6 7.5 5" />
          </svg>
        </Link>
      </header>

      {/* Rango + XP */}
      <section
        className="tele-card-gold rise px-5 py-4"
        style={{ "--rise-delay": "0.08s" } as React.CSSProperties}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="tech-label">Rango de clínica</p>
            <p className="display text-xl text-gold-300">{rank.current.name}</p>
          </div>
          <div className="text-right">
            <p className="tele-num text-lg font-semibold text-chalk">
              {stats.xp} <span className="text-xs text-chalk-dim">XP</span>
            </p>
            {stats.streakDays > 0 && (
              <p className="tele-num text-xs text-gold-400">
                🔥 {stats.streakDays} {stats.streakDays === 1 ? "día" : "días"} de racha
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-pitch-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300 transition-all duration-1000"
            style={{ width: `${Math.max(rank.progress * 100, 4)}%` }}
          />
        </div>
        {rank.next && (
          <p className="tech-label mt-2">
            {rank.next.min - stats.xp} XP para {rank.next.name}
          </p>
        )}
      </section>

      {/* Telemetría semanal */}
      <section
        className="tele-card rise px-5 py-5"
        style={{ "--rise-delay": "0.16s" } as React.CSSProperties}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="tech-label">Telemetría · últimos 7 días</p>
          <span
            className={`tech-label ${cloud === "online" ? "text-try-400" : cloud === "syncing" ? "text-gold-400" : "text-chalk-faint"}`}
          >
            {cloud === "online" ? "● nube" : cloud === "syncing" ? "◌ sync" : "○ local"}
          </span>
        </div>
        <div className="flex items-center gap-5">
          <EffRing pct={eff} label="Efectividad" />
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <p className="tele-num text-xl font-semibold text-chalk">
                {week.length}
                <span className="ml-1 text-xs text-chalk-dim">patadas</span>
              </p>
              <div className="chalk-line mt-1.5" />
            </div>
            <div>
              <p className="tele-num text-xl font-semibold text-chalk">
                {avgDist}
                <span className="ml-1 text-xs text-chalk-dim">m prom. acierto</span>
              </p>
              <div className="chalk-line mt-1.5" />
            </div>
            <div>
              <p
                className={`tele-num text-xl font-semibold ${avgEffort > 60 ? "text-miss-500" : "text-try-400"}`}
              >
                {avgEffort}
                <span className="ml-1 text-xs text-chalk-dim">% esfuerzo</span>
              </p>
              {avgEffort > 60 && (
                <p className="text-[10px] text-miss-500/80">
                  Alred: bajá la potencia, subí la técnica
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Nivel actual + drill sugerido */}
      <section
        className="tele-card rise px-5 py-4"
        style={{ "--rise-delay": "0.24s" } as React.CSSProperties}
      >
        <div className="flex items-center justify-between">
          <p className="tech-label">Tu nivel</p>
          <span
            className="rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-wider"
            style={{ color: level.color, border: `1px solid ${level.color}44` }}
          >
            NIVEL {level.level}
          </span>
        </div>
        <p className="display mt-1 text-lg text-chalk">{level.name}</p>
        {nextDrill && (
          <Link
            href="/academia"
            className="mt-3 flex items-center gap-3 rounded-xl border border-navy-300/15 bg-pitch-800/70 px-4 py-3"
          >
            <span className="text-xl">🎯</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-chalk">
                {nextDrill.title}
              </span>
              <span className="tech-label">
                {nextDrill.focus} · máx {nextDrill.maxEffortPct}% esfuerzo
              </span>
            </span>
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-gold-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </Link>
        )}
      </section>

      {/* Insignias */}
      <section
        className="rise"
        style={{ "--rise-delay": "0.32s" } as React.CSSProperties}
      >
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="tech-label">Insignias · {earned.length}/10</p>
          <Link href="/perfil" className="tech-label text-gold-400">
            ver todas
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {earned.length === 0 ? (
            <div className="tele-card w-full px-4 py-3 text-center text-sm text-chalk-dim">
              Cargá tu primera sesión para ganar tu primera insignia
            </div>
          ) : (
            earned.map((b) => (
              <div
                key={b.id}
                className="tele-card-gold flex min-w-[86px] flex-col items-center px-3 py-3"
                title={b.description}
              >
                <span className="text-2xl">{b.icon}</span>
                <span className="mt-1 text-center font-mono text-[9px] leading-tight tracking-wide text-gold-300">
                  {b.name}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* CTA principal */}
      <Link
        href="/cargar"
        className="btn-gold rise flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold tracking-wide uppercase lg:col-span-2"
        style={{ "--rise-delay": "0.4s" } as React.CSSProperties}
      >
        Iniciar sesión de pateo
      </Link>
    </main>
  );
}
