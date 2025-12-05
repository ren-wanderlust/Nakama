ALTER TABLE projects ADD COLUMN IF NOT EXISTS required_roles text[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags text[];
