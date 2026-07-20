-- PatIA Lawn Tennis · Migración 0008
-- Clima objetivo de la sesión (autocompletado desde Open-Meteo).

alter table public.training_sessions
  add column if not exists temperature_c numeric(4,1),
  add column if not exists weather_auto boolean not null default false;
