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
import { zoneOf, ZONE_LABELS } from "@/lib/field";
import { EffRing } from "@/components/EffRing";

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
      if (k.category === "punt" || k.category === "grubber") continue;
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

  const avgDistMade = made.length
    ? Math.round(made.reduce((a, k) => a + k.distance, 0) / made.length)
    : 0;
  const maxDistMade = made.length ? Math.max(...made.map((k) => k.distance)) : 0;

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

          {/* Historial */}
          <section className="rise lg:col-span-2" style={{ "--rise-delay": "0.4s" } as React.CSSProperties}>
            <p className="tech-label mb-2 px-1">Historial de sesiones</p>
            <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
              {sessions.slice(0, 10).map((s) => {
                const m = s.kicks.filter((k) => k.isMade).length;
                const e = s.kicks.length ? Math.round((m / s.kicks.length) * 100) : 0;
                return (
                  <div key={s.id} className="tele-card flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <p className="tele-num text-sm text-chalk">
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
                    <p
                      className={`tele-num text-lg font-semibold ${e >= 70 ? "text-try-400" : e >= 50 ? "text-gold-400" : "text-miss-500"}`}
                    >
                      {e}%
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
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
