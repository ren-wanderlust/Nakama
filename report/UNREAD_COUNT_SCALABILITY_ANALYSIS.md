# 未読カウント実装のスケーラビリティ分析

## 概要

新しく実装した未読カウント機能（プロジェクト参加時点以降のメッセージのみを未読としてカウント）について、リアルタイムチャットアプリとしてスケールに耐えられるかを分析しました。

---

## 🔴 重大な問題

### 1. リアルタイム購読の範囲が広すぎる

**場所**: `App.tsx` L355-468

**問題**:
```typescript
const channel = supabase
  .channel(`unread_messages_${session.user.id}`)
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'messages' },
    // フィルターなし → 全ユーザーの全メッセージ変更を購読
  )
```

**影響**:
- ❌ **世界中の全ユーザーの全メッセージ変更イベントを受信**
- ❌ メッセージが増えるほど、無関係なイベントが増加
- ❌ ネットワーク帯域の無駄遣い
- ❌ クライアント側のCPU使用率増加（フィルタリング処理）
- ❌ Supabase Realtimeの接続上限に早く到達

**想定される規模での影響**:
- 1,000ユーザー × 1メッセージ/分 = 1,000イベント/分/ユーザー
- 10,000ユーザー × 1メッセージ/分 = 10,000イベント/分/ユーザー
- **スケール不可**

---

### 2. リアルタイムイベントでのプロフィール取得（N+1問題）

**場所**: `App.tsx` L384-390

**問題**:
```typescript
// メッセージが来るたびに、毎回プロフィールを取得
const { data } = await supabase
  .from('profiles')
  .select('name, image')
  .eq('id', newMessage.sender_id)
  .single();
```

**影響**:
- ❌ メッセージが来るたびに追加のDBクエリ
- ❌ チャットが活発な場合、大量のプロフィール取得リクエスト
- ❌ レイテンシーの増加

**想定される規模での影響**:
- 1メッセージ/秒 × 1プロフィール取得 = 60リクエスト/分/ユーザー
- 10メッセージ/秒 = 600リクエスト/分/ユーザー
- **DB負荷増大**

---

### 3. 過剰なクエリ無効化と再取得

**場所**: `App.tsx` L450-452, 463-465

**問題**:
```typescript
// 全てのメッセージ変更で以下を実行
queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount.detail(session.user.id) });
queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(session.user.id) });
queryClient.refetchQueries({ queryKey: queryKeys.chatRooms.list(session.user.id) });
```

**影響**:
- ❌ 無関係なメッセージ変更でも`get_team_chat_rooms`と`get_unread_message_count`を再実行
- ❌ チャット一覧全体を再取得（重いクエリ）
- ❌ サーバー負荷増大

**想定される規模での影響**:
- 1,000イベント/分/ユーザー × 2クエリ = 2,000クエリ/分/ユーザー
- **DB負荷増大、レスポンス低下**

---

## ⚠️ 中程度の問題

### 4. SQL関数での未読カウント計算の効率性

**場所**: `sql/get_team_chat_rooms.sql` L113-126

**問題**:
```sql
unread_counts as (
  select
    ar.chat_room_id,
    count(m.id) as unread_count
  from accessible_rooms ar
  left join read_statuses rs on ar.chat_room_id = rs.chat_room_id
  left join participation_times pt on pt.project_id = ar.project_id
  left join public.messages m on m.chat_room_id = ar.chat_room_id
    and m.sender_id <> p_user_id
    and m.created_at > coalesce(...)
  group by ar.chat_room_id
)
```

**懸念点**:
- ⚠️ 大量のメッセージがあるルームで、全メッセージをスキャンする可能性
- ⚠️ `participation_times` CTEは毎回再計算（キャッシュなし）

**現状の評価**:
- ✅ `idx_messages_room_time` インデックス（`chat_room_id, created_at DESC`）があるため、範囲スキャンは効率的
- ⚠️ ただし、ルーム数が増えるとパフォーマンス低下の可能性

**想定される規模での影響**:
- 100ルーム × 10,000メッセージ/ルーム = 1,000,000行スキャン可能性
- **インデックスがあれば許容範囲だが、要監視**

---

### 5. インデックスの確認

