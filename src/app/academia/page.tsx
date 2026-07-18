"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { usePlayer } from "@/lib/store";
import { LEVELS, DRILLS, VIDEO_SEARCHES } from "@/lib/drills";

export default function AcademiaPage() {
  const { profile, updateProfile } = usePlayer();
  const [selected, setSelected] = useState<1 | 2 | 3>(profile.skillLevel);

  const drills = DRILLS.filter((d) => d.level === selected);
  const videos = VIDEO_SEARCHES.filter((v) => v.level === selected);
  const level = LEVELS[selected - 1];

  return (
    <main className="flex flex-col gap-5">
      <header className="rise" style={{ "--rise-delay": "0s" } as React.CSSProperties}>
        <p className="tech-label">Academia off-field</p>
        <h1 className="display text-2xl text-chalk">Entrenar la cabeza y el botín</h1>
        <p className="mt-1 text-xs text-chalk-dim">
          La técnica se construye en tu casa; la cancha es para validarla.
        </p>
      </header>

      {/* Selector de nivel */}
      <div
        className="rise grid grid-cols-3 gap-2"
        style={{ "--rise-delay": "0.08s" } as React.CSSProperties}
      >
        {LEVELS.map((l) => {
          const active = selected === l.level;
          const unlocked = l.level <= profile.skillLevel;
          return (
            <button
              key={l.level}
              onClick={() => setSelected(l.level)}
              className={`relative rounded-2xl border px-2 py-3 text-center transition-all ${
                active
                  ? "border-gold-400/50 bg-gold-400/10"
                  : "border-navy-300/15 bg-pitch-800/50"
              } ${!unlocked ? "opacity-60" : ""}`}
            >
              <span
                className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-semibold"
                style={{ background: `${l.color}22`, color: l.color, border: `1px solid ${l.color}55` }}
              >
                {unlocked ? l.level : "🔒"}
              </span>
              <span className={`block text-[11px] font-medium ${active ? "text-gold-300" : "text-chalk-dim"}`}>
                {l.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Descripción del nivel */}
      <section
        className="tele-card rise px-5 py-4"
        style={{ "--rise-delay": "0.16s" } as React.CSSProperties}
      >
        <div className="flex items-center justify-between">
          <p className="display text-lg" style={{ color: level.color }}>
            {level.name}
          </p>
          <p className="tech-label">{level.subtitle}</p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-chalk-dim">{level.summary}</p>
        {selected > profile.skillLevel && (
          <p className="mt-2 text-[11px] text-gold-400">
            🔒 Nivel bloqueado — consultá con tu entrenador de la clínica para desbloquearlo,
            o marcalo como tu nivel actual en el perfil.
          </p>
        )}
        {selected < profile.skillLevel && (
          <p className="mt-2 text-[11px] text-try-400">✓ Nivel completado — repasarlo nunca está de más</p>
        )}
        {selected === profile.skillLevel && selected < 3 && (
          <button
            onClick={() => updateProfile({ skillLevel: (selected + 1) as 1 | 2 | 3 })}
            className="mt-3 w-full rounded-xl border border-gold-400/40 bg-gold-400/10 py-2.5 font-mono text-[11px] tracking-wider text-gold-300 uppercase"
          >
            Marcar nivel como completado →
          </button>
        )}
      </section>

      {/* Drills */}
      <section className="rise flex flex-col gap-2.5" style={{ "--rise-delay": "0.24s" } as React.CSSProperties}>
        <p className="tech-label px-1">Ejercicios del nivel</p>
        {drills.map((d) => (
          <details key={d.id} className="tele-card group px-4 py-3.5 open:pb-4">
            <summary className="flex cursor-pointer list-none items-center gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] ${
                  d.offField
                    ? "bg-navy-500/25 text-navy-300"
                    : "bg-try-500/15 text-try-400"
                }`}
              >
                {d.offField ? "CASA" : "CAMPO"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-chalk">{d.title}</span>
                <span className="tech-label">{d.focus}</span>
              </span>
              <span className="tele-num shrink-0 rounded-full border border-navy-300/20 px-2 py-0.5 text-[10px] text-chalk-dim">
                ≤{d.maxEffortPct}%
              </span>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-chalk-faint transition-transform group-open:rotate-90"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </summary>
            <p className="mt-3 border-l-2 border-gold-400/30 pl-3 text-xs leading-relaxed text-chalk-dim">
              {d.description}
            </p>
          </details>
        ))}
      </section>

      {/* Banco de video */}
      {videos.length > 0 && (
        <section className="rise flex flex-col gap-2.5" style={{ "--rise-delay": "0.32s" } as React.CSSProperties}>
          <p className="tech-label px-1">Banco de video</p>
          {videos.map((v) => (
            <a
              key={v.id}
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.query)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tele-card flex items-center gap-3 px-4 py-3.5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-miss-500/15">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 text-miss-500" fill="currentColor">
                  <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-chalk">{v.title}</span>
                <span className="mt-0.5 block text-[11px] text-chalk-dim">{v.note}</span>
              </span>
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-chalk-faint" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </a>
          ))}
          <p className="px-1 text-[10px] text-chalk-faint">
            Cuando la clínica suba sus videos al canal de YouTube del club, se embeben acá
            automáticamente según tu nivel.
          </p>
        </section>
      )}

      {/* Simulador táctico (nivel 3) */}
      {selected === 3 && <TacticalSim />}
    </main>
  );
}

/** Mini-juego: decisión táctica en 3 segundos (Nivel 3) */
const SCENARIOS = [
  {
    text: "Defensa sube en línea rápida, hay espacio profundo detrás del fullback.",
    correct: "punt",
    options: ["grubber", "punt", "chip"],
    why: "Con espacio profundo, el punt largo territorial castiga a la defensa adelantada.",
  },
  {
    text: "La defensa está plana a 5 m, el wing dejó un canal corto a tu espalda derecha.",
    correct: "chip",
    options: ["chip", "punt", "grubber"],
    why: "El chip por encima de una línea plana y corta recupera la pelota en el canal libre.",
  },
  {
    text: "Ruck a 15 m del ingoal rival, defensa cerrada, el pasto está rápido.",
    correct: "grubber",
    options: ["punt", "grubber", "chip"],
    why: "Cerca del ingoal y con pasto rápido, el grubber rasante fuerza el error o el try.",
  },
];

function TacticalSim() {
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const s = SCENARIOS[idx % SCENARIOS.length];

  return (
    <section className="tele-card-gold rise px-5 py-4" style={{ "--rise-delay": "0.4s" } as React.CSSProperties}>
      <p className="tech-label mb-2">Simulador táctico · decidí en 3 segundos</p>
      <p className="text-sm leading-relaxed text-chalk">{s.text}</p>
      <div className="mt-3 flex gap-2">
        {s.options.map((o) => (
          <button
            key={o}
            onClick={() => setAnswer(o)}
            disabled={answer !== null}
            className={`flex-1 rounded-xl border py-2.5 font-mono text-[11px] tracking-wider uppercase transition-colors ${
              answer === null
                ? "border-navy-300/25 text-chalk-dim active:bg-pitch-700"
                : o === s.correct
                  ? "border-try-500 bg-try-500/20 text-try-400"
                  : o === answer
                    ? "border-miss-500 bg-miss-500/15 text-miss-500"
                    : "border-navy-300/15 text-chalk-faint"
            }`}
          >
            {o.replace("_", " ")}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {answer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden"
          >
            <p className="mt-3 text-xs leading-relaxed text-chalk-dim">
              {answer === s.correct ? "✓ ¡Bien leído! " : "✗ Esta vez no. "}
              {s.why}
            </p>
            <button
              onClick={() => {
                setAnswer(null);
                setIdx((i) => i + 1);
              }}
              className="mt-2 font-mono text-[11px] tracking-wider text-gold-400 uppercase"
            >
              Siguiente escenario →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
