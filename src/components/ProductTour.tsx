"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTour } from "@/lib/tour";

const STEPS = [
  {
    icon: "🏉",
    title: "Así funciona la clínica",
    body: "Cada patada que cargás suma XP, sube tu rango y te acerca a insignias. Competís primero contra vos mismo, semana a semana.",
  },
  {
    icon: "🏠",
    title: "Inicio",
    body: "Tu rango, tu XP y tu efectividad de los últimos 7 días. Abajo, el próximo ejercicio sugerido para tu nivel.",
  },
  {
    icon: "🎯",
    title: "Cargar sesión — el corazón de la app",
    body: "Elegí el gesto (palos, salida de 22, touch o rastrón), tocá la cancha donde pateaste y confirmá el resultado. Al cerrar, registrás cansancio, viento y cómo te sentiste.",
  },
  {
    icon: "🏆",
    title: "Ranking",
    body: "Torneo semanal —arranca de cero cada lunes— y tabla de temporada. Se compite con el XP real de tus patadas.",
  },
  {
    icon: "📅",
    title: "Clínica",
    body: "La fecha de la próxima clínica, qué ir practicando mientras tanto, y las devoluciones que te dejan los referentes del club.",
  },
  {
    icon: "🎓",
    title: "Academia",
    body: "Ejercicios de bajo esfuerzo para hacer en casa, por nivel (1 a 3), más el banco de video y el simulador táctico.",
  },
  {
    icon: "📊",
    title: "Stats",
    body: "Tu evolución de 14 días, el mapa de zonas donde más convertís, y tus últimas sesiones comparadas con las anteriores.",
  },
  {
    icon: "🤖",
    title: "PatIA",
    body: "Tu entrenador de IA: analiza tus números reales y responde sobre técnica, fatiga, distancia o rutina mental.",
  },
  {
    icon: "👤",
    title: "Perfil",
    body: "Editá tus datos, activá las notificaciones push y vinculá tu Google para no perder el progreso.",
  },
] as const;

/** Recorrido guiado de la app: se abre solo o desde el botón "?" de la nav. */
export function ProductTour() {
  const { open, hide } = useTour();
  const [step, setStep] = useState(0);

  if (!open) return null;

  const last = step === STEPS.length - 1;
  const s = STEPS[step];

  const finish = () => {
    hide();
    setStep(0);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={finish}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tele-card-gold relative w-full max-w-sm px-6 py-7"
      >
        <button
          onClick={finish}
          aria-label="Cerrar tutorial"
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full text-chalk-faint hover:text-chalk"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            <p className="text-center text-5xl">{s.icon}</p>
            <h2 className="display mt-3 text-center text-xl text-gold-300">
              {s.title}
            </h2>
            <p className="mt-2 text-center text-sm leading-relaxed text-chalk-dim">
              {s.body}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-5 bg-gold-400" : "w-1.5 bg-navy-300/30"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-2.5">
          {step > 0 && (
            <button
              onClick={() => setStep((v) => v - 1)}
              className="rounded-xl border border-navy-300/25 px-4 font-mono text-[11px] tracking-wider text-chalk-dim uppercase hover:text-chalk"
            >
              ← Atrás
            </button>
          )}
          <button
            onClick={() => (last ? finish() : setStep((v) => v + 1))}
            className="btn-gold flex-1 rounded-xl py-3 text-xs font-bold tracking-wide uppercase"
          >
            {last ? "¡Listo, a patear! 🏉" : "Siguiente →"}
          </button>
        </div>

        {!last ? (
          <button
            onClick={finish}
            className="mt-3 block w-full text-center font-mono text-[10px] tracking-wider text-chalk-faint uppercase hover:text-chalk-dim"
          >
            Saltar tutorial
          </button>
        ) : (
          <p className="mt-3 text-center text-[10px] text-chalk-faint">
            Podés volver a verlo tocando el{" "}
            <span className="text-gold-400">❓</span> cuando quieras.
          </p>
        )}
      </div>
    </div>
  );
}