**確認済み**:
- ✅ `idx_project_applications_approved_at` - `approved_at`にインデックス（追加済み）
- ✅ `idx_project_applications_user_approved` - `(user_id, status)`にインデックス（既存）
- ✅ `idx_messages_room_time` - `(chat_room_id, created_at DESC)`にインデックス（既存）
- ✅ `idx_chat_room_read_status_user_room` - `(user_id, chat_room_id)`にインデックス（既存）

**不足している可能性**:
- ⚠️ `participation_times` CTEで`project_applications`の`(user_id, status, approved_at)`複合インデックスがあるとより効率的
  - 現在: `idx_project_applications_user_approved (user_id, status) WHERE status = 'approved'`
  - 推奨: `(user_id, status, approved_at) WHERE status = 'approved'`

---

## ✅ 良好な点

### 1. サーバー側での集約
- ✅ RPC関数（`get_team_chat_rooms`, `get_unread_message_count`）でサーバー側集約
- ✅ クライアント側での複雑な計算を回避

### 2. React Queryの活用
- ✅ キャッシュ戦略（`staleTime`, `gcTime`）
- ✅ クエリの再利用

### 3. インデックスの充実
- ✅ 主要なクエリパスにインデックスが設定済み

---

## 🚨 緊急度別の改善提案

### 🔴 緊急（スケーラビリティに致命的）

#### 1. リアルタイム購読のフィルタリング

**改善案**:
```typescript
// フィルター付きで購読（Supabase Realtimeのフィルター機能を使用）
const channel = supabase
  .channel(`unread_messages_${session.user.id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    // 自分宛のメッセージ、または参加しているグループチャットのみ
    filter: `receiver_id=eq.${session.user.id} OR chat_room_id=in.(${participatingRoomIds.join(',')})`
  }, ...)
```

**制約**:
- ⚠️ Supabase Realtimeのフィルターは限定的（複雑な条件ができない可能性）
- ⚠️ `participatingRoomIds`の動的更新が必要

**代替案（推奨）**:
```typescript
// イベント受信時に、自分に関係するメッセージかチェック
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'messages'
}, async (payload) => {
  const newMessage = payload.new;
  
  // 自分に関係するメッセージかチェック（早期リターン）
  const isRelevant = 
    newMessage.receiver_id === session.user.id ||
    newMessage.sender_id === session.user.id ||
    (newMessage.chat_room_id && participatingRoomIds.has(newMessage.chat_room_id));
  
  if (!isRelevant) return; // 無関係なメッセージはスキップ
  
  // 関係するメッセージのみ処理
  ...
})
```

**効果**:
- ✅ 無関係なイベントの処理をスキップ
- ✅ クライアント側のCPU使用率削減
- ✅ ネットワーク帯域の節約

---

#### 2. プロフィール取得のキャッシュ化

**改善案**:
```typescript
// React Queryのキャッシュから取得を試みる
const profileQueryKey = queryKeys.profile.detail(newMessage.sender_id);
const cachedProfile = queryClient.getQueryData(profileQueryKey);

if (cachedProfile) {
  senderName = cachedProfile.name || '';
  senderImage = cachedProfile.image || '';
} else {
  // キャッシュがない場合のみ取得（バッチ取得も検討）
  const { data } = await supabase
    .from('profiles')
    .select('name, image')
    .eq('id', newMessage.sender_id)
    .single();
  ...
  
  // キャッシュに保存
  queryClient.setQueryData(profileQueryKey, data);
}
```

**さらに改善（バッチ取得）**:
```typescript
// 複数のメッセージが連続して来た場合、プロフィール取得をバッチ化
const profileIdsToFetch = new Set<string>();
let batchTimeout: NodeJS.Timeout | null = null;

