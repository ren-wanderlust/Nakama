-- Add status column to projects table
-- This column stores the progress status of the project
-- Possible values: 'idea', 'planning', 'developing', 'beta', 'released'

ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT;

-- Optional: Add a comment for documentation
COMMENT ON COLUMN projects.status IS 'Project progress status: idea, planning, developing, beta, released';
