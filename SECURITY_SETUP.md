# セキュリティ設定ガイド

## 概要

このドキュメントは、Supabase Security Advisor の警告を解消するための設定手順を説明します。

---

## 1. RPC関数のセキュリティ修正

### 対象関数

- `public.delete_account`
- `public.update_chat_room_read_status` (存在する場合)

### 対応内容

**警告**: Function Search Path Mutable

**解決方法**: `SECURITY DEFINER` 関数に `SET search_path = public` を追加

### 実行手順

1. Supabase Dashboard > SQL Editor を開く
2. `sql/fix_rpc_security.sql` を実行
3. 実行結果を確認（エラーがないことを確認）

### 確認方法

```sql
-- 修正後の関数定義を確認
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    p.proconfig as function_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('delete_account', 'update_chat_room_read_status')
ORDER BY p.proname;
```

`function_config` に `{search_path=public}` が含まれていることを確認してください。

### 注意事項

- `update_chat_room_read_status` 関数が存在しない場合は、該当セクションをスキップしてください
- 関数の署名（引数）が不明な場合は、先に `pg_get_functiondef()` で定義を確認してください

---

## 2. Leaked Password Protection の有効化

### 警告

**警告**: Leaked Password Protection Disabled

### 対応内容

Supabase Dashboard 側で Leaked Password Protection を有効化する必要があります。

### 実行手順

1. Supabase Dashboard にログイン
2. プロジェクトを選択
3. **Authentication** > **Policies** に移動
4. **Password** セクションを開く
5. **Leaked Password Protection** を有効化
6. 設定を保存

### 設定内容

- **Enable Leaked Password Protection**: ON
- **Password Strength**: 推奨設定を使用（またはカスタム設定）

### 効果

- 既知の漏洩パスワードリストと照合し、脆弱なパスワードの使用を防止
- ユーザー登録時に、漏洩したパスワードの使用をブロック

### 注意事項

- この設定は Supabase Dashboard 側でのみ変更可能です
- アプリコード側の変更は不要です
- 既存ユーザーには影響しません（新規登録時のみ適用）

---

## 3. 確認チェックリスト

### RPC関数のセキュリティ修正

- [ ] `sql/fix_rpc_security.sql` を実行
- [ ] `delete_account` 関数に `SET search_path = public` が追加されていることを確認
- [ ] `update_chat_room_read_status` 関数が存在する場合、同様に修正されていることを確認
- [ ] 既存のアプリケーション動作に影響がないことを確認

### Leaked Password Protection

- [ ] Supabase Dashboard で Leaked Password Protection を有効化
- [ ] 新規ユーザー登録時に脆弱なパスワードがブロックされることを確認

---

## 4. トラブルシューティング

### RPC関数の修正でエラーが発生する場合

1. 関数が存在するか確認:
   ```sql
   SELECT proname, pronamespace 
   FROM pg_proc 
   WHERE proname = 'delete_account';
   ```

2. 関数の現在の定義を確認:
   ```sql
   SELECT pg_get_functiondef(oid) 
   FROM pg_proc 
   WHERE proname = 'delete_account';
   ```

3. 権限を確認:
   ```sql
   SELECT grantee, privilege_type 
   FROM information_schema.routine_privileges 
   WHERE routine_name = 'delete_account';
   ```

### Leaked Password Protection が有効化できない場合

- Supabase プロジェクトのプランでこの機能が利用可能か確認
- プロジェクト管理者権限があるか確認
- Supabase サポートに問い合わせ

---

## 5. 参考リンク

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [PostgreSQL Function Security](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [Supabase Leaked Password Protection](https://supabase.com/docs/guides/auth/password-security)

---

## 更新履歴

- 2025-01-XX: 初版作成
