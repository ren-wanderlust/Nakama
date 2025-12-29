-- ============================================================================
-- 通知（notifications）テーブルの不整合修正用SQL
-- プロジェクト応募（application）の通知が保存されない問題を解決します
-- ============================================================================

-- 1. typeカラムのチェック制約を更新（'application', 'application_status' を許可）
-- NOTE: setup_user_notifications.sql が後から実行されると上書きされてしまうため、ここで確実に修正します
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('important', 'update', 'psychology', 'other', 'like', 'match', 'message', 'application', 'application_status'));

-- 2. 必要なカラムの存在確認（念のため）
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. INSERTポリシーの再作成
-- 通知の挿入が許可されていないとRealtimeイベントも飛びません
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 4. 既存のポリシーも念のため確認（SELECT）
DROP POLICY IF EXISTS "Users can view public notifications and their own notifications" ON public.notifications;
CREATE POLICY "Users can view public notifications and their own notifications"
ON public.notifications FOR SELECT
USING (
  user_id is null -- 全体のお知らせ
  or 
  user_id = auth.uid() -- 自分宛のお知らせ
);
