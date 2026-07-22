-- DM depth: realtime delivery, private attachments, and group threads.

alter table public.dm_threads drop constraint if exists dm_threads_kind_check;
alter table public.dm_threads
  add constraint dm_threads_kind_check check (kind = any (array['direct'::text, 'store'::text, 'group'::text]));

alter table public.dm_threads
  add column if not exists title text not null default '';

alter table public.dm_messages drop constraint if exists dm_messages_body_check;
alter table public.dm_messages alter column body set default '';
alter table public.dm_messages
  add constraint dm_messages_body_check check (char_length(body) <= 4000);

create table if not exists public.dm_thread_members (
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role = any (array['owner'::text, 'member'::text])),
  joined_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create index if not exists dm_thread_members_user_id_idx on public.dm_thread_members (user_id);

create table if not exists public.dm_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.dm_messages (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes integer not null default 0 check (size_bytes >= 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now(),
  constraint dm_message_attachments_storage_path_format check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$')
);

create index if not exists dm_message_attachments_message_id_idx on public.dm_message_attachments (message_id);

insert into public.dm_thread_members (thread_id, user_id, role)
select id, user_a, case when created_by = user_a then 'owner' else 'member' end
from public.dm_threads
where kind = 'direct' and user_a is not null
on conflict do nothing;

insert into public.dm_thread_members (thread_id, user_id, role)
select id, user_b, case when created_by = user_b then 'owner' else 'member' end
from public.dm_threads
where kind = 'direct' and user_b is not null
on conflict do nothing;

insert into public.dm_thread_members (thread_id, user_id, role)
select id, member_user_id, case when created_by = member_user_id then 'owner' else 'member' end
from public.dm_threads
where kind = 'store' and member_user_id is not null
on conflict do nothing;

insert into public.dm_thread_members (thread_id, user_id, role)
select t.id, s.owner_user_id, case when t.created_by = s.owner_user_id then 'owner' else 'member' end
from public.dm_threads t
join public.stores s on s.id = t.store_id
where t.kind = 'store' and s.owner_user_id is not null
on conflict do nothing;

alter table public.dm_thread_members enable row level security;
alter table public.dm_message_attachments enable row level security;

drop policy if exists "dm_thread_members_select_participants" on public.dm_thread_members;
create policy "dm_thread_members_select_participants"
  on public.dm_thread_members for select to authenticated
  using (public.is_dm_thread_participant(thread_id, auth.uid()));

drop policy if exists "dm_message_attachments_select_participants" on public.dm_message_attachments;
create policy "dm_message_attachments_select_participants"
  on public.dm_message_attachments for select to authenticated
  using (
    exists (
      select 1
      from public.dm_messages m
      where m.id = message_id
        and public.is_dm_thread_participant(m.thread_id, auth.uid())
    )
  );

create or replace function public.is_dm_thread_participant(p_thread_id uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.dm_threads t
    left join public.stores s on s.id = t.store_id
    where t.id = p_thread_id
      and p_uid is not null
      and (
        (t.kind = 'direct' and (t.user_a = p_uid or t.user_b = p_uid))
        or
        (t.kind = 'store' and (t.member_user_id = p_uid or s.owner_user_id = p_uid))
        or
        exists (
          select 1 from public.dm_thread_members tm
          where tm.thread_id = t.id and tm.user_id = p_uid
        )
      )
  );
$function$;

create or replace function public.create_group_dm_thread(p_member_user_ids uuid[], p_title text default '')
returns public.dm_threads
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid uuid := auth.uid();
  v_title text := left(btrim(coalesce(p_title, '')), 80);
  v_member_ids uuid[];
  v_row public.dm_threads;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;

  select array_agg(distinct member_id)
  into v_member_ids
  from unnest(coalesce(p_member_user_ids, array[]::uuid[])) as member_id
  where member_id is not null and member_id <> v_uid;

  if coalesce(array_length(v_member_ids, 1), 0) < 1 then
    raise exception 'Pick at least one other person' using errcode = '22023';
  end if;
  if coalesce(array_length(v_member_ids, 1), 0) > 24 then
    raise exception 'Group threads can have up to 25 people' using errcode = '22023';
  end if;
  if exists (
    select 1
    from unnest(v_member_ids) as member_id
    left join public.profiles p on p.id = member_id
    where p.id is null
  ) then
    raise exception 'One or more members were not found' using errcode = 'P0002';
  end if;

  insert into public.dm_threads (kind, title, created_by)
  values ('group', v_title, v_uid)
  returning * into v_row;

  insert into public.dm_thread_members (thread_id, user_id, role)
  values (v_row.id, v_uid, 'owner')
  on conflict do nothing;

  insert into public.dm_thread_members (thread_id, user_id, role)
  select v_row.id, member_id, 'member'
  from unnest(v_member_ids) as member_id
  on conflict do nothing;

  return v_row;
end;
$function$;

create or replace function public.list_my_dm_threads(p_limit integer default 50)
returns table (
  id uuid,
  kind text,
  title text,
  user_a uuid,
  user_b uuid,
  store_id uuid,
  member_user_id uuid,
  created_by uuid,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz,
  other_user_id uuid,
  other_display_name text,
  other_handle text,
  other_avatar_url text,
  store_name text,
  store_handle text,
  unread_count integer,
  member_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;

  return query
  select
    t.id,
    t.kind,
    t.title,
    t.user_a,
    t.user_b,
    t.store_id,
    t.member_user_id,
    t.created_by,
    t.last_message_at,
    t.last_message_preview,
    t.created_at,
    case
      when t.kind = 'direct' then case when t.user_a = v_uid then t.user_b else t.user_a end
      when t.kind = 'store' and t.member_user_id = v_uid then s.owner_user_id
      when t.kind = 'store' then t.member_user_id
      else null
    end as other_user_id,
    case
      when t.kind = 'direct' then coalesce(op.name, op.handle, 'Stitcher')
      when t.kind = 'store' and t.member_user_id = v_uid then coalesce(s.name, 'Shop')
      when t.kind = 'store' then coalesce(mp.name, mp.handle, 'Stitcher')
      when t.kind = 'group' and btrim(t.title) <> '' then t.title
      when t.kind = 'group' then coalesce((
        select string_agg(coalesce(gp.name, gp.handle, 'Stitcher'), ', ' order by gp.name nulls last, gp.handle)
        from public.dm_thread_members gm
        left join public.profiles gp on gp.id = gm.user_id
        where gm.thread_id = t.id and gm.user_id <> v_uid
      ), 'Group thread')
      else 'Chat'
    end::text as other_display_name,
    case
      when t.kind = 'direct' then coalesce(op.handle, '')
      when t.kind = 'store' and t.member_user_id = v_uid then coalesce(s.handle, '')
      when t.kind = 'store' then coalesce(mp.handle, '')
      else ''
    end::text as other_handle,
    case
      when t.kind = 'direct' then coalesce(op.avatar_url, '')
      when t.kind = 'store' and t.member_user_id = v_uid then coalesce(s.avatar_url, '')
      when t.kind = 'store' then coalesce(mp.avatar_url, '')
      else ''
    end::text as other_avatar_url,
    coalesce(s.name, '')::text as store_name,
    coalesce(s.handle, '')::text as store_handle,
    coalesce((
      select count(*)::integer
      from public.dm_messages m
      left join public.dm_thread_reads r
        on r.thread_id = t.id and r.user_id = v_uid
      where m.thread_id = t.id
        and m.sender_id is distinct from v_uid
        and m.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
    ), 0) as unread_count,
    coalesce((select count(*)::integer from public.dm_thread_members tm where tm.thread_id = t.id), 0) as member_count
  from public.dm_threads t
  left join public.stores s on s.id = t.store_id
  left join public.profiles op on op.id = case
    when t.kind = 'direct' then case when t.user_a = v_uid then t.user_b else t.user_a end
    else null end
  left join public.profiles mp on mp.id = t.member_user_id
  where public.is_dm_thread_participant(t.id, v_uid)
  order by coalesce(t.last_message_at, t.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$function$;

create or replace function public.list_dm_messages(p_thread_id uuid, p_limit integer default 100)
returns table (
  id uuid,
  thread_id uuid,
  sender_id uuid,
  body text,
  created_at timestamptz,
  sender_name text,
  sender_handle text,
  attachments jsonb
)
language plpgsql
security definer
set search_path = public
as $function$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if not public.is_dm_thread_participant(p_thread_id, v_uid) then
    raise exception 'Thread not found' using errcode = '42501';
  end if;

  insert into public.dm_thread_reads as r (thread_id, user_id, last_read_at)
  values (p_thread_id, v_uid, now())
  on conflict (thread_id, user_id) do update
    set last_read_at = excluded.last_read_at;

  return query
  select
    m.id,
    m.thread_id,
    m.sender_id,
    m.body,
    m.created_at,
    coalesce(p.name, p.handle, 'Stitcher')::text as sender_name,
    coalesce(p.handle, '')::text as sender_handle,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'message_id', a.message_id,
        'storage_path', a.storage_path,
        'file_name', a.file_name,
        'mime_type', a.mime_type,
        'size_bytes', a.size_bytes,
        'created_at', a.created_at
      ) order by a.created_at)
      from public.dm_message_attachments a
      where a.message_id = m.id
    ), '[]'::jsonb) as attachments
  from public.dm_messages m
  left join public.profiles p on p.id = m.sender_id
  where m.thread_id = p_thread_id
  order by m.created_at asc
  limit greatest(1, least(coalesce(p_limit, 100), 200));
