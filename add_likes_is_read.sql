-- =============================================
-- likes テーブルに is_read カラムを追加
-- SupabaseのSQL Editorで実行してください
-- =============================================

-- 既存のlikesテーブルにis_readカラムを追加
ALTER TABLE likes ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- 既存のレコードはすべて未読として扱う（falseに設定）
UPDATE likes SET is_read = FALSE WHERE is_read IS NULL;
