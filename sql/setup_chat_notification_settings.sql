-- =====================================================
-- チャット通知（ミュート）設定テーブル
-- =====================================================
-- 目的:
-- - ユーザーごとに「このチャットは通知オフ」を保存する
-- - 送信者側がミュートユーザーを判定して push を送らないようにできる
--
-- 注意:
-- - 現状の push 送信はクライアント側で Expo Push API を直接叩く実装のため、
--   送信者が受信者のミュート設定を参照できる必要があります。
--   そのため SELECT は authenticated に対して広めに許可しています（運用上は要検討）。
-- =====================================================

CREATE TABLE IF NOT EXISTS public.chat_notification_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('dm', 'group')),
  target_id uuid NOT NULL, -- dm: 相手ユーザーID / group: chat_room_id
  muted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, type, target_id)
);

ALTER TABLE public.chat_notification_settings ENABLE ROW LEVEL SECURITY;

-- 自分の設定は操作できる
CREATE POLICY "Users can upsert own chat notification settings"
  ON public.chat_notification_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat notification settings"
  ON public.chat_notification_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat notification settings"
  ON public.chat_notification_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 送信者がミュート判定できるように読み取りは authenticated に許可（要検討）
DROP POLICY IF EXISTS "Authenticated users can view all chat notification settings" ON public.chat_notification_settings;
CREATE POLICY "Authenticated users can view all chat notification settings"
  ON public.chat_notification_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_chat_notification_settings_lookup
  ON public.chat_notification_settings(type, target_id, user_id);


