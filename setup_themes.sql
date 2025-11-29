-- 挑戦カード（テーマ）機能用のテーブル作成と設定
-- このSQLをSupabaseのSQLエディタで実行してください

-- 1. themesテーブルの作成
create table if not exists public.themes (
  id uuid default gen_random_uuid() primary key,
  title text not null unique,
  icon text not null,
  image_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. theme_participantsテーブルの作成（ユーザーとテーマの紐付け）
create table if not exists public.theme_participants (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  theme_id uuid references public.themes(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, theme_id) -- 同じテーマに重複して参加できないようにする
);

-- 3. RLS（行レベルセキュリティ）の有効化
alter table public.themes enable row level security;
alter table public.theme_participants enable row level security;

-- 4. ポリシーの設定

-- themes: 誰でも閲覧可能
create policy "Anyone can view themes"
on public.themes for select
using ( true );

-- themes: 管理者のみ追加・編集・削除可能（今回は簡易的にauthenticatedは閲覧のみとするが、運用上はService Role等で管理）
-- ユーザーが勝手に追加できないように、insert/update/deleteポリシーは作成しない（デフォルトで拒否）

-- theme_participants: 誰でも閲覧可能（参加人数カウントのため）
create policy "Anyone can view theme participants"
on public.theme_participants for select
using ( true );

-- theme_participants: 認証済みユーザーは自分の参加情報を追加可能
create policy "Users can join themes"
on public.theme_participants for insert
to authenticated
with check ( auth.uid() = user_id );

-- theme_participants: 認証済みユーザーは自分の参加情報を削除可能（参加キャンセル）
create policy "Users can leave themes"
on public.theme_participants for delete
to authenticated
using ( auth.uid() = user_id );

-- 5. 初期データの投入
insert into public.themes (icon, title, image_url)
values
  ('🤖', 'AIプロダクト開発', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80'),
  ('📱', 'モバイルアプリ開発', 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80'),
  ('🚀', 'スタートアップ起業', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80'),
  ('⛓️', 'Web3 / ブロックチェーン', 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80'),
  ('🏙️', '地方創生 / まちづくり', 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80'),
  ('👗', 'D2C / ブランド立ち上げ', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80'),
  ('🔥', 'ハッカソン / ビジコン', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80'),
  ('📚', 'EdTech / 教育', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80'),
  ('🤝', '学生団体 / コミュニティ', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80'),
  ('💻', 'Vibeコーディング', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80'),
  ('🎮', 'ゲーム制作 / エンタメ', 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=800&q=80'),
  ('📹', '動画・メディア運営', 'https://images.unsplash.com/photo-1586899028174-e7098604235b?auto=format&fit=crop&w=800&q=80')
on conflict (title) do nothing;
