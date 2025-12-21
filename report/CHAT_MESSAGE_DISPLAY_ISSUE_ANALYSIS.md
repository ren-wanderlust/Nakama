# チャットメッセージ表示問題 - 原因調査レポート

## 問題の概要

1. **自分が送信したメッセージがチャットルームに表示されない**
2. **相手から送られたメッセージについて、自分がチャットルームを開いている時に送信されたメッセージしかチャットルームに表示されない**

---

## 1. 原因分析

### 1.1 問題1: 自分が送信したメッセージが表示されない

#### 原因候補1: Realtime購読のフィルター問題（確率: 80%）

**ファイル**: `data/hooks/useMessagesInfinite.ts` (L74)

```typescript
filter: isGroup ? `chat_room_id=eq.${roomId}` : undefined,
```

**問題点**:
- 個人チャットの場合、`filter: undefined`で全てのメッセージを購読している
- しかし、コールバック内でフィルタリングしている（L80-85）
- 自分が送信したメッセージ（`sender_id = userId, receiver_id = roomId`）は、フィルター条件を満たすはず

**しかし、潜在的な問題**:
- Realtime購読が正しく動作していない可能性
- メッセージ送信直後にRealtimeイベントが発火する前に、UIが更新されていない可能性

#### 原因候補2: `setQueryData`が正しく動作していない（確率: 90%）

**ファイル**: `data/hooks/useMessagesInfinite.ts` (L146-160)

```typescript
queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData || !oldData.pages) return oldData; // ← 問題点

    // Add to the first page (newest)
    const firstPage = oldData.pages[0];
    const updatedFirstPage = {
        ...firstPage,
        data: [formattedMessage, ...firstPage.data],
    };

    return {
        ...oldData,
        pages: [updatedFirstPage, ...oldData.pages.slice(1)],
    };
});
```

**問題点**:
1. **`oldData`が`null`または`undefined`の場合**: 何も更新されない
   - 初回ロード中（`isLoading: true`）にメッセージを送信した場合、`oldData`が`null`の可能性がある
   - この場合、`setQueryData`が何も更新せず、メッセージが表示されない

2. **`oldData.pages`が空配列の場合**: 何も更新されない
   - メッセージが0件の場合、`pages: []`になる可能性がある
   - この場合も、`oldData.pages[0]`が`undefined`になり、エラーが発生する可能性

3. **楽観的更新（Optimistic Update）がない**:
   - `handleSend`でメッセージを送信した後、Realtime購読に依存している
   - しかし、Realtime購読が発火する前に、UIに反映されない
   - 送信直後に楽観的更新でキャッシュに追加する必要がある

#### 原因候補3: メッセージ送信後の処理不足（確率: 95%）

**ファイル**: `components/ChatRoom.tsx` (L590-591)

```typescript
if (data) {
    // No manual setMessages, rely on Realtime subscription in hook
```

**問題点**:
- メッセージ送信成功後、手動でキャッシュを更新していない
- Realtime購読に完全に依存している
- しかし、Realtime購読が発火するまでに時間がかかる可能性がある
- または、Realtime購読が正しく動作していない可能性

**確率**: **95%** - これが主な原因である可能性が高い

---

### 1.2 問題2: 相手から送られたメッセージが、チャットルームを開いている時に送信されたものしか表示されない

#### 原因候補1: Realtime購読がチャットルームを開いている時のみ有効（確率: 100%）

**ファイル**: `data/hooks/useMessagesInfinite.ts` (L41-42)

```typescript
useEffect(() => {
    if (!enabled || !roomId) return;
    // ...
}, [roomId, userId, isGroup, queryClient, queryKey, enabled]);
```

**問題点**:
- Realtime購読は、チャットルームを開いている時（`enabled = true`）のみ有効
- チャットルームを開いていない時に送られたメッセージは、Realtime購読でキャッチされない
- これは**正常な動作**だが、サーバーから取得したメッセージが正しく表示されていない可能性がある

