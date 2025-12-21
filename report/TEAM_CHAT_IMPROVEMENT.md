# チームチャット実装改善 - 個人チャットと同等レベルの実装

## 改善の目的

チームチャットの実装を、個人チャットと同等レベルで「正確・シンプル・効率的」にする。

---

## 改善内容

### 1. 最新メッセージ取得の改善

**改善前**:
- 複数の `order()` で取得し、クライアント側で `Map` + `forEach` で抽出
- PostgREST の仕様上、`order()` 複数指定が正しく効かない可能性
- 不要なメッセージを多く取得している

**改善後**:
- **RPC関数 `get_team_chat_rooms` を使用**
- **PostgreSQL の `DISTINCT ON` を使用して、各 `chat_room_id` ごとに最新1件を確実に取得**
- クライアント側での複雑な集計ロジックを削除

**実装**:
```sql
-- 各ルームの最新メッセージを取得（DISTINCT ON使用）
latest_messages as (
  select distinct on (m.chat_room_id)
    m.chat_room_id,
    m.content as last_message_content,
    m.created_at as last_message_created_at
  from public.messages m
  join accessible_rooms ar on m.chat_room_id = ar.chat_room_id
  order by m.chat_room_id, m.created_at desc
)
```

**効果**:
- ✅ 各ルームごとに最新1件を確実に取得
- ✅ 不要なメッセージを取得しない
- ✅ クライアント側の処理が不要

---

### 2. 未読判定の改善

**改善前**:
- `globalMinLastRead` を使って一括取得し、クライアントでフィルタリング
- チャットルーム数が増えると非効率

**改善後**:
- **RPC関数内で各 `chat_room_id` ごとに未読数をサーバー側で算出**
- `globalMinLastRead` を使わず、各ルームごとに `last_read_at` と `messages.created_at` を比較

**実装**:
```sql
-- 各ルームの未読数をカウント
unread_counts as (
  select
    ar.chat_room_id,
    count(m.id) as unread_count
  from accessible_rooms ar
  left join read_statuses rs on ar.chat_room_id = rs.chat_room_id
  left join public.messages m on m.chat_room_id = ar.chat_room_id
    and m.sender_id <> p_user_id
    and m.created_at > coalesce(rs.last_read_at, timestamp with time zone '1970-01-01 00:00:00+00')
  group by ar.chat_room_id
)
```

**効果**:
- ✅ 各ルームごとに正確に未読数をカウント
- ✅ 不要なメッセージを取得しない
- ✅ チャットルーム数が増えても効率的

---

### 3. 個人チャットとの整合性

**個人チャットの実装**:
- 最新メッセージ: 全メッセージを降順で取得し、最初に見つかったメッセージを使用（シンプル）
- 未読判定: `is_read` フラグで判定（シンプル）

**チームチャットの改善後**:
- 最新メッセージ: RPC関数内で `DISTINCT ON` を使用して各ルームごとに最新1件を取得（シンプル）
- 未読判定: RPC関数内で各ルームごとに未読数をサーバー側で算出（シンプル）

**思想の統一**:
- ✅ 両者とも「サーバー側で最新メッセージ・未読数を確定させる」
- ✅ クライアント側の複雑な集計ロジックを削除
- ✅ 実装を読んだときに、両者が同じ思想で理解できる

---

## 実装ファイル

### 1. SQL: `sql/get_team_chat_rooms.sql`

**RPC関数**: `public.get_team_chat_rooms(p_user_id uuid)`

**戻り値**:
- `chat_room_id`: チャットルームID
- `project_id`: プロジェクトID
- `project_title`: プロジェクトタイトル
- `project_image_url`: プロジェクト画像URL
- `owner_image`: オーナー画像URL
- `room_created_at`: ルーム作成日時
- `last_message_content`: 最新メッセージ内容
- `last_message_created_at`: 最新メッセージ作成日時
- `unread_count`: 未読数

**特徴**:
- ✅ `DISTINCT ON` を使用して最新メッセージを確実に取得
- ✅ 各ルームごとに未読数を正確にカウント
- ✅ `SECURITY DEFINER` + `SET search_path = public` でセキュリティ対応

---

### 2. TypeScript: `data/api/chatRooms.ts`

**改善前** (L134-245):
- 複数のクエリを実行し、クライアント側で `Map` + `forEach` で集計
- `globalMinLastRead` を使用して非効率

