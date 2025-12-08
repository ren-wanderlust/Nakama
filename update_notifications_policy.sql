-- notifications テーブルの UPDATE RLS ポリシーを追加
-- ユーザーが自分宛の通知を既読にできるようにする

-- 既存のポリシーがあれば削除
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- ユーザー固有の通知を更新するポリシー
-- user_id が自分のID の通知を更新可能
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 公開通知（user_id is null）の既読管理について:
-- 公開通知は全ユーザーで共有されるため、個別の既読管理には
-- 別途 user_notification_reads テーブルが必要です。
-- 現在の実装では、公開通知は常に未読として表示されます。
-- ユーザー固有の通知（いいね、マッチングなど）のみが既読管理の対象です。

