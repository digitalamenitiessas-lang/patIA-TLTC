"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { usePlayer } from "@/lib/store";

/**
 * Si la cuenta entró con Google y todavía no fue aprobada por el
 * administrador de la clínica, bloquea la app y muestra el estado.
 * Los invitados (sesión anónima) nunca pasan por acá.
 */
export function ApprovalGate({ children }: { children: React.ReactNode }) {
  const { ready, account, signOut, getAccessToken } = usePlayer();
  const notified = useRef(false);

  const blocked =
    ready &&
    account.kind === "google" &&
    account.approvalStatus !== "approved";

  // Avisa al admin (push + mail) una sola vez por carga; el servidor
  // deduplica con access_notified_at.
  useEffect(() => {
    if (!blocked || account.approvalStatus !== "pending" || notified.current)
      return;
    notified.current = true;
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      await fetch("/api/access-request", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    })();
  }, [blocked, account.approvalStatus, getAccessToken]);

  if (!blocked) return <>{children}</>;

  const rejected = account.approvalStatus === "rejected";

  return (
    <main className="flex min-h-[80dvh] flex-col items-center justify-center gap-6 text-center">
      <Image
        src="/escudo.webp"
        alt="Escudo TLTC"
        width={72}
        height={77}
        className="drop-shadow-[0_0_24px_rgba(255,196,0,0.25)]"
      />
      <div className="tele-card-gold max-w-sm px-7 py-6">
        <p className="text-4xl">{rejected ? "🚫" : "⏳"}</p>
        <h1 className="display mt-2 text-xl text-gold-300">
          {rejected ? "Acceso no habilitado" : "Esperando al entrenador"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-chalk-dim">
          {rejected ? (
            <>
              Tu cuenta {account.email && <b>{account.email}</b>} no fue
              habilitada para la clínica. Si creés que es un error, hablá con
              tu entrenador.
            </>
          ) : (
            <>
              Tu cuenta {account.email && <b>{account.email}</b>} ya está
              creada. El administrador de la clínica recibió el aviso y tiene
              que aprobarla — te llega una notificación apenas lo haga.
            </>
          )}
        </p>
      </div>
      <button
        onClick={signOut}
        className="rounded-xl border border-navy-300/25 px-6 py-3 font-mono text-[11px] tracking-wider text-chalk-dim uppercase hover:text-chalk"
      >
        Salir y entrar como invitado
      </button>
    </main>
  );
}
