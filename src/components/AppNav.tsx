"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { usePlayer } from "@/lib/store";
import { useTour } from "@/lib/tour";

const ICONS = {
  inicio: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h4.5V14h4v5.5h4.5V10" />,
  academia: (
    <path d="M12 4 2.5 8.5 12 13l9.5-4.5L12 4Zm-6 7v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
  ),
  clinica: (
    <path d="M7 3v3m10-3v3M4.5 8.5h15M6 5h12a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V6.5A1.5 1.5 0 0 1 6 5Zm6 7v4m-2-2h4" />
  ),
  ranking: (
    <path d="M8 4h8v3.5a4 4 0 0 1-8 0V4ZM8 5.5H4.8a3.2 3.2 0 0 0 3.4 3.4M16 5.5h3.2a3.2 3.2 0 0 1-3.4 3.4M12 11.5V15m-3.5 5.5h7M10 15h4l.8 5.5H9.2L10 15Z" />
  ),
  stats: <path d="M4 20V10m5.3 10V4m5.4 16v-8m5.3 8V7" />,
  patia: (
    <path d="M12 3a7 7 0 0 0-7 7v4.5A2.5 2.5 0 0 0 7.5 17H9v-5H6.8M12 3a7 7 0 0 1 7 7v4.5a2.5 2.5 0 0 1-2.5 2.5H15v-5h2.2M10 20h4" />
  ),
} as const;

/** Barra inferior móvil: Cargar es el botón central; Stats vive en Inicio y sidebar */
const MOBILE_TABS = [
  { href: "/", label: "Inicio", icon: ICONS.inicio },
  { href: "/clinica", label: "Clínica", icon: ICONS.clinica },
  { href: "/cargar", label: "Cargar", icon: null }, // botón central especial
  { href: "/academia", label: "Academia", icon: ICONS.academia },
  { href: "/ranking", label: "Ranking", icon: ICONS.ranking },
  { href: "/patia", label: "PatIA", icon: ICONS.patia },
];

/** Sidebar de escritorio: navegación completa */
const SIDEBAR_TABS = [
  { href: "/", label: "Inicio", icon: ICONS.inicio },
  { href: "/clinica", label: "Clínica", icon: ICONS.clinica },
  { href: "/cargar", label: "Cargar", icon: null },
  { href: "/ranking", label: "Ranking", icon: ICONS.ranking },
  { href: "/academia", label: "Academia", icon: ICONS.academia },
  { href: "/stats", label: "Stats", icon: ICONS.stats },
  { href: "/patia", label: "PatIA", icon: ICONS.patia },
];

const BallIcon = (
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
);

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppNav() {
  const pathname = usePathname();
  const { account, cloud } = usePlayer();
  const { show: showTour } = useTour();

  return (
    <>
      {/* ── Sidebar de escritorio ─────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-navy-300/15 bg-pitch-900/70 backdrop-blur-xl lg:flex">
        <Link href="/" className="flex items-center gap-3 px-5 pt-7 pb-6">
          <Image
            src="/escudo.webp"
            alt="Escudo TLTC"
            width={40}
            height={43}
            className="drop-shadow-[0_0_14px_rgba(255,196,0,0.25)]"
          />
          <span className="min-w-0">
            <span className="display block text-lg leading-tight text-chalk">
              PatIA
            </span>
            <span className="tech-label">Lawn Tennis</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {SIDEBAR_TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            if (tab.icon === null) {
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="btn-gold my-2 flex items-center justify-center gap-2.5 rounded-2xl py-3 text-xs font-bold tracking-wide uppercase"
                >
                  {BallIcon}
                  Cargar sesión
                </Link>
              );
            }
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-gold-400/10 text-gold-300"
                    : "text-chalk-dim hover:bg-pitch-800/70 hover:text-chalk"
                }`}
              >
                {active && (
                  <span className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gold-400 shadow-[0_0_8px_rgba(255,209,0,0.6)]" />
                )}
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
                <span className="font-mono text-[11px] tracking-[0.14em] uppercase">
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {account.role === "admin" && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive(pathname, "/admin")
                  ? "bg-gold-400/10 text-gold-300"
                  : "text-chalk-dim hover:bg-pitch-800/70 hover:text-chalk"
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
                <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3Z" />
                <path d="m9.5 12 1.8 1.8 3.4-3.6" />
              </svg>
              <span className="font-mono text-[11px] tracking-[0.14em] uppercase">
                Admin
              </span>
            </Link>
          )}
        </nav>

        <div className="border-t border-navy-300/10 px-5 py-4">
          <Link
            href="/perfil"
            className={`flex items-center gap-3 rounded-xl py-1 transition-colors ${
              isActive(pathname, "/perfil")
                ? "text-gold-300"
                : "text-chalk-dim hover:text-chalk"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <circle cx="12" cy="8.5" r="3.5" />
              <path d="M4.5 20c1.5-3.4 4.2-5 7.5-5s6 1.6 7.5 5" />
            </svg>
            <span className="font-mono text-[11px] tracking-[0.14em] uppercase">
              Perfil
            </span>
          </Link>
          <button
            onClick={showTour}
            className="mt-3 flex items-center gap-2 text-chalk-faint transition-colors hover:text-gold-300"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-navy-300/35 font-mono text-[10px]">
              ?
            </span>
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase">
              Cómo funciona
            </span>
          </button>
          <p className="tech-label mt-2">
            {cloud === "online"
              ? "● nube sincronizada"
              : cloud === "syncing"
                ? "◌ sincronizando"
                : "○ modo local"}
          </p>
        </div>
      </aside>

      {/* ── Barra inferior móvil ──────────────────────────────── */}
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 lg:hidden">
        <div className="saltire-weave mx-3 mb-4 flex items-end justify-between rounded-3xl border border-navy-300/20 bg-pitch-900/92 px-1.5 pt-2 pb-2 shadow-[0_-10px_44px_rgba(3,6,14,0.92)] backdrop-blur-xl">
          {MOBILE_TABS.map((tab) => {
            const active = isActive(pathname, tab.href);

            if (tab.icon === null) {
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-label="Cargar sesión"
                  className="relative -mt-8 flex h-16 w-16 shrink-0 flex-col items-center justify-center"
                >
                  {/* Halo dorado pulsante */}
                  <span className="absolute inset-0 rounded-full bg-gold-400/25 blur-md" />
                  <span className="btn-gold relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-pitch-950">
                    {BallIcon}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors ${
                  active ? "text-gold-400" : "text-chalk-dim hover:text-chalk"
                }`}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-5 rounded-full bg-gold-400 shadow-[0_0_8px_rgba(255,209,0,0.6)]" />
                )}
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
                  className={`font-mono text-[8px] tracking-[0.06em] uppercase ${
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

      {/* ── Botón flotante de ayuda (móvil) ───────────────────── */}
      <button
        onClick={showTour}
        aria-label="Cómo funciona PatIA"
        className="fixed right-4 bottom-32 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-gold-400/35 bg-pitch-900/85 font-mono text-sm text-gold-300 shadow-[0_4px_18px_rgba(3,6,14,0.6)] backdrop-blur-lg lg:hidden"
      >
        ?
      </button>
    </>
  );
}
