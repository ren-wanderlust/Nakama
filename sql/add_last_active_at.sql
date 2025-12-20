-- Add last_active_at column to profiles table for tracking user activity
-- Run this in Supabase SQL Editor

-- Step 1: Add the column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Set initial value to created_at for existing users
UPDATE profiles 
SET last_active_at = COALESCE(last_active_at, created_at, NOW());

-- Step 3: Create index for sorting by activity
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at 
ON profiles(last_active_at DESC);

-- Step 4: Create a function to update last_active_at on login/activity
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET last_active_at = NOW() 
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The app will call a direct UPDATE when user logs in
-- This is simpler and more reliable than triggers
