# チャットメッセージのローカル保存・キャッシュ実装 - 調査レポート

## 調査目的

チャットルームを開いた際に過去のメッセージが連続的に取得され、UXが悪い問題について、現状の実装と一般的なチャットアプリの実装を比較し、移行可能性を検討する。

---

## 1. 現状のこのリポジトリのメッセージ取得・ローカル保存状況

### 1.1 メッセージ取得方法

**ファイル**: `components/ChatRoom.tsx`

**実装詳細**:

```typescript
// L412: メッセージはuseStateで管理（メモリ上のみ）
const [messages, setMessages] = useState<Message[]>([]);

// L475-530: fetchMessages関数
const fetchMessages = async (userId: string) => {
    let query = supabase
        .from('messages')
        .select('id, content, image_url, sender_id, receiver_id, chat_room_id, created_at, reply_to')
        .order('created_at', { ascending: true }); // 全件取得（ページネーションなし）

    if (isGroup) {
        query = query.eq('chat_room_id', partnerId);
    } else {
        query = query.or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`);
    }

    const { data, error } = await query;
    // ... プロフィール情報を取得してフォーマット ...
    setMessages(formattedMessages); // 全メッセージを一度にstateに設定
};
```

**特徴**:
- ❌ **ページネーションなし**: 全メッセージを一度に取得
- ❌ **React Query未使用**: チャットルーム内のメッセージはReact Queryで管理されていない
- ❌ **ローカル保存なし**: `useState`でメモリ上のみ管理
- ✅ **Realtime購読**: 新しいメッセージは`subscribeToMessages`で受信し、`setMessages((prev) => [...prev, newMessage])`で追加

### 1.2 ローカル保存・キャッシュの状況

**結論**: **ローカル保存は一切行われていない**

**根拠**:
1. **メッセージデータ**: `useState<Message[]>([])`でメモリ上のみ管理
2. **React Query**: チャット一覧（`useChatRooms`）はReact Query + AsyncStorageで永続化されているが、**個別のメッセージは対象外**
3. **AsyncStorage**: メッセージデータをAsyncStorageに保存する処理は存在しない
4. **SQLite/WatermelonDB**: ローカルDBは導入されていない

**現在のキャッシュ状況**:
- ✅ **チャット一覧**: React Query + AsyncStorageで永続化（`data/hooks/useChatRooms.ts`）
- ❌ **個別メッセージ**: キャッシュなし（毎回サーバーから全件取得）

### 1.3 初期化フロー

**ファイル**: `components/ChatRoom.tsx` (L422-473)

```typescript
useEffect(() => {
    const initializeChat = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUserId(user.id);
            await fetchMessages(user.id); // 全メッセージを取得（ブロッキング）
            subscribeToMessages(user.id); // Realtime購読開始
        }
        setLoading(false);
    };

    initializeChat();
    markAsRead();
    // ...
}, [partnerId, isGroup]);
```

**問題点**:
- `fetchMessages`が完了するまで`loading`が`true`のまま
- メッセージ数が多い場合、取得に時間がかかり、ユーザーはローディング画面を見続ける
- 取得完了後、一度に全メッセージが表示される（段階的表示なし）

---

## 2. LINEなどのチャットアプリの一般的な実装

### 2.1 アーキテクチャパターン

一般的なチャットアプリ（LINE、WhatsApp、Telegram等）は以下のアーキテクチャを採用：

#### パターン1: ローカルDB + ページネーション（推奨）

**構成**:
- **ローカルDB**: SQLite / WatermelonDB / Realm など
- **初回表示**: ローカルDBから最新N件（例: 50件）を即座に表示
- **過去メッセージ**: スクロール時にページネーションで取得
- **Realtime同期**: 新しいメッセージを受信したらローカルDBに保存

**フロー**:
```
1. チャットルームを開く
   ↓
2. ローカルDBから最新50件を取得（即座に表示）
   ↓
3. バックグラウンドでサーバーから最新メッセージを取得・同期
   ↓
4. ユーザーが上にスクロール
   ↓
5. ローカルDBに古いメッセージがあれば表示、なければサーバーから取得
   ↓
6. Realtimeで新しいメッセージを受信
   ↓
