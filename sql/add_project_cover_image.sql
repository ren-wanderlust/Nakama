-- プロジェクトにカバー画像を追加
-- 実行日: 2024-12-30

-- cover_imageカラムを追加
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS cover_image TEXT DEFAULT NULL;

-- インデックスは不要（検索には使わない）

-- 確認用クエリ
-- SELECT id, title, cover_image FROM projects LIMIT 5;
