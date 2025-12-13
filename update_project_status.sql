-- プロジェクトテーブルにステータスカラムを追加
ALTER TABLE projects ADD COLUMN status text DEFAULT 'recruiting';

-- 既存のデータを更新（NULLの場合）
UPDATE projects SET status = 'recruiting' WHERE status IS NULL;