end;
$function$;

create or replace function public.send_dm_message(p_thread_id uuid, p_body text, p_attachments jsonb default '[]'::jsonb)
returns public.dm_messages
language plpgsql
security definer
set search_path = public
as $function$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_row public.dm_messages;
  v_preview text;
  v_attachment_count integer := case when jsonb_typeof(coalesce(p_attachments, '[]'::jsonb)) = 'array' then jsonb_array_length(coalesce(p_attachments, '[]'::jsonb)) else 0 end;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if not public.is_dm_thread_participant(p_thread_id, v_uid) then
    raise exception 'Thread not found' using errcode = '42501';
  end if;
  if char_length(v_body) < 1 and v_attachment_count < 1 then
    raise exception 'Message cannot be empty' using errcode = '22023';
  end if;
  if char_length(v_body) > 4000 then
    raise exception 'Message is too long' using errcode = '22023';
  end if;
  if v_attachment_count > 6 then
    raise exception 'Attach up to 6 files' using errcode = '22023';
  end if;

  insert into public.dm_messages (thread_id, sender_id, body)
  values (p_thread_id, v_uid, v_body)
  returning * into v_row;

  insert into public.dm_message_attachments (message_id, storage_path, file_name, mime_type, size_bytes)
  select
    v_row.id,
    item->>'storage_path',
    left(coalesce(item->>'file_name', 'Attachment'), 160),
    left(coalesce(item->>'mime_type', 'application/octet-stream'), 120),
    least(greatest(coalesce((item->>'size_bytes')::integer, 0), 0), 10485760)
  from jsonb_array_elements(coalesce(p_attachments, '[]'::jsonb)) as item
  where coalesce(item->>'storage_path', '') ~ ('^' || v_uid::text || '/' || p_thread_id::text || '/[^/]+$');

  v_preview := case
    when v_body <> '' then left(v_body, 140)
    when v_attachment_count = 1 then 'Sent an attachment'
    else 'Sent attachments'
  end;
  update public.dm_threads t
  set last_message_at = v_row.created_at,
      last_message_preview = v_preview,
      updated_at = now()
  where t.id = p_thread_id;

  return v_row;
end;
$function$;

do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('dm-attachments', 'dm-attachments', false, 10485760, null)
  on conflict (id) do update
    set public = false,
        file_size_limit = 10485760;
exception when undefined_table then
  null;
end $$;

drop policy if exists "dm_attachments_insert_own_thread_path" on storage.objects;
create policy "dm_attachments_insert_own_thread_path"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dm-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_dm_thread_participant(((storage.foldername(name))[2])::uuid, auth.uid())
  );

drop policy if exists "dm_attachments_select_thread_participants" on storage.objects;
create policy "dm_attachments_select_thread_participants"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dm-attachments'
    and public.is_dm_thread_participant(((storage.foldername(name))[2])::uuid, auth.uid())
  );

do $$
begin
  alter publication supabase_realtime add table public.dm_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.dm_thread_reads;
exception when duplicate_object then null;
end $$;

revoke all on function public.create_group_dm_thread(uuid[], text) from public;
grant execute on function public.create_group_dm_thread(uuid[], text) to authenticated;
revoke all on function public.send_dm_message(uuid, text, jsonb) from public;
grant execute on function public.send_dm_message(uuid, text, jsonb) to authenticated;
