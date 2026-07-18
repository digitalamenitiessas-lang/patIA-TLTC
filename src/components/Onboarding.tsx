"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { usePlayer } from "@/lib/store";
import {
  RUGBY_POSITIONS,
  type Division,
  type RugbyPosition,
} from "@/lib/types";

const DIVISIONS: Division[] = [
  "M6-M14",
  "M15",
  "M16",
  "M17",
  "M19",
  "Pre-Intermedia",
  "Primera",
  "Veteranos",
];

const CONSENT_POINTS = [
  {
    icon: "🛡️",
    title: "Tus datos, cuidados",
    body: "Guardamos tu ficha deportiva y tu telemetría de pateo para acompañar tu progreso. Solo el staff de la clínica puede verlos. Podés pedir que se eliminen cuando quieras.",
  },
  {
    icon: "🎓",
    title: "Objetivo pedagógico y deportivo",
    body: "Esta app existe para enseñar: técnica de pateo, hábitos de entrenamiento y fortaleza mental. Cada número que registrás es una herramienta de aprendizaje, no un juicio.",
  },
  {
    icon: "🎮",
    title: "Gamificación sana, cero apuestas",
    body: "Los XP, rangos, insignias y torneos son incentivos para practicar mejor — nunca involucran dinero, premios materiales ni apuestas. Acá se compite primero contra uno mismo.",
  },
  {
    icon: "🤝",
    title: "Acompañamiento real",
    body: "PatIA y la app complementan —no reemplazan— a tus entrenadores. Ante cualquier dolor, molestia o preocupación, hablá con tu entrenador, tu familia o el profesional del club.",
  },
];

/**
 * Puerta de entrada de la clínica: consentimiento informado + ficha
 * del jugador. Bloquea la app hasta completarse (una sola vez).
 */
