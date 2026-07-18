-- PatIA Lawn Tennis · Migración 0002
-- Login con Google + aprobación del administrador + suscripciones web push.
--
-- Modelo de acceso:
--   · Usuario anónimo (invitado)  → aprobado automáticamente (cero fricción en la cancha).
--   · Usuario con Google          → queda "pending" hasta que un admin lo apruebe.
--   · marco.rossi@derecho.unt.edu.ar → admin aprobado de entrada (bootstrap).

-- 1 · Columnas de identidad y aprobación en el perfil
alter table public.player_profiles
  add column if not exists role text not null default 'player'
    check (role in ('player', 'admin')),
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists email text,
  add column if not exists avatar_url text,
  add column if not exists access_notified_at timestamptz;

create index if not exists idx_profiles_pending
  on public.player_profiles (approval_status)
  where approval_status = 'pending';

-- 2 · Helpers con security definer (evitan recursión en RLS)
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.player_profiles
    where id = auth.uid() and role = 'admin' and approval_status = 'approved'
  );
$$;

create or replace function public.is_approved()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.player_profiles
    where id = auth.uid() and approval_status = 'approved'
  );
$$;

-- 3 · Perfil automático al crear un usuario en auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_is_anon boolean := coalesce(new.is_anonymous, false);
  v_email text := new.email;
  v_admin boolean := v_email is not null
    and lower(v_email) = 'marco.rossi@derecho.unt.edu.ar';
begin
  insert into public.player_profiles (id, full_name, email, avatar_url, role, approval_status)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      'Pateador/a'
    ),
    v_email,
    new.raw_user_meta_data ->> 'avatar_url',
    case when v_admin then 'admin' else 'player' end,
    case when v_admin or v_is_anon then 'approved' else 'pending' end
  )
  on conflict (id) do update set
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, public.player_profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Si un invitado vincula luego su Google, copiamos el mail al perfil (sigue aprobado:
-- ya venía usando la app; el admin puede rechazarlo desde el panel si corresponde).
create or replace function public.handle_user_email_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update public.player_profiles
  set email = new.email,
      avatar_url = coalesce(new.raw_user_meta_data ->> 'avatar_url', avatar_url),
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_update();

-- 4 · Políticas de administrador
drop policy if exists "admin: leer perfiles" on public.player_profiles;
create policy "admin: leer perfiles" on public.player_profiles
  for select using (public.is_admin());

drop policy if exists "admin: actualizar perfiles" on public.player_profiles;
create policy "admin: actualizar perfiles" on public.player_profiles
  for update using (public.is_admin());

drop policy if exists "admin: leer sesiones" on public.training_sessions;
create policy "admin: leer sesiones" on public.training_sessions
  for select using (public.is_admin());

drop policy if exists "admin: leer patadas" on public.logged_kicks;
create policy "admin: leer patadas" on public.logged_kicks
  for select using (public.is_admin());

-- 5 · Los pendientes/rechazados no pueden escribir datos de entrenamiento
drop policy if exists "propias sesiones: crear" on public.training_sessions;
create policy "propias sesiones: crear" on public.training_sessions
  for insert with check (auth.uid() = player_id and public.is_approved());

drop policy if exists "propias patadas: crear" on public.logged_kicks;
create policy "propias patadas: crear" on public.logged_kicks
  for insert with check (auth.uid() = player_id and public.is_approved());

-- 6 · Suscripciones web push (VAPID)
create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references public.player_profiles(id) on delete cascade not null,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now() not null
);

create index if not exists idx_push_player on public.push_subscriptions (player_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "propias suscripciones: leer" on public.push_subscriptions;
create policy "propias suscripciones: leer" on public.push_subscriptions
  for select using (auth.uid() = player_id);

drop policy if exists "propias suscripciones: crear" on public.push_subscriptions;
create policy "propias suscripciones: crear" on public.push_subscriptions
  for insert with check (auth.uid() = player_id);

drop policy if exists "propias suscripciones: actualizar" on public.push_subscriptions;
create policy "propias suscripciones: actualizar" on public.push_subscriptions
  for update using (auth.uid() = player_id);

drop policy if exists "propias suscripciones: borrar" on public.push_subscriptions;
create policy "propias suscripciones: borrar" on public.push_subscriptions
  for delete using (auth.uid() = player_id);