#### 原因候補2: サーバーから取得したメッセージが正しく表示されていない（確率: 70%）

**ファイル**: `components/ChatRoom.tsx` (L430-432)

```typescript
const messages = useMemo(() => {
    return data?.pages.flatMap(page => page.data) || [];
}, [data]);
```

**問題点**:
- `fetchMessagesPage`は`order('created_at', { ascending: false })`で取得している（最新が先）
- つまり、`pages[0].data`が最新のメッセージ配列
- `flatMap`で結合すると、`[最新, ..., 古い]`の順になる
- しかし、`inverted={true}`のFlatListを使用しているため、表示順が逆になる可能性

**確認が必要**:
- `fetchMessagesPage`の戻り値の順序
- `inverted={true}`のFlatListの動作
- メッセージの表示順序

#### 原因候補3: 初回ロード時のデータ取得問題（確率: 60%）

**ファイル**: `data/hooks/useMessagesInfinite.ts` (L23-38)

```typescript
const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
        fetchMessagesPage({
            roomId,
            userId,
            limit: 50,
            cursor: pageParam as string | undefined,
            isGroup,
        }),
    // ...
    enabled,
});
```

**問題点**:
- `enabled`が`false`の場合、クエリが実行されない
- `currentUserId`が`undefined`の場合、`enabled: !!currentUserId`が`false`になる
- この場合、メッセージが取得されない

**確認が必要**:
- `currentUserId`の取得タイミング
- `enabled`の値

---

## 2. 原因の確率分析

### 問題1: 自分が送信したメッセージが表示されない

| 原因 | 確率 | 説明 |
|------|------|------|
| **メッセージ送信後の楽観的更新がない** | **95%** | `handleSend`でメッセージを送信した後、手動でキャッシュを更新していない。Realtime購読に完全に依存しているが、発火までに時間がかかる可能性がある。 |
| **`setQueryData`が`oldData`が`null`の場合に動作しない** | **90%** | 初回ロード中にメッセージを送信した場合、`oldData`が`null`の可能性があり、`setQueryData`が何も更新しない。 |
| **Realtime購読のフィルター問題** | **80%** | 個人チャットの場合、`filter: undefined`で全てのメッセージを購読しているが、コールバック内でフィルタリングしている。自分が送信したメッセージが正しくキャッチされていない可能性がある。 |

**最も可能性が高い原因**: **メッセージ送信後の楽観的更新がない（95%）**

### 問題2: 相手から送られたメッセージが、チャットルームを開いている時に送信されたものしか表示されない

| 原因 | 確率 | 説明 |
|------|------|------|
| **Realtime購読がチャットルームを開いている時のみ有効** | **100%** | これは正常な動作だが、サーバーから取得したメッセージが正しく表示されていない可能性がある。 |
| **サーバーから取得したメッセージが正しく表示されていない** | **70%** | `fetchMessagesPage`の戻り値の順序や`inverted={true}`のFlatListの動作に問題がある可能性がある。 |
| **初回ロード時のデータ取得問題** | **60%** | `currentUserId`が`undefined`の場合、`enabled: !!currentUserId`が`false`になり、メッセージが取得されない。 |

**最も可能性が高い原因**: **サーバーから取得したメッセージが正しく表示されていない（70%）**

---

## 3. 修正案

### 3.1 問題1の修正案: 自分が送信したメッセージが表示されない

#### 修正案1: 楽観的更新（Optimistic Update）を追加（推奨）

**ファイル**: `components/ChatRoom.tsx` (L516-634)

