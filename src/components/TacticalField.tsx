"use client";

import { useRef, useState } from "react";
import {
  FIELD_W,
  FIELD_H,
  SALIDA_H,
  TOUCH_H,
  TOUCH_MARGIN,
  RASTRON_H,
  INGOAL_DEPTH,
  POSTS_X,
  POSTS_GAP,
  SALIDA_ORIGIN,
  MODE_SPECS,
} from "@/lib/field";
import type { FieldMode, Kick } from "@/lib/types";

interface Pt {
  x: number;
  y: number;
}

interface Props {
  mode: FieldMode;
  kicks: Kick[];
  origin: Pt | null;
  end: Pt | null;
  onTap: (x: number, y: number) => void;
}

/** ViewBox y conversión de coordenadas de juego → SVG por modo */
const GEOM: Record<
  FieldMode,
  {
    viewBox: string;
    w: number;
    h: number;
    /** y de juego → y de SVG */
    toSvgY: (y: number) => number;
    /** punto de pantalla → coordenadas de juego */
    fromScreen: (fx: number, fy: number) => Pt;
  }
> = {
  palos: {
    viewBox: `0 0 ${FIELD_W} ${FIELD_H}`,
    w: FIELD_W,
    h: FIELD_H,
    toSvgY: (y) => y,
    fromScreen: (fx, fy) => ({ x: fx * FIELD_W, y: fy * FIELD_H }),
  },
  salida: {
    viewBox: `0 0 ${FIELD_W} ${SALIDA_H}`,
    w: FIELD_W,
    h: SALIDA_H,
    toSvgY: (y) => SALIDA_H - y,
    fromScreen: (fx, fy) => ({ x: fx * FIELD_W, y: SALIDA_H - fy * SALIDA_H }),
  },
  touch: {
    viewBox: `${-TOUCH_MARGIN} 0 ${FIELD_W + TOUCH_MARGIN * 2} ${TOUCH_H}`,
    w: FIELD_W + TOUCH_MARGIN * 2,
    h: TOUCH_H,
    toSvgY: (y) => TOUCH_H - y,
    fromScreen: (fx, fy) => ({
      x: -TOUCH_MARGIN + fx * (FIELD_W + TOUCH_MARGIN * 2),
      y: TOUCH_H - fy * TOUCH_H,
    }),
  },
  rastron: {
    viewBox: `0 ${-INGOAL_DEPTH} ${FIELD_W} ${RASTRON_H + INGOAL_DEPTH}`,
    w: FIELD_W,
    h: RASTRON_H + INGOAL_DEPTH,
    toSvgY: (y) => y,
    fromScreen: (fx, fy) => ({
      x: fx * FIELD_W,
      y: -INGOAL_DEPTH + fy * (RASTRON_H + INGOAL_DEPTH),
    }),
  },
};

const CHALK = "#e9edf5";
const GOLD = "#ffc400";

function GrassStripes({ w, h, y0 = 0 }: { w: number; h: number; y0?: number }) {
  const stripe = 10;
  const n = Math.ceil(h / stripe);
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <rect
          key={i}
          x={0}
          y={y0 + i * stripe}
          width={w}
          height={stripe}
          fill={i % 2 ? "rgba(16,185,129,0.05)" : "rgba(16,185,129,0.02)"}
        />
      ))}
    </>
  );
}

function HLine({
  y,
  bold,
  dash,
  label,
  opacity,
}: {
  y: number;
  bold?: boolean;
  dash?: boolean;
  label?: string;
  opacity?: number;
}) {
  return (
    <g>
      <line
        x1={0}
        y1={y}
        x2={FIELD_W}
        y2={y}
        stroke={CHALK}
        strokeWidth={bold ? 0.5 : 0.22}
        strokeDasharray={dash ? "1.6,1.6" : undefined}
        opacity={opacity ?? (bold ? 0.65 : 0.3)}
      />
      {label && (
        <text
          x={1.8}
          y={y - 1}
          fill={CHALK}
          opacity={0.4}
          fontSize={2.4}
          fontFamily="monospace"
        >
          {label}
        </text>
      )}
    </g>
  );
}

function BallMarker({ x, y, pulse }: { x: number; y: number; pulse?: boolean }) {
  return (
    <g>
      {pulse && (
        <circle
          cx={x}
          cy={y}
          r={1.6}
          fill="none"
          stroke={GOLD}
          strokeWidth={0.4}
          className="kick-pulse"
        />
      )}
      <ellipse
        cx={x}
        cy={y}
        rx={1.35}
        ry={0.95}
        transform={`rotate(-38 ${x} ${y})`}
        fill={GOLD}
        stroke="#fff"
        strokeWidth={0.28}
      />
      <line
        x1={x - 0.55}
        y1={y + 0.42}
        x2={x + 0.55}
        y2={y - 0.42}
        stroke="#1a1400"
        strokeWidth={0.22}
      />
    </g>
  );
}

