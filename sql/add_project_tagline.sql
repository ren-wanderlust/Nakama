-- Add tagline column to projects table
-- Run this in Supabase SQL Editor

-- Step 1: Add the column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN projects.tagline IS 'プロジェクトの短い説明（タグライン）';