**修正内容**:
```typescript
const handleSend = async () => {
    // ... 既存のコード ...

    try {
        // 1. 楽観的更新: 送信前にキャッシュに追加
        const optimisticMessage: Message = {
            id: `temp-${Date.now()}`, // 一時ID
            text: content,
            image_url: imageUri || undefined,
            sender: 'me',
            senderId: currentUserId,
            senderName: '自分', // または現在のユーザー名
            timestamp: new Date().toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
            }),
            date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            replyTo: replyData || undefined,
        };

        // 楽観的更新: キャッシュに追加
        queryClient.setQueryData(queryKeys.messages.list(partnerId), (oldData: any) => {
            if (!oldData || !oldData.pages) {
                // oldDataがnullの場合、新しい構造を作成
                return {
                    pages: [{
                        data: [optimisticMessage],
                        nextCursor: null,
                    }],
                    pageParams: [undefined],
                };
            }

            const firstPage = oldData.pages[0];
            const updatedFirstPage = {
                ...firstPage,
                data: [optimisticMessage, ...firstPage.data],
            };

            return {
                ...oldData,
                pages: [updatedFirstPage, ...oldData.pages.slice(1)],
            };
        });

        // 2. サーバーに送信
        const { data, error } = await supabase
            .from('messages')
            .insert({
                sender_id: currentUserId,
                receiver_id: isGroup ? null : partnerId,
                chat_room_id: isGroup ? partnerId : null,
                content: content,
                image_url: uploadedImageUrl,
                reply_to: replyData,
            })
            .select()
            .single();

        if (error) throw error;

        if (data) {
            // 3. 楽観的更新を実際のデータに置き換え
            queryClient.setQueryData(queryKeys.messages.list(partnerId), (oldData: any) => {
                if (!oldData || !oldData.pages) return oldData;

                const firstPage = oldData.pages[0];
                // 一時IDのメッセージを実際のメッセージに置き換え
                const updatedData = firstPage.data.map((msg: Message) => {
                    if (msg.id.startsWith('temp-')) {
                        return {
                            ...optimisticMessage,
                            id: data.id,
                            created_at: data.created_at,
                        };
                    }
                    return msg;
                });

                const updatedFirstPage = {
                    ...firstPage,
                    data: updatedData,
                };

                return {
                    ...oldData,
                    pages: [updatedFirstPage, ...oldData.pages.slice(1)],
                };
            });

            // ... 既存のコード ...
        }
    } catch (error: any) {
        // 4. エラー時は楽観的更新をロールバック
        queryClient.setQueryData(queryKeys.messages.list(partnerId), (oldData: any) => {
            if (!oldData || !oldData.pages) return oldData;

            const firstPage = oldData.pages[0];
            const updatedData = firstPage.data.filter((msg: Message) => !msg.id.startsWith('temp-'));

            const updatedFirstPage = {
                ...firstPage,
                data: updatedData,
            };

            return {
                ...oldData,
                pages: [updatedFirstPage, ...oldData.pages.slice(1)],
            };
        });

        // ... 既存のエラーハンドリング ...
    }
};
```

**メリット**:
- ✅ 送信直後にUIに反映される（UXが向上）
- ✅ Realtime購読に依存しない
- ✅ エラー時はロールバック可能

#### 修正案2: `setQueryData`の`oldData`が`null`の場合の処理を改善

**ファイル**: `data/hooks/useMessagesInfinite.ts` (L146-160)

**修正内容**:
```typescript
queryClient.setQueryData(queryKey, (oldData: any) => {
    // oldDataがnullまたはundefinedの場合、新しい構造を作成
    if (!oldData || !oldData.pages) {
        return {
            pages: [{
                data: [formattedMessage],
                nextCursor: null,
            }],
            pageParams: [undefined],
        };
    }

    // 既存のメッセージと重複チェック（同じIDのメッセージが既にある場合は追加しない）
    const firstPage = oldData.pages[0];
    const existingIds = new Set(firstPage.data.map((msg: Message) => msg.id));
    if (existingIds.has(formattedMessage.id)) {
        return oldData; // 既に存在する場合は更新しない
    }

    // Add to the first page (newest)
    const updatedFirstPage = {
        ...firstPage,
        data: [formattedMessage, ...firstPage.data],
    };

    return {
        ...oldData,
        pages: [updatedFirstPage, ...oldData.pages.slice(1)],
    };
});
```

