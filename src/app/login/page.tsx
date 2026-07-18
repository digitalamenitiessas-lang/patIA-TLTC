"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { ready, account, signInWithGoogle } = usePlayer();

  // Si vuelve del OAuth ya aprobado, directo al inicio.
  // Si quedó pendiente, el ApprovalGate se encarga en cualquier ruta.
  useEffect(() => {
    if (ready && account.kind === "google" && account.approvalStatus === "approved") {
      router.replace("/");
    }
  }, [ready, account, router]);

  return (
    <main className="flex min-h-[80dvh] flex-col items-center justify-center gap-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/escudo.webp"
          alt="Escudo Tucumán Lawn Tennis Club"
          width={84}
          height={90}
          priority
          className="drop-shadow-[0_0_28px_rgba(255,196,0,0.3)]"
        />
        <div>
          <p className="tech-label">Clínica de Pateadores · D. Tejerizo</p>
          <h1 className="display text-3xl text-chalk">PatIA</h1>
        </div>
      </div>

      <div className="tele-card w-full max-w-sm px-6 py-6">
        <p className="text-sm leading-relaxed text-chalk-dim">
          Con tu cuenta de Google guardás tu progreso para siempre y podés
          entrar desde cualquier dispositivo. El administrador de la clínica
          aprueba cada cuenta nueva.
        </p>

        <button
          onClick={() => void signInWithGoogle()}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-navy-300/25 bg-chalk py-3.5 text-sm font-semibold text-pitch-950 transition-transform active:scale-[0.98]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5">
            <path
              fill="#4285F4"
              d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.14-4.06 1.14-3.12 0-5.77-2.11-6.71-4.95H1.29v3.09A12 12 0 0 0 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l4-3.09Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.63l4 3.09C6.23 6.88 8.88 4.77 12 4.77Z"
            />
          </svg>
          Continuar con Google
        </button>

        {account.kind === "guest" && (
          <p className="mt-3 text-[11px] leading-relaxed text-chalk-faint">
            Estás como invitado: al vincular Google, todas tus sesiones y tu
            XP se conservan.
          </p>
        )}

        <div className="chalk-line my-5" />

        <button
          onClick={() => router.push("/")}
          className="w-full rounded-xl border border-navy-300/25 py-3 font-mono text-[11px] tracking-wider text-chalk-dim uppercase hover:text-chalk"
        >
          Seguir como invitado
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-chalk-faint">
          Sin registro: tus datos viven en este dispositivo y se respaldan en
          la nube del club de forma anónima.
        </p>
      </div>

      <p className="font-mono text-[10px] text-chalk-faint">
        Tucumán Lawn Tennis Club · est. 1902
      </p>
    </main>
  );
}
