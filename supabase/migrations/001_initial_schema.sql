-- CONTE cloud storage foundation
-- Each project is stored as JSON to preserve v11 compatibility while cloud sync is introduced.

create table if not exists public.conte_projects (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  data jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1 check (schema_version >= 1),
  revision bigint not null default 1 check (revision >= 1),
  client_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists conte_projects_owner_updated_idx
  on public.conte_projects (owner_id, updated_at desc);

alter table public.conte_projects enable row level security;

revoke all on table public.conte_projects from anon;
grant select, insert, update, delete on table public.conte_projects to authenticated;

drop policy if exists "Users can read own CONTE projects" on public.conte_projects;
create policy "Users can read own CONTE projects"
  on public.conte_projects for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Users can create own CONTE projects" on public.conte_projects;
create policy "Users can create own CONTE projects"
  on public.conte_projects for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can update own CONTE projects" on public.conte_projects;
create policy "Users can update own CONTE projects"
  on public.conte_projects for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can delete own CONTE projects" on public.conte_projects;
create policy "Users can delete own CONTE projects"
  on public.conte_projects for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.conte_set_project_update_metadata()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  if new.data is distinct from old.data or new.deleted_at is distinct from old.deleted_at then
    new.revision = old.revision + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists conte_projects_update_metadata on public.conte_projects;
create trigger conte_projects_update_metadata
  before update on public.conte_projects
  for each row execute function public.conte_set_project_update_metadata();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'conte-assets',
  'conte-assets',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own CONTE assets" on storage.objects;
create policy "Users can read own CONTE assets"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'conte-assets' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can upload own CONTE assets" on storage.objects;
create policy "Users can upload own CONTE assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'conte-assets' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can update own CONTE assets" on storage.objects;
create policy "Users can update own CONTE assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'conte-assets' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'conte-assets' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can delete own CONTE assets" on storage.objects;
create policy "Users can delete own CONTE assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'conte-assets' and (storage.foldername(name))[1] = (select auth.uid()::text));