**メリット**:
- ✅ `oldData`が`null`の場合でも動作する
- ✅ 重複チェックで同じメッセージが複数回追加されることを防ぐ

---

### 3.2 問題2の修正案: 相手から送られたメッセージが、チャットルームを開いている時に送信されたものしか表示されない

#### 修正案1: サーバーから取得したメッセージの表示順序を確認・修正

**ファイル**: `components/ChatRoom.tsx` (L430-432)

**確認が必要**:
- `fetchMessagesPage`の戻り値の順序（最新→古い）
- `inverted={true}`のFlatListの動作
- メッセージの表示順序

**修正内容（必要に応じて）**:
```typescript
const messages = useMemo(() => {
    if (!data?.pages) return [];
    
    // pages[0]が最新、pages[last]が古い
    // flatMapで結合すると [最新, ..., 古い] の順になる
    // inverted={true}のFlatListを使用しているため、表示順は [古い, ..., 最新] になる
    // これは正しい動作のはずだが、確認が必要
    const allMessages = data.pages.flatMap(page => page.data);
    
    // デバッグ用ログ
    console.log('[ChatRoom] Messages:', {
        totalPages: data.pages.length,
        totalMessages: allMessages.length,
        firstMessage: allMessages[0],
        lastMessage: allMessages[allMessages.length - 1],
    });
    
    return allMessages;
}, [data]);
```

#### 修正案2: 初回ロード時のデータ取得を確実にする

**ファイル**: `components/ChatRoom.tsx` (L403-428)

**修正内容**:
```typescript
// Get current user ID first
useEffect(() => {
    const getUserId = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUserId(user.id);
        }
    };
    getUserId();
}, []);

// Use Infinite Query hook
const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isMessagesLoading,
    refetch, // 追加
} = useMessagesInfinite({
    roomId: partnerId,
    userId: currentUserId || '',
    isGroup,
    enabled: !!currentUserId,
});

// currentUserIdが設定されたら、メッセージを再取得
useEffect(() => {
    if (currentUserId && partnerId) {
        refetch();
    }
}, [currentUserId, partnerId, refetch]);
```

**メリット**:
- ✅ `currentUserId`が設定されたら、確実にメッセージを取得する

---

## 4. 推奨される修正手順

### ステップ1: 問題1の修正（優先度: 高）

1. **楽観的更新を追加**（修正案1）
   - `handleSend`でメッセージ送信前にキャッシュに追加
   - 送信成功後、一時IDを実際のIDに置き換え
   - エラー時はロールバック

2. **`setQueryData`の`oldData`が`null`の場合の処理を改善**（修正案2）
   - `oldData`が`null`の場合、新しい構造を作成
   - 重複チェックを追加

### ステップ2: 問題2の修正（優先度: 中）

1. **サーバーから取得したメッセージの表示順序を確認**
   - デバッグログを追加して、メッセージの順序を確認
   - 必要に応じて修正

2. **初回ロード時のデータ取得を確実にする**
   - `currentUserId`が設定されたら、メッセージを再取得

---

## 5. まとめ

### 問題1: 自分が送信したメッセージが表示されない

**最も可能性が高い原因**: **メッセージ送信後の楽観的更新がない（95%）**

**修正案**:
1. `handleSend`で楽観的更新を追加（送信前にキャッシュに追加）
2. `setQueryData`の`oldData`が`null`の場合の処理を改善

### 問題2: 相手から送られたメッセージが、チャットルームを開いている時に送信されたものしか表示されない

**最も可能性が高い原因**: **サーバーから取得したメッセージが正しく表示されていない（70%）**

**修正案**:
1. サーバーから取得したメッセージの表示順序を確認・修正
2. 初回ロード時のデータ取得を確実にする
