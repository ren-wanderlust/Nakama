import { useQuery } from '@tanstack/react-query';
import { fetchProjectApplications } from '../api/applications';
import { queryKeys } from '../queryKeys';

export function useProjectApplications(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projectApplications.detail(userId || ''),
    queryFn: () => fetchProjectApplications(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2分
    gcTime: 10 * 60 * 1000, // 10分
    // 画面（LikesPage等）はタブ切替でアンマウントされるため、復帰時に自動で取りこぼしを回収する
    refetchOnMount: 'always',
  });
}
