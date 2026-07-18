"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "Inicio",
    icon: (
      <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h4.5V14h4v5.5h4.5V10" />
    ),
  },
  {
    href: "/academia",
    label: "Academia",
    icon: (
      <path d="M12 4 2.5 8.5 12 13l9.5-4.5L12 4Zm-6 7v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
    ),
  },
  {
    href: "/cargar",
    label: "Cargar",
    icon: null, // botón central especial
  },
  {
    href: "/stats",
    label: "Stats",
    icon: <path d="M4 20V10m5.3 10V4m5.4 16v-8m5.3 8V7" />,
  },
  {
    href: "/patia",
    label: "PatIA",
    icon: (
      <path d="M12 3a7 7 0 0 0-7 7v4.5A2.5 2.5 0 0 0 7.5 17H9v-5H6.8M12 3a7 7 0 0 1 7 7v4.5a2.5 2.5 0 0 1-2.5 2.5H15v-5h2.2M10 20h4" />
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2">
      <div className="mx-4 mb-4 flex items-end justify-between rounded-3xl border border-navy-300/15 bg-pitch-900/90 px-3 pt-2 pb-2 shadow-[0_-8px_40px_rgba(5,8,16,0.9)] backdrop-blur-xl">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

          if (tab.icon === null) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label="Cargar sesión"
                className="btn-gold -mt-8 flex h-16 w-16 flex-col items-center justify-center rounded-full border-4 border-pitch-950"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  {/* Pelota de rugby */}
                  <ellipse cx="12" cy="12" rx="8.5" ry="5.5" transform="rotate(-38 12 12)" />
                  <path d="M9 15l6-6M10.4 13.6l1 1M12.6 11.4l1 1" strokeWidth="1.6" />
                </svg>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex w-14 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors ${
                active ? "text-gold-400" : "text-chalk-dim hover:text-chalk"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {tab.icon}
              </svg>
              <span
                className={`font-mono text-[9px] tracking-[0.12em] uppercase ${
                  active ? "text-gold-400" : ""
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
