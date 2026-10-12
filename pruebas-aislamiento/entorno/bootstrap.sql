-- Reproduce el entorno minimo de Supabase sobre un Postgres limpio,
-- para poder aplicar las migraciones del repo sin depender del CLI.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists graphql_public;
create schema if not exists cron;
create schema if not exists net;
create schema if not exists vault;
create schema if not exists realtime;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit password 'authenticator';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    create role supabase_admin superuser login password 'supabase_admin';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'postgres') then
    create role postgres superuser login;
  end if;
end
$$;

grant anon, authenticated, service_role to authenticator;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- auth.users: el esquema real trae mas columnas, pero las migraciones solo
-- referencian id, email y raw_user_meta_data.
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  raw_app_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Las pone GoTrue en produccion. Sin ellas, lo que se prueba aqui no se
  -- parece a lo que va a pasar alli: una funcion que las use compila igual y
  -- revienta en caliente.
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  confirmation_sent_at timestamptz,
  banned_until timestamptz
);

-- El contexto de peticion se simula con GUCs, igual que hace PostgREST.
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create or replace function auth.role() returns text language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', current_setting('role', true))
$$;

create or replace function auth.email() returns text language sql stable as $$
  select auth.jwt() ->> 'email'
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;

-- Stubs de pg_cron y pg_net: no existen en la imagen oficial de Postgres.
-- Registran la llamada en lugar de ejecutarla, para que las migraciones apliquen.
create table if not exists cron.job (
  jobid bigserial primary key,
  jobname text unique,
  schedule text,
  command text,
  active boolean default true
);

create or replace function cron.schedule(job_name text, schedule text, command text)
returns bigint language plpgsql as $$
declare id bigint;
begin
  insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command
  returning jobid into id;
  return id;
end
$$;

create or replace function cron.schedule(schedule text, command text)
returns bigint language sql as $$
  select cron.schedule('job-' || md5(schedule || command), schedule, command)
$$;

create or replace function cron.unschedule(job_name text)
returns boolean language plpgsql as $$
begin
  delete from cron.job where jobname = job_name;
  return true;
end
$$;

create or replace function cron.unschedule(job_id bigint)
returns boolean language plpgsql as $$
begin
  delete from cron.job where jobid = job_id;
  return true;
end
$$;

create table if not exists net.http_request_queue (
  id bigserial primary key,
  url text,
  headers jsonb,
  body jsonb,
  created_at timestamptz default now()
);

create or replace function net.http_post(
  url text,
  body jsonb default '{}'::jsonb,
  params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb,
  timeout_milliseconds integer default 5000
) returns bigint language plpgsql as $$
declare id bigint;
begin
  insert into net.http_request_queue (url, headers, body) values (url, headers, body) returning net.http_request_queue.id into id;
  return id;
end
$$;

create or replace function extensions.http_post(url text, body jsonb default '{}'::jsonb)
returns bigint language sql as $$ select net.http_post(url, body) $$;

grant usage on schema cron, net, extensions to postgres, service_role;

-- storage.objects: algunas politicas del repo la referencian.
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  created_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table storage.objects enable row level security;

create table if not exists realtime.messages (
  id uuid primary key default gen_random_uuid(),
  topic text,
  extension text,
  payload jsonb,
  inserted_at timestamptz default now()
);
alter table realtime.messages enable row level security;

create or replace function realtime.topic() returns text language sql stable as $$
  select current_setting('realtime.topic', true)
$$;

grant usage on schema realtime to anon, authenticated, service_role;
grant all on realtime.messages to anon, authenticated, service_role;

create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select string_to_array(name, '/')
$$;

grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