7. ローカルDBに保存 + UIに追加
```

**メリット**:
- ✅ **即座に表示**: ローカルDBから読み込むため、ローディング時間がほぼゼロ
- ✅ **オフライン対応**: ネットワークがなくても過去のメッセージを閲覧可能
- ✅ **効率的**: 必要な分だけ取得（ページネーション）
- ✅ **一貫性**: ローカルDBが唯一の情報源（Single Source of Truth）

#### パターン2: メモリキャッシュ + ページネーション

**構成**:
- **メモリキャッシュ**: React Query / Apollo Client など
- **初回表示**: キャッシュがあれば即座に表示、なければサーバーから取得
- **過去メッセージ**: スクロール時にページネーションで取得
- **Realtime同期**: 新しいメッセージを受信したらキャッシュに追加

**フロー**:
```
1. チャットルームを開く
   ↓
2. React Queryキャッシュから最新50件を取得（あれば即座に表示）
   ↓
3. キャッシュがなければサーバーから取得
   ↓
4. ユーザーが上にスクロール
   ↓
5. キャッシュに古いメッセージがあれば表示、なければサーバーから取得
   ↓
6. Realtimeで新しいメッセージを受信
   ↓
7. キャッシュに追加 + UIに反映
```

**メリット**:
- ✅ **実装が簡単**: 既存のReact Queryで対応可能
- ✅ **即座に表示**: キャッシュがあればローディング時間が短い
- ❌ **オフライン不可**: アプリ再起動時はキャッシュが消える（AsyncStorage永続化すれば改善可能）

### 2.2 LINEの実装（推測）

**公開情報から推測される実装**:

1. **ローカルDB使用**: SQLite等でメッセージを永続化
2. **初回表示**: ローカルDBから最新50-100件を即座に表示
3. **バックグラウンド同期**: サーバーから最新メッセージを取得してローカルDBを更新
4. **ページネーション**: 上にスクロール時に過去メッセージを段階的に取得
5. **Realtime購読**: 新しいメッセージを受信したらローカルDBに保存してUIに反映

**特徴**:
- チャットルームを開いた瞬間にメッセージが表示される（ローディングなし）
- ネットワークがなくても過去のメッセージを閲覧可能
- 新しいメッセージはRealtimeで即座に反映

---

## 3. 現状との違いと移行可能性

### 3.1 主な違い

| 項目 | 現状の実装 | 一般的な実装（LINE等） |
|------|-----------|---------------------|
| **初回表示** | 全メッセージをサーバーから取得（ブロッキング） | ローカルDBから最新N件を即座に表示 |
| **ローカル保存** | なし（メモリ上のみ） | ローカルDB（SQLite等）に永続化 |
| **ページネーション** | なし（全件取得） | あり（段階的取得） |
| **ローディング時間** | メッセージ数に比例して長い | ほぼゼロ（ローカルDBから読み込み） |
| **オフライン対応** | 不可 | 可能（過去メッセージを閲覧可能） |
| **Realtime同期** | メモリ上のstateに追加 | ローカルDBに保存してからUIに反映 |

### 3.2 移行可能性

#### ✅ 移行は可能

**理由**:
1. **React Queryの導入**: 既にチャット一覧でReact Query + AsyncStorageを使用している
2. **Realtime購読**: 既にSupabase Realtimeで新しいメッセージを受信している
3. **ページネーション対応**: Supabaseは`range()`でページネーションに対応

#### 移行に必要な作業

##### オプション1: React Query + AsyncStorage（簡易版）

**実装内容**:
- `useInfiniteQuery`でメッセージをページネーション取得
- AsyncStorageで永続化（`persistQueryClient`を使用）
- 初回表示時はキャッシュから最新N件を表示
- 上にスクロール時に過去メッセージを取得
- Realtimeで新しいメッセージを受信したら`queryClient.setQueryData`でキャッシュに追加

**メリット**:
- ✅ 既存のReact Queryインフラを活用
- ✅ 実装が比較的簡単
- ✅ AsyncStorageで永続化可能

**デメリット**:
- ❌ オフライン時の検索・フィルタリングが困難
- ❌ 大量のメッセージを扱う場合、AsyncStorageの容量制限に引っかかる可能性

##### オプション2: ローカルDB（WatermelonDB / SQLite）（推奨）

**実装内容**:
- WatermelonDBまたは`react-native-sqlite-storage`を導入
- メッセージテーブルをローカルDBに作成
- 初回表示時はローカルDBから最新50件を取得
- バックグラウンドでサーバーから最新メッセージを同期
- 上にスクロール時に過去メッセージをページネーション取得
- Realtimeで新しいメッセージを受信したらローカルDBに保存

**メリット**:
- ✅ オフライン対応が完璧
- ✅ 大量のメッセージを効率的に管理
- ✅ 検索・フィルタリングが高速
- ✅ LINE等の実装に近い

**デメリット**:
- ❌ 実装が複雑（スキーマ定義、マイグレーション等）
- ❌ サーバーとローカルDBの同期ロジックが必要

### 3.3 推奨される移行パス

#### フェーズ1: React Query + ページネーション（短期改善）

**目標**: 全件取得をやめ、ページネーションで段階的に取得

**実装**:
1. `useInfiniteQuery`でメッセージをページネーション取得
2. 初回表示時は最新50件のみ取得
3. 上にスクロール時に過去メッセージを取得
4. Realtimeで新しいメッセージを受信したら`queryClient.setQueryData`で追加

**効果**:
- ✅ 初回表示が高速化（50件のみ取得）
- ✅ メッセージ数が多い場合でもUXが改善
- ✅ 既存のReact Queryインフラを活用

#### フェーズ2: AsyncStorage永続化（中期改善）

**目標**: アプリ再起動時もキャッシュから即座に表示

**実装**:
1. `persistQueryClient`でメッセージキャッシュをAsyncStorageに永続化
2. 初回表示時はキャッシュから最新50件を表示
3. バックグラウンドでサーバーから最新メッセージを取得して同期

**効果**:
- ✅ アプリ再起動時も即座に表示
- ✅ オフライン時も過去のメッセージを閲覧可能（キャッシュ範囲内）

#### フェーズ3: ローカルDB導入（長期改善）

**目標**: LINE等と同等のUXを実現

**実装**:
1. WatermelonDBまたはSQLiteを導入
2. メッセージテーブルをローカルDBに作成
3. サーバーとローカルDBの同期ロジックを実装
4. 初回表示時はローカルDBから最新50件を表示

**効果**:
- ✅ 完全なオフライン対応
- ✅ 大量のメッセージを効率的に管理
- ✅ LINE等と同等のUX

---

## 4. Realtime購読とローカル保存の統合

### 4.1 現状の実装

**ファイル**: `components/ChatRoom.tsx` (L532-606)

```typescript
const subscribeToMessages = (userId: string) => {
    // ...
    .on('postgres_changes', { event: 'INSERT', ... }, async (payload) => {
        // 新しいメッセージを受信
        const newMessage: Message = { ... };
        setMessages((prev) => [...prev, newMessage]); // メモリ上のstateに追加
    })
    .subscribe();
};
```

**問題点**:
- メモリ上のstateに追加するのみ
- ローカル保存されないため、アプリ再起動時に消える

### 4.2 一般的な実装（LINE等）

**フロー**:
```
1. Realtimeで新しいメッセージを受信
   ↓
