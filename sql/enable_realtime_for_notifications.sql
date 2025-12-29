-- ============================================================================
-- Realtime有効化用SQL
-- notifications, project_applications テーブルの変更をアプリ側で検知できるようにします
-- ============================================================================

-- notifications テーブルを Realtime の監視対象に追加
alter publication supabase_realtime add table public.notifications;

-- project_applications テーブルも念のため確認・追加
alter publication supabase_realtime add table public.project_applications;

-- 補足:
-- 既に監視対象になっている場合でもエラーにはなりませんが、
-- もしエラーになる場合は `do nothing` のような構文がないため、
-- UIから確認するか、エラーを無視して進めてください。
-- 通常は idempotent ではありませんが、Supabase上では追加コマンドとして安全に実行できることが多いです。
