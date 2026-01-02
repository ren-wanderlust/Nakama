-- project_applications テーブルに approved_at カラムを追加
-- ユーザーがプロジェクトに参加（承認）された時点を記録するため

-- 1. approved_at カラムを追加（NULL許可、承認時点を記録）
ALTER TABLE public.project_applications 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- 2. 既存の承認済みレコードについて、created_at を approved_at として設定
-- （既存データの整合性を保つため。実際の承認時点は不明なので created_at を使用）
UPDATE public.project_applications 
SET approved_at = created_at 
WHERE status = 'approved' AND approved_at IS NULL;

-- 3. インデックスを追加（未読カウントクエリのパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_project_applications_approved_at 
ON public.project_applications(approved_at) 
WHERE status = 'approved';

-- 4. 説明コメントを追加
COMMENT ON COLUMN public.project_applications.approved_at IS 
'プロジェクトへの参加が承認された時点。未読メッセージカウントで使用（承認以降のメッセージのみを未読としてカウント）。';

