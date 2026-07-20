-- PatIA Lawn Tennis · Migración 0007
-- Suma digitalamenitiessas@gmail.com a la lista de administradores.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_is_anon boolean := coalesce(new.is_anonymous, false);
  v_email text := lower(coalesce(new.email, ''));
  v_admin boolean := v_email in (
    'marco.rossi1708@gmail.com',
    'digitalamenitiessas@gmail.com',
    'marco.rossi@derecho.unt.edu.ar'
  );
begin
  insert into public.player_profiles (id, full_name, email, avatar_url, role, approval_status)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      'Pateador/a'
    ),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url',
    case when v_admin then 'admin' else 'player' end,
    case when v_admin or v_is_anon then 'approved' else 'pending' end
  )
  on conflict (id) do update set
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, public.player_profiles.avatar_url),
    role = case when v_admin then 'admin' else public.player_profiles.role end,
    approval_status = case when v_admin then 'approved' else public.player_profiles.approval_status end;
  return new;
end;
$$;

-- Promover el perfil si ya existe
update public.player_profiles
set role = 'admin', approval_status = 'approved', updated_at = now()
where lower(email) = 'digitalamenitiessas@gmail.com';
