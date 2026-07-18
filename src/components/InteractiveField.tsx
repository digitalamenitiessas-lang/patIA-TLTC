"use client";

import { useRef, useState } from "react";
import { FIELD_W, FIELD_H, POSTS_X, POSTS_GAP } from "@/lib/field";
import type { Kick } from "@/lib/types";

interface Props {
  kicks: Kick[];
  pending: { x: number; y: number } | null;
  onTap: (x: number, y: number) => void;
}

/**
 * Media cancha táctil: la línea de meta (con los postes) arriba,
 * mitad de cancha abajo. Un toque marca el punto de pateo.
 */
export function InteractiveField({ kicks, pending, onTap }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [flash, setFlash] = useState(false);

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * FIELD_W;
    const y = ((e.clientY - rect.top) / rect.height) * FIELD_H;
    if (y < 1.5) return; // no patear desde adentro del in-goal
    if (navigator.vibrate) navigator.vibrate(8);
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    onTap(Math.round(x * 100) / 100, Math.round(y * 100) / 100);
  };

  const gx = POSTS_X - POSTS_GAP / 2;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border transition-colors duration-150 ${
        flash ? "border-gold-400/60" : "border-navy-300/20"
      }`}
      style={{
        aspectRatio: `${FIELD_W}/${FIELD_H}`,
        background:
          "linear-gradient(180deg, rgba(6,30,20,0.9), rgba(5,16,12,0.95))",
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
        className="h-full w-full cursor-crosshair touch-none select-none"
        onPointerDown={handlePointer}
      >
        {/* Franjas de césped */}
        {Array.from({ length: 5 }).map((_, i) => (
          <rect
            key={i}
            x="0"
            y={i * 10}
            width={FIELD_W}
            height="10"
            fill={i % 2 ? "rgba(16,185,129,0.05)" : "rgba(16,185,129,0.02)"}
          />
        ))}

        {/* Línea de meta */}
        <line x1="0" y1="1.5" x2={FIELD_W} y2="1.5" stroke="#e9edf5" strokeWidth="0.55" opacity="0.85" />
        {/* Línea de 5 m */}
        <line x1="0" y1="6.5" x2={FIELD_W} y2="6.5" stroke="#e9edf5" strokeWidth="0.2" strokeDasharray="1.6,1.6" opacity="0.3" />
        {/* Línea de 22 */}
        <line x1="0" y1="23.5" x2={FIELD_W} y2="23.5" stroke="#e9edf5" strokeWidth="0.3" opacity="0.5" />
        <text x="1.8" y="22.4" fill="#e9edf5" opacity="0.45" fontSize="2.4" fontFamily="monospace">22</text>
        {/* Línea de 10 m (desde mitad) */}
        <line x1="0" y1="41.5" x2={FIELD_W} y2="41.5" stroke="#e9edf5" strokeWidth="0.2" strokeDasharray="1.6,1.6" opacity="0.35" />
        <text x="1.8" y="40.4" fill="#e9edf5" opacity="0.35" fontSize="2.4" fontFamily="monospace">10</text>
        {/* Mitad de cancha */}
        <line x1="0" y1={FIELD_H - 0.3} x2={FIELD_W} y2={FIELD_H - 0.3} stroke="#e9edf5" strokeWidth="0.5" opacity="0.6" />

        {/* Marcas de hash cada 5 m verticales */}
        {[5, 15, 55, 65].map((x) => (
          <g key={x} stroke="#e9edf5" strokeWidth="0.18" opacity="0.25">
            <line x1={x} y1="22.5" x2={x} y2="24.5" />
            <line x1={x} y1="40.5" x2={x} y2="42.5" />
          </g>
        ))}

        {/* Postes (vista cenital): base + palos en oro */}
        <g>
          <line x1={gx} y1="0" x2={gx} y2="3.2" stroke="#ffc400" strokeWidth="0.9" strokeLinecap="round" />
          <line x1={gx + POSTS_GAP} y1="0" x2={gx + POSTS_GAP} y2="3.2" stroke="#ffc400" strokeWidth="0.9" strokeLinecap="round" />
          <line x1={gx} y1="1.5" x2={gx + POSTS_GAP} y2="1.5" stroke="#ffc400" strokeWidth="0.7" />
          <circle cx={POSTS_X} cy="1.5" r="0.7" fill="#ffc400" opacity="0.9" />
        </g>

        {/* Historial de la sesión */}
        {kicks.map((k) => (
          <g key={k.id}>
            {k.isMade ? (
              <circle cx={k.x} cy={k.y} r="1.1" fill="#10b981" opacity="0.85" stroke="#050810" strokeWidth="0.2" />
            ) : (
              <g stroke="#e5484d" strokeWidth="0.45" opacity="0.85" strokeLinecap="round">
                <line x1={k.x - 0.9} y1={k.y - 0.9} x2={k.x + 0.9} y2={k.y + 0.9} />
                <line x1={k.x - 0.9} y1={k.y + 0.9} x2={k.x + 0.9} y2={k.y - 0.9} />
              </g>
            )}
          </g>
        ))}

        {/* Punto pendiente + trayectoria a los postes */}
        {pending && (
          <g>
            <line
              x1={pending.x}
              y1={pending.y}
              x2={POSTS_X}
              y2="1.5"
              stroke="#ffc400"
              strokeWidth="0.3"
              strokeDasharray="1.2,1"
              opacity="0.7"
            />
            <circle cx={pending.x} cy={pending.y} r="1.6" fill="none" stroke="#ffc400" strokeWidth="0.4" className="kick-pulse" />
            <circle cx={pending.x} cy={pending.y} r="1.3" fill="#ffc400" stroke="#fff" strokeWidth="0.3" />
          </g>
        )}
      </svg>

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
