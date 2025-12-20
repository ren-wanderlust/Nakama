-- Add content_tags column to projects table
-- Run this in Supabase SQL Editor

-- Step 1: Add the column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS content_tags TEXT[];

-- Step 2: Add comment for documentation
COMMENT ON COLUMN projects.content_tags IS 'プロジェクトの内容を表すタグ（複数選択可）';
