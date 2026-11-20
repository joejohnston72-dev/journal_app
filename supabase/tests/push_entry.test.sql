-- Data-safety checks for push_entry, RLS and append-only history. Fails loudly on any violation.
\set ON_ERROR_STOP 1
create function pg_temp.push(p_rev text, p_parent text, p_merge text, p_body text) returns jsonb language sql as $$
  select push_entry(
    '{"id":"aaaaaaaa-0000-0000-0000-000000000001","created_at":"2026-11-20T07:00:00Z","original_date":"2026-11-20T07:00:00Z","kind":"text","title_source":"auto"}',
    jsonb_build_array(jsonb_build_object('id', p_rev, 'parent_id', p_parent, 'merge_parent_id', p_merge, 'title', '', 'body', p_body,
      'opened_at', '2026-11-20T07:00:00Z', 'saved_at', '2026-11-20T07:00:00Z', 'device_id', 'test')),
    p_rev::uuid)
$$;
create function pg_temp.expect(label text, ok boolean) returns void language plpgsql as $$
begin if not ok then raise exception 'FAILED: %', label; end if; raise notice 'ok: %', label; end $$;

set role anon;
do $$ begin
  perform 1 from entries;
  raise exception 'FAILED: anon can read entries';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform push_entry('{}', '[]', null);
  raise exception 'FAILED: anon can call push_entry';
exception when insufficient_privilege then null;
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select pg_temp.expect('first push accepted', pg_temp.push('bbbbbbbb-0000-0000-0000-000000000001', null, null, 'v1')->>'status' = 'ok');
select pg_temp.expect('retry is idempotent', pg_temp.push('bbbbbbbb-0000-0000-0000-000000000001', null, null, 'v1')->>'status' = 'ok');
select pg_temp.expect('no duplicate revisions', (select count(*) from revisions) = 1);
select pg_temp.expect('child fast-forwards', pg_temp.push('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', null, 'phone v2')->>'status' = 'ok');
select pg_temp.expect('sibling is a conflict', pg_temp.push('bbbbbbbb-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', null, 'laptop v2')->>'status' = 'conflict');
select pg_temp.expect('conflict leaves server text alone', (select body from entries) = 'phone v2');
select pg_temp.expect('conflicting version still stored', exists (select 1 from revisions where body = 'laptop v2'));
select pg_temp.expect('merge with both parents accepted', pg_temp.push('bbbbbbbb-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002', 'merged')->>'status' = 'ok');
select pg_temp.expect('entry body follows head', (select body from entries) = 'merged');

do $$ begin
  update revisions set body = 'tampered';
  raise exception 'FAILED: API edited history';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  delete from entries;
  raise exception 'FAILED: API deleted entries';
exception when insufficient_privilege then null;
end $$;
select pg_temp.expect('API cannot edit history or delete entries', (select count(*) from entries) = 1 and not exists (select 1 from revisions where body = 'tampered'));

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.expect('other account sees nothing', (select count(*) from entries) = 0 and (select count(*) from revisions) = 0);
do $$ begin
  perform pg_temp.push('cccccccc-0000-0000-0000-000000000001', null, null, 'intruder');
  raise exception 'FAILED: other account pushed into entry';
exception when others then
  if sqlerrm like 'FAILED%' then raise; end if;
end $$;

reset role;
do $$ begin
  update revisions set body = 'x';
  raise exception 'FAILED: superuser rewrote history';
exception when others then
  if sqlerrm like 'FAILED%' then raise; end if;
end $$;
select pg_temp.expect('history intact for privileged roles', (select count(*) from revisions where body = 'x') = 0);
