
-- Enable pg_net extension for HTTP calls from triggers
create extension if not exists pg_net with schema extensions;

-- Push subscriptions table
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  organization_id uuid references public.organizations(id),
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users can insert own push sub" on public.push_subscriptions for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can view own push sub" on public.push_subscriptions for select to authenticated using (auth.uid() = user_id);
create policy "Users can update own push sub" on public.push_subscriptions for update to authenticated using (auth.uid() = user_id);
create policy "Users can delete own push sub" on public.push_subscriptions for delete to authenticated using (auth.uid() = user_id);

-- Trigger function to send push notification when vehicle status changes to terminado
create or replace function public.notify_vehicle_completed_push()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _url text;
  _key text;
  _admin_ids uuid[];
begin
  if OLD.status is distinct from NEW.status and NEW.status = 'terminado' then
    select decrypted_secret into _url from vault.decrypted_secrets where name = 'SUPABASE_URL' limit 1;
    select decrypted_secret into _key from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY' limit 1;
    
    if _url is not null and _key is not null then
      select array_agg(ur.user_id) into _admin_ids
      from public.user_roles ur
      where ur.organization_id = NEW.organization_id and ur.role = 'admin';
      
      if _admin_ids is not null then
        perform net.http_post(
          url := _url || '/functions/v1/send-push',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || _key
          ),
          body := jsonb_build_object(
            'type', 'vehicle_completed',
            'title', '🔔 ¡Vehículo Terminado!',
            'body', NEW.plate || ' - ' || NEW.brand || ' ' || NEW.model || ' está listo para entregar',
            'url', '/vehicles/' || NEW.id,
            'user_ids', to_jsonb(_admin_ids),
            'organization_id', NEW.organization_id
          )
        );
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

create trigger on_vehicle_completed_push
  after update on public.vehicles
  for each row
  execute function public.notify_vehicle_completed_push();
