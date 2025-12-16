import { useQuery } from '@tanstack/react-query';
import { fetchUnreadCount } from '../api/unread';
import { queryKeys } from '../queryKeys';

export function useUnreadCount(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.unreadCount.detail(userId || ''),
    queryFn: () => fetchUnreadCount(userId!),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1分（未読数は更新頻度が高いため短め）
    gcTime: 5 * 60 * 1000, // 5分
  });
}
