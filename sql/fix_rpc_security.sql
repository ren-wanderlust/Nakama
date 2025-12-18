-- =====================================================
-- RPC関数のセキュリティ修正
-- =====================================================
-- 
-- 目的: Supabase Security Advisor の警告を解消
--   - Function Search Path Mutable 警告への対応
-- 
-- 対象関数:
--   1. public.delete_account
--   2. public.update_chat_room_read_status (存在する場合)
-- 
-- 変更内容:
--   - SECURITY DEFINER 関数に SET search_path = public を追加
--   - 関数名・署名・戻り値・挙動は一切変更しない
-- 
-- 実行方法: Supabase Dashboard > SQL Editor でこのファイルを実行
-- =====================================================

begin;

-- =====================================================
-- 1. public.delete_account 関数の修正
-- =====================================================
-- 
-- 変更内容:
--   - SET search_path = public を関数定義に追加
--   - 既存のロジック・引数・返り値・挙動は一切変更しない
-- 
-- 影響範囲:
--   - MyPage.tsx: supabase.rpc('delete_account') の呼び出し
--   - 関数の動作は変更されないため、既存コードへの影響なし
-- =====================================================

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  -- Delete from theme_participants
  delete from public.theme_participants where user_id = current_user_id;

  -- Delete from likes (sent and received)
  delete from public.likes where sender_id = current_user_id or receiver_id = current_user_id;

  -- Delete from messages (sent and received)
  delete from public.messages where sender_id = current_user_id or receiver_id = current_user_id;

  -- Delete from profiles
  delete from public.profiles where id = current_user_id;

end;
$$;

-- 権限を再付与（既存の権限を維持）
grant execute on function public.delete_account() to authenticated;

-- =====================================================
-- 2. public.update_chat_room_read_status 関数の修正
-- =====================================================
-- 
-- 注意: この関数が存在する場合のみ修正します。
--       存在しない場合は、このセクションをスキップしてください。
-- 
-- 変更内容:
--   - SET search_path = public を関数定義に追加
--   - 既存のロジック・引数・返り値・挙動は一切変更しない
-- 
-- 影響範囲:
--   - この関数を使用しているコードがあれば、動作は変更されない
-- 
-- 実行前の確認:
--   関数が存在するか確認するには、以下を実行してください:
--   SELECT pg_get_functiondef(oid) 
--   FROM pg_proc 
--   WHERE proname = 'update_chat_room_read_status' 
--   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- 
--   関数が存在する場合、その定義を確認し、以下の形式で修正してください:
--   CREATE OR REPLACE FUNCTION public.update_chat_room_read_status(...)
--   RETURNS ...
--   LANGUAGE plpgsql
--   SECURITY DEFINER
--   SET search_path = public
--   AS $$ ... $$;
-- =====================================================

-- 注意: update_chat_room_read_status 関数が存在する場合、
--       上記の確認クエリで関数定義を取得し、SET search_path = public を追加してください。
--       関数の署名（引数）が不明なため、ここでは自動修正を行いません。

commit;

-- =====================================================
-- 確認用クエリ
-- =====================================================
-- 
-- 修正後の関数定義を確認:
-- 
-- SELECT 
--     n.nspname as schema_name,
--     p.proname as function_name,
--     pg_get_functiondef(p.oid) as function_definition
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND p.proname IN ('delete_account', 'update_chat_room_read_status')
-- ORDER BY p.proname;
-- 
-- search_path が設定されているか確認:
-- 
-- SELECT 
--     n.nspname as schema_name,
--     p.proname as function_name,
--     p.proconfig as function_config
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND p.proname IN ('delete_account', 'update_chat_room_read_status')
-- ORDER BY p.proname;
-- 
-- =====================================================
