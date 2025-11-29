-- チャット画像送信機能用の設定
-- このSQLをSupabaseのSQLエディタで実行してください

-- 1. messagesテーブルにimage_urlカラムを追加
alter table public.messages 
add column if not exists image_url text;

-- 2. チャット画像用のストレージバケット 'chat-images' を作成
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

-- 3. ストレージポリシーの設定

-- 誰でも閲覧可能（チャット相手が見れるようにするため）
create policy "Public Access Chat Images"
on storage.objects for select
using ( bucket_id = 'chat-images' );

-- 認証済みユーザーはアップロード可能
create policy "Authenticated users can upload chat images"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'chat-images' );

-- 自分のアップロードした画像は削除可能（必要であれば）
create policy "Users can delete their own chat images"
on storage.objects for delete
to authenticated
using ( bucket_id = 'chat-images' and owner = auth.uid() );
