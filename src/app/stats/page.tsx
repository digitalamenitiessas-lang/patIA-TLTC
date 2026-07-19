"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { usePlayer } from "@/lib/store";
import {
  zoneOf,
  ZONE_LABELS,
  GOAL_CATEGORIES,
  MODE_OF,
  MODE_SPECS,
  POSTS_X,
  POSTS_GAP,
} from "@/lib/field";
import { EffRing } from "@/components/EffRing";
import { VENUE_NAMES } from "@/lib/geo";
import type { FieldMode, Kick, Session } from "@/lib/types";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function StatsPage() {
  const { sessions, stats } = usePlayer();
  // Ancla temporal estable por montaje: evita recomputar la ventana en cada render
  const [now] = useState(() => Date.now());
  const kicks = stats.allKicks;
  const made = kicks.filter((k) => k.isMade);
  const eff = kicks.length ? (made.length / kicks.length) * 100 : 0;

  // Evolución por día (últimos 14 días)
  const daily = useMemo(() => {
    const map = new Map<string, { attempts: number; made: number }>();
    for (const s of sessions) {
      const cur = map.get(s.date) ?? { attempts: 0, made: 0 };
      cur.attempts += s.kicks.length;
      cur.made += s.kicks.filter((k) => k.isMade).length;
      map.set(s.date, cur);
    }
    const out: { day: string; intentos: number; aciertos: number; efectividad: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      const v = map.get(key);
      out.push({
        day: DAY_LABELS[d.getDay()],
        intentos: v?.attempts ?? 0,
        aciertos: v?.made ?? 0,
        efectividad: v && v.attempts ? Math.round((v.made / v.attempts) * 100) : 0,
      });
    }
    return out;
  }, [sessions, now]);

  // Mapa de honestidad: efectividad por zona distancia × ángulo
  const zones = useMemo(() => {
    const grid: { attempts: number; made: number }[][] = Array.from(
      { length: 3 },
      () => Array.from({ length: 3 }, () => ({ attempts: 0, made: 0 })),
    );
    for (const k of kicks) {
      if (!GOAL_CATEGORIES.includes(k.category)) continue;
      const z = zoneOf(k.distance, k.angle);
      grid[z.d][z.a].attempts++;
      if (k.isMade) grid[z.d][z.a].made++;
    }
    return grid;
  }, [kicks]);

  // Correlación RPE vs efectividad
  const rpeInsight = useMemo(() => {
    const withRpe = sessions.filter((s) => s.rpe !== null && s.kicks.length >= 5);
    if (withRpe.length < 3) return null;
    const fresh = withRpe.filter((s) => (s.rpe ?? 0) <= 5);
    const tired = withRpe.filter((s) => (s.rpe ?? 0) > 5);
    const effOf = (list: typeof withRpe) => {
      const all = list.flatMap((s) => s.kicks);
      return all.length
        ? Math.round((all.filter((k) => k.isMade).length / all.length) * 100)
        : null;
    };
    return { fresh: effOf(fresh), tired: effOf(tired) };
  }, [sessions]);

  const goalMade = made.filter((k) => GOAL_CATEGORIES.includes(k.category));
  const avgDistMade = goalMade.length
    ? Math.round(goalMade.reduce((a, k) => a + k.distance, 0) / goalMade.length)
    : 0;
  const maxDistMade = goalMade.length
    ? Math.max(...goalMade.map((k) => k.distance))
    : 0;

  // Autocompetencia: tu último bloque de sesiones vs el anterior
  const progreso = useMemo(() => {
    if (sessions.length < 4) return null;
    const half = Math.min(5, Math.floor(sessions.length / 2));
    const calc = (list: Session[]) => {
      const ks = list.flatMap((s) => s.kicks);
      const m = ks.filter((k) => k.isMade).length;
      return {
        eff: ks.length ? Math.round((m / ks.length) * 100) : 0,
        vol: list.length ? Math.round(ks.length / list.length) : 0,
        effort: ks.length
          ? Math.round(ks.reduce((a, k) => a + k.effortPct, 0) / ks.length)
          : 0,
      };
    };
    return {
      n: half,
      recent: calc(sessions.slice(0, half)),
      prev: calc(sessions.slice(half, half * 2)),
    };
  }, [sessions]);

  // Juego territorial: salidas, touch y rastrones
  const territorial = useMemo(() => {
    const modes: FieldMode[] = ["salida", "touch", "rastron"];
    return modes
      .map((m) => {
        const ks = kicks.filter((k) => MODE_OF[k.category] === m);
        if (!ks.length) return null;
        const ok = ks.filter((k) => k.isMade).length;
        const meters = ks.filter((k) => k.metersGained !== undefined);
        const avgMeters = meters.length
          ? Math.round(meters.reduce((a, k) => a + (k.metersGained ?? 0), 0) / meters.length)
          : null;
        return {
          mode: m,
          name: MODE_SPECS[m].name,
          count: ks.length,
          pct: Math.round((ok / ks.length) * 100),
          avgMeters,
        };
      })
      .filter(Boolean) as {
      mode: FieldMode;
      name: string;
      count: number;
      pct: number;
      avgMeters: number | null;
    }[];
  }, [kicks]);

  return (
    <main className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <header className="rise lg:col-span-2" style={{ "--rise-delay": "0s" } as React.CSSProperties}>
        <p className="tech-label">Telemetría de carrera</p>
        <h1 className="display text-2xl text-chalk">Tus números</h1>
      </header>

      {kicks.length === 0 ? (
        <div className="tele-card px-5 py-10 text-center lg:col-span-2">
          <p className="text-4xl">📊</p>
          <p className="mt-2 text-sm text-chalk-dim">
            Todavía no hay datos. Cargá tu primera sesión y acá aparece tu telemetría.
          </p>
        </div>
      ) : (
        <>
          {/* Resumen general */}
          <section
            className="tele-card rise flex items-center gap-5 px-5 py-5"
            style={{ "--rise-delay": "0.08s" } as React.CSSProperties}
          >
            <EffRing pct={eff} label="Total" size={110} />
            <div className="grid flex-1 grid-cols-2 gap-3">
              <div>
                <p className="tele-num text-xl font-semibold text-chalk">{kicks.length}</p>
                <p className="tech-label">patadas</p>
              </div>
              <div>
                <p className="tele-num text-xl font-semibold text-chalk">{sessions.length}</p>
                <p className="tech-label">sesiones</p>
              </div>
              <div>
                <p className="tele-num text-xl font-semibold text-chalk">{avgDistMade} m</p>
                <p className="tech-label">prom. acierto</p>
              </div>
              <div>
                <p className="tele-num text-xl font-semibold text-gold-300">{maxDistMade} m</p>
                <p className="tech-label">récord</p>
              </div>
            </div>
          </section>

          {/* Autocompetencia: vos contra vos */}
          {progreso && (
            <section
              className="tele-card-gold rise px-5 py-4 lg:col-span-2"
              style={{ "--rise-delay": "0.12s" } as React.CSSProperties}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="tech-label">Vos contra vos</p>
                <p className="tech-label">
                  últimas {progreso.n} vs {progreso.n} anteriores
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <ProgressStat
                  label="Efectividad"
                  prev={progreso.prev.eff}
                  next={progreso.recent.eff}
                  unit="%"
                  upIsGood
                />
                <ProgressStat
                  label="Patadas / sesión"
                  prev={progreso.prev.vol}
                  next={progreso.recent.vol}
                  upIsGood
                />
                <ProgressStat
                  label="Esfuerzo prom."
                  prev={progreso.prev.effort}
                  next={progreso.recent.effort}
                  unit="%"
                  upIsGood={false}
                />
              </div>
              <p className="mt-3 text-center text-[11px] text-chalk-faint">
                La primera competencia es contra tu propia versión anterior.
              </p>
            </section>
          )}

          {/* Evolución 14 días */}
          <section
            className="tele-card rise px-4 py-4"
            style={{ "--rise-delay": "0.16s" } as React.CSSProperties}
          >
            <p className="tech-label mb-3 px-1">Evolución · 14 días</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={daily} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(79,127,214,0.08)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#4a5468", fontSize: 9, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fill: "#4a5468", fontSize: 9, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0c1424",
                      border: "1px solid rgba(79,127,214,0.25)",
                      borderRadius: 12,
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                    labelStyle={{ color: "#8c96ab" }}
                  />
                  <Bar dataKey="intentos" fill="rgba(79,127,214,0.35)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="aciertos" fill="rgba(16,185,129,0.75)" radius={[3, 3, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="efectividad"
                    stroke="#ffc400"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Mapa de honestidad por zonas */}
          <section
            className="tele-card rise px-5 py-4"
            style={{ "--rise-delay": "0.24s" } as React.CSSProperties}
          >
            <p className="tech-label mb-1">Mapa de honestidad</p>
            <p className="mb-3 text-[11px] text-chalk-faint">
              Efectividad por distancia y ángulo (patadas a los palos)
            </p>
            <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1.5">
              <div />
              {ZONE_LABELS.a.map((a) => (
                <p key={a} className="text-center font-mono text-[8px] leading-tight text-chalk-faint">
                  {a}
                </p>
              ))}
              {zones.map((row, d) => (
                <ContentsRow key={d} label={ZONE_LABELS.d[d]} row={row} />
              ))}
            </div>
          </section>

          {/* Juego territorial */}
          {territorial.length > 0 && (
            <section
              className="tele-card rise px-5 py-4"
              style={{ "--rise-delay": "0.28s" } as React.CSSProperties}
            >
              <p className="tech-label mb-1">Juego territorial</p>
              <p className="mb-3 text-[11px] text-chalk-faint">
                Salidas, touch y rastrones: acá el objetivo no son los palos
              </p>
              <div className="flex flex-col gap-2">
                {territorial.map((t) => (
                  <div key={t.mode} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs text-chalk">{t.name}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-pitch-700">
                      <div
                        className={`h-full rounded-full ${t.pct >= 70 ? "bg-try-500" : t.pct >= 45 ? "bg-gold-400" : "bg-miss-500"}`}
                        style={{ width: `${Math.max(t.pct, 4)}%` }}
                      />
                    </div>
                    <span className="tele-num w-20 shrink-0 text-right text-[11px] text-chalk-dim">
                      {t.pct}%{t.avgMeters !== null ? ` · ${t.avgMeters}m` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Insight RPE */}
          {rpeInsight && rpeInsight.fresh !== null && rpeInsight.tired !== null && (
            <section
              className="tele-card-gold rise px-5 py-4"
              style={{ "--rise-delay": "0.32s" } as React.CSSProperties}
            >
              <p className="tech-label mb-2">Fatiga vs. puntería</p>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <p className="tele-num text-2xl font-semibold text-try-400">
                    {rpeInsight.fresh}%
                  </p>
                  <p className="tech-label">descansado (RPE ≤ 5)</p>
                </div>
                <span className="text-chalk-faint">vs</span>
                <div className="text-center">
                  <p className="tele-num text-2xl font-semibold text-miss-500">
                    {rpeInsight.tired}%
                  </p>
                  <p className="tech-label">cansado (RPE &gt; 5)</p>
                </div>
              </div>
              {rpeInsight.fresh - rpeInsight.tired >= 10 && (
                <p className="mt-3 text-xs leading-relaxed text-chalk-dim">
                  Tu efectividad cae {rpeInsight.fresh - rpeInsight.tired} puntos cuando
                  llegás cansado. PatIA sugiere: bajá el volumen de los días previos al
                  partido y mantené el esfuerzo ≤ 40 %.
                </p>
              )}
            </section>
          )}

          {/* Historial: cada sesión con fecha, mapa y detalle */}
          <section className="rise lg:col-span-2" style={{ "--rise-delay": "0.4s" } as React.CSSProperties}>
            <p className="tech-label mb-2 px-1">
              Historial de sesiones · tocá una para ver el detalle
            </p>
            <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:items-start">
              {sessions.slice(0, 20).map((s, i) => (
                <SessionCard key={s.id} session={s} prev={sessions[i + 1]} />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

/** Métrica de autocompetencia con flecha de tendencia */
function ProgressStat({
  label,
  prev,
  next,
  unit = "",
  upIsGood,
}: {
  label: string;
  prev: number;
  next: number;
  unit?: string;
  upIsGood: boolean;
}) {
  const delta = next - prev;
  const improved = delta === 0 ? null : upIsGood ? delta > 0 : delta < 0;
  const color =
    improved === null
      ? "text-chalk-dim"
      : improved
        ? "text-try-400"
        : "text-miss-500";
  return (
    <div className="rounded-xl bg-pitch-950/40 px-3 py-2.5 text-center">
      <p className="tele-num text-2xl font-semibold text-chalk">
        {next}
        <span className="text-xs text-chalk-dim">{unit}</span>
      </p>
      <p className={`tele-num text-[11px] font-semibold ${color}`}>
        {delta === 0 ? "= igual" : `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)}${unit}`}
        <span className="text-chalk-faint"> · antes {prev}{unit}</span>
      </p>
      <p className="tech-label mt-0.5">{label}</p>
    </div>
  );
}

/** Mini-mapa de la media cancha con los orígenes de las patadas a los palos */
function MiniField({ kicks }: { kicks: Kick[] }) {
  const gx = POSTS_X - POSTS_GAP / 2;
  return (
    <svg
      viewBox="0 0 70 50"
      className="w-full rounded-xl border border-navy-300/15"
      style={{
        background: "linear-gradient(180deg, rgba(6,30,20,0.9), rgba(5,16,12,0.95))",
      }}
    >
      <line x1="0" y1="1.5" x2="70" y2="1.5" stroke="#eef2fa" strokeWidth="0.5" opacity="0.8" />
      <line x1="0" y1="23.5" x2="70" y2="23.5" stroke="#eef2fa" strokeWidth="0.3" opacity="0.45" />
      <text x="1.8" y="22.4" fill="#eef2fa" opacity="0.4" fontSize="2.4" fontFamily="monospace">22</text>
      <line x1="0" y1="49.7" x2="70" y2="49.7" stroke="#eef2fa" strokeWidth="0.5" opacity="0.5" />
      <g>
        <line x1={gx} y1="0" x2={gx} y2="3" stroke="#ffd100" strokeWidth="0.8" strokeLinecap="round" />
        <line x1={gx + POSTS_GAP} y1="0" x2={gx + POSTS_GAP} y2="3" stroke="#ffd100" strokeWidth="0.8" strokeLinecap="round" />
        <line x1={gx} y1="1.5" x2={gx + POSTS_GAP} y2="1.5" stroke="#ffd100" strokeWidth="0.6" />
      </g>
      {kicks.map((k) =>
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
  );
}

const WIND_LABELS: Record<string, string> = {
  calma: "calma",
  a_favor: "a favor",
  en_contra: "en contra",
  cruzado_izq: "cruzado ←",
  cruzado_der: "cruzado →",
};

/** Sesión del historial, expandible con mapa y condiciones */
function SessionCard({ session: s, prev }: { session: Session; prev?: Session }) {
  const [open, setOpen] = useState(false);
  const m = s.kicks.filter((k) => k.isMade).length;
  const e = s.kicks.length ? Math.round((m / s.kicks.length) * 100) : 0;

  const prevMade = prev?.kicks.filter((k) => k.isMade).length ?? 0;
  const prevEff = prev && prev.kicks.length ? Math.round((prevMade / prev.kicks.length) * 100) : null;
  const delta = prevEff !== null ? e - prevEff : null;

  const goalKicks = s.kicks.filter((k) => GOAL_CATEGORIES.includes(k.category));

  const modeChips = (["palos", "salida", "touch", "rastron"] as FieldMode[])
    .map((mode) => {
      const ks = s.kicks.filter((k) => MODE_OF[k.category] === mode);
      if (!ks.length) return null;
      const ok = ks.filter((k) => k.isMade).length;
      const meters = ks.filter((k) => k.metersGained !== undefined);
      const avg = meters.length
        ? Math.round(meters.reduce((a, k) => a + (k.metersGained ?? 0), 0) / meters.length)
        : null;
      return {
        mode,
        text: `${MODE_SPECS[mode].name} ${ok}/${ks.length}${avg !== null ? ` · ${avg}m` : ""}`,
      };
    })
    .filter(Boolean) as { mode: FieldMode; text: string }[];

  return (
    <div className="tele-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex-1">
          <p className="tele-num text-sm text-chalk capitalize">
            {new Date(s.date + "T12:00:00").toLocaleDateString("es-AR", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </p>
          <p className="tech-label">
            {s.kicks.length} patadas
            {s.rpe ? ` · RPE ${s.rpe}` : ""}
            {s.windDirection !== "calma" ? ` · viento ${s.windKmh} km/h` : ""}
          </p>
        </div>
        {delta !== null && delta !== 0 && (
          <span
            className={`tele-num rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              delta > 0
                ? "bg-try-500/15 text-try-400"
                : "bg-miss-500/15 text-miss-500"
            }`}
          >
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} pts
          </span>
        )}
        <p
          className={`tele-num text-lg font-semibold ${e >= 70 ? "text-try-400" : e >= 50 ? "text-gold-400" : "text-miss-500"}`}
        >
          {e}%
        </p>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-chalk-faint transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-navy-300/12 px-4 pt-3 pb-4">
          {goalKicks.length > 0 && (
            <div className="mb-3">
              <p className="tech-label mb-1.5">
                Desde dónde pateaste a los palos · {goalKicks.filter((k) => k.isMade).length}/{goalKicks.length}
              </p>
              <MiniField kicks={goalKicks} />
            </div>
          )}

          {modeChips.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {modeChips.map((c) => (
                <span
                  key={c.mode}
                  className="rounded-full border border-navy-300/20 bg-pitch-950/40 px-2.5 py-1 font-mono text-[10px] text-chalk-dim"
                >
                  {c.text}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {s.rpe !== null && (
              <p className="tech-label">
                cansancio <span className="text-chalk">{s.rpe}/10</span>
              </p>
            )}
            <p className="tech-label">
              viento{" "}
              <span className="text-chalk">
                {WIND_LABELS[s.windDirection] ?? s.windDirection}
                {s.windDirection !== "calma" ? ` ${s.windKmh} km/h` : ""}
              </span>
            </p>
            {s.confidence !== null && (
              <p className="tech-label">
                confianza <span className="text-gold-300">{"⭐".repeat(s.confidence)}</span>
              </p>
            )}
            {s.venueVerified && s.venue && (
              <p className="tech-label">
                📍{" "}
                <span className="text-try-400">
                  {VENUE_NAMES[s.venue] ?? s.venue} ✓
                </span>
              </p>
            )}
          </div>

          {s.mentalNote.trim() && (
            <p className="mt-2.5 border-l-2 border-gold-400/30 pl-3 text-xs leading-relaxed text-chalk-dim italic">
              &ldquo;{s.mentalNote}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ContentsRow({
  label,
  row,
}: {
  label: string;
  row: { attempts: number; made: number }[];
}) {
  return (
    <>
      <p className="flex items-center pr-1 font-mono text-[8px] leading-tight text-chalk-faint">
        {label}
      </p>
      {row.map((cell, i) => {
        const pct = cell.attempts ? Math.round((cell.made / cell.attempts) * 100) : null;
        const bg =
          pct === null
            ? "rgba(74,84,104,0.12)"
            : pct >= 70
              ? "rgba(16,185,129,0.45)"
              : pct >= 40
                ? "rgba(255,196,0,0.4)"
                : "rgba(229,72,77,0.4)";
        return (
          <div
            key={i}
            className="flex h-14 flex-col items-center justify-center rounded-lg"
            style={{ background: bg }}
          >
            {pct === null ? (
              <span className="text-[10px] text-chalk-faint">—</span>
            ) : (
              <>
                <span className="tele-num text-sm font-semibold text-chalk">{pct}%</span>
                <span className="font-mono text-[8px] text-chalk-dim">
                  {cell.made}/{cell.attempts}
                </span>
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
