-- Push Tokens RLS ポリシー修正
-- 問題: 現在のポリシーでは、自分のトークンしか読み取れないため、
-- 他のユーザーにプッシュ通知を送信する際にトークンが取得できない

-- 既存のSELECTポリシーを削除
DROP POLICY IF EXISTS "Users can view own tokens" ON public.push_tokens;

-- 新しいSELECTポリシー: ログインしているユーザーは全てのトークンを読み取れる
-- これにより、いいね・マッチング・メッセージ送信時に相手のトークンを取得できる
CREATE POLICY "Authenticated users can view all tokens"
  ON public.push_tokens FOR SELECT
  TO authenticated
  USING (true);

-- 注意: INSERT/UPDATE/DELETEは引き続き自分のトークンのみ操作可能
