import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchProfiles } from '../api/profiles';
import { queryKeys } from '../queryKeys';

const PAGE_SIZE = 20;

export function useProfilesList(sort: 'newest' | 'recommended' | 'deadline' = 'newest') {
  return useInfiniteQuery({
    queryKey: queryKeys.profiles.list(PAGE_SIZE, sort),
    queryFn: ({ pageParam = 0 }) =>
      fetchProfiles({
        pageNumber: pageParam,
        pageSize: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage, allPages) => {
      // 次ページがある場合は次のページ番号を返す
      return lastPage.hasMore ? allPages.length : undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 30 * 60 * 1000, // 30分
  });
}
