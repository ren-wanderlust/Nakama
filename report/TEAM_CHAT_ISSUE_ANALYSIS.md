# チームチャット表示問題の調査結果

## 問題の概要

プロジェクトの参加人数が2人以上になったときにチームチャットが作成されるが、chatページのチームタブに表示されない。

---

## 調査結果

### 1. チームチャット作成ロジック

**場所**: `components/ProjectDetail.tsx` L262-295

**動作**:
- 応募が承認（`approved`）されたときに実行
- 承認済みメンバー数（オーナー含む）が2人以上になったらチームチャットを作成
- 既存のチャットルームがあるかチェック（`existingRoom`）
- 存在しない場合のみ作成

**コード**:
```typescript
if (newStatus === 'approved') {
  const { count } = await supabase
    .from('project_applications')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .eq('status', 'approved');
  
  const totalMembers = (count || 0) + 1; // +1 for owner
  
  if (totalMembers >= 2) {
    const { data: existingRoom } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('project_id', project.id)
      .single();
    
    if (!existingRoom) {
      await supabase.from('chat_rooms').insert({
        project_id: project.id,
        type: 'group'
      });
    }
  }
}
```

**評価**: ✅ ロジック自体は正しく実装されている

---

### 2. チームチャット取得ロジック

**場所**: `data/api/chatRooms.ts` L135-150

**動作**:
- `chat_rooms` テーブルから `type = 'group'` のチャットルームを取得
- RLSポリシーによって、ユーザーがアクセスできるチャットルームのみが返される

**コード**:
```typescript
const { data: teamRoomsData } = await supabase
  .from('chat_rooms')
  .select(`
    id,
    project_id,
    created_at,
    project:projects (
      id,
      title,
      image_url,
      owner:profiles!owner_id (
        image
      )
    )
  `)
  .eq('type', 'group');
```

**RLSポリシー** (`sql/setup_team_chat.sql` L15-30):
- ユーザーは以下の条件でチャットルームを閲覧可能:
  - プロジェクトのオーナーである (`projects.owner_id = auth.uid()`)
  - または、プロジェクトに承認済み（approved）で応募している (`project_applications.status = 'approved'`)

**評価**: ✅ 取得ロジック自体は正しく実装されている

---

### 3. チームチャット表示ロジック

**場所**: `components/TalkPage.tsx` L158-228

**動作**:
- `chatRooms` から `type === 'group'` のチャットルームをフィルタリング
- `renderTeamList()` で表示

**コード**:
```typescript
const renderTeamList = () => {
  const teamRooms = chatRooms.filter(r => r.type === 'group');
  
  if (teamRooms.length > 0) {
    return (
      <FlatList
        data={teamRooms}
        // ... レンダリング
      />
    );
  } else {
    return <EmptyState ... />;
  }
};
```

**評価**: ✅ 表示ロジック自体は正しく実装されている

---

### 4. Realtime購読の設定

**場所**: `components/TalkPage.tsx` L51-80

**現在の購読**:
- ✅ `messages` テーブルの `INSERT`, `UPDATE` イベント
- ✅ `likes` テーブルの `INSERT`, `DELETE` イベント
- ❌ **`chat_rooms` テーブルの変更を購読していない**

**コード**:
```typescript
useEffect(() => {
  if (!userId) return;

  // Subscribe to new messages
  const messageSubscription = supabase
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
    })
    // ...

  // Subscribe to new likes (matches)
  const likesSubscription = supabase
    .channel('public:likes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
    })
    // ...

  return () => {
    supabase.removeChannel(messageSubscription);
    supabase.removeChannel(likesSubscription);
  };
}, [userId, queryClient]);
```

**問題**: ❌ **`chat_rooms` テーブルの `INSERT` イベントを購読していない**

**影響**:
- チームチャットが作成されても、Realtimeイベントが発火しない
- `invalidateQueries` が実行されない
- React Queryのキャッシュが更新されない
- 手動で `refetch()` を実行しない限り、新しいチャットルームが表示されない

---

### 5. チャットルーム作成後の処理

**場所**: `components/ProjectDetail.tsx` L280-295

**現在の処理**:
- チャットルーム作成後、`Alert.alert` で通知のみ
- `invalidateQueries` を実行していない
- `onProjectUpdated()` コールバックを呼び出しているが、これは `MyPage` のプロジェクト一覧更新用

