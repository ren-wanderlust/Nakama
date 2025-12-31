import { useQuery } from '@tanstack/react-query';
import { fetchProjectMembers } from '../api/projectMembers';
import { queryKeys } from '../queryKeys';

function makeProjectIdsKey(projectIds: string[]) {
  // 順序の揺れでキャッシュが増えないようにソートして固定化
  return [...projectIds].sort().join(',');
}

export function useProjectMembers(projectIds: string[]) {
  const key = makeProjectIdsKey(projectIds);

  return useQuery({
    queryKey: queryKeys.projectMembers.list(key),
    queryFn: () => fetchProjectMembers(projectIds),
    enabled: projectIds.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
  });
}


