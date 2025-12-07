-- =============================================
-- notifications テーブルの type 制約を更新
-- SupabaseのSQL Editorで実行してください
-- =============================================

-- 現在の制約を削除
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 新しい制約を追加（application と application_status を許可）
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('important', 'update', 'psychology', 'other', 'like', 'match', 'message', 'application', 'application_status'));
