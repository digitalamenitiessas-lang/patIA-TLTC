"use client";

/** Anillo de efectividad estilo telemetría, con glow y punto de avance */
export function EffRing({
  pct,
  size = 120,
  label,
}: {
  pct: number; // 0–100
  size?: number;
  label: string;
}) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(pct, 0), 100);
  const offset = circ * (1 - clamped / 100);

  // Punto de avance en el extremo del arco
  const angle = (clamped / 100) * 2 * Math.PI - Math.PI / 2;
  const cx = size / 2 + r * Math.cos(angle);
  const cy = size / 2 + r * Math.sin(angle);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(61,127,217,0.16)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#goldGrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="ring-animate"
            style={{
              "--ring-circ": `${circ}`,
              filter: "drop-shadow(0 0 5px rgba(255,209,0,0.45))",
            } as React.CSSProperties}
          />
        </g>
        {clamped > 0 && (
          <circle cx={cx} cy={cy} r={stroke / 2 + 1.5} fill="#fffbe6" className="ring-animate" />
        )}
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffdf4d" />
            <stop offset="60%" stopColor="#ffd100" />
            <stop offset="100%" stopColor="#c99a00" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tele-num gold-sheen text-2xl font-semibold">
          {Math.round(pct)}
          <span className="text-sm">%</span>
        </span>
        <span className="tech-label mt-0.5">{label}</span>
      </div>
    </div>
  );
}
