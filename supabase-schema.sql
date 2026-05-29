-- ============================================================
-- Viaje Corea + Japón 2026 — Schema para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- Tabla principal de ítems
create table if not exists trip_items (
  id            text primary key,
  category      text not null,
  name          text not null,
  description   text,
  urgency       text not null check (urgency in ('now', 'soon', 'later')),
  buy_by        date not null,
  use_date      date not null,
  price         integer not null default 0,
  currency      text not null check (currency in ('KRW', 'JPY', 'USD')),
  link          text,
  done          boolean not null default false,
  assigned_to   text,
  notes         text,
  updated_at    timestamptz default now()
);

-- Trigger para actualizar updated_at automáticamente
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trip_items_updated_at
  before update on trip_items
  for each row execute function update_updated_at();

-- ─── Row Level Security ──────────────────────────────────────
-- Solo usuarios autenticados pueden leer y escribir

alter table trip_items enable row level security;

-- Política: cualquier usuario autenticado puede leer
create policy "Usuarios autenticados pueden leer"
  on trip_items for select
  to authenticated
  using (true);

-- Política: cualquier usuario autenticado puede insertar
create policy "Usuarios autenticados pueden insertar"
  on trip_items for insert
  to authenticated
  with check (true);

-- Política: cualquier usuario autenticado puede actualizar
create policy "Usuarios autenticados pueden actualizar"
  on trip_items for update
  to authenticated
  using (true);

-- ─── Realtime ────────────────────────────────────────────────
-- Habilitar realtime para la tabla (actualizar en tiempo real entre usuarios)
-- Ir a: Supabase > Database > Replication > supabase_realtime > Agregar trip_items

-- ─── Verificar que todo quedó bien ───────────────────────────
select * from trip_items limit 1;