const queueProfileFetch = (senderId: string) => {
  profileIdsToFetch.add(senderId);
  
  if (batchTimeout) clearTimeout(batchTimeout);
  batchTimeout = setTimeout(async () => {
    if (profileIdsToFetch.size === 0) return;
    
    // バッチで一括取得
    const ids = Array.from(profileIdsToFetch);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, image')
      .in('id', ids);
    
    // キャッシュに保存
    profiles?.forEach(profile => {
      queryClient.setQueryData(queryKeys.profile.detail(profile.id), profile);
    });
    
    profileIdsToFetch.clear();
  }, 100); // 100ms待ってバッチ化
};
```

**効果**:
- ✅ N+1問題の解決
- ✅ DB負荷削減
- ✅ レイテンシー削減

---

#### 3. クエリ無効化の最適化

**改善案**:
```typescript
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'messages'
}, async (payload) => {
  const newMessage = payload.new;
  
  // 自分に関係するメッセージかチェック
  const isRelevant = checkIfMessageIsRelevant(newMessage, session.user.id);
  if (!isRelevant) return;
  
  // 特定のルームのみ無効化（部分的な更新）
  if (newMessage.chat_room_id) {
    // グループチャットの場合
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.chatRooms.list(session.user.id),
      exact: false 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.unreadCount.detail(session.user.id) 
    });
  } else {
    // 個人チャットの場合
    const roomId = newMessage.receiver_id === session.user.id 
      ? newMessage.sender_id 
      : newMessage.receiver_id;
    
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.chatRooms.list(session.user.id) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.messages.list(roomId) 
    });
  }
  
  // refetchQueriesは削除（invalidateQueriesで十分）
  // → ユーザーが画面を見ている場合のみ自動再取得される
});
```

**効果**:
- ✅ 無関係なメッセージ変更での無効化を回避
- ✅ 必要最小限のクエリ無効化
- ✅ 自動再取得の抑制（ユーザーがアクティブな場合のみ）

---

### ⚠️ 推奨（パフォーマンス改善）

#### 4. 追加インデックスの検討

**改善案**:
```sql
-- project_applications の approved_at を含む複合インデックス
CREATE INDEX IF NOT EXISTS idx_project_applications_user_approved_at 
ON project_applications(user_id, status, approved_at) 
WHERE status = 'approved';

-- messages の未読判定用複合インデックス（グループチャット用）
CREATE INDEX IF NOT EXISTS idx_messages_room_sender_time 
ON messages(chat_room_id, sender_id, created_at DESC) 
WHERE chat_room_id IS NOT NULL;
```

**効果**:
- ✅ `participation_times` CTEの高速化
- ✅ 未読カウント計算の高速化

---

#### 5. 未読カウント計算の最適化

**改善案**:
```sql
-- より効率的な未読カウント計算
unread_counts as (
  select
    ar.chat_room_id,
    count(m.id) as unread_count
  from accessible_rooms ar
  left join read_statuses rs on ar.chat_room_id = rs.chat_room_id
  left join participation_times pt on pt.project_id = ar.project_id
  -- サブクエリで範囲を絞る（インデックス活用）
  left join lateral (
    select id
    from public.messages
    where chat_room_id = ar.chat_room_id
      and sender_id <> p_user_id
      and created_at > coalesce(
        rs.last_read_at,
        coalesce(pt.joined_at, timestamp with time zone '1970-01-01 00:00:00+00')
      )
    limit 1000  -- 上限を設ける（未読数が1000を超えることは稀）
  ) m on true
  group by ar.chat_room_id
)
```

**効果**:
- ✅ 大量メッセージがあるルームでも高速化
- ⚠️ ただし、未読数が1000を超える場合は注意が必要

---

## 📊 想定される規模での影響

### 現在の実装
- **1,000ユーザー × 1メッセージ/分**: 1,000イベント/分/ユーザー → **NG**
- **10,000ユーザー**: 10,000イベント/分/ユーザー → **完全にNG**

### 改善後の見込み
- **1,000ユーザー × 1メッセージ/分**: ~10イベント/分/ユーザー（関係するメッセージのみ） → **OK**
- **10,000ユーザー**: ~100イベント/分/ユーザー → **許容範囲**

---

## 🎯 優先順位

1. **🔴 最優先**: リアルタイム購読のフィルタリング（自分に関係するメッセージのみ処理）
2. **🔴 最優先**: プロフィール取得のキャッシュ化（N+1問題の解決）
3. **🔴 最優先**: クエリ無効化の最適化（無関係なメッセージ変更での無効化を回避）
4. **⚠️ 推奨**: 追加インデックスの検討
5. **⚠️ 推奨**: 未読カウント計算の最適化（必要に応じて）

---

## 結論

**現状の実装は、リアルタイムチャットアプリとしてスケールに耐えられません。**

特に、**全ユーザーの全メッセージ変更を購読している点は致命的**です。ユーザー数が増えると、即座にパフォーマンス問題が発生します。

**緊急に修正が必要な項目**:
1. リアルタイム購読でのフィルタリング（自分に関係するメッセージのみ処理）
2. プロフィール取得のキャッシュ化
3. クエリ無効化の最適化

これらの修正を行えば、スケーラビリティは大幅に改善されます。

