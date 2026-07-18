"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { InteractiveField } from "@/components/InteractiveField";
import { kickMetrics } from "@/lib/field";
import { usePlayer } from "@/lib/store";
import { sessionXp } from "@/lib/gamification";
import type { Kick, KickCategory, Session, WindDirection } from "@/lib/types";

const KICK_TYPES: { value: KickCategory; label: string }[] = [
  { value: "conversion", label: "Conversión" },
  { value: "penalty", label: "Penal" },
  { value: "drop_kick", label: "Drop" },
  { value: "salida_22", label: "Salida 22" },
  { value: "punt", label: "Punt" },
  { value: "grubber", label: "Grubber" },
];

const WINDS: { value: WindDirection; label: string }[] = [
  { value: "calma", label: "Calma" },
  { value: "a_favor", label: "A favor" },
  { value: "en_contra", label: "En contra" },
  { value: "cruzado_izq", label: "Cruzado ←" },
  { value: "cruzado_der", label: "Cruzado →" },
];

export default function CargarPage() {
  const router = useRouter();
  const { addSession, profile } = usePlayer();

  const [kicks, setKicks] = useState<Kick[]>([]);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [category, setCategory] = useState<KickCategory>("conversion");
  const [effort, setEffort] = useState(40);
  const [closing, setClosing] = useState(false);
  const [saved, setSaved] = useState<Session | null>(null);

  // Cierre de sesión
  const [rpe, setRpe] = useState(5);
  const [windKmh, setWindKmh] = useState(0);
  const [windDir, setWindDir] = useState<WindDirection>("calma");
  const [confidence, setConfidence] = useState(3);
  const [note, setNote] = useState("");

  const metrics = useMemo(
    () => (pending ? kickMetrics(pending.x, pending.y) : null),
    [pending],
  );

  const made = kicks.filter((k) => k.isMade).length;

  const confirmKick = (isMade: boolean) => {
    if (!pending || !metrics) return;
    const kick: Kick = {
      id: crypto.randomUUID(),
      x: pending.x,
      y: pending.y,
      distance: metrics.distance,
      angle: metrics.angle,
      isMade,
      category,
      effortPct: effort,
      createdAt: new Date().toISOString(),
    };
    setKicks((prev) => [...prev, kick]);
    setPending(null);
    if (navigator.vibrate) navigator.vibrate(isMade ? [10, 40, 20] : 15);
  };

  const finishSession = () => {
    const session: Session = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      kicks,
      rpe,
      windKmh,
      windDirection: windDir,
      mentalNote: note,
      confidence,
      createdAt: new Date().toISOString(),
    };
    addSession(session);
    setSaved(session);
    setClosing(false);
  };

  // Pantalla de resumen post-guardado
  if (saved) {
    const xp = sessionXp(saved);
    const eff = saved.kicks.length
      ? Math.round((saved.kicks.filter((k) => k.isMade).length / saved.kicks.length) * 100)
      : 0;
    return (
      <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="tele-card-gold flex flex-col items-center gap-2 px-10 py-8"
        >
          <span className="text-5xl">🏉</span>
          <p className="display text-2xl text-gold-300">¡Sesión guardada!</p>
          <p className="tele-num text-4xl font-semibold text-chalk">+{xp} XP</p>
          <div className="chalk-line my-2 w-full" />
          <p className="tele-num text-sm text-chalk-dim">
            {saved.kicks.length} patadas · {eff}% efectividad
          </p>
          {saved.kicks.length > 0 && saved.kicks.every((k) => k.effortPct <= 40) && (
            <p className="text-xs text-try-400">
              🪶 Sesión de técnica pura — así se construye la cadena cinética
            </p>
          )}
        </motion.div>
        <button
          onClick={() => router.push("/")}
          className="btn-gold rounded-2xl px-8 py-3.5 text-sm font-bold tracking-wide uppercase"
        >
          Volver al inicio
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="tech-label">Sesión de pateo</p>
          <h1 className="display text-2xl text-chalk">Tocá donde pateás</h1>
        </div>
        <div className="text-right">
          <p className="tele-num text-lg font-semibold text-chalk">
            <span className="text-try-400">{made}</span>
            <span className="text-chalk-faint">/{kicks.length}</span>
          </p>
          <p className="tech-label">aciertos</p>
        </div>
      </header>

      {/* Selector de tipo de patada */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {KICK_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setCategory(t.value)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 font-mono text-[11px] tracking-wide transition-colors ${
              category === t.value
                ? "border-gold-400/60 bg-gold-400/15 text-gold-300"
                : "border-navy-300/20 text-chalk-dim"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <InteractiveField
        kicks={kicks}
        pending={pending}
        onTap={(x, y) => setPending({ x, y })}
      />

      {/* Slider de esfuerzo — filosofía Alred */}
      <div className="tele-card px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="tech-label">Esfuerzo de impacto</p>
          <p
            className={`tele-num text-sm font-semibold ${effort > 60 ? "text-miss-500" : effort > 40 ? "text-gold-400" : "text-try-400"}`}
          >
            {effort}%
          </p>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={effort}
          onChange={(e) => setEffort(Number(e.target.value))}
          className="mt-1 w-full"
        />
        <p className="text-[10px] text-chalk-faint">
          La clínica recomienda ≤ 40 %: técnica sobre potencia
        </p>
      </div>

      {/* Panel de confirmación */}
      <AnimatePresence>
        {pending && metrics && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="tele-card fixed bottom-24 left-1/2 z-30 w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 px-5 py-4 shadow-2xl shadow-black/60"
          >
            <div className="mb-3 flex justify-around">
              <div className="text-center">
                <p className="tele-num text-2xl font-semibold text-gold-300">
                  {metrics.distance}
                  <span className="text-xs">m</span>
                </p>
                <p className="tech-label">distancia</p>
              </div>
              <div className="text-center">
                <p className="tele-num text-2xl font-semibold text-gold-300">
                  {metrics.angle}°
                </p>
                <p className="tech-label">ángulo</p>
              </div>
              <div className="text-center">
                <p className="tele-num text-2xl font-semibold text-chalk">
                  {metrics.side}
                </p>
                <p className="tech-label">lado</p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => confirmKick(true)}
                className="flex-1 rounded-xl bg-try-500 py-3.5 text-sm font-bold text-white uppercase active:scale-95"
              >
                Adentro ✓
              </button>
              <button
                onClick={() => confirmKick(false)}
                className="flex-1 rounded-xl bg-miss-500 py-3.5 text-sm font-bold text-white uppercase active:scale-95"
              >
                Afuera ✗
              </button>
            </div>
            <button
              onClick={() => setPending(null)}
              className="mt-2 w-full text-center font-mono text-[10px] tracking-wider text-chalk-faint uppercase"
            >
              descartar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {kicks.length > 0 && !pending && (
        <button
          onClick={() => setClosing(true)}
          className="btn-gold rounded-2xl py-4 text-sm font-bold tracking-wide uppercase"
        >
          Terminar sesión ({kicks.length} {kicks.length === 1 ? "patada" : "patadas"})
        </button>
      )}

      {/* Modal de cierre: RPE, viento, diario mental */}
      <AnimatePresence>
        {closing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setClosing(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl border-t border-navy-300/25 bg-pitch-900 px-5 pt-5 pb-8"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-chalk-faint/40" />
              <h2 className="display mb-4 text-xl text-chalk">Cerrar la sesión</h2>

              <label className="tech-label">
                Cansancio (RPE) · <span className="text-gold-400">{rpe}/10</span>
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={rpe}
                onChange={(e) => setRpe(Number(e.target.value))}
                className="mb-4 w-full"
              />

              <label className="tech-label">Viento</label>
              <div className="mt-1 mb-3 flex gap-1.5 overflow-x-auto">
                {WINDS.map((w) => (
                  <button
                    key={w.value}
                    onClick={() => setWindDir(w.value)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-[11px] ${
                      windDir === w.value
                        ? "border-gold-400/60 bg-gold-400/15 text-gold-300"
                        : "border-navy-300/20 text-chalk-dim"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
              {windDir !== "calma" && (
                <>
                  <label className="tech-label">
                    Intensidad · <span className="text-gold-400">{windKmh} km/h</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={5}
                    value={windKmh}
                    onChange={(e) => setWindKmh(Number(e.target.value))}
                    className="mb-3 w-full"
                  />
                </>
              )}

              <label className="tech-label">Confianza de hoy</label>
              <div className="mt-1 mb-3 flex gap-2">
                {[1, 2, 3, 4, 5].map((c) => (
                  <button
                    key={c}
                    onClick={() => setConfidence(c)}
                    className={`flex-1 rounded-xl border py-2.5 text-lg ${
                      confidence >= c
                        ? "border-gold-400/50 bg-gold-400/15"
                        : "border-navy-300/15 opacity-40"
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>

              <label className="tech-label">Diario mental (opcional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="¿Cómo te sentiste? ¿Qué notaste en tu rutina?"
                rows={2}
                className="mt-1 mb-4 w-full rounded-xl border border-navy-300/20 bg-pitch-800 px-3 py-2.5 text-sm text-chalk placeholder:text-chalk-faint focus:border-gold-400/50 focus:outline-none"
              />

              <button
                onClick={finishSession}
                className="btn-gold w-full rounded-2xl py-4 text-sm font-bold tracking-wide uppercase"
              >
                Guardar sesión
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