function OriginMarker({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={1.5} fill="none" stroke={GOLD} strokeWidth={0.35} opacity={0.9} />
      <circle cx={x} cy={y} r={0.55} fill={GOLD} />
      <line x1={x - 2.3} y1={y} x2={x + 2.3} y2={y} stroke={GOLD} strokeWidth={0.22} opacity={0.6} />
      <line x1={x} y1={y - 2.3} x2={x} y2={y + 2.3} stroke={GOLD} strokeWidth={0.22} opacity={0.6} />
    </g>
  );
}

/** Vuelo de la pelota: parábola punteada animada entre dos puntos SVG */
function Flight({ from, to, bounce }: { from: Pt; to: Pt; bounce?: boolean }) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Curvatura perpendicular, proporcional a la distancia
  const arc = bounce ? 0 : Math.min(7, len * 0.22);
  const cx = mx - (dy / len) * arc;
  const cy = my + (dx / len) * arc;
  return (
    <g>
      <path
        d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
        fill="none"
        stroke={GOLD}
        strokeWidth={0.32}
        strokeDasharray={bounce ? "0.7,1.1" : "1.3,1"}
        opacity={0.8}
        className="flight-dash"
      />
      {bounce &&
        [0.35, 0.6, 0.8, 0.93].map((t) => (
          <circle
            key={t}
            cx={from.x + dx * t}
            cy={from.y + dy * t}
            r={0.35}
            fill={GOLD}
            opacity={0.5}
          />
        ))}
    </g>
  );
}

function Posts({ y = 0 }: { y?: number }) {
  const gx = POSTS_X - POSTS_GAP / 2;
  return (
    <g>
      <line x1={gx} y1={y - 1.5} x2={gx} y2={y + 1.7} stroke={GOLD} strokeWidth={0.9} strokeLinecap="round" />
      <line x1={gx + POSTS_GAP} y1={y - 1.5} x2={gx + POSTS_GAP} y2={y + 1.7} stroke={GOLD} strokeWidth={0.9} strokeLinecap="round" />
      <line x1={gx} y1={y} x2={gx + POSTS_GAP} y2={y} stroke={GOLD} strokeWidth={0.7} />
    </g>
  );
}

