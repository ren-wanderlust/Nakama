import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * React Query の QueryClient インスタンス
 * 永続化設定を含む
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分（デフォルト）
      gcTime: 30 * 60 * 1000, // 30分（旧cacheTime）
      retry: 1,
      refetchOnMount: false, // キャッシュがあれば即表示
      refetchOnReconnect: true,
      refetchOnWindowFocus: false, // React Native前提なので無効
    },
  },
});

/**
 * AsyncStorage を使った永続化パーシスター
 */
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});
