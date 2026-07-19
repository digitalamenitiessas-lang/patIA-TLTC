"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePlayer, useBadges } from "@/lib/store";
import { rankFor, RANKS } from "@/lib/gamification";
import {
  getPushStatus,
  subscribeToPush,
  unsubscribeFromPush,
  type PushStatus,
} from "@/lib/push";
import { RUGBY_POSITIONS, type Division } from "@/lib/types";

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

export default function PerfilPage() {
  const { profile, updateProfile, stats, cloud, account, userId, signOut } =
    usePlayer();
  const { earned, all } = useBadges();
  const rank = rankFor(stats.xp);

  const [push, setPush] = useState<PushStatus | "loading">("loading");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    void getPushStatus().then(setPush);
  }, []);

  const togglePush = async () => {
    if (!userId || pushBusy) return;
    setPushBusy(true);
    try {
      setPush(
        push === "subscribed"
          ? await unsubscribeFromPush()
          : await subscribeToPush(userId),
      );
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <main className="flex flex-col gap-5">
      <header className="rise flex items-center gap-4" style={{ "--rise-delay": "0s" } as React.CSSProperties}>
        <Image src="/escudo.webp" alt="TLTC" width={44} height={47} />
        <div>
          <p className="tech-label">Ficha de jugador</p>
          <h1 className="display text-2xl text-chalk">Mi perfil</h1>
        </div>
      </header>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-5">
          {/* Datos */}
          <section className="tele-card rise flex flex-col gap-4 px-5 py-5" style={{ "--rise-delay": "0.08s" } as React.CSSProperties}>
            <div>
              <label className="tech-label">Nombre</label>
              <input
                value={profile.fullName}
                onChange={(e) => updateProfile({ fullName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-navy-300/20 bg-pitch-800 px-3.5 py-3 text-sm text-chalk focus:border-gold-400/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="tech-label">DNI</label>
              <input
                value={profile.dni ?? ""}
                onChange={(e) =>
                  updateProfile({ dni: e.target.value.replace(/\D/g, "").slice(0, 9) })
                }
                inputMode="numeric"
                placeholder="Sin puntos"
                className="mt-1 w-full rounded-xl border border-navy-300/20 bg-pitch-800 px-3.5 py-3 text-sm text-chalk placeholder:text-chalk-faint focus:border-gold-400/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="tech-label">Puesto</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {RUGBY_POSITIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => updateProfile({ position: p })}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] ${
                      profile.position === p
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
                    onClick={() => updateProfile({ division: d })}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] ${
                      profile.division === d
                        ? "border-gold-400/60 bg-gold-400/15 text-gold-300"
                        : "border-navy-300/20 text-chalk-dim"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="tech-label">Pie hábil</label>
                <div className="mt-1.5 flex gap-1.5">
                  {(["derecho", "izquierdo"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => updateProfile({ preferredFoot: f })}
                      className={`flex-1 rounded-xl border py-2.5 font-mono text-[11px] capitalize ${
                        profile.preferredFoot === f
                          ? "border-gold-400/60 bg-gold-400/15 text-gold-300"
                          : "border-navy-300/20 text-chalk-dim"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <label className="tech-label">Nivel de clínica</label>
                <div className="mt-1.5 flex gap-1.5">
                  {([1, 2, 3] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => updateProfile({ skillLevel: l })}
                      className={`flex-1 rounded-xl border py-2.5 font-mono text-[11px] ${
                        profile.skillLevel === l
                          ? "border-gold-400/60 bg-gold-400/15 text-gold-300"
                          : "border-navy-300/20 text-chalk-dim"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Cuenta */}
          <section className="tele-card rise px-5 py-4" style={{ "--rise-delay": "0.12s" } as React.CSSProperties}>
            <p className="tech-label mb-2">Cuenta</p>
            {account.kind === "google" ? (
              <>
                <p className="text-sm text-chalk">
                  {account.email}
                  {account.role === "admin" && (
                    <span className="ml-2 rounded-full border border-gold-400/40 px-2 py-0.5 font-mono text-[9px] text-gold-300 uppercase">
                      admin
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-chalk-faint">
                  Vinculada con Google — tu progreso te sigue a cualquier
                  dispositivo.
                </p>
                <button
                  onClick={() => void signOut()}
                  className="mt-3 rounded-xl border border-navy-300/25 px-4 py-2 font-mono text-[10px] tracking-wider text-chalk-dim uppercase hover:text-chalk"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-chalk-dim">
                  Estás como <span className="text-chalk">invitado</span>. Si
                  cambiás de teléfono, tu progreso no te sigue.
                </p>
                <Link
                  href="/login"
                  className="btn-gold mt-3 block rounded-xl px-4 py-2.5 text-center text-xs font-bold tracking-wide uppercase"
                >
                  Vincular con Google
                </Link>
              </>
            )}
          </section>

          {/* Notificaciones */}
          <section className="tele-card rise px-5 py-4" style={{ "--rise-delay": "0.16s" } as React.CSSProperties}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="tech-label">Notificaciones push</p>
                <p className="mt-1 text-[11px] leading-relaxed text-chalk-faint">
                  {push === "unsupported"
                    ? "Este navegador no soporta notificaciones. En iPhone: agregá la app a la pantalla de inicio."
                    : push === "denied"
                      ? "Bloqueadas por el navegador — habilitalas desde la configuración del sitio."
                      : "Avisos de la clínica: aprobaciones, rachas y novedades del entrenador."}
                </p>
              </div>
              {(push === "subscribed" || push === "unsubscribed") && (
                <button
                  onClick={() => void togglePush()}
                  disabled={pushBusy}
                  aria-label="Alternar notificaciones"
                  className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
                    push === "subscribed"
                      ? "border-gold-400/60 bg-gold-400/30"
                      : "border-navy-300/30 bg-pitch-800"
                  } ${pushBusy ? "opacity-50" : ""}`}
                >
                  <span
                    className={`absolute top-0.5 h-5.5 w-5.5 rounded-full transition-all ${
                      push === "subscribed"
                        ? "left-6 bg-gold-400"
                        : "left-0.5 bg-chalk-faint"
                    }`}
                  />
                </button>
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          {/* Carrera */}
          <section className="tele-card-gold rise px-5 py-4" style={{ "--rise-delay": "0.16s" } as React.CSSProperties}>
            <p className="tech-label mb-3">Carrera en la clínica</p>
            <div className="flex flex-col gap-2">
              {RANKS.map((r) => {
                const reached = stats.xp >= r.min;
                const isCurrent = rank.current.name === r.name;
                return (
                  <div key={r.name} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[10px] ${
                        reached
                          ? "border-gold-400 bg-gold-400/20 text-gold-300"
                          : "border-navy-300/25 text-chalk-faint"
                      }`}
                    >
                      {reached ? "✓" : ""}
                    </span>
                    <span
                      className={`flex-1 text-sm ${isCurrent ? "display text-gold-300" : reached ? "text-chalk" : "text-chalk-faint"}`}
                    >
                      {r.name}
                    </span>
                    <span className="tele-num text-[11px] text-chalk-faint">{r.min} XP</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Insignias completas */}
          <section className="rise" style={{ "--rise-delay": "0.24s" } as React.CSSProperties}>
            <p className="tech-label mb-2 px-1">
              Insignias · {earned.length}/{all.length}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {all.map((b) => {
                const got = earned.some((e) => e.id === b.id);
                return (
                  <div
                    key={b.id}
                    className={`${got ? "tele-card-gold" : "tele-card opacity-50"} px-4 py-3`}
                  >
                    <span className="text-2xl grayscale-0">{got ? b.icon : "🔒"}</span>
                    <p className={`mt-1 text-xs font-medium ${got ? "text-gold-300" : "text-chalk-dim"}`}>
                      {b.name}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-chalk-faint">
                      {b.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <p className="rise text-center font-mono text-[10px] text-chalk-faint" style={{ "--rise-delay": "0.32s" } as React.CSSProperties}>
        Datos {cloud === "online" ? "sincronizados con la nube del club ●" : "guardados en este dispositivo ○"}
        <br />
        Tucumán Lawn Tennis Club · est. 1902
      </p>
    </main>
  );
}
