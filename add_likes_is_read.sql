-- =============================================
-- likes テーブルに is_read カラムを追加
-- SupabaseのSQL Editorで実行してください
-- =============================================

-- 既存のlikesテーブルにis_readカラムを追加（興味あり用）
ALTER TABLE likes ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- 既存のレコードはすべて未読として扱う（falseに設定）
UPDATE likes SET is_read = FALSE WHERE is_read IS NULL;

-- =============================================
-- is_read_as_match カラムを追加（マッチング用）
-- =============================================

-- マッチング確認用のカラムを追加
ALTER TABLE likes ADD COLUMN IF NOT EXISTS is_read_as_match BOOLEAN DEFAULT FALSE;

-- 既存のレコードはすべて未読として扱う
UPDATE likes SET is_read_as_match = FALSE WHERE is_read_as_match IS NULL;

-- =============================================
-- UPDATE ポリシーを追加（既読にするため）
-- =============================================

-- 既存のポリシーがあれば削除
DROP POLICY IF EXISTS "Users can mark received likes as read" ON public.likes;

-- 受信者が自分宛のいいねを既読に更新できるポリシー
CREATE POLICY "Users can mark received likes as read"
ON public.likes FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);
