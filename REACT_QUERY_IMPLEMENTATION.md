# React Query + AsyncStorage 永続キャッシュ実装

## 1. 依存関係の追加

以下のコマンドで依存関係をインストールしてください：

```bash
npm install @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-async-storage-persister
```

**注意**: `@react-native-async-storage/async-storage` は既にインストール済みです。

---

## 2. QueryClient + 永続化のセットアップ

### ファイル: `lib/queryClient.ts` (新規作成)

QueryClientとAsyncStorage永続化パーシスターを設定しました。

### ファイル: `App.tsx` (修正)

`PersistQueryClientProvider`を最上位に追加し、`AuthProvider`の外側でラップしました。

**設定内容**:
- `staleTime`: 5分（デフォルト）
- `gcTime`: 30分（旧cacheTime）
- `retry`: 1回
- `refetchOnMount`: false（キャッシュがあれば即表示）
- `refetchOnReconnect`: true
- `refetchOnWindowFocus`: false（React Native前提）

---

## 3. data層の新設

### ディレクトリ構造

```
data/
├── queryKeys.ts          # queryKeyの一元管理
├── api/
│   ├── profiles.ts       # プロフィール一覧取得API
│   ├── chatRooms.ts      # チャット一覧取得API
│   └── unread.ts         # 未読数取得API（RPC）
└── hooks/
    ├── useProfilesList.ts    # プロフィール一覧用hook（useInfiniteQuery）
    ├── useChatRooms.ts       # チャット一覧用hook（useQuery）
    └── useUnreadCount.ts     # 未読数用hook（useQuery）
```

### queryKey一覧

- **プロフィール一覧**: `['profiles', 'list', { pageSize: 20, sort: 'newest' | 'recommended' | 'deadline' }]`
- **チャット一覧**: `['chatRooms', 'list', userId]`
- **未読数**: `['unreadCount', userId]`

---

## 4. App.tsx の修正（プロフィール一覧・未読数）

### プロフィール一覧

**変更前**:
- `fetchProfiles`関数で手動取得
- `displayProfiles` stateで管理
- `loadMoreProfiles`でページネーション

**変更後**:
- `useProfilesList(sortOrder)` hookを使用（useInfiniteQuery）
- `displayProfiles`は`profilesQuery.data?.pages.flatMap(...)`から取得
- `loadMoreProfiles`は`profilesQuery.fetchNextPage()`に置換
- `onRefresh`は`profilesQuery.refetch()`に置換

### 未読数

**変更前**:
- `fetchUnreadMessages`関数でRPCを直接呼び出し
- `unreadMessagesCount` stateで管理
- Realtimeイベント時に`fetchUnreadMessages()`を再実行

**変更後**:
- `useUnreadCount(session?.user?.id)` hookを使用（useQuery）
- `unreadMessagesCount`は`unreadCountQuery.data ?? 0`から取得
- Realtimeイベント時に`queryClient.invalidateQueries(['unreadCount', userId])`を呼び出し

---

## 5. TalkPage.tsx の修正（チャット一覧）

**変更前**:
- `fetchChatRooms`関数で複数クエリを実行し、stateを更新
- Realtimeイベント時に`fetchChatRooms()`を再実行

**変更後**:
- `useChatRooms(userId)` hookを使用（useQuery）
- `chatRooms`は`chatRoomsQuery.data || []`から取得
- Realtimeイベント時に`queryClient.invalidateQueries(['chatRooms', userId])`を呼び出し
- `onRefresh`は`chatRoomsQuery.refetch()`に置換

**注意**: `fetchChatRooms`関数の実装は`data/api/chatRooms.ts`に移動しました。

---

## 6. なぜロード体感が消えるか

1. **AsyncStorage永続化**: アプリ再起動時、キャッシュが即座に復元され、初回表示が瞬時に表示される
2. **stale-while-revalidate**: キャッシュを即表示しつつ、裏で最新データを取得して差分更新するため、ローディング画面が不要
3. **refetchOnMount: false**: キャッシュがあれば再取得しないため、画面遷移時の不要なローディングが発生しない

---

## 7. 実装の注意点

- **userIdを含むqueryKey**: ユーザー単位でキャッシュを分離しているため、別ユーザーのキャッシュが混ざらない
- **Realtimeはトリガー用途**: データ取得はReact Queryに統一し、Realtimeイベントでは`invalidateQueries`のみを呼び出す
- **既存のSecureStore利用**: セッション管理などはそのまま維持（AsyncStorageは一覧データのみ）

---

## 8. 今後の拡張（Local DB移行時）

- `data/api/*.ts`の関数を、SupabaseクエリからLocal DBクエリに置き換えるだけで対応可能
- queryKeyの構造は維持するため、フロントエンド側の変更は最小限
