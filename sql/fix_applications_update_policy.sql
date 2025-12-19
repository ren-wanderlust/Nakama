-- 応募者が自分の応募を更新できるようにするポリシーを追加
-- これにより「再応募」機能が動作するようになります

-- 既存のポリシーを削除（オプション：競合を避けるため）
DROP POLICY IF EXISTS "Users can update their own applications" ON public.project_applications;

-- 応募者が自分の応募を更新できるポリシーを追加
CREATE POLICY "Users can update their own applications"
  ON public.project_applications FOR UPDATE
  USING ( auth.uid() = user_id );

-- 注意：既存の「Project owners can update applications」ポリシーはそのままにします
-- これにより、プロジェクトオーナーは応募の承認/棄却ができ、
-- 応募者は自分の応募を更新（再応募）できるようになります
