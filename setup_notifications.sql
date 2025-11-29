-- お知らせ機能用のテーブル作成と設定
-- このSQLをSupabaseのSQLエディタで実行してください

-- 1. notificationsテーブルの作成
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('important', 'update', 'psychology', 'other')),
  title text not null,
  content text, -- 詳細内容
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. RLS（行レベルセキュリティ）の有効化
alter table public.notifications enable row level security;

-- 3. 参照ポリシーの作成: 誰でも閲覧可能
create policy "Anyone can view notifications"
on public.notifications for select
using ( true );

-- 4. 初期データの投入（テスト用）
insert into public.notifications (type, title, content, image_url, created_at)
values
  (
    'important',
    '【重要】利用規約改定のお知らせ',
    '2024年11月19日より利用規約を一部改定いたしました。主な変更点は...',
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop',
    now()
  ),
  (
    'update',
    '新機能「挑戦カード」がリリースされました！',
    '興味のあるテーマを探して、同じ志を持つ仲間とつながりましょう！',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&h=100&fit=crop',
    now() - interval '1 day'
  ),
  (
    'psychology',
    'あなたの隠れた才能がわかる？「ビジネス心理テスト」公開中',
    'たった3分であなたの適職や強みがわかる心理テストを公開しました。',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&h=100&fit=crop',
    now() - interval '3 days'
  ),
  (
    'other',
    'プロフィールを充実させて、マッチング率をアップさせましょう！',
    '自己紹介文やタグを詳しく設定することで、より相性の良い相手とマッチングしやすくなります。',
    'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop',
    now() - interval '5 days'
  );
