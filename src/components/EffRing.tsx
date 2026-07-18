"use client";

/** Anillo de efectividad estilo telemetría */
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
  const offset = circ * (1 - Math.min(pct, 100) / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(79,127,214,0.14)"
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
          style={{ "--ring-circ": `${circ}` } as React.CSSProperties}
        />
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd747" />
            <stop offset="100%" stopColor="#c99700" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tele-num text-2xl font-semibold text-gold-300">
          {Math.round(pct)}
          <span className="text-sm text-gold-500">%</span>
        </span>
        <span className="tech-label mt-0.5">{label}</span>
      </div>
    </div>
  );
}