**コード**:
```typescript
if (!createRoomError) {
  Alert.alert('チームチャット作成', 'メンバーが2名以上になったため、チームチャットが自動作成されました！「トーク」タブから確認できます。');
} else {
  console.error('Error creating chat room:', createRoomError);
}
```

**問題**: ❌ **チャットルーム作成後に `invalidateQueries` を実行していない**

**影響**:
- チャットルームが作成されても、`TalkPage` のReact Queryキャッシュが更新されない
- ユーザーが手動で `refetch()` を実行しない限り、新しいチャットルームが表示されない

---

## 問題の原因（結論）

### 主要な問題: **Realtime購読の不足**

1. **`chat_rooms` テーブルの変更を購読していない**
   - `TalkPage.tsx` で `messages` と `likes` の変更のみを購読
   - `chat_rooms` の `INSERT` イベントを購読していない
   - そのため、チームチャットが作成されても `invalidateQueries` が実行されない

2. **チャットルーム作成後に `invalidateQueries` を実行していない**
   - `ProjectDetail.tsx` でチャットルーム作成後、`TalkPage` のキャッシュを更新していない
   - 手動で `refetch()` を実行しない限り、新しいチャットルームが表示されない

### 副次的な問題（可能性）

3. **RLSポリシーの問題**
   - チャットルーム作成時、RLSポリシーによって作成がブロックされる可能性
   - `ProjectDetail.tsx` で `createRoomError` をログ出力しているが、エラーハンドリングが不十分

4. **データ取得時のフィルタリング**
   - `fetchChatRooms` で取得したチャットルームが、RLSポリシーによって正しくフィルタリングされているか確認が必要

---

## 確認すべき点

### 1. データベースに実際にチャットルームが作成されているか

**確認方法**:
```sql
SELECT 
  cr.id,
  cr.project_id,
  cr.type,
  cr.created_at,
  p.title as project_title,
  p.owner_id,
  COUNT(pa.id) as approved_applicants
FROM chat_rooms cr
JOIN projects p ON cr.project_id = p.id
LEFT JOIN project_applications pa ON pa.project_id = p.id AND pa.status = 'approved'
WHERE cr.type = 'group'
GROUP BY cr.id, cr.project_id, cr.type, cr.created_at, p.title, p.owner_id;
```

### 2. RLSポリシーが正しく機能しているか

**確認方法**:
- プロジェクトオーナーとしてログインし、自分のプロジェクトのチャットルームが取得できるか
- 承認済みメンバーとしてログインし、参加しているプロジェクトのチャットルームが取得できるか

### 3. Realtime購読が動作しているか

**確認方法**:
- Supabase Dashboard > Database > Replication で `chat_rooms` テーブルが Realtime で有効になっているか
- ブラウザのコンソールで Realtime イベントが発火しているか

---

## 推奨される修正（実装はまだ行わない）

### 修正1: Realtime購読の追加

`components/TalkPage.tsx` に `chat_rooms` テーブルの変更を購読する処理を追加:

```typescript
// Subscribe to chat_rooms changes
const chatRoomsSubscription = supabase
  .channel('public:chat_rooms')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_rooms' }, () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
  })
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_rooms' }, () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
  })
  .subscribe();
```

### 修正2: チャットルーム作成後のキャッシュ更新

`components/ProjectDetail.tsx` でチャットルーム作成後、`invalidateQueries` を実行:

```typescript
if (!createRoomError) {
  // Invalidate chat rooms query to refresh the list
  queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(currentUser.id) });
  Alert.alert('チームチャット作成', 'メンバーが2名以上になったため、チームチャットが自動作成されました！「トーク」タブから確認できます。');
}
```

---

## まとめ

**主要な問題**:
1. ❌ `chat_rooms` テーブルの変更を Realtime で購読していない
2. ❌ チャットルーム作成後に `invalidateQueries` を実行していない

**その他の可能性**:
3. ⚠️ RLSポリシーによる作成ブロック（エラーハンドリング不足）
4. ⚠️ データベースに実際にチャットルームが作成されていない（確認が必要）

**次のステップ**:
1. データベースに実際にチャットルームが作成されているか確認
2. RLSポリシーが正しく機能しているか確認
3. Realtime購読を追加
4. チャットルーム作成後のキャッシュ更新を追加
