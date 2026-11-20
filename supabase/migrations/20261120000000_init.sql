-- P0 foundations: entries + append-only revisions, row-level security, push_entry RPC.
-- Mirrors src/db/schema.ts. Rules match MemoryRemote in src/sync/remote.ts.
-- Never edit this file once applied; add a new migration instead.

create table public.entries (
  id               uuid primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at       timestamptz not null,
  updated_at       timestamptz not null default now(),   -- server clock, pull cursor
  original_date    timestamptz not null,
  kind             text not null check (kind in ('text','quick','voice','photo','scan','import')),
  source           text,
  is_private       boolean not null default false,
  prompt_id        uuid,
  session_id       uuid,
  deleted_at       timestamptz,                          -- bin; rows are never deleted
  title_source     text not null default 'auto' check (title_source in ('auto','user')),
  head_revision_id uuid,
  title            text not null default '',             -- copy of head revision, for search/export
  body             text not null default ''
);

create index entries_user_updated on public.entries (user_id, updated_at);

create table public.revisions (
  id              uuid primary key,
  user_id         uuid not null default auth.uid() references auth.users (id) on delete restrict,
  entry_id        uuid not null references public.entries (id) on delete restrict,
  parent_id       uuid,
  merge_parent_id uuid,
  title           text not null,
  body            text not null,
  opened_at       timestamptz not null,
  saved_at        timestamptz not null,
  device_id       text not null,
  received_at     timestamptz not null default now()
);

create index revisions_entry on public.revisions (entry_id);

-- Row-level security: only your account can read or write your rows.
alter table public.entries   enable row level security;
alter table public.revisions enable row level security;

create policy entries_select on public.entries for select using (user_id = auth.uid());
create policy entries_insert on public.entries for insert with check (user_id = auth.uid());
create policy entries_update on public.entries for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- No delete policy: entries cannot be deleted through the API.

create policy revisions_select on public.revisions for select using (user_id = auth.uid());
create policy revisions_insert on public.revisions for insert with check (user_id = auth.uid());
-- No update/delete policies: revisions are append-only.

-- Belt and braces: block changes to history and hard deletes even for privileged roles.
create function public.forbid_change() returns trigger language plpgsql as $$
begin
  raise exception '% on % is not allowed: history is append-only', tg_op, tg_table_name;
end $$;

create trigger revisions_append_only before update or delete on public.revisions
  for each row execute function public.forbid_change();
create trigger entries_no_delete before delete on public.entries
  for each row execute function public.forbid_change();

-- push_entry: insert revisions idempotently, then move the head forward only if
-- the current server head is an ancestor of (or equal to) the new head.
-- Otherwise report a conflict; text is never overwritten by the last writer.
create function public.push_entry(p_entry jsonb, p_revisions jsonb, p_new_head uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id   uuid := (p_entry->>'id')::uuid;
  v_head uuid;
  v_fwd  boolean;
begin
  insert into entries (id, created_at, original_date, kind, source, is_private, prompt_id, session_id, deleted_at, title_source)
  values (
    v_id,
    (p_entry->>'created_at')::timestamptz,
    (p_entry->>'original_date')::timestamptz,
    p_entry->>'kind',
    p_entry->>'source',
    coalesce((p_entry->>'is_private')::boolean, false),
    (p_entry->>'prompt_id')::uuid,
    (p_entry->>'session_id')::uuid,
    (p_entry->>'deleted_at')::timestamptz,
    coalesce(p_entry->>'title_source', 'auto')
  )
  on conflict (id) do nothing;

  select head_revision_id into v_head from entries where id = v_id for update;
  if not found then
    raise exception 'entry % not accessible', v_id;
  end if;

  insert into revisions (id, entry_id, parent_id, merge_parent_id, title, body, opened_at, saved_at, device_id)
  select (r->>'id')::uuid, v_id, (r->>'parent_id')::uuid, (r->>'merge_parent_id')::uuid,
         r->>'title', r->>'body', (r->>'opened_at')::timestamptz, (r->>'saved_at')::timestamptz, r->>'device_id'
  from jsonb_array_elements(coalesce(p_revisions, '[]'::jsonb)) as r
  on conflict (id) do nothing;

  if v_head is null or v_head = p_new_head then
    v_fwd := true;
  elsif p_new_head is null then
    v_fwd := false;
  else
    with recursive chain(id) as (
      select p_new_head
      union
      select p.id
      from chain c
      join revisions rv on rv.id = c.id and rv.entry_id = v_id
      cross join lateral (values (rv.parent_id), (rv.merge_parent_id)) as p(id)
      where p.id is not null
    )
    select exists (select 1 from chain where id = v_head) into v_fwd;
  end if;

  if not v_fwd then
    return jsonb_build_object('status', 'conflict', 'server_head', v_head);
  end if;

  update entries e set
    head_revision_id = coalesce(p_new_head, v_head),
    original_date    = (p_entry->>'original_date')::timestamptz,
    kind             = p_entry->>'kind',
    source           = p_entry->>'source',
    is_private       = coalesce((p_entry->>'is_private')::boolean, false),
    prompt_id        = (p_entry->>'prompt_id')::uuid,
    session_id       = (p_entry->>'session_id')::uuid,
    deleted_at       = (p_entry->>'deleted_at')::timestamptz,
    title_source     = coalesce(p_entry->>'title_source', 'auto'),
    title            = coalesce((select h.title from revisions h where h.id = coalesce(p_new_head, v_head)), e.title),
    body             = coalesce((select h.body from revisions h where h.id = coalesce(p_new_head, v_head)), e.body),
    updated_at       = now()
  where e.id = v_id;

  return jsonb_build_object('status', 'ok', 'server_head', coalesce(p_new_head, v_head));
end $$;

revoke all on function public.push_entry(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.push_entry(jsonb, jsonb, uuid) to authenticated;
