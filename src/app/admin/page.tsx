"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { usePlayer } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";

interface Row {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  division: string;
  role: string;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
  is_anonymous?: boolean;
}

export default function AdminPage() {
  const { ready, account, userId, getAccessToken } = usePlayer();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase
      .from("player_profiles")
      .select(
        "id, full_name, email, avatar_url, division, role, approval_status, created_at",
      )
      .order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Traer el plantel es sincronizar con un sistema externo (Supabase)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready && account.role === "admin") void load();
  }, [ready, account.role, load]);

  const decide = async (playerId: string, decision: "approved" | "rejected") => {
    setBusy(playerId);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/decide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ playerId, decision }),
      });
      if (res.ok) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === playerId ? { ...r, approval_status: decision } : r,
          ),
        );
      }
    } finally {
      setBusy(null);
    }
  };

  if (!ready) return null;

  if (account.role !== "admin") {
    return (
      <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-4xl">🔒</p>
        <p className="text-sm text-chalk-dim">
          Esta sección es solo para el administrador de la clínica.
        </p>
      </main>
    );
  }

  const pending = rows.filter((r) => r.approval_status === "pending");
  const others = rows.filter((r) => r.approval_status !== "pending");

  return (
    <main className="flex flex-col gap-5">
      <header className="rise" style={{ "--rise-delay": "0s" } as React.CSSProperties}>
        <p className="tech-label">Panel del entrenador</p>
        <h1 className="display text-2xl text-chalk">Administración</h1>
      </header>

      {/* Pendientes */}
      <section className="rise flex flex-col gap-2.5" style={{ "--rise-delay": "0.08s" } as React.CSSProperties}>
        <p className="tech-label px-1">
          Esperando aprobación · {pending.length}
        </p>
        {loading ? (
          <div className="tele-card px-5 py-6 text-center text-sm text-chalk-dim">
            Cargando…
          </div>
        ) : pending.length === 0 ? (
          <div className="tele-card px-5 py-6 text-center text-sm text-chalk-dim">
            Nadie en la puerta del club ahora mismo.
          </div>
        ) : (
          pending.map((r) => (
            <div key={r.id} className="tele-card-gold px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Avatar row={r} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-chalk">
                    {r.full_name}
                  </p>
                  <p className="truncate text-[11px] text-chalk-dim">
                    {r.email ?? "sin mail"} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  disabled={busy === r.id}
                  onClick={() => decide(r.id, "approved")}
                  className="flex-1 rounded-xl bg-try-500 py-2.5 text-xs font-bold text-white uppercase active:scale-95 disabled:opacity-50"
                >
                  Aprobar ✓
                </button>
                <button
                  disabled={busy === r.id}
                  onClick={() => decide(r.id, "rejected")}
                  className="flex-1 rounded-xl border border-miss-500/60 py-2.5 text-xs font-bold text-miss-500 uppercase active:scale-95 disabled:opacity-50"
                >
                  Rechazar ✗
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Plantel */}
      <section className="rise flex flex-col gap-2" style={{ "--rise-delay": "0.16s" } as React.CSSProperties}>
        <p className="tech-label px-1">Plantel · {others.length}</p>
        <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
          {others.map((r) => (
            <div key={r.id} className="tele-card flex items-center gap-3 px-4 py-3">
              <Avatar row={r} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-chalk">
                  {r.full_name}
                  {r.role === "admin" && (
                    <span className="ml-1.5 rounded-full border border-gold-400/40 px-1.5 py-0.5 font-mono text-[9px] text-gold-300 uppercase">
                      admin
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] text-chalk-dim">
                  {r.email ?? "invitado anónimo"} · {r.division}
                </p>
              </div>
              {r.approval_status === "rejected" ? (
                <button
                  disabled={busy === r.id}
                  onClick={() => decide(r.id, "approved")}
                  className="shrink-0 rounded-lg border border-try-500/50 px-2.5 py-1.5 font-mono text-[10px] text-try-400 uppercase"
                >
                  Rehabilitar
                </button>
              ) : (
                r.id !== userId &&
                r.email && (
                  <button
                    disabled={busy === r.id}
                    onClick={() => decide(r.id, "rejected")}
                    className="shrink-0 rounded-lg border border-navy-300/25 px-2.5 py-1.5 font-mono text-[10px] text-chalk-faint uppercase hover:border-miss-500/50 hover:text-miss-500"
                  >
                    Revocar
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Avatar({ row }: { row: Row }) {
  if (row.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={row.avatar_url}
        alt=""
        referrerPolicy="no-referrer"
        className="h-10 w-10 shrink-0 rounded-full border border-navy-300/25 object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-navy-300/25 bg-pitch-800">
      <Image src="/escudo.webp" alt="" width={22} height={24} className="opacity-60" />
    </div>
  );
}
