-- メッセージ機能用のテーブル作成と設定
-- このSQLをSupabaseのSQLエディタで実行してください

-- 1. messagesテーブルの作成
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  sender_id uuid references auth.users(id) not null,
  receiver_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. RLS（行レベルセキュリティ）の有効化
alter table public.messages enable row level security;

-- 3. 参照ポリシーの作成: 自分が送信または受信したメッセージのみ見れる
create policy "Users can view their own messages"
on public.messages for select
using (
  auth.uid() = sender_id or auth.uid() = receiver_id
);

-- 4. 挿入ポリシーの作成: 自分からのメッセージのみ送信できる
create policy "Users can insert their own messages"
on public.messages for insert
with check (
  auth.uid() = sender_id
);

-- 5. リアルタイム機能の有効化
-- 既存のpublicationに追加（もしエラーになる場合は、SupabaseのDatabase -> Replication設定を確認してください）
alter publication supabase_realtime add table public.messages;

-- 6. パフォーマンス用インデックス
create index if not exists messages_sender_id_idx on public.messages(sender_id);
create index if not exists messages_receiver_id_idx on public.messages(receiver_id);
create index if not exists messages_created_at_idx on public.messages(created_at);