2. ローカルDBに保存（INSERT）
   ↓
3. UIに反映（キャッシュを更新）
```

**実装例（WatermelonDBの場合）**:
```typescript
.on('postgres_changes', { event: 'INSERT', ... }, async (payload) => {
    // 1. ローカルDBに保存
    await database.write(async () => {
        await database.get('messages').create(message => {
            message.id = payload.new.id;
            message.content = payload.new.content;
            // ...
        });
    });

    // 2. UIに反映（React Queryの場合）
    queryClient.setQueryData(['messages', chatRoomId], (old) => {
        return [...old, newMessage];
    });
});
```

**特徴**:
- ✅ ローカルDBが唯一の情報源（Single Source of Truth）
- ✅ アプリ再起動時もメッセージが残る
- ✅ オフライン時も新しいメッセージを保存可能

---

## 5. まとめ

### 5.1 現状の問題点

1. **全件取得**: メッセージ数が多い場合、取得に時間がかかる
2. **ローカル保存なし**: 毎回サーバーから取得する必要がある
3. **ローディング時間**: ユーザーはローディング画面を見続ける必要がある
4. **オフライン不可**: ネットワークがないと過去のメッセージを閲覧できない

### 5.2 一般的な実装との違い

- **初回表示**: ローカルDBから即座に表示 vs サーバーから全件取得
- **ローカル保存**: ローカルDBに永続化 vs メモリ上のみ
- **ページネーション**: 段階的取得 vs 全件取得
- **Realtime同期**: ローカルDBに保存してからUI反映 vs メモリ上のstateに追加のみ

### 5.3 移行可能性

✅ **移行は可能**

**推奨される移行パス**:
1. **短期**: React Query + ページネーション（全件取得をやめる）
2. **中期**: AsyncStorage永続化（アプリ再起動時もキャッシュから表示）
3. **長期**: ローカルDB導入（LINE等と同等のUX）

**注意点**:
- Realtime購読で新しいメッセージを受信したら、ローカル保存してからUIに反映する必要がある
- サーバーとローカルDBの同期ロジックが必要（競合解決、タイムスタンプ比較等）
