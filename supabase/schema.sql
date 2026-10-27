-- ============================================================
--  ESQUEMA DE BASE DE DATOS - Consulta de mesas por QR
-- ============================================================
--  CÓMO USARLO:
--   1. Entra a tu proyecto en https://supabase.com
--   2. Menú izquierdo: "SQL Editor" > "New query"
--   3. Pega TODO este archivo y pulsa "Run"
--   4. Es seguro ejecutarlo más de una vez.
-- ============================================================

create extension if not exists unaccent with schema extensions;

-- ---------- TABLA: mesas ----------
create table if not exists public.mesas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,              -- Ej: "Mesa 01"
  capacidad  integer not null default 10 check (capacidad > 0),
  activa     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- TABLA: familias ----------
create table if not exists public.familias (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,              -- Ej: "Familia Pérez"
  cantidad_personas integer not null default 1 check (cantidad_personas > 0),
  mesa_id           uuid unique references public.mesas(id) on delete set null,
  estado            text not null default 'confirmada',
  created_at        timestamptz not null default now()
);
-- "unique" en mesa_id = UNA familia por mesa (regla elegida).

-- ---------- VALIDACIÓN: no superar la capacidad de la mesa ----------
create or replace function public.validar_capacidad()
returns trigger language plpgsql as $$
declare cap integer;
begin
  if new.mesa_id is not null then
    select capacidad into cap from public.mesas where id = new.mesa_id;
    if new.cantidad_personas > cap then
      raise exception 'La mesa solo tiene capacidad para % personas', cap
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_validar_capacidad on public.familias;
create trigger trg_validar_capacidad
  before insert or update on public.familias
  for each row execute function public.validar_capacidad();

-- ============================================================
--  SEGURIDAD (RLS)
--  - Visitantes (anon): NO pueden leer ni escribir las tablas.
--  - Administradores (usuarios autenticados): acceso total.
-- ============================================================
alter table public.mesas    enable row level security;
alter table public.familias enable row level security;

drop policy if exists "admin_mesas"    on public.mesas;
drop policy if exists "admin_familias" on public.familias;

create policy "admin_mesas" on public.mesas
  for all to authenticated using (true) with check (true);
create policy "admin_familias" on public.familias
  for all to authenticated using (true) with check (true);

-- ============================================================
--  CONSULTA PÚBLICA CONTROLADA
--  Los invitados solo pueden llamar a esta función, que devuelve
--  únicamente: nombre de familia, personas y mesa.
--  - Ignora tildes y mayúsculas ("perez" encuentra "Pérez").
--  - Exige mínimo 3 letras y devuelve máximo 5 resultados
--    (evita que alguien descargue la lista completa).
-- ============================================================
create or replace function public.consultar_mesa(p_nombre text)
returns table (familia text, personas integer, mesa text)
language sql
security definer
set search_path = public, extensions
as $$
  select f.nombre, f.cantidad_personas, m.nombre
  from public.familias f
  left join public.mesas m on m.id = f.mesa_id
  where length(trim(p_nombre)) >= 3
    and unaccent(lower(f.nombre)) like '%' || unaccent(lower(trim(p_nombre))) || '%'
  order by f.nombre
  limit 5;
$$;

revoke all on function public.consultar_mesa(text) from public;
grant execute on function public.consultar_mesa(text) to anon, authenticated;
