-- =====================================================
-- チームチャット一覧取得用のRPC関数
-- =====================================================
-- 
-- 目的: チームチャットの最新メッセージと未読数を
--       サーバー側で効率的に取得する
-- 
-- 個人チャットと同じ思想:
--   - 最新メッセージ: 各ルームごとに最新1件を確実に取得
--   - 未読数: 各ルームごとに正確にカウント
-- 
-- 実行方法: Supabase Dashboard > SQL Editor で実行
-- =====================================================

-- Function: public.get_team_chat_rooms(p_user_id uuid)
-- Returns: チームチャットルーム一覧（最新メッセージ・未読数含む）
create or replace function public.get_team_chat_rooms(p_user_id uuid)
returns table (
  chat_room_id uuid,
  project_id uuid,
  project_title text,
  project_image_url text,
  owner_image text,
  room_created_at timestamp with time zone,
  last_message_content text,
  last_message_created_at timestamp with time zone,
  last_message_image_url text,
  last_message_sender_id uuid,
  last_message_sender_name text,
  unread_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with
  -- 1. ユーザーが参加しているプロジェクトを取得
  member_projects as (
    select id as project_id
    from public.projects
    where owner_id = p_user_id

    union

    select pa.project_id
    from public.project_applications pa
    where pa.user_id = p_user_id
      and pa.status = 'approved'
  ),
  -- 2. ユーザーが参加しているチームチャットルームを取得
  accessible_rooms as (
    select
      cr.id as chat_room_id,
      cr.project_id,
      cr.created_at as room_created_at,
      p.title as project_title,
      p.image_url as project_image_url,
      owner_profile.image as owner_image
    from public.chat_rooms cr
    join member_projects mp on cr.project_id = mp.project_id
    left join public.projects p on cr.project_id = p.id
    left join public.profiles owner_profile on p.owner_id = owner_profile.id
    where cr.type = 'group'
  ),
  -- 3. 各ルームの最新メッセージを取得（DISTINCT ON使用）
  latest_messages as (
    select distinct on (m.chat_room_id)
      m.chat_room_id,
      replace(m.content, '__system__', '') as last_message_content,
      m.created_at as last_message_created_at,
      m.image_url as last_message_image_url,
      m.sender_id as last_message_sender_id,
      sender_profile.name as last_message_sender_name
    from public.messages m
    join accessible_rooms ar on m.chat_room_id = ar.chat_room_id
    left join public.profiles sender_profile on m.sender_id = sender_profile.id
    order by m.chat_room_id, m.created_at desc
  ),
  -- 4. 各ルームの既読状態を取得
  read_statuses as (
    select
      rs.chat_room_id,
      rs.last_read_at
    from public.chat_room_read_status rs
    where rs.user_id = p_user_id
  ),
  -- 4.5. ユーザーが各プロジェクトに参加した時点を取得
  participation_times as (
    -- プロジェクトオーナーの場合
    select
      p.id as project_id,
      least(
        p.created_at,
        coalesce(cr.created_at, p.created_at)
      ) as joined_at
    from public.projects p
    left join public.chat_rooms cr on cr.project_id = p.id and cr.type = 'group'
    where p.owner_id = p_user_id
    
    union
    
    -- 参加者の場合（approved_at を使用）
    select
      pa.project_id,
      coalesce(pa.approved_at, pa.created_at) as joined_at
    from public.project_applications pa
    where pa.user_id = p_user_id
      and pa.status = 'approved'
  ),
  -- 5. 各ルームの未読数をカウント
  unread_counts as (
    select
      ar.chat_room_id,
      count(m.id) as unread_count
    from accessible_rooms ar
    left join read_statuses rs on ar.chat_room_id = rs.chat_room_id
    left join participation_times pt on pt.project_id = ar.project_id
    left join public.messages m on m.chat_room_id = ar.chat_room_id
      and m.sender_id <> p_user_id
      and m.created_at > coalesce(
        rs.last_read_at,
        coalesce(pt.joined_at, timestamp with time zone '1970-01-01 00:00:00+00')
      )
    group by ar.chat_room_id
  )
  -- 6. すべてのデータを結合して返す
  select
    ar.chat_room_id,
    ar.project_id,
    ar.project_title,
    ar.project_image_url,
    ar.owner_image,
    ar.room_created_at,
    coalesce(lm.last_message_content, 'チームチャットが作成されました') as last_message_content,
    coalesce(lm.last_message_created_at, ar.room_created_at) as last_message_created_at,
    lm.last_message_image_url,
    lm.last_message_sender_id,
    lm.last_message_sender_name,
    coalesce(uc.unread_count, 0) as unread_count
  from accessible_rooms ar
  left join latest_messages lm on ar.chat_room_id = lm.chat_room_id
  left join unread_counts uc on ar.chat_room_id = uc.chat_room_id
  order by coalesce(lm.last_message_created_at, ar.room_created_at) desc;
end;
$$;


-- 権限を付与
grant execute on function public.get_team_chat_rooms(uuid) to authenticated;

-- =====================================================
-- 確認用クエリ
-- =====================================================
-- 
-- SELECT * FROM public.get_team_chat_rooms('user_id_here');
-- 
-- =====================================================