export function Onboarding({ children }: { children: React.ReactNode }) {
  const { ready, profile, updateProfile } = usePlayer();

  const needsOnboarding =
    ready && (!profile.consentAt || !profile.dni || !profile.position);

  const [step, setStep] = useState<1 | 2>(1);
  const [consentChecked, setConsentChecked] = useState(false);

  const [fullName, setFullName] = useState("");
  const [dni, setDni] = useState("");
  const [position, setPosition] = useState<RugbyPosition | "">("");
  const [division, setDivision] = useState<Division | "">("");
  const [foot, setFoot] = useState<"derecho" | "izquierdo">("derecho");

  if (!needsOnboarding) return <>{children}</>;

  const cleanName = fullName.trim().replace(/\s+/g, " ");
  const nameOk = cleanName.length >= 5 && cleanName.includes(" ");
  const dniOk = /^\d{7,9}$/.test(dni);
  const formOk = nameOk && dniOk && position !== "" && division !== "";

  const submit = () => {
    if (!formOk) return;
    updateProfile({
      fullName: cleanName,
      dni,
      position: position as RugbyPosition,
      division: division as Division,
      preferredFoot: foot,
      consentAt: new Date().toISOString(),
    });
  };

  const inputCls =
    "w-full rounded-xl border border-navy-300/25 bg-pitch-800 px-4 py-3 text-sm text-chalk placeholder:text-chalk-faint focus:border-gold-400/60 focus:outline-none";

  return (
    <main className="flex min-h-[92dvh] flex-col items-center justify-center py-6">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.section
            key="consent"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-lg"
          >
            <div className="mb-6 flex flex-col items-center text-center">
              <Image
                src="/escudo.webp"
                alt="Escudo Tucumán Lawn Tennis Club"
                width={76}
                height={82}
                priority
                className="drop-shadow-[0_0_28px_rgba(255,196,0,0.35)]"
              />
              <p className="tech-label mt-3">
                Clínica de Pateadores · Daniel Tejerizo
              </p>
              <h1 className="display mt-1 text-3xl text-chalk">
                Bienvenido a la clínica
              </h1>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-chalk-dim">
                Antes de pisar la cancha, leé cómo funciona esto. Es corto y es
                importante — como la charla del entrenador antes del partido.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {CONSENT_POINTS.map((p, i) => (
                <motion.article
                  key={p.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.09 }}
                  className="tele-card flex gap-3.5 px-4 py-3.5"
                >
                  <span className="mt-0.5 text-2xl">{p.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-chalk">{p.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-chalk-dim">
                      {p.body}
                    </p>
                  </div>
                </motion.article>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="mt-5"
            >
              <label className="tele-card-gold flex cursor-pointer items-center gap-3 px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="h-5 w-5 shrink-0 accent-[#ffc400]"
                />
                <span className="text-xs leading-relaxed text-chalk">
                  Leí y acepto el tratamiento de mis datos y el objetivo
                  pedagógico-deportivo de la app.
                  <span className="text-chalk-dim">
                    {" "}
                    Si soy menor, cuento con el aval de mi familia o tutor.
                  </span>
                </span>
              </label>

              <button
                onClick={() => setStep(2)}
                disabled={!consentChecked}
                className="btn-gold mt-3 w-full rounded-2xl py-4 text-sm font-bold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-35"
              >
                Continuar →
              </button>
            </motion.div>
          </motion.section>
        ) : (
          <motion.section
            key="ficha"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-lg"
          >
            <div className="mb-5 flex items-center gap-4">
              <Image src="/escudo.webp" alt="TLTC" width={48} height={52} />
              <div>
                <p className="tech-label">Paso 2 de 2</p>
                <h1 className="display text-2xl text-chalk">Tu ficha de jugador</h1>
                <p className="text-xs text-chalk-dim">
                  Como la planilla del club, pero digital.
                </p>
              </div>
            </div>

            <div className="tele-card flex flex-col gap-4 px-5 py-5">
              <div>
                <label className="tech-label">Nombre y apellido</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="p. ej. Juan Cruz Pérez"
                  autoComplete="name"
                  className={`${inputCls} mt-1`}
                />
                {fullName && !nameOk && (
                  <p className="mt-1 text-[10px] text-miss-500">
                    Escribí nombre y apellido completos
                  </p>
                )}
              </div>

              <div>
                <label className="tech-label">DNI (sin puntos)</label>
                <input
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                  placeholder="p. ej. 45123456"
                  inputMode="numeric"
                  maxLength={9}
                  className={`${inputCls} mt-1`}
                />
                {dni && !dniOk && (
                  <p className="mt-1 text-[10px] text-miss-500">
                    Entre 7 y 9 números
                  </p>
                )}
              </div>

              <div>
                <label className="tech-label">Puesto en el que jugás</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {RUGBY_POSITIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPosition(p)}
                      className={`rounded-full border px-3 py-1.5 font-mono text-[11px] transition-colors ${
                        position === p
                          ? "border-gold-400/60 bg-gold-400/15 text-gold-300"
                          : "border-navy-300/20 text-chalk-dim"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="tech-label">División</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {DIVISIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDivision(d)}
                      className={`rounded-full border px-3 py-1.5 font-mono text-[11px] transition-colors ${
                        division === d
                          ? "border-gold-400/60 bg-gold-400/15 text-gold-300"
                          : "border-navy-300/20 text-chalk-dim"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="tech-label">Pie hábil</label>
                <div className="mt-1.5 flex gap-1.5">
                  {(["derecho", "izquierdo"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFoot(f)}
                      className={`flex-1 rounded-xl border py-2.5 font-mono text-[11px] capitalize ${
                        foot === f
                          ? "border-gold-400/60 bg-gold-400/15 text-gold-300"
                          : "border-navy-300/20 text-chalk-dim"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2.5">
              <button
                onClick={() => setStep(1)}
                className="rounded-2xl border border-navy-300/25 px-5 font-mono text-[11px] tracking-wider text-chalk-dim uppercase hover:text-chalk"
              >
                ← Volver
              </button>
              <button
                onClick={submit}
                disabled={!formOk}
                className="btn-gold flex-1 rounded-2xl py-4 text-sm font-bold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-35"
              >
                ¡A la cancha! 🏉
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <p className="mt-6 text-center font-mono text-[10px] text-chalk-faint">
        Tucumán Lawn Tennis Club · est. 1902
      </p>
    </main>
  );
}
