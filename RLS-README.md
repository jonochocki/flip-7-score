# RLS Reference (2026-02-04)

This file captures the SQL snippets executed and the current RLS policies as of 2026-02-04.

## SQL Snippets Ran

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expr,
  with_check as with_check_expr
from pg_policies
order by schemaname, tablename, policyname;
```

```sql
select
  n.nspname as schemaname,
  c.relname as tablename,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname in ('public')
order by schemaname, tablename;
```

```sql
select
  n.nspname as schema,
  p.proname as name,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer,
  p.provolatile as volatility,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_game_member',
    'is_game_host',
    'create_game',
    'join_game',
    'start_game',
    'create_round',
    'handle_lobby_departure',
    'submit_score',
    'create_rematch_game',
    'get_game_by_code',
    'get_current_round',
    'get_game_totals',
    'can_advance_round'
  )
order by name;
```

```sql
begin;

create or replace function public.get_game_by_code(p_code text)
returns table(id uuid, code text, status game_status)
language sql
stable security definer
set search_path to 'public'
as $function$
  select g.id, g.code, g.status
  from public.games g
  where g.code = upper(p_code)
    and auth.uid() is not null
  limit 1;
$function$;

create or replace function public.get_current_round(p_game_id uuid)
returns table(round_id uuid, round_index integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  select r.id as round_id, r.round_index
  from public.rounds r
  where r.game_id = p_game_id
    and exists (
      select 1
      from public.players p
      where p.game_id = p_game_id
        and p.user_id = auth.uid()
    )
  order by r.round_index desc
  limit 1;
$function$;

create or replace function public.get_game_totals(p_game_id uuid)
returns table(player_id uuid, name text, status player_status, total_score integer, rounds_submitted integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    player_id,
    name,
    status,
    total_score::int,
    rounds_submitted::int
  from public.game_totals
  where game_id = p_game_id
    and exists (
      select 1
      from public.players p
      where p.game_id = p_game_id
        and p.user_id = auth.uid()
    )
  order by total_score desc, name asc;
$function$;

create or replace function public.create_rematch_game(p_game_id uuid)
returns table(game_id uuid, code text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_new_game_id uuid := gen_random_uuid();
  v_code text;
  v_host_old uuid;
  v_host_seat int;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;

  if not public.is_game_host(p_game_id) then
    raise exception 'only host can rematch';
  end if;

  select g.host_player_id into v_host_old
  from games g
  where g.id = p_game_id;

  if not found then
    raise exception 'Game not found';
  end if;

  loop
    v_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from games g where g.code = v_code);
  end loop;

  insert into games (id, code, status, host_player_id)
  values (v_new_game_id, v_code, 'lobby', null);

  select p.seat_order into v_host_seat
  from players p
  where p.id = v_host_old;

  insert into players (game_id, name, avatar, color, seat_order, status, user_id)
  select
    v_new_game_id,
    p.name,
    p.avatar,
    p.color,
    p.seat_order,
    case
      when p.status = 'left' then 'left'
      else 'active'
    end,
    p.user_id
  from players p
  where p.game_id = p_game_id
  order by p.seat_order;

  update games g
  set host_player_id = (
    select p.id
    from players p
    where p.game_id = v_new_game_id
      and p.seat_order = v_host_seat
      and p.status <> 'left'
    limit 1
  )
  where g.id = v_new_game_id;

  return query
  select v_new_game_id as game_id, v_code as code;
end;
$function$;

create or replace function public.join_game(
  p_code text,
  p_name text,
  p_avatar text default null::text,
  p_color text default null::text
)
returns table(game_id uuid, player_id uuid)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_game_id uuid;
  v_player_id uuid;
  v_seat int;
  v_status game_status;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;

  select g.id, g.status into v_game_id, v_status
  from public.games g
  where g.code = upper(p_code);

  if v_game_id is null then
    raise exception 'invalid code';
  end if;

  if v_status <> 'lobby' then
    raise exception 'game not joinable';
  end if;

  if exists (
    select 1 from public.players p
    where p.game_id = v_game_id
      and p.user_id = auth.uid()
  ) then
    raise exception 'already joined';
  end if;

  select coalesce(max(seat_order), 0) + 1 into v_seat
  from public.players p
  where p.game_id = v_game_id;

  insert into public.players (game_id, user_id, name, avatar, color, seat_order)
  values (
    v_game_id,
    auth.uid(),
    p_name,
    p_avatar,
    p_color,
    v_seat
  )
  returning id into v_player_id;

  return query select v_game_id, v_player_id;
end;
$function$;

create or replace function public.handle_lobby_departure(
  p_game_id uuid,
  p_player_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_host_player_id uuid;
  v_status game_status;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;

  select g.host_player_id, g.status into v_host_player_id, v_status
  from public.games g
  where g.id = p_game_id;

  if v_host_player_id is null then
    raise exception 'game not found';
  end if;

  if v_status <> 'lobby' then
    raise exception 'game not in lobby';
  end if;

  if p_player_id = v_host_player_id then
    if not public.is_game_member(p_game_id) then
      raise exception 'not a member';
    end if;
    delete from public.players where game_id = p_game_id;
    delete from public.games where id = p_game_id;
    return;
  end if;

  if not public.is_game_host(p_game_id) then
    raise exception 'only host can remove players';
  end if;

  delete from public.players
  where id = p_player_id
    and game_id = p_game_id;
end;
$function$;

create or replace function public.submit_score(
  p_round_id uuid,
  p_score integer,
  p_flip7_bonus boolean default false
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_player_id uuid;
  v_game_id uuid;
  v_latest_round_id uuid;
  v_status public.player_status;
  v_game_status public.game_status;
  v_score int;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;

  select p.id, p.game_id, p.status
    into v_player_id, v_game_id, v_status
  from public.players p
  join public.rounds r on r.game_id = p.game_id
  where r.id = p_round_id
    and p.user_id = auth.uid();

  if v_player_id is null then
    raise exception 'not a player in this game';
  end if;

  select g.status into v_game_status
  from public.games g
  where g.id = v_game_id;

  if v_game_status <> 'active' then
    raise exception 'game not active';
  end if;

  select r.id into v_latest_round_id
  from public.rounds r
  where r.game_id = v_game_id
  order by r.round_index desc
  limit 1;

  if v_latest_round_id <> p_round_id then
    raise exception 'not current round';
  end if;

  if v_status not in ('active', 'frozen', 'stayed', 'busted') then
    raise exception 'player not eligible to submit';
  end if;

  if exists (
    select 1 from public.round_scores rs
    where rs.round_id = p_round_id
      and rs.player_id = v_player_id
  ) then
    raise exception 'score already submitted';
  end if;

  if v_status = 'busted' then
    v_score := 0;
    p_flip7_bonus := false;
  else
    v_score := greatest(p_score, 0);
  end if;

  insert into public.round_scores (round_id, player_id, score, flip7_bonus)
  values (p_round_id, v_player_id, v_score, p_flip7_bonus);
end;
$function$;

commit;
```

### Lobby Player Cap (20)

There is now a hard limit of 20 players per lobby enforced in `join_game`.

```sql
create or replace function public.join_game(
  p_code text,
  p_name text,
  p_avatar text default null::text,
  p_color text default null::text
)
returns table(game_id uuid, player_id uuid)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_game_id uuid;
  v_player_id uuid;
  v_seat int;
  v_status game_status;
  v_player_count int;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;

  select g.id, g.status into v_game_id, v_status
  from public.games g
  where g.code = upper(p_code);

  if v_game_id is null then
    raise exception 'invalid code';
  end if;

  if v_status <> 'lobby' then
    raise exception 'game not joinable';
  end if;

  if exists (
    select 1 from public.players p
    where p.game_id = v_game_id
      and p.user_id = auth.uid()
  ) then
    raise exception 'already joined';
  end if;

  select count(*) into v_player_count
  from public.players p
  where p.game_id = v_game_id;

  if v_player_count >= 20 then
    raise exception 'lobby is full';
  end if;

  select coalesce(max(seat_order), 0) + 1 into v_seat
  from public.players p
  where p.game_id = v_game_id;

  insert into public.players (game_id, user_id, name, avatar, color, seat_order)
  values (
    v_game_id,
    auth.uid(),
    p_name,
    p_avatar,
    p_color,
    v_seat
  )
  returning id into v_player_id;

  return query select v_game_id, v_player_id;
end;
$function$;
```

## Current RLS Policies

```json
[
  {
    "schemaname": "cron",
    "tablename": "job",
    "policyname": "cron_job_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "using_expr": "(username = CURRENT_USER)",
    "with_check_expr": null
  },
  {
    "schemaname": "cron",
    "tablename": "job_run_details",
    "policyname": "cron_job_run_details_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "using_expr": "(username = CURRENT_USER)",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "games",
    "policyname": "games_select_member",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "using_expr": "((( SELECT auth.uid() AS uid) IS NOT NULL) AND ( SELECT is_game_member(games.id) AS is_game_member))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "games",
    "policyname": "games_update_host",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "using_expr": "is_game_host(id)",
    "with_check_expr": "is_game_host(id)"
  },
  {
    "schemaname": "public",
    "tablename": "players",
    "policyname": "players_select_member",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "using_expr": "((( SELECT auth.uid() AS uid) IS NOT NULL) AND ( SELECT is_game_member(players.game_id) AS is_game_member))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "players",
    "policyname": "players_update_self_or_host",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "using_expr": "((user_id = auth.uid()) OR is_game_host(game_id))",
    "with_check_expr": "((user_id = auth.uid()) OR is_game_host(game_id))"
  },
  {
    "schemaname": "public",
    "tablename": "round_scores",
    "policyname": "round_scores_insert_self",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "using_expr": null,
    "with_check_expr": "(player_id IN ( SELECT p.id\n   FROM players p\n  WHERE (p.user_id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "round_scores",
    "policyname": "round_scores_select_member",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "using_expr": "is_game_member(( SELECT r.game_id\n   FROM rounds r\n  WHERE (r.id = round_scores.round_id)))",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "round_scores",
    "policyname": "round_scores_update_self",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "using_expr": "(player_id IN ( SELECT p.id\n   FROM players p\n  WHERE (p.user_id = auth.uid())))",
    "with_check_expr": "(player_id IN ( SELECT p.id\n   FROM players p\n  WHERE (p.user_id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "rounds",
    "policyname": "rounds_delete_host",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "using_expr": "is_game_host(game_id)",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "rounds",
    "policyname": "rounds_mutate_host",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "using_expr": null,
    "with_check_expr": "is_game_host(game_id)"
  },
  {
    "schemaname": "public",
    "tablename": "rounds",
    "policyname": "rounds_select_member",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "using_expr": "is_game_member(game_id)",
    "with_check_expr": null
  },
  {
    "schemaname": "public",
    "tablename": "rounds",
    "policyname": "rounds_update_host",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "using_expr": "is_game_host(game_id)",
    "with_check_expr": "is_game_host(game_id)"
  }
]
```
