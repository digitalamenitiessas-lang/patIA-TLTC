"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePlayer } from "./store";

const TOUR_KEY = "patia-tour-seen-v1";

interface TourCtx {
  open: boolean;
  show: () => void;
  hide: () => void;
}

const Ctx = createContext<TourCtx | null>(null);

/**
 * Controla el recorrido guiado. Se auto-abre una sola vez por dispositivo
 * (marca `localStorage`), recién cuando el jugador ya pasó la aprobación
 * y el onboarding — nunca compite con esas pantallas bloqueantes.
 */
export function TourProvider({ children }: { children: React.ReactNode }) {
  const { ready, profile, account } = usePlayer();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ready || !profile.consentAt) return;
    if (account.kind === "google" && account.approvalStatus !== "approved")
      return;
    try {
      if (!localStorage.getItem(TOUR_KEY)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOpen(true);
      }
    } catch {
      // localStorage no disponible: no interrumpimos la app por esto
    }
  }, [ready, profile.consentAt, account.kind, account.approvalStatus]);

  const hide = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      // sin espacio o modo privado
    }
  }, []);

  const show = useCallback(() => setOpen(true), []);

  return <Ctx.Provider value={{ open, show, hide }}>{children}</Ctx.Provider>;
}

export function useTour() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTour debe usarse dentro de TourProvider");
  return ctx;
}
