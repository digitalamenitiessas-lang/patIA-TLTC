-- PatIA Lawn Tennis · Clínica de Pateadores "Daniel Tejerizo"
-- Esquema inicial: perfiles, sesiones, patadas, insignias y espejo de videos.

create table if not exists public.player_profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  full_name text not null default 'Pateador/a',
  division text not null default 'M15',
  preferred_foot text not null default 'derecho'
    check (preferred_foot in ('derecho', 'izquierdo')),
  skill_level integer not null default 1 check (skill_level in (1, 2, 3)),
  xp integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.training_sessions (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references public.player_profiles(id) on delete cascade not null,
  session_date date default current_date not null,
  rpe_fatigue_index integer check (rpe_fatigue_index between 1 and 10),
  wind_velocity_kmh integer not null default 0,
  wind_direction text not null default 'calma'
    check (wind_direction in ('calma', 'en_contra', 'a_favor', 'cruzado_izq', 'cruzado_der')),
  psychological_note text,
  confidence integer check (confidence between 1 and 5),
  created_at timestamptz default now() not null
);

create table if not exists public.logged_kicks (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.training_sessions(id) on delete cascade not null,
  player_id uuid references public.player_profiles(id) on delete cascade not null,
  x_coord numeric(5,2) not null,
  y_coord numeric(5,2) not null,
  calculated_distance_m integer not null,
  calculated_angle_deg integer not null,
  is_made boolean not null,
  kick_category text not null
    check (kick_category in ('conversion', 'penalty', 'drop_kick', 'punt', 'salida_22', 'grubber')),
  effort_pct integer check (effort_pct between 10 and 100),
  created_at timestamptz default now() not null
);

create table if not exists public.player_badges (
  player_id uuid references public.player_profiles(id) on delete cascade not null,
  badge_id text not null,
  earned_at timestamptz default now() not null,
  primary key (player_id, badge_id)
);

create table if not exists public.youtube_video_mirror (
  id uuid default gen_random_uuid() primary key,
  youtube_video_id text unique not null,
  title text not null,
  description text,
  associated_level integer check (associated_level in (1, 2, 3)),
  drill_category text not null
    check (drill_category in ('biomecanica', 'rutina_mental', 'drop_kick', 'salida_22')),
  created_at timestamptz default now() not null
);

create index if not exists idx_kicks_player on public.logged_kicks (player_id, created_at desc);
create index if not exists idx_sessions_player on public.training_sessions (player_id, session_date desc);

alter table public.player_profiles enable row level security;
alter table public.training_sessions enable row level security;
alter table public.logged_kicks enable row level security;
alter table public.player_badges enable row level security;
alter table public.youtube_video_mirror enable row level security;

create policy "propio perfil: leer" on public.player_profiles
  for select using (auth.uid() = id);
create policy "propio perfil: crear" on public.player_profiles
  for insert with check (auth.uid() = id);
create policy "propio perfil: actualizar" on public.player_profiles
  for update using (auth.uid() = id);

create policy "propias sesiones: leer" on public.training_sessions
  for select using (auth.uid() = player_id);
create policy "propias sesiones: crear" on public.training_sessions
  for insert with check (auth.uid() = player_id);
create policy "propias sesiones: actualizar" on public.training_sessions
  for update using (auth.uid() = player_id);

create policy "propias patadas: leer" on public.logged_kicks
  for select using (auth.uid() = player_id);
create policy "propias patadas: crear" on public.logged_kicks
  for insert with check (auth.uid() = player_id);

create policy "propias insignias: leer" on public.player_badges
  for select using (auth.uid() = player_id);
create policy "propias insignias: crear" on public.player_badges
  for insert with check (auth.uid() = player_id);

-- Los videos de la clínica son visibles para cualquier usuario autenticado
create policy "videos: leer autenticados" on public.youtube_video_mirror
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');
