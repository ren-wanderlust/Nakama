-- =============================================
-- 指定されたユーザーを削除するスクリプト
-- SupabaseのSQL Editorで実行してください
-- =============================================

-- 削除対象ユーザーID
-- 1eff21e9-8976-439a-953d-811d04bd0ad5

-- 1. 関連データを先に削除（外部キー制約のため）

-- いいね関連
DELETE FROM likes WHERE sender_id = '1eff21e9-8976-439a-953d-811d04bd0ad5' OR receiver_id = '1eff21e9-8976-439a-953d-811d04bd0ad5';

-- 通知関連
DELETE FROM notifications WHERE user_id = '1eff21e9-8976-439a-953d-811d04bd0ad5' OR sender_id = '1eff21e9-8976-439a-953d-811d04bd0ad5';

-- メッセージ関連
DELETE FROM messages WHERE sender_id = '1eff21e9-8976-439a-953d-811d04bd0ad5' OR receiver_id = '1eff21e9-8976-439a-953d-811d04bd0ad5';

-- チャットルームメンバー
DELETE FROM chat_room_members WHERE user_id = '1eff21e9-8976-439a-953d-811d04bd0ad5';

-- プロジェクトメンバー
DELETE FROM project_members WHERE user_id = '1eff21e9-8976-439a-953d-811d04bd0ad5';

-- プロジェクト（オーナーの場合）
DELETE FROM projects WHERE owner_id = '1eff21e9-8976-439a-953d-811d04bd0ad5';

-- プッシュトークン
DELETE FROM push_tokens WHERE user_id = '1eff21e9-8976-439a-953d-811d04bd0ad5';

-- ブロック関連
DELETE FROM blocks WHERE blocker_id = '1eff21e9-8976-439a-953d-811d04bd0ad5' OR blocked_id = '1eff21e9-8976-439a-953d-811d04bd0ad5';

-- 通報関連
DELETE FROM reports WHERE reporter_id = '1eff21e9-8976-439a-953d-811d04bd0ad5' OR reported_id = '1eff21e9-8976-439a-953d-811d04bd0ad5';

-- 2. プロフィールを削除
DELETE FROM profiles WHERE id = '1eff21e9-8976-439a-953d-811d04bd0ad5';

-- 3. 認証ユーザーを削除（管理者権限が必要）
-- DELETE FROM auth.users WHERE id = '1eff21e9-8976-439a-953d-811d04bd0ad5';
