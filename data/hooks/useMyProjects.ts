import { useQuery } from '@tanstack/react-query';
import { fetchMyProjects, fetchParticipatingProjects } from '../api/myProjects';
import { queryKeys } from '../queryKeys';

export function useMyProjects(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.myProjects.detail(userId || ''),
    queryFn: () => fetchMyProjects(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2分
    gcTime: 10 * 60 * 1000, // 10分
    // タブ切替で画面がアンマウントされるため、復帰時に最新化する
    refetchOnMount: 'always',
  });
}

export function useParticipatingProjects(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.participatingProjects.detail(userId || ''),
    queryFn: () => fetchParticipatingProjects(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2分
    gcTime: 10 * 60 * 1000, // 10分
    // タブ切替で画面がアンマウントされるため、復帰時に最新化する
    refetchOnMount: 'always',
  });
}
