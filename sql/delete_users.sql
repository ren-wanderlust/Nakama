-- =============================================
-- 指定されたユーザーを削除するスクリプト
-- SupabaseのSQL Editorで実行してください
-- =============================================

-- 削除対象ユーザーID
-- a4e6010a-a316-4d82-8890-9e7b4795df6a

-- 1. 関連データを先に削除（外部キー制約のため）

-- いいね関連
DELETE FROM likes WHERE sender_id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a' OR receiver_id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a';

-- 通知関連
DELETE FROM notifications WHERE user_id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a' OR sender_id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a';

-- メッセージ関連
DELETE FROM messages WHERE sender_id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a' OR receiver_id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a';

-- プロジェクト応募
DELETE FROM project_applications WHERE user_id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a';

-- テーマ参加者
DELETE FROM theme_participants WHERE user_id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a';

-- プロジェクト（オーナーの場合）
DELETE FROM projects WHERE owner_id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a';

-- プッシュトークン
DELETE FROM push_tokens WHERE user_id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a';

-- ブロック関連
DELETE FROM blocks WHERE blocker_id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a' OR blocked_id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a';

-- 通報関連
DELETE FROM reports WHERE reporter_id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a' OR reported_id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a';

-- 2. プロフィールを削除
DELETE FROM profiles WHERE id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a';

-- 3. 認証ユーザーを削除
DELETE FROM auth.users WHERE id = 'a4e6010a-a316-4d82-8890-9e7b4795df6a';
