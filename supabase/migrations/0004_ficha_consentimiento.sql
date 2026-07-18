-- PatIA Lawn Tennis · Migración 0004
-- Ficha completa del jugador (DNI, puesto) y consentimiento informado.

alter table public.player_profiles
  add column if not exists dni text,
  add column if not exists position text,
  add column if not exists consent_accepted_at timestamptz;