**改善後**:
```typescript
// --- Team Chats (Server-side aggregation via RPC) ---
// 個人チャットと同じ思想: サーバー側で最新メッセージ・未読数を確定させる
const { data: teamRoomsData, error: teamRoomsError } = await supabase.rpc('get_team_chat_rooms', {
  p_user_id: userId,
});

if (teamRoomsError) {
  console.error('Error fetching team chat rooms:', teamRoomsError);
  throw teamRoomsError;
}

let teamRooms: ChatRoom[] = [];
if (teamRoomsData && teamRoomsData.length > 0) {
  teamRooms = teamRoomsData.map((room: any) => {
    // タイムスタンプのフォーマットのみ（個人チャットと同じ）
    // ...
  });
}
```

**特徴**:
- ✅ RPC関数を1回呼び出すだけ
- ✅ クライアント側の複雑な集計ロジックを削除
- ✅ 個人チャットと同じシンプルな実装

---

## なぜこの設計が個人チャットと同等に理想的か

### 1. **サーバー側での集約**

**個人チャット**:
- クエリで直接取得（`order('created_at', { ascending: false })`）
- サーバー側でソート済みのデータを取得

**チームチャット（改善後）**:
- RPC関数で集約（`DISTINCT ON` で最新メッセージ、`COUNT` で未読数）
- サーバー側で集約済みのデータを取得

**共通点**: ✅ 両者ともサーバー側でデータを確定させ、クライアント側は表示のみ

---

### 2. **クライアント側の処理の簡素化**

**個人チャット**:
- 取得したメッセージをループして、最初に見つかったメッセージを使用
- 未読数を `Map` で集計

**チームチャット（改善後）**:
- RPC関数の結果をそのまま使用
- クライアント側での集計ロジックが不要

**共通点**: ✅ クライアント側の処理がシンプル

---

### 3. **スケーラビリティ**

**個人チャット**:
- メッセージ数が増えても、降順で取得するため効率的

**チームチャット（改善後）**:
- `DISTINCT ON` を使用して、各ルームごとに最新1件のみを取得
- 未読数もサーバー側でカウントするため、チャットルーム数が増えても効率的

**共通点**: ✅ スケールしても破綻しない設計

---

### 4. **実装の理解しやすさ**

**個人チャット**:
- 「全メッセージを降順で取得 → 最初の1件を使用」という明確なロジック

**チームチャット（改善後）**:
- 「RPC関数で各ルームごとに最新メッセージ・未読数を取得」という明確なロジック

**共通点**: ✅ 実装を読んだときに、両者が同じ思想で理解できる

---

## 改善の効果

### パフォーマンス

1. **最新メッセージ取得**:
   - 改善前: 全メッセージを取得し、クライアント側で抽出（非効率）
   - 改善後: 各ルームごとに最新1件のみを取得（効率的）

2. **未読判定**:
   - 改善前: `globalMinLastRead` を使って多くの不要なメッセージを取得（非効率）
   - 改善後: 各ルームごとに未読数をサーバー側でカウント（効率的）

### コードの簡潔性

1. **クライアント側の処理**:
   - 改善前: `Map` + `forEach` で複雑な集計ロジック（約110行）
   - 改善後: RPC関数の結果をそのまま使用（約30行）

2. **保守性**:
   - 改善前: クライアント側のロジックが複雑で、バグが発生しやすい
   - 改善後: サーバー側で集約するため、ロジックが明確で保守しやすい

---

## 実行手順

### 1. SQL関数の作成

Supabase Dashboard > SQL Editor で `sql/get_team_chat_rooms.sql` を実行

### 2. TypeScriptコードの更新

`data/api/chatRooms.ts` が既に更新済み

### 3. 動作確認

- チームチャット一覧が正しく表示されるか
- 最新メッセージが正しく表示されるか
- 未読数が正しく表示されるか
- Realtime購読が正しく動作するか

---

## まとめ

**改善のポイント**:
1. ✅ 最新メッセージ取得: `DISTINCT ON` を使用してサーバー側で確実に取得
2. ✅ 未読判定: 各ルームごとにサーバー側で正確にカウント
3. ✅ 個人チャットとの整合性: 同じ思想で実装

**結果**:
- ✅ 個人チャットと同等レベルで「正確・シンプル・効率的」
- ✅ スケールしても破綻しない設計
- ✅ 実装を読んだときに、両者が同じ思想で理解できる
