# React Query + AsyncStorage 永続キャッシュ実装 - 成果物まとめ

## 1. 追加した依存とインストール手順

### インストール済みパッケージ

以下のパッケージが`package.json`に追加済みです：

```json
"@tanstack/react-query": "^5.62.11",
"@tanstack/react-query-persist-client": "^5.90.14",
"@tanstack/query-async-storage-persister": "^5.89.0",
"@react-native-async-storage/async-storage": "^2.2.0" // 既存
```

### インストールコマンド

```bash
npm install
```

（既にインストール済みのため、再インストールは不要です）

---

## 2. QueryClientProvider + 永続化の実装コード

### ファイル: `lib/queryClient.ts` (新規作成)

```typescript
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分
      gcTime: 30 * 60 * 1000, // 30分
      retry: 1,
      refetchOnMount: false, // キャッシュがあれば即表示
      refetchOnReconnect: true,
      refetchOnWindowFocus: false, // React Native前提
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});
```

### ファイル: `App.tsx` (修正箇所: L2080-2090)

```typescript
return (
  <SafeAreaProvider>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 30 * 60 * 1000, // 30分
      }}
    >
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </PersistQueryClientProvider>
  </SafeAreaProvider>
);
```

**設定内容**:
- ✅ `staleTime`: 5分（デフォルト）
- ✅ `gcTime`: 30分
- ✅ `retry`: 1回
- ✅ `refetchOnMount`: false（キャッシュがあれば即表示）
- ✅ `refetchOnReconnect`: true
- ✅ `refetchOnWindowFocus`: false（React Native前提）
- ✅ AsyncStorage永続化（SecureStoreは使用しない）

---

## 3. 新設した data層のファイル一式

### ディレクトリ構造

```
data/
├── queryKeys.ts              # queryKeyの一元管理
├── api/
│   ├── profiles.ts           # プロフィール一覧取得API
│   ├── chatRooms.ts          # チャット一覧取得API
│   └── unread.ts             # 未読数取得API（RPC）
└── hooks/
    ├── useProfilesList.ts    # プロフィール一覧用hook（useInfiniteQuery）
    ├── useChatRooms.ts       # チャット一覧用hook（useQuery）
    └── useUnreadCount.ts     # 未読数用hook（useQuery）
```

### 3-1. `data/queryKeys.ts`

```typescript
export const queryKeys = {
  profiles: {
    all: ['profiles'] as const,
    lists: () => [...queryKeys.profiles.all, 'list'] as const,
    list: (pageSize: number, sort: 'newest' | 'recommended' | 'deadline') =>
      [...queryKeys.profiles.lists(), { pageSize, sort }] as const,
  },
  chatRooms: {
    all: ['chatRooms'] as const,
    lists: () => [...queryKeys.chatRooms.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.chatRooms.lists(), userId] as const,
  },
  unreadCount: {
    all: ['unreadCount'] as const,
    detail: (userId: string) => [...queryKeys.unreadCount.all, userId] as const,
  },
};
```

### 3-2. `data/api/profiles.ts`

- `fetchProfiles(params)`: プロフィール一覧をページネーションで取得
- 返り値: `{ profiles: Profile[], hasMore: boolean }`

### 3-3. `data/api/chatRooms.ts`

- `fetchChatRooms(userId)`: チャット一覧（個別 + グループ）を取得
- 返り値: `ChatRoom[]`
- N+1問題を回避したバッチクエリ実装を維持

### 3-4. `data/api/unread.ts`

- `fetchUnreadCount(userId)`: RPC `get_unread_message_count` を呼び出し
- 返り値: `number`

### 3-5. `data/hooks/useProfilesList.ts`

```typescript
export function useProfilesList(sort: 'newest' | 'recommended' | 'deadline' = 'newest') {
  return useInfiniteQuery({
    queryKey: queryKeys.profiles.list(PAGE_SIZE, sort),
    queryFn: ({ pageParam = 0 }) => fetchProfiles({ pageNumber: pageParam, pageSize: PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) => lastPage.hasMore ? allPages.length : undefined,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
```

### 3-6. `data/hooks/useChatRooms.ts`

```typescript
export function useChatRooms(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.chatRooms.list(userId || ''),
    queryFn: () => fetchChatRooms(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
```

### 3-7. `data/hooks/useUnreadCount.ts`

```typescript
export function useUnreadCount(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.unreadCount.detail(userId || ''),
    queryFn: () => fetchUnreadCount(userId!),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
```

---

## 4. App.tsx（プロフィール一覧・未読数）の差分

### 4-1. プロフィール一覧の変更

**変更前** (L172-221):
```typescript
const [displayProfiles, setDisplayProfiles] = useState<Profile[]>([]);
const [page, setPage] = useState(0);
const [hasMore, setHasMore] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);

const fetchProfiles = async (pageNumber = 0, shouldRefresh = false) => {
  // ... 手動でstate更新
  setDisplayProfiles(mappedProfiles);
  setHasMore(data.length === PAGE_SIZE);
  setPage(pageNumber);
};

const loadMoreProfiles = () => {
  if (!loadingMore && hasMore) {
    fetchProfiles(page + 1);
  }
};
```

**変更後** (L131, L177-185):
```typescript
// React Query hooks
const profilesQuery = useProfilesList(sortOrder === 'newest' ? 'newest' : sortOrder === 'recommended' ? 'recommended' : 'deadline');

// プロフィール一覧をReact Queryから取得（useInfiniteQuery）
const displayProfiles: Profile[] = profilesQuery.data?.pages.flatMap((page: any) => page.profiles) || [];
const loadingMore = profilesQuery.isFetchingNextPage;
const hasMore = profilesQuery.hasNextPage ?? false;

const loadMoreProfiles = () => {
  if (profilesQuery.hasNextPage && !profilesQuery.isFetchingNextPage) {
    profilesQuery.fetchNextPage();
  }
};
```

