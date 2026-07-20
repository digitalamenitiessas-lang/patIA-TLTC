"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { TacticalField, type KickFxSpec } from "@/components/TacticalField";
import {
  MODE_OF,
  MODE_SPECS,
  RESULTS_BY_MODE,
  SALIDA_ORIGIN,
  SALIDA_ZONE_INFO,
  POSTS_X,
  kickMetrics,
  goalDifficulty,
  salidaMetrics,
  touchMetrics,
  rastronMetrics,
  type ResultOption,
} from "@/lib/field";
import { usePlayer } from "@/lib/store";
import {
  sessionXp,
  totalXp,
  streakDays,
  earnedBadges,
  rankFor,
  XP_PER_KICK,
  XP_PER_MADE,
} from "@/lib/gamification";
import type { BadgeDef } from "@/lib/types";
import { checkIn, type CheckinStatus } from "@/lib/geo";
import { weatherNow, type WeatherNow } from "@/lib/weather";
import type {
  FieldMode,
  Kick,
  KickCategory,
  Session,
  WindDirection,
} from "@/lib/types";

interface Pt {
  x: number;
  y: number;
}

/** Selector táctico: un tile por gesto de pateo */
const MODE_TILES: {
  mode: FieldMode;
  icon: string;
  categories: { value: KickCategory; label: string }[];
}[] = [
  {
    mode: "palos",
    icon: "🥅",
    categories: [
      { value: "conversion", label: "Conversión" },
      { value: "penalty", label: "Penal" },
      { value: "drop_kick", label: "Drop" },
    ],
  },
  { mode: "salida", icon: "🪂", categories: [{ value: "salida_22", label: "Salida 22" }] },
  { mode: "touch", icon: "🚀", categories: [{ value: "punt", label: "Punt / despeje" }] },
  { mode: "rastron", icon: "🎳", categories: [{ value: "grubber", label: "Grubber" }] },
];

const WINDS: { value: WindDirection; label: string }[] = [
  { value: "calma", label: "Calma" },
  { value: "a_favor", label: "A favor" },
  { value: "en_contra", label: "En contra" },
  { value: "cruzado_izq", label: "Cruzado ←" },
  { value: "cruzado_der", label: "Cruzado →" },
];

const TONE_CLASSES: Record<ResultOption["tone"], string> = {
  try: "bg-try-500 text-white",
  gold: "bg-gold-500 text-[#1a1400]",
  miss: "bg-miss-500 text-white",
};

interface SessionReward {
  rankedUp: boolean;
  newRank: string;
  newBadges: BadgeDef[];
  maxCombo: number;
}

