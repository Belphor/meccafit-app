begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('forjador', 'cliente');
  end if;

  if not exists (select 1 from pg_type where typname = 'estagio_forca') then
    create type public.estagio_forca as enum (
      'cinzas',
      'faisca',
      'brasa',
      'labareda',
      'fogo_cosmico_sagrado'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'subgrupo_muscular') then
    create type public.subgrupo_muscular as enum (
      'costas',
      'peito',
      'ombros',
      'bracos',
      'pernas'
    );
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  full_name text,
  data_nascimento date not null,
  role public.user_role not null default 'cliente',
  forjador_id uuid references public.profiles(id) on delete set null,
  status_contrato text not null default 'ativo'
);

create table if not exists public.matriz_forca (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles(id) on delete cascade,
  musculo public.subgrupo_muscular not null,
  estagio public.estagio_forca not null default 'cinzas',
  max_peso numeric(8,2) not null default 0,
  vtc_total numeric(12,2) not null default 0,
  total_sessoes integer not null default 0,
  ultima_evolucao_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matriz_forca_cliente_musculo_key unique (cliente_id, musculo),
  constraint matriz_forca_max_peso_check check (max_peso >= 0),
  constraint matriz_forca_vtc_total_check check (vtc_total >= 0),
  constraint matriz_forca_total_sessoes_check check (total_sessoes >= 0)
);

create table if not exists public.fenix_pureza_diaria (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles(id) on delete cascade,
  data date not null,
  pureza_percentual numeric(5,2) not null default 0,
  agua_litros numeric(5,2),
  sono_horas numeric(4,2),
  treino_realizado boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fenix_pureza_diaria_cliente_data_key unique (cliente_id, data),
  constraint fenix_pureza_diaria_pureza_check check (
    pureza_percentual >= 0 and pureza_percentual <= 100
  )
);

create table if not exists public.historico_treino (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles(id) on delete cascade,
  matriz_forca_id uuid references public.matriz_forca(id) on delete set null,
  musculo public.subgrupo_muscular not null,
  exercicio_id text not null default 'geral',
  exercicio_nome text not null default 'Treino geral',
  peso numeric(8,2) not null,
  repeticoes integer not null default 1,
  series integer not null default 1,
  vtc_gerado numeric(12,2)
    generated always as (peso * repeticoes * series) stored,
  status text not null default 'CONCLUÍDO',
  registrado_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint historico_treino_peso_check check (peso > 0),
  constraint historico_treino_repeticoes_check check (repeticoes > 0),
  constraint historico_treino_series_check check (series > 0)
);

create index if not exists profiles_forjador_id_idx
  on public.profiles(forjador_id);

create index if not exists matriz_forca_cliente_id_idx
  on public.matriz_forca(cliente_id);

create index if not exists fenix_pureza_diaria_cliente_id_data_idx
  on public.fenix_pureza_diaria(cliente_id, data desc);

create index if not exists historico_treino_cliente_id_registrado_em_idx
  on public.historico_treino(cliente_id, registrado_em desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_matriz_forca_updated_at on public.matriz_forca;
create trigger set_matriz_forca_updated_at
before update on public.matriz_forca
for each row execute function public.set_updated_at();

drop trigger if exists set_fenix_pureza_diaria_updated_at on public.fenix_pureza_diaria;
create trigger set_fenix_pureza_diaria_updated_at
before update on public.fenix_pureza_diaria
for each row execute function public.set_updated_at();

create or replace function public.on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_musculo public.subgrupo_muscular;
begin
  if nullif(new.raw_user_meta_data ->> 'data_nascimento', '') is null then
    raise exception 'data_nascimento é obrigatório no cadastro do perfil.'
      using errcode = '23502';
  end if;

  v_role := case
    when new.raw_user_meta_data ->> 'role' = 'forjador' then 'forjador'::public.user_role
    else 'cliente'::public.user_role
  end;

  insert into public.profiles (
    id,
    full_name,
    data_nascimento,
    role,
    status_contrato
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', '')
    ),
    (new.raw_user_meta_data ->> 'data_nascimento')::date,
    v_role,
    'ativo'
  )
  on conflict (id)
  do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    data_nascimento = excluded.data_nascimento,
    role = excluded.role,
    updated_at = now();

  foreach v_musculo in array enum_range(null::public.subgrupo_muscular)
  loop
    insert into public.matriz_forca (
      cliente_id,
      musculo
    )
    values (
      new.id,
      v_musculo
    )
    on conflict (cliente_id, musculo) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.on_auth_user_created();