export function TacticalField({ mode, kicks, origin, end, onTap }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [flash, setFlash] = useState(false);
  const g = GEOM[mode];
  const spec = MODE_SPECS[mode];

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pt = g.fromScreen(
      (e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height,
    );
    if (mode === "palos" && pt.y < 1.5) return; // no patear desde el in-goal
    if (navigator.vibrate) navigator.vibrate(8);
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    onTap(Math.round(pt.x * 100) / 100, Math.round(pt.y * 100) / 100);
  };

  const ghosts = kicks.slice(-24);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border transition-colors duration-150 ${
        flash ? "border-gold-400/60" : "border-navy-300/20"
      }`}
      style={{
        aspectRatio: `${g.w}/${g.h}`,
        maxHeight: "62dvh",
        margin: "0 auto",
        background:
          "linear-gradient(180deg, rgba(6,30,20,0.9), rgba(5,16,12,0.95))",
      }}
    >
      <svg
        ref={svgRef}
        viewBox={g.viewBox}
        className="h-full w-full cursor-crosshair touch-none select-none"
        onPointerDown={handlePointer}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="touchHatch" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="1.6" stroke={CHALK} strokeWidth="0.25" opacity="0.35" />
          </pattern>
        </defs>

        {/* ══ MODO PALOS ══ */}
        {mode === "palos" && (
          <>
            <GrassStripes w={FIELD_W} h={FIELD_H} />
            <HLine y={1.5} bold opacity={0.85} />
            <HLine y={6.5} dash />
            <HLine y={23.5} bold label="22" opacity={0.5} />
            <HLine y={41.5} dash label="10" opacity={0.35} />
            <HLine y={FIELD_H - 0.3} bold opacity={0.6} />
            {[5, 15, 55, 65].map((x) => (
              <g key={x} stroke={CHALK} strokeWidth={0.18} opacity={0.25}>
                <line x1={x} y1={22.5} x2={x} y2={24.5} />
                <line x1={x} y1={40.5} x2={x} y2={42.5} />
              </g>
            ))}
            <Posts y={1.5} />
            <circle cx={POSTS_X} cy={1.5} r={0.7} fill={GOLD} opacity={0.9} />

            {/* Historial de la sesión */}
            {ghosts.map((k) =>
              k.isMade ? (
                <circle key={k.id} cx={k.x} cy={k.y} r={1.1} fill="#10b981" opacity={0.85} stroke="#050810" strokeWidth={0.2} />
              ) : (
                <g key={k.id} stroke="#e5484d" strokeWidth={0.45} opacity={0.85} strokeLinecap="round">
                  <line x1={k.x - 0.9} y1={k.y - 0.9} x2={k.x + 0.9} y2={k.y + 0.9} />
                  <line x1={k.x - 0.9} y1={k.y + 0.9} x2={k.x + 0.9} y2={k.y - 0.9} />
                </g>
              ),
            )}

            {origin && (
              <g>
                <Flight from={{ x: origin.x, y: origin.y }} to={{ x: POSTS_X, y: 1.5 }} />
                <BallMarker x={origin.x} y={origin.y} pulse />
              </g>
            )}
          </>
        )}

        {/* ══ MODO SALIDA DE 22 ══ */}
        {mode === "salida" && (
          <>
            <GrassStripes w={FIELD_W} h={SALIDA_H} />
            {/* Franjas tácticas de caída (desde la 22 propia, abajo) */}
            <rect x={0} y={g.toSvgY(10)} width={FIELD_W} height={10} fill="rgba(229,72,77,0.10)" />
            <rect x={0} y={g.toSvgY(25)} width={FIELD_W} height={15} fill="rgba(255,196,0,0.10)" />
            <rect x={0} y={0} width={FIELD_W} height={g.toSvgY(25)} fill="rgba(16,185,129,0.07)" />
            <text x={FIELD_W - 1.5} y={g.toSvgY(5) + 0.8} textAnchor="end" fill="#e5484d" opacity={0.75} fontSize={2.2} fontFamily="monospace">CORTA</text>
            <text x={FIELD_W - 1.5} y={g.toSvgY(17.5) + 0.8} textAnchor="end" fill={GOLD} opacity={0.8} fontSize={2.2} fontFamily="monospace">AIRE · DISPUTA</text>
            <text x={FIELD_W - 1.5} y={g.toSvgY(40) + 0.8} textAnchor="end" fill="#34d399" opacity={0.8} fontSize={2.2} fontFamily="monospace">TERRITORIO</text>

            <HLine y={g.toSvgY(0)} bold opacity={0.85} label="" />
            <text x={1.8} y={g.toSvgY(0) - 1.2} fill={CHALK} opacity={0.6} fontSize={2.4} fontFamily="monospace">TU 22</text>
            <HLine y={g.toSvgY(10)} dash label="10 m" />
            <HLine y={g.toSvgY(28)} bold label="MITAD" opacity={0.55} />
            <HLine y={g.toSvgY(38)} dash label="10 m rival" opacity={0.3} />
            <HLine y={g.toSvgY(56) + 0.25} bold label="22 RIVAL" opacity={0.5} />

            {/* Tee fijo en el centro de tu 22 */}
            <OriginMarker x={SALIDA_ORIGIN.x} y={g.toSvgY(0)} />

            {ghosts.map((k) =>
              k.endX !== undefined && k.endY !== undefined ? (
                <circle
                  key={k.id}
                  cx={k.endX}
                  cy={g.toSvgY(k.endY)}
                  r={1}
                  fill={k.isMade ? "#10b981" : "#e5484d"}
                  opacity={0.75}
                  stroke="#050810"
                  strokeWidth={0.2}
                />
              ) : null,
            )}

            {end && (
              <g>
                <Flight
                  from={{ x: SALIDA_ORIGIN.x, y: g.toSvgY(0) }}
                  to={{ x: end.x, y: g.toSvgY(end.y) }}
                />
                <BallMarker x={end.x} y={g.toSvgY(end.y)} pulse />
              </g>
            )}
          </>
        )}

        {/* ══ MODO TOUCH ══ */}
        {mode === "touch" && (
          <>
            <GrassStripes w={FIELD_W} h={TOUCH_H} />
            {/* Corredores de touch */}
            <rect x={-TOUCH_MARGIN} y={0} width={TOUCH_MARGIN} height={TOUCH_H} fill="url(#touchHatch)" />
            <rect x={FIELD_W} y={0} width={TOUCH_MARGIN} height={TOUCH_H} fill="url(#touchHatch)" />
            <line x1={0} y1={0} x2={0} y2={TOUCH_H} stroke={CHALK} strokeWidth={0.5} opacity={0.8} />
            <line x1={FIELD_W} y1={0} x2={FIELD_W} y2={TOUCH_H} stroke={CHALK} strokeWidth={0.5} opacity={0.8} />
            <text x={-TOUCH_MARGIN / 2} y={TOUCH_H / 2} fill={CHALK} opacity={0.55} fontSize={2.4} fontFamily="monospace" textAnchor="middle" transform={`rotate(-90 ${-TOUCH_MARGIN / 2} ${TOUCH_H / 2})`}>TOUCH</text>
            <text x={FIELD_W + TOUCH_MARGIN / 2} y={TOUCH_H / 2} fill={CHALK} opacity={0.55} fontSize={2.4} fontFamily="monospace" textAnchor="middle" transform={`rotate(90 ${FIELD_W + TOUCH_MARGIN / 2} ${TOUCH_H / 2})`}>TOUCH</text>

            {[10, 20, 30, 40, 50].map((m) => (
              <HLine key={m} y={g.toSvgY(m)} dash={m % 20 !== 0} label={`${m} m`} opacity={0.28} />
            ))}
            <HLine y={g.toSvgY(0)} bold opacity={0.5} />

            {ghosts.map((k) =>
              k.endX !== undefined && k.endY !== undefined ? (
                <circle key={k.id} cx={k.endX} cy={g.toSvgY(k.endY)} r={1} fill={k.isMade ? "#10b981" : "#e5484d"} opacity={0.7} stroke="#050810" strokeWidth={0.2} />
              ) : null,
            )}

            {origin && <OriginMarker x={origin.x} y={g.toSvgY(origin.y)} />}
            {origin && end && (
              <g>
                <Flight from={{ x: origin.x, y: g.toSvgY(origin.y) }} to={{ x: end.x, y: g.toSvgY(end.y) }} />
                {(end.x < 0 || end.x > FIELD_W) ? (
                  <g>
                    {/* Banderín del touch encontrado */}
                    <line x1={end.x} y1={g.toSvgY(end.y)} x2={end.x} y2={g.toSvgY(end.y) - 3.4} stroke={CHALK} strokeWidth={0.35} />
                    <path d={`M ${end.x} ${g.toSvgY(end.y) - 3.4} l ${end.x < 0 ? 2.6 : -2.6} 0.9 l ${end.x < 0 ? -2.6 : 2.6} 0.9 Z`} fill={GOLD} />
                    <circle cx={end.x} cy={g.toSvgY(end.y)} r={0.55} fill={GOLD} />
                  </g>
                ) : (
                  <BallMarker x={end.x} y={g.toSvgY(end.y)} pulse />
                )}
              </g>
            )}
            {origin && !end && <BallMarker x={origin.x} y={g.toSvgY(origin.y)} pulse />}
          </>
        )}

        {/* ══ MODO RASTRÓN ══ */}
        {mode === "rastron" && (
          <>
            {/* In-goal */}
            <rect x={0} y={-INGOAL_DEPTH} width={FIELD_W} height={INGOAL_DEPTH} fill="rgba(255,196,0,0.08)" />
            <text x={POSTS_X} y={-INGOAL_DEPTH / 2 + 0.8} textAnchor="middle" fill={GOLD} opacity={0.5} fontSize={2.4} fontFamily="monospace">IN-GOAL</text>
            <GrassStripes w={FIELD_W} h={RASTRON_H} />
            <HLine y={0} bold opacity={0.85} />
            <HLine y={5} dash label="5 m" />
            <HLine y={22} bold label="22" opacity={0.55} />
            <Posts y={0} />

            {/* Línea defensiva sugerida */}
            {origin && (
              <g opacity={0.3}>
                {[8, 20, 32, 44, 56].map((x) => (
                  <circle key={x} cx={x + ((origin.y * 7) % 6)} cy={Math.max(2.5, origin.y - 6)} r={0.9} fill="#4f7fd6" />
                ))}
              </g>
            )}

            {ghosts.map((k) =>
              k.endX !== undefined && k.endY !== undefined ? (
                <circle key={k.id} cx={k.endX} cy={k.endY} r={1} fill={k.isMade ? "#10b981" : "#e5484d"} opacity={0.7} stroke="#050810" strokeWidth={0.2} />
              ) : null,
            )}

            {origin && <OriginMarker x={origin.x} y={origin.y} />}
            {origin && end && (
              <g>
                <Flight from={origin} to={end} bounce />
                <BallMarker x={end.x} y={end.y} pulse />
              </g>
            )}
            {origin && !end && <BallMarker x={origin.x} y={origin.y} pulse />}
          </>
        )}
      </svg>

      {/* Instrucción contextual */}
      <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-full border border-navy-300/25 bg-pitch-950/80 px-3 py-1 backdrop-blur">
        <p className="font-mono text-[9px] tracking-[0.14em] text-chalk-dim uppercase">
          {spec.twoTap && origin && !end ? spec.tapHint2 : spec.tapHint}
        </p>
      </div>

      {/* Marca de agua del escudo */}
      <div
        className="pointer-events-none absolute right-2 bottom-2 h-10 w-10 opacity-15"
        style={{
          backgroundImage: "url(/escudo.webp)",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />
    </div>
  );
}
