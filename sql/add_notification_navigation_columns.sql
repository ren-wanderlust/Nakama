-- Add columns to notifications table for navigation support
-- This allows notifications to link to specific projects and users

-- Add project_id column for project-related notifications (e.g., applications)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Add related_user_id column for user-related notifications (e.g., likes, matches)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS related_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add sender_id column to track who sent the notification
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_user_id ON notifications(related_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);

-- Add comments for documentation
COMMENT ON COLUMN notifications.project_id IS 'プロジェクト関連の通知用（応募など）';
COMMENT ON COLUMN notifications.related_user_id IS 'いいね・マッチングの相手ユーザー';
COMMENT ON COLUMN notifications.sender_id IS '通知送信者';
