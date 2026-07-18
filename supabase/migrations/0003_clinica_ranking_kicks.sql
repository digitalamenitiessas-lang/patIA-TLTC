-- PatIA Lawn Tennis · Migración 0003
-- Cancha táctica por modo de patada, ranking/torneo, segmento Clínica
-- con devoluciones de los referentes pateadores del club.

-- 1 · Rol "coach" para los referentes
alter table public.player_profiles drop constraint if exists player_profiles_role_check;
alter table public.player_profiles
  add constraint player_profiles_role_check check (role in ('player', 'coach', 'admin'));

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.player_profiles
    where id = auth.uid()
      and role in ('admin', 'coach')
      and approval_status = 'approved'
  );
$$;

-- Lectura de datos de jugadores también para coaches (devoluciones)
drop policy if exists "staff: leer perfiles" on public.player_profiles;
create policy "staff: leer perfiles" on public.player_profiles
  for select using (public.is_staff());

drop policy if exists "staff: leer sesiones" on public.training_sessions;
create policy "staff: leer sesiones" on public.training_sessions
  for select using (public.is_staff());

drop policy if exists "staff: leer patadas" on public.logged_kicks;
create policy "staff: leer patadas" on public.logged_kicks
  for select using (public.is_staff());

-- 2 · Patadas con destino: salida de 22, touch y rastrón
--    (x/y siguen siendo el origen; end_* es dónde terminó la pelota)
alter table public.logged_kicks
  add column if not exists end_x_coord numeric(6,2),
  add column if not exists end_y_coord numeric(6,2),
  add column if not exists result text,
  add column if not exists meters_gained integer;

-- 3 · Catálogo de referentes pateadores de la clínica
create table if not exists public.coaches (
  id uuid default gen_random_uuid() primary key,
  full_name text unique not null,
  title text,
  user_id uuid references auth.users on delete set null,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz default now() not null
);

alter table public.coaches enable row level security;

drop policy if exists "coaches: leer" on public.coaches;
create policy "coaches: leer" on public.coaches
  for select using (true);

drop policy if exists "coaches: administrar" on public.coaches;
create policy "coaches: administrar" on public.coaches
  for all using (public.is_admin());

insert into public.coaches (full_name, title, sort_order) values
  ('Nicolás Sánchez', 'Apertura · Los Pumas · récord de puntos', 1),
  ('Federico Mentz', 'Referente pateador TLTC', 2),
  ('Domingo Miotti', 'Apertura · pateador profesional', 3),
  ('Stefano Ferro', 'Referente pateador TLTC', 4),
  ('Ignacio Rodríguez Prado', 'Referente pateador TLTC', 5)
on conflict (full_name) do nothing;

-- 4 · Clínicas: fechas del año, foco y plan de práctica
create table if not exists public.clinics (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  clinic_date date not null,
  start_time text,
  location text not null default 'Tucumán Lawn Tennis Club',
  focus text,
  level integer check (level in (1, 2, 3)),
  prep jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid references public.player_profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

create index if not exists idx_clinics_date on public.clinics (clinic_date desc);

alter table public.clinics enable row level security;

drop policy if exists "clinicas: leer" on public.clinics;
create policy "clinicas: leer" on public.clinics
  for select using (true);

drop policy if exists "clinicas: staff administra" on public.clinics;
create policy "clinicas: staff administra" on public.clinics
  for all using (public.is_staff());

-- 5 · Devoluciones individuales de los referentes
create table if not exists public.coach_feedback (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references public.player_profiles(id) on delete cascade not null,
  coach_id uuid references public.coaches(id) not null,
  author_id uuid references public.player_profiles(id) on delete set null,
  clinic_id uuid references public.clinics(id) on delete set null,
  body text not null,
  focus_next text,
  rating integer check (rating between 1 and 5),
  created_at timestamptz default now() not null
);

create index if not exists idx_feedback_player on public.coach_feedback (player_id, created_at desc);

alter table public.coach_feedback enable row level security;

drop policy if exists "devoluciones: jugador lee las suyas" on public.coach_feedback;
create policy "devoluciones: jugador lee las suyas" on public.coach_feedback
  for select using (auth.uid() = player_id);

drop policy if exists "devoluciones: staff lee todas" on public.coach_feedback;
create policy "devoluciones: staff lee todas" on public.coach_feedback
  for select using (public.is_staff());

drop policy if exists "devoluciones: staff escribe" on public.coach_feedback;
create policy "devoluciones: staff escribe" on public.coach_feedback
  for insert with check (public.is_staff());

drop policy if exists "devoluciones: staff borra" on public.coach_feedback;
create policy "devoluciones: staff borra" on public.coach_feedback
  for delete using (public.is_staff());

-- 6 · Ranking / torneo — agregación server-side con la fórmula de XP de la app
--    (20 por sesión + 5 por patada + 5 por acierto)
create or replace function public.get_leaderboard(period text default 'season')
returns table (
  player_id uuid,
  full_name text,
  division text,
  avatar_url text,
  xp integer,
  kicks integer,
  made integer,
  sessions integer,
  effectiveness integer
)
language sql stable security definer
set search_path = public
as $$
  select
    p.id as player_id,
    p.full_name,
    p.division,
    p.avatar_url,
    (count(distinct s.id) * 20
      + count(k.id) * 5
      + (count(k.id) filter (where k.is_made)) * 5)::int as xp,
    count(k.id)::int as kicks,
    (count(k.id) filter (where k.is_made))::int as made,
    count(distinct s.id)::int as sessions,
    coalesce(round(100.0 * (count(k.id) filter (where k.is_made))
      / nullif(count(k.id), 0)), 0)::int as effectiveness
  from public.player_profiles p
  join public.training_sessions s
    on s.player_id = p.id
    and (period <> 'week' or s.session_date >= date_trunc('week', current_date)::date)
  left join public.logged_kicks k on k.session_id = s.id
  where p.approval_status = 'approved'
    and p.is_active
    and public.is_approved()
  group by p.id
  order by xp desc, effectiveness desc
  limit 50;
$$;

grant execute on function public.get_leaderboard(text) to authenticated;