create or replace function public.is_forjador_of_cliente(p_cliente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles cliente
    where cliente.id = p_cliente_id
      and cliente.forjador_id = auth.uid()
  );
$$;

create or replace function public.is_self_or_forjador(p_cliente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = p_cliente_id
    or public.is_forjador_of_cliente(p_cliente_id);
$$;

alter table public.profiles enable row level security;
alter table public.matriz_forca enable row level security;
alter table public.fenix_pureza_diaria enable row level security;
alter table public.historico_treino enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('matriz_forca', 'fenix_pureza_diaria', 'historico_treino')
      and cmd in ('INSERT', 'ALL')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

drop policy if exists "ARGOS profiles select self or assigned" on public.profiles;
create policy "ARGOS profiles select self or assigned"
on public.profiles
for select
to authenticated
using (id = auth.uid() or forjador_id = auth.uid());

drop policy if exists "ARGOS profiles insert self" on public.profiles;
create policy "ARGOS profiles insert self"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "ARGOS profiles update self" on public.profiles;
create policy "ARGOS profiles update self"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "ARGOS matriz select self or forjador" on public.matriz_forca;
create policy "ARGOS matriz select self or forjador"
on public.matriz_forca
for select
to authenticated
using (public.is_self_or_forjador(cliente_id));

drop policy if exists "ARGOS matriz insert authenticated cliente" on public.matriz_forca;
create policy "ARGOS matriz insert authenticated cliente"
on public.matriz_forca
for insert
to authenticated
with check (auth.uid() = cliente_id);

drop policy if exists "ARGOS matriz update authenticated cliente" on public.matriz_forca;
create policy "ARGOS matriz update authenticated cliente"
on public.matriz_forca
for update
to authenticated
using (auth.uid() = cliente_id)
with check (auth.uid() = cliente_id);

drop policy if exists "ARGOS pureza select self or forjador" on public.fenix_pureza_diaria;
create policy "ARGOS pureza select self or forjador"
on public.fenix_pureza_diaria
for select
to authenticated
using (public.is_self_or_forjador(cliente_id));

drop policy if exists "ARGOS pureza insert authenticated cliente" on public.fenix_pureza_diaria;
create policy "ARGOS pureza insert authenticated cliente"
on public.fenix_pureza_diaria
for insert
to authenticated
with check (auth.uid() = cliente_id);

drop policy if exists "ARGOS pureza update authenticated cliente" on public.fenix_pureza_diaria;
create policy "ARGOS pureza update authenticated cliente"
on public.fenix_pureza_diaria
for update
to authenticated
using (auth.uid() = cliente_id)
with check (auth.uid() = cliente_id);

drop policy if exists "ARGOS treino select self or forjador" on public.historico_treino;
create policy "ARGOS treino select self or forjador"
on public.historico_treino
for select
to authenticated
using (public.is_self_or_forjador(cliente_id));

drop policy if exists "ARGOS treino insert authenticated cliente" on public.historico_treino;
create policy "ARGOS treino insert authenticated cliente"
on public.historico_treino
for insert
to authenticated
with check (auth.uid() = cliente_id);

drop policy if exists "ARGOS treino update authenticated cliente" on public.historico_treino;
create policy "ARGOS treino update authenticated cliente"
on public.historico_treino
for update
to authenticated
using (auth.uid() = cliente_id)
with check (auth.uid() = cliente_id);

create or replace function public.calcular_estagio_forca(p_vtc_total numeric)
returns public.estagio_forca
language sql
immutable
as $$
  select case
    when p_vtc_total >= 100000 then 'fogo_cosmico_sagrado'::public.estagio_forca
    when p_vtc_total >= 50000 then 'labareda'::public.estagio_forca
    when p_vtc_total >= 20000 then 'brasa'::public.estagio_forca
    when p_vtc_total >= 5000 then 'faisca'::public.estagio_forca
    else 'cinzas'::public.estagio_forca
  end;
$$;

create or replace function public.registrar_treino_com_status(
  p_user_id uuid,
  p_exercicio_id text,
  p_peso_atual numeric,
  p_musculo public.subgrupo_muscular default 'costas',
  p_repeticoes integer default 1,
  p_series integer default 1,
  p_exercicio_nome text default 'Treino geral'
)
returns table (
  status text,
  max_peso_atual numeric,
  peso_atual numeric,
  vtc_gerado numeric,
  payload jsonb
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_matriz_id uuid;
  v_max_anterior numeric;
  v_max_atual numeric;
  v_vtc numeric;
  v_status text;
  v_estagio public.estagio_forca;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.'
      using errcode = '42501';
  end if;

  if p_user_id <> auth.uid() then
    raise exception 'Operação bloqueada pela divisão ARGOS: cliente_id não corresponde ao auth.uid().'
      using errcode = '42501';
  end if;

  if p_peso_atual <= 0 then
    raise exception 'Peso deve ser maior que zero.';
  end if;

  if p_repeticoes <= 0 or p_series <= 0 then
    raise exception 'Repetições e séries devem ser maiores que zero.';
  end if;

  v_vtc := p_peso_atual * p_repeticoes * p_series;

  select mf.max_peso
  into v_max_anterior
  from public.matriz_forca mf
  where mf.cliente_id = p_user_id
    and mf.musculo = p_musculo;

  v_status := case
    when v_max_anterior is null or p_peso_atual > v_max_anterior then 'SUPERAÇÃO'
    else 'CONCLUÍDO'
  end;

  insert into public.matriz_forca (
    cliente_id,
    musculo,
    max_peso,
    vtc_total,
    total_sessoes,
    ultima_evolucao_em
  )
  values (
    p_user_id,
    p_musculo,
    p_peso_atual,
    v_vtc,
    1,
    case when v_status = 'SUPERAÇÃO' then now() else null end
  )
  on conflict (cliente_id, musculo)
  do update set
    max_peso = greatest(public.matriz_forca.max_peso, excluded.max_peso),
    vtc_total = public.matriz_forca.vtc_total + excluded.vtc_total,
    total_sessoes = public.matriz_forca.total_sessoes + 1,
    ultima_evolucao_em = case
      when excluded.max_peso > public.matriz_forca.max_peso then now()
      else public.matriz_forca.ultima_evolucao_em
    end,
    updated_at = now()
  returning id, max_peso, estagio
  into v_matriz_id, v_max_atual, v_estagio;

  insert into public.historico_treino (
    cliente_id,
    matriz_forca_id,
    musculo,
    exercicio_id,
    exercicio_nome,
    peso,
    repeticoes,
    series,
    status
  )
  values (
    p_user_id,
    v_matriz_id,
    p_musculo,
    p_exercicio_id,
    p_exercicio_nome,
    p_peso_atual,
    p_repeticoes,
    p_series,
    v_status
  );

  update public.matriz_forca
  set estagio = public.calcular_estagio_forca(vtc_total)
  where id = v_matriz_id
  returning estagio into v_estagio;

  status := v_status;
  max_peso_atual := v_max_atual;
  peso_atual := p_peso_atual;
  vtc_gerado := v_vtc;
  payload := jsonb_build_object(
    'evento', v_status,
    'mensagem', case
      when v_status = 'SUPERAÇÃO' then 'SUPERAÇÃO registrada na MATRIX DA ALMA.'
      else 'Treino concluído e registrado na MATRIX DA ALMA.'
    end,
    'cliente_id', p_user_id,
    'musculo', p_musculo,
    'peso', p_peso_atual,
    'repeticoes', p_repeticoes,
    'series', p_series,
    'vtc_gerado', v_vtc,
    'max_peso_atual', v_max_atual,
    'estagio', v_estagio
  );

  return next;
exception
  when foreign_key_violation then
    raise exception 'Erro 23503: usuário inexistente em public.profiles ou vínculo inválido.'
      using errcode = '23503';
end;
$$;

create or replace view public.vw_renascimento_fenix
with (security_invoker = true)
as
select
  p.id as cliente_id,
  p.full_name,
  p.role,
  p.forjador_id,
  p.status_contrato,
  mf.musculo,
  mf.estagio,
  mf.max_peso,
  mf.vtc_total,
  mf.total_sessoes,
  mf.ultima_evolucao_em,
  fpd.data as pureza_data,
  fpd.pureza_percentual,
  fpd.treino_realizado
from public.profiles p
left join public.matriz_forca mf
  on mf.cliente_id = p.id
left join public.fenix_pureza_diaria fpd
  on fpd.cliente_id = p.id
where public.is_self_or_forjador(p.id);

revoke insert, update, delete on public.matriz_forca from anon;
revoke insert, update, delete on public.fenix_pureza_diaria from anon;
revoke insert, update, delete on public.historico_treino from anon;
revoke execute on function public.registrar_treino_com_status from anon;

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.matriz_forca to authenticated;
grant select, insert, update on public.fenix_pureza_diaria to authenticated;
grant select, insert, update on public.historico_treino to authenticated;
grant select on public.vw_renascimento_fenix to authenticated;
grant execute on function public.registrar_treino_com_status to authenticated;

commit;
