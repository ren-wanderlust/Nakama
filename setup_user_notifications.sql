-- ユーザー個別通知用にnotificationsテーブルを拡張

-- 1. カラムの追加
alter table public.notifications 
add column if not exists user_id uuid references auth.users(id),
add column if not exists sender_id uuid references auth.users(id),
add column if not exists is_read boolean default false;

-- 2. typeの制約を解除して再設定（既存のデータを考慮）
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check 
  check (type in ('important', 'update', 'psychology', 'other', 'like', 'match'));

-- 3. RLSポリシーの更新
drop policy if exists "Anyone can view notifications" on public.notifications;

create policy "Users can view public notifications and their own notifications"
on public.notifications for select
using (
  user_id is null -- 全体のお知らせ
  or 
  user_id = auth.uid() -- 自分宛のお知らせ
);

-- 4. インサートポリシー（App.tsxから入れるため）
create policy "Authenticated users can insert notifications"
on public.notifications for insert
with check (auth.role() = 'authenticated');