export default function CargarPage() {
  const router = useRouter();
  const { addSession, stats, sessions, profile } = usePlayer();

  const [category, setCategory] = useState<KickCategory>("conversion");
  const mode = MODE_OF[category];
  const spec = MODE_SPECS[mode];

  const [kicks, setKicks] = useState<Kick[]>([]);
  const [origin, setOrigin] = useState<Pt | null>(null);
  const [end, setEnd] = useState<Pt | null>(null);
  const [effort, setEffort] = useState(40);
  const [closing, setClosing] = useState(false);
  const [saved, setSaved] = useState<Session | null>(null);

  // Cierre de sesión
  const [rpe, setRpe] = useState(5);
  const [windKmh, setWindKmh] = useState(0);
  const [windDir, setWindDir] = useState<WindDirection>("calma");
  const [confidence, setConfidence] = useState(3);
  const [note, setNote] = useState("");
  const [checkin, setCheckin] = useState<CheckinStatus>({ state: "idle" });
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherAuto, setWeatherAuto] = useState(false);

  // Al abrir el cierre, autocompletar el clima desde Open-Meteo
  const openClosing = () => {
    setClosing(true);
    if (weather || weatherLoading) return;
    setWeatherLoading(true);
    weatherNow()
      .then((w) => {
        if (w) {
          setWeather(w);
          setWindKmh(w.windKmh);
          setWeatherAuto(true);
          if (w.windKmh < 6) setWindDir("calma");
        }
      })
      .finally(() => setWeatherLoading(false));
  };

  const doCheckIn = async () => {
    setCheckin({ state: "locating" });
    setCheckin(await checkIn());
  };

  // Animación del gesto de patada + combo de aciertos seguidos
  const fxKey = useRef(0);
  const [fx, setFx] = useState<KickFxSpec | null>(null);
  const [xpPop, setXpPop] = useState<{ amount: number; made: boolean; combo: number; key: number } | null>(null);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const [reward, setReward] = useState<SessionReward | null>(null);

  const clearPending = () => {
    setOrigin(null);
    setEnd(null);
  };

  const switchCategory = (c: KickCategory) => {
    setCategory(c);
    if (MODE_OF[c] !== mode) clearPending();
  };

  const handleTap = (x: number, y: number) => {
    const pt = { x, y };
    if (mode === "palos") {
      setOrigin(pt);
    } else if (mode === "salida") {
      setEnd(pt);
    } else {
      // dos toques: origen → destino (re-tocar corrige el destino)
      if (!origin) setOrigin(pt);
      else setEnd(pt);
    }
  };

  /* ── Métricas del intento pendiente ── */
  const pending = useMemo(() => {
    if (mode === "palos" && origin) {
      const m = kickMetrics(origin.x, origin.y);
      return { ...m, difficulty: goalDifficulty(m.distance, m.angle) };
    }
    if (mode === "salida" && end) return salidaMetrics(end.x, end.y);
    if (mode === "touch" && origin && end) return touchMetrics(origin, end);
    if (mode === "rastron" && origin && end) return rastronMetrics(origin, end);
    return null;
  }, [mode, origin, end]);

  const modeKicks = kicks.filter((k) => MODE_OF[k.category] === mode);
  const made = kicks.filter((k) => k.isMade).length;

  const pushKick = (isMade: boolean, result?: Kick["result"]) => {
    let kick: Kick | null = null;
    const base = {
      id: crypto.randomUUID(),
      category,
      effortPct: effort,
      isMade,
      result,
      createdAt: new Date().toISOString(),
    };

    if (mode === "palos" && origin) {
      const m = kickMetrics(origin.x, origin.y);
      kick = { ...base, x: origin.x, y: origin.y, distance: m.distance, angle: m.angle };
    } else if (mode === "salida" && end) {
      const m = salidaMetrics(end.x, end.y);
      kick = {
        ...base,
        x: SALIDA_ORIGIN.x,
        y: SALIDA_ORIGIN.y,
        endX: end.x,
        endY: end.y,
        distance: m.meters,
        angle: 0,
        metersGained: m.meters,
      };
    } else if ((mode === "touch" || mode === "rastron") && origin && end) {
      const meters =
        mode === "touch"
          ? touchMetrics(origin, end).meters
          : rastronMetrics(origin, end).meters;
      kick = {
        ...base,
        x: origin.x,
        y: origin.y,
        endX: end.x,
        endY: end.y,
        distance: meters,
        angle: 0,
        metersGained: meters,
      };
    }

    if (!kick) return;

    // Trayectoria del gesto según el modo (coords de juego)
    const target =
      mode === "palos"
        ? { x: POSTS_X, y: 1.5 }
        : end ?? { x: kick.x, y: kick.y };
    const start =
      mode === "salida"
        ? SALIDA_ORIGIN
        : { x: kick.x, y: kick.y };
    const key = ++fxKey.current;
    setFx({ from: start, to: target, made: isMade, bounce: mode === "rastron", key });

    comboRef.current = isMade ? comboRef.current + 1 : 0;
    if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
    setXpPop({
      amount: XP_PER_KICK + (isMade ? XP_PER_MADE : 0),
      made: isMade,
      combo: comboRef.current,
      key,
    });

    setKicks((prev) => [...prev, kick]);
    clearPending();
    if (navigator.vibrate) navigator.vibrate(isMade ? [10, 40, 20] : 15);
  };

  const undoLast = () => setKicks((prev) => prev.slice(0, -1));

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
      venue: checkin.state === "verified" ? checkin.venueId : null,
      venueVerified: checkin.state === "verified",
      temperatureC: weather?.tempC ?? null,
      weatherAuto,
      createdAt: new Date().toISOString(),
    };
    // Recompensa: comparar el antes (stats actuales) con el después
    const preBadgeIds = new Set(earnedBadges(stats).map((b) => b.id));
    const preRank = rankFor(stats.xp).current.name;

    const postSessions = [session, ...sessions];
    const postCtx = {
      sessions: postSessions,
      allKicks: postSessions.flatMap((s) => s.kicks),
      profile,
      streakDays: streakDays(postSessions),
      xp: totalXp(postSessions),
    };
    const postRank = rankFor(postCtx.xp).current.name;
    const newBadges = earnedBadges(postCtx).filter((b) => !preBadgeIds.has(b.id));

    setReward({
      rankedUp: postRank !== preRank,
      newRank: postRank,
      newBadges,
      maxCombo: maxComboRef.current,
    });

    addSession(session);
    setSaved(session);
    setClosing(false);
  };

  /* ── Resumen post-guardado ── */
  if (saved) {
    const xp = sessionXp(saved);
    const eff = saved.kicks.length
      ? Math.round((saved.kicks.filter((k) => k.isMade).length / saved.kicks.length) * 100)
      : 0;
    const byMode = MODE_TILES.map((t) => {
      const ks = saved.kicks.filter((k) => MODE_OF[k.category] === t.mode);
      if (!ks.length) return null;
      const ok = ks.filter((k) => k.isMade).length;
      return `${t.icon} ${ok}/${ks.length}`;
    }).filter(Boolean);

    const celebrate = !!reward && (reward.rankedUp || reward.newBadges.length > 0);

    return (
      <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-5 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="tele-card-gold relative flex flex-col items-center gap-2 overflow-hidden px-10 py-8"
        >
          {/* Estallido de partículas si hubo recompensa */}
          {celebrate && (
            <div className="pointer-events-none absolute left-1/2 top-16 -z-0">
              {Array.from({ length: 16 }).map((_, i) => (
                <span
                  key={i}
                  className="reward-particle h-1.5 w-1.5 rounded-full"
                  style={
                    {
                      background: i % 2 ? "#34d399" : "#ffd100",
                      "--a": `${(i / 16) * 360}deg`,
                      "--r": `${64 + (i % 3) * 18}px`,
                      "--d": `${(i % 4) * 0.05}s`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          )}
          <span className="relative text-5xl">🏉</span>
          <p className="display text-2xl text-gold-300">¡Sesión guardada!</p>
          <p className="tele-num gold-sheen text-4xl font-bold">+{xp} XP</p>
          <div className="chalk-line my-2 w-full" />
          <p className="tele-num text-sm text-chalk-dim">
            {saved.kicks.length} patadas · {eff}% objetivo cumplido
          </p>
          {byMode.length > 0 && (
            <p className="tele-num text-sm text-chalk-dim">{byMode.join(" · ")}</p>
          )}
          {reward && reward.maxCombo >= 3 && (
            <p className="tele-num text-sm text-gold-300">
              🔥 Mejor racha de la sesión: {reward.maxCombo} seguidas
            </p>
          )}
          {saved.kicks.length > 0 && saved.kicks.every((k) => k.effortPct <= 40) && (
            <p className="text-xs text-try-400">
              🪶 Sesión de técnica pura — así se construye la cadena cinética
            </p>
          )}
        </motion.div>

        {/* Subida de rango */}
        {reward?.rankedUp && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.25 }}
            className="tele-card-gold flex items-center gap-3 px-6 py-3.5"
          >
            <span className="text-3xl">⭐</span>
            <span className="text-left">
              <span className="tech-label">Subiste de rango</span>
              <span className="display block text-lg text-gold-300">{reward.newRank}</span>
            </span>
          </motion.div>
        )}

        {/* Insignias nuevas */}
        {reward && reward.newBadges.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            <p className="tech-label">
              {reward.newBadges.length === 1 ? "Nueva insignia" : "Nuevas insignias"}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {reward.newBadges.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ scale: 0, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.35 + i * 0.12 }}
                  className="tele-card-gold flex min-w-[92px] flex-col items-center px-3 py-3"
                  title={b.description}
                >
                  <span className="text-3xl">{b.icon}</span>
                  <span className="mt-1 text-center font-mono text-[9px] leading-tight tracking-wide text-gold-300">
                    {b.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={() => router.push("/")}
          className="btn-gold rounded-2xl px-8 py-3.5 text-sm font-bold tracking-wide uppercase"
        >
          Volver al inicio
        </button>
      </main>
    );
  }

  const panelReady = pending !== null;
  const results = RESULTS_BY_MODE[mode];

  return (
    <main className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-6">
      <header className="flex items-end justify-between lg:col-span-2">
        <div>
          <p className="tech-label">Sesión de pateo · {spec.name}</p>
          <h1 className="display text-2xl text-chalk">{spec.objective}</h1>
        </div>
        <div className="text-right">
          <p className="tele-num text-lg font-semibold text-chalk">
            <span className="text-try-400">{made}</span>
            <span className="text-chalk-faint">/{kicks.length}</span>
          </p>
          <p className="tech-label">objetivos</p>
        </div>
      </header>

      {/* Selector táctico de gesto */}
      <div className="flex flex-col gap-2 lg:col-start-2 lg:row-start-2">
        <div className="grid grid-cols-4 gap-1.5">
          {MODE_TILES.map((t) => {
            const active = mode === t.mode;
            const count = kicks.filter((k) => MODE_OF[k.category] === t.mode).length;
            return (
              <button
                key={t.mode}
                onClick={() => switchCategory(t.categories[0].value)}
                className={`relative flex flex-col items-center gap-0.5 rounded-2xl border px-1 py-2.5 transition-all ${
                  active
                    ? "border-gold-400/60 bg-gold-400/10"
                    : "border-navy-300/20 bg-pitch-800/50"
                }`}
              >
                <span className="text-lg">{t.icon}</span>
                <span
                  className={`font-mono text-[9px] tracking-wide uppercase ${
                    active ? "text-gold-300" : "text-chalk-dim"
                  }`}
                >
                  {MODE_SPECS[t.mode].name}
                </span>
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy-500 px-1 font-mono text-[9px] text-chalk">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* Sub-variantes del modo palos */}
        {mode === "palos" && (
          <div className="flex gap-1.5">
            {MODE_TILES[0].categories.map((c) => (
              <button
                key={c.value}
                onClick={() => switchCategory(c.value)}
                className={`flex-1 rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-wide transition-colors ${
                  category === c.value
                    ? "border-gold-400/60 bg-gold-400/15 text-gold-300"
                    : "border-navy-300/20 text-chalk-dim"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative lg:col-start-1 lg:row-start-2 lg:row-span-4">
        <TacticalField
          mode={mode}
          kicks={modeKicks}
          origin={mode === "salida" ? SALIDA_ORIGIN : origin}
          end={end}
          onTap={handleTap}
          fx={fx}
        />
        {/* +XP flotante + combo de aciertos */}
        {xpPop && (
          <div
            key={xpPop.key}
            className="xp-pop pointer-events-none absolute left-1/2 top-[14%] z-20 flex flex-col items-center"
          >
            <span
              className={`tele-num text-2xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] ${
                xpPop.made ? "text-gold-300" : "text-chalk-dim"
              }`}
            >
              +{xpPop.amount} XP
            </span>
            {xpPop.made && xpPop.combo >= 2 && (
              <span className="tele-num mt-0.5 rounded-full bg-gold-400/20 px-2 py-0.5 text-xs font-semibold text-gold-300">
                🔥 {xpPop.combo} seguidas
              </span>
            )}
          </div>
        )}
      </div>

      {/* Slider de esfuerzo — filosofía Alred */}
      <div className="tele-card px-4 py-3 lg:col-start-2 lg:row-start-3">
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
        {panelReady && pending && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="tele-card fixed bottom-24 left-1/2 z-30 w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 px-5 py-4 shadow-2xl shadow-black/60 lg:static lg:col-start-2 lg:row-start-4 lg:w-full lg:max-w-none lg:translate-x-0 lg:shadow-none"
          >
            {/* ── Métricas por modo ── */}
            {mode === "palos" && "difficulty" in pending && (
              <>
                <div className="mb-3 flex justify-around">
                  <Metric big={`${pending.distance}`} unit="m" label="distancia" gold />
                  <Metric big={`${pending.angle}°`} label="ángulo" gold />
                  <Metric big={pending.side} label="lado" small />
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <p className="tech-label">Dificultad del intento</p>
                    <p className="tele-num text-xs font-semibold text-chalk">
                      {pending.difficulty}% esperable
                    </p>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-pitch-700">
                    <div
                      className={`h-full rounded-full ${pending.difficulty >= 65 ? "bg-try-500" : pending.difficulty >= 35 ? "bg-gold-400" : "bg-miss-500"}`}
                      style={{ width: `${pending.difficulty}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <button onClick={() => pushKick(true)} className="flex-1 rounded-xl bg-try-500 py-3.5 text-sm font-bold text-white uppercase active:scale-95">
                    Adentro ✓
                  </button>
                  <button onClick={() => pushKick(false)} className="flex-1 rounded-xl bg-miss-500 py-3.5 text-sm font-bold text-white uppercase active:scale-95">
                    Afuera ✗
                  </button>
                </div>
              </>
            )}

            {mode === "salida" && "zone" in pending && (
              <>
                <div className="mb-2 flex justify-around">
                  <Metric big={`${pending.meters}`} unit="m" label="profundidad" gold />
                  <Metric big={SALIDA_ZONE_INFO[pending.zone].label} label="zona de caída" small />
                  <Metric big={pending.side} label="sector" small />
                </div>
                <p className="mb-3 text-center text-[11px] text-chalk-dim">
                  {SALIDA_ZONE_INFO[pending.zone].note}
                </p>
                <ResultButtons options={results!} onPick={(o) => pushKick(o.made, o.value)} />
              </>
            )}

            {mode === "touch" && "foundTouch" in pending && (
              <>
                <div className="mb-2 flex justify-around">
                  <Metric big={`${pending.meters}`} unit="m" label="metros ganados" gold />
                  <Metric
                    big={pending.foundTouch ? `Touch ${pending.sideOut}` : "Quedó adentro"}
                    label="salida"
                    small
                  />
                </div>
                <p className="mb-3 text-center text-[11px] text-chalk-dim">
                  {pending.foundTouch
                    ? "La pelota salió: confirmá cómo encontró el touch"
                    : "No cruzó la línea de touch: posesión viva para el rival"}
                </p>
                <ResultButtons
                  options={results!.filter((o) =>
                    pending.foundTouch ? o.made : !o.made,
                  )}
                  onPick={(o) => pushKick(o.made, o.value)}
                />
              </>
            )}

            {mode === "rastron" && "inGoal" in pending && (
              <>
                <div className="mb-2 flex justify-around">
                  <Metric big={`${pending.meters}`} unit="m" label="penetración" gold />
                  <Metric big={pending.inGoal ? "In-goal" : "Campo"} label="terminó en" small />
                </div>
                <p className="mb-3 text-center text-[11px] text-chalk-dim">
                  {pending.inGoal
                    ? "Rastrón al in-goal: try, touch-down rival o salida de 22"
                    : "Pelota al piso detrás de la línea defensiva"}
                </p>
                <ResultButtons options={results!} onPick={(o) => pushKick(o.made, o.value)} />
              </>
            )}

            <button
              onClick={clearPending}
              className="mt-2 w-full text-center font-mono text-[10px] tracking-wider text-chalk-faint uppercase"
            >
              descartar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {kicks.length > 0 && !panelReady && (
        <div className="flex gap-2 lg:col-start-2 lg:row-start-5 lg:flex-col">
          <button
            onClick={openClosing}
            className="btn-gold flex-1 rounded-2xl py-4 text-sm font-bold tracking-wide uppercase"
          >
            Terminar sesión ({kicks.length})
          </button>
          <button
            onClick={undoLast}
            aria-label="Deshacer última patada"
            className="rounded-2xl border border-navy-300/25 px-4 font-mono text-[11px] tracking-wider text-chalk-dim uppercase hover:text-chalk lg:py-3"
          >
            ↩ deshacer
          </button>
        </div>
      )}

      {/* Modal de cierre: RPE, viento, diario mental */}
      <AnimatePresence>
        {closing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm lg:items-center"
            onClick={() => setClosing(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl border-t border-navy-300/25 bg-pitch-900 px-5 pt-5 pb-8 lg:rounded-3xl lg:border lg:pb-6"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-chalk-faint/40" />
              <h2 className="display mb-4 text-xl text-chalk">Cerrar la sesión</h2>

              {/* Clima automático (Open-Meteo) */}
              {weatherLoading ? (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-navy-300/20 bg-pitch-800 px-3.5 py-2.5 text-xs text-chalk-dim">
                  <span className="animate-pulse">🛰️</span> Obteniendo el clima de tu ubicación…
                </div>
              ) : weather ? (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-gold-400/25 bg-gold-400/[0.06] px-3.5 py-2.5">
                  <span className="text-2xl">{weather.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-chalk">
                      {weather.label} · <span className="tele-num font-semibold">{weather.tempC}°</span>
                    </p>
                    <p className="tech-label">
                      Viento {weather.windKmh} km/h del {weather.compass} · autocompletado
                    </p>
                  </div>
                </div>
              ) : null}

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

              <label className="tech-label">
                Viento{" "}
                {weather && weather.windKmh >= 6 && (
                  <span className="text-chalk-dim">
                    · sopla del {weather.compass} — ¿cómo te pega?
                  </span>
                )}
              </label>
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

              <label className="tech-label">¿Estás en el club?</label>
              <div className="mt-1 mb-3">
                {checkin.state === "verified" ? (
                  <p className="flex items-center gap-2 rounded-xl border border-try-500/40 bg-try-500/10 px-3.5 py-2.5 text-xs text-try-400">
                    📍 Verificado: estás en {checkin.venueName}
                    <span className="text-chalk-faint">
                      (a {checkin.distanceM} m del centro del predio)
                    </span>
                  </p>
                ) : checkin.state === "far" ? (
                  <p className="rounded-xl border border-navy-300/20 bg-pitch-800 px-3.5 py-2.5 text-xs text-chalk-dim">
                    Estás a{" "}
                    {checkin.distanceM >= 1000
                      ? `${(checkin.distanceM / 1000).toFixed(1)} km`
                      : `${checkin.distanceM} m`}{" "}
                    de {checkin.venueName} — la sesión se guarda sin marca de club.
                  </p>
                ) : checkin.state === "denied" ? (
                  <p className="rounded-xl border border-navy-300/20 bg-pitch-800 px-3.5 py-2.5 text-xs text-chalk-dim">
                    Sin permiso de ubicación — habilitalo en el navegador si querés
                    la marca 📍 del club.
                  </p>
                ) : (
                  <button
                    onClick={() => void doCheckIn()}
                    disabled={checkin.state === "locating"}
                    className="w-full rounded-xl border border-gold-400/40 bg-gold-400/10 py-2.5 font-mono text-[11px] tracking-wider text-gold-300 uppercase disabled:opacity-50"
                  >
                    {checkin.state === "locating"
                      ? "◌ Ubicando…"
                      : "📍 Marcar que estoy en el Lawn Tennis"}
                  </button>
                )}
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

function Metric({
  big,
  unit,
  label,
  gold,
  small,
}: {
  big: string;
  unit?: string;
  label: string;
  gold?: boolean;
  small?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className={`tele-num font-semibold ${gold ? "text-gold-300" : "text-chalk"} ${
          small ? "text-base capitalize" : "text-2xl"
        }`}
      >
        {big}
        {unit && <span className="text-xs">{unit}</span>}
      </p>
      <p className="tech-label">{label}</p>
    </div>
  );
}

function ResultButtons({
  options,
  onPick,
}: {
  options: ResultOption[];
  onPick: (o: ResultOption) => void;
}) {
  return (
    <div className={`grid gap-2 ${options.length >= 3 ? "grid-cols-3" : options.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onPick(o)}
          className={`rounded-xl py-3 text-[11px] leading-tight font-bold uppercase active:scale-95 ${TONE_CLASSES[o.tone]}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
