import { useQuery } from '@tanstack/react-query';
import { fetchMatches } from '../api/matches';
import { queryKeys } from '../queryKeys';

export function useMatches(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.matches.detail(userId || ''),
    queryFn: () => fetchMatches(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2分
    gcTime: 10 * 60 * 1000, // 10分
  });
}