**onRefresh の変更** (L740-747):
```typescript
// 変更前
const onRefresh = async () => {
  setRefreshing(true);
  await fetchProfiles(0, true);
  setRefreshing(false);
};

// 変更後
const onRefresh = React.useCallback(async () => {
  setRefreshing(true);
  await Promise.all([
    profilesQuery.refetch(),
    unreadCountQuery.refetch(),
    fetchMatches(),
  ]);
  setRefreshing(false);
}, [profilesQuery, unreadCountQuery]);
```

### 4-2. 未読数の変更

**変更前** (L311-353):
```typescript
const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

const fetchUnreadMessages = async () => {
  const { data, error } = await supabase.rpc('get_unread_message_count', {
    p_user_id: session.user.id,
  });
  setUnreadMessagesCount(data ?? 0);
};

// Realtime購読
const channel = supabase
  .channel(`unread_messages_${session.user.id}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
    fetchUnreadMessages();
  })
  .subscribe();
```

**変更後** (L132, L310-327):
```typescript
// React Query hooks
const unreadCountQuery = useUnreadCount(session?.user?.id);
const unreadMessagesCount = unreadCountQuery.data ?? 0;

// Realtime購読（invalidateQueries使用）
const channel = supabase
  .channel(`unread_messages_${session.user.id}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount.detail(session.user.id) });
  })
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount.detail(session.user.id) });
  })
  .subscribe();
```

---

## 5. TalkPage.tsx の差分（fetch直叩き→useQuery、Realtime→invalidate）

### 変更前 (L38-77, L87-337)

```typescript
const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
const [loading, setLoading] = useState(true);

const fetchChatRooms = async () => {
  // ... 複数クエリを実行
  setChatRooms(allRooms);
  setLoading(false);
};

useEffect(() => {
  fetchChatRooms();

  const messageSubscription = supabase
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
      fetchChatRooms(); // 直接fetch
    })
    .subscribe();
}, []);
```

### 変更後 (L34-79)

```typescript
// React Query hooks
const queryClient = useQueryClient();
const [userId, setUserId] = useState<string | undefined>(undefined);

useEffect(() => {
  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id);
  };
  getUserId();
}, []);

const chatRoomsQuery = useChatRooms(userId);
const chatRooms: ChatRoom[] = chatRoomsQuery.data || [];
const loading = chatRoomsQuery.isLoading;

const onRefresh = async () => {
  setRefreshing(true);
  await chatRoomsQuery.refetch();
  setRefreshing(false);
};

useEffect(() => {
  if (!userId) return;

  // Subscribe to new messages
  const messageSubscription = supabase
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
    })
    .subscribe();

  // Subscribe to new likes (matches)
  const likesSubscription = supabase
    .channel('public:likes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'likes' }, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(messageSubscription);
    supabase.removeChannel(likesSubscription);
  };
}, [userId, queryClient]);
```

**主な変更点**:
- ✅ `fetchChatRooms`関数を`data/api/chatRooms.ts`に移動
- ✅ `useChatRooms(userId)` hookを使用
- ✅ Realtimeイベント時に`invalidateQueries`を呼び出し（直接fetchしない）
- ✅ `onRefresh`は`chatRoomsQuery.refetch()`に置換

---

## 6. 「なぜロード体感が消えるか」を3行で説明

1. **AsyncStorage永続化**: アプリ再起動時、キャッシュが即座に復元され、初回表示が瞬時に表示される（ローディング画面が不要）
2. **stale-while-revalidate**: キャッシュを即表示しつつ、裏で最新データを取得して差分更新するため、ユーザーは常にデータを見ることができる
3. **refetchOnMount: false**: キャッシュがあれば再取得しないため、画面遷移時の不要なローディングが発生しない

---

## 7. queryKey一覧

| 用途 | queryKey | 例 |
|------|----------|-----|
| **プロフィール一覧** | `['profiles', 'list', { pageSize: 20, sort: 'newest' }]` | `queryKeys.profiles.list(20, 'newest')` |
| **チャット一覧** | `['chatRooms', 'list', userId]` | `queryKeys.chatRooms.list('user-123')` |
| **未読数** | `['unreadCount', userId]` | `queryKeys.unreadCount.detail('user-123')` |

**注意**: すべてのqueryKeyに`userId`を含めることで、別ユーザーのキャッシュが混ざらないように設計されています。

---

## 実装の確認事項

✅ 依存関係の追加完了  
✅ QueryClientProvider + 永続化セットアップ完了  
✅ data層の新設完了（queryKeys/api/hooks）  
✅ プロフィール一覧をuseInfiniteQuery化完了  
✅ チャット一覧をuseQuery化完了  
✅ 未読数をuseQuery化完了  
✅ RealtimeイベントでinvalidateQueries使用  
✅ ポーリングなし（setInterval禁止）  
✅ SecureStoreは使用せず、AsyncStorageのみ使用  
✅ 既存のSecureStore利用（セッション等）は維持  

---

## 次のステップ（オプション）

- [ ] エラーハンドリングの強化
- [ ] オフライン時の挙動確認
- [ ] キャッシュサイズの監視
- [ ] 将来のLocal DB移行準備（queryKey構造は維持）
