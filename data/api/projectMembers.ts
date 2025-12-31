import { supabase } from '../../lib/supabase';

export interface ProjectMemberLite {
  id: string;
  image: string | null;
}

export type ProjectMembersMap = Record<string, ProjectMemberLite[]>;

/**
 * プロジェクトごとの参加メンバー（owner + approved applications）をまとめて取得
 */
export async function fetchProjectMembers(projectIds: string[]): Promise<ProjectMembersMap> {
  if (!projectIds || projectIds.length === 0) return {};

  // 1) owners
  const { data: ownerRows, error: ownersError } = await supabase
    .from('projects')
    .select(`
      id,
      owner:profiles!owner_id (
        id,
        image
      )
    `)
    .in('id', projectIds);

  if (ownersError) throw ownersError;

  // 2) approved members
  const { data: appRows, error: appsError } = await supabase
    .from('project_applications')
    .select(`
      project_id,
      user:profiles!user_id (
        id,
        image
      )
    `)
    .in('project_id', projectIds)
    .eq('status', 'approved');

  if (appsError) throw appsError;

  // 3) merge + dedupe
  const map: ProjectMembersMap = {};
  projectIds.forEach((pid) => {
    map[pid] = [];
  });

  (ownerRows || []).forEach((row: any) => {
    const pid = row.id;
    const owner = row.owner;
    if (!pid || !owner?.id) return;
    map[pid] = map[pid] || [];
    map[pid].push({ id: owner.id, image: owner.image ?? null });
  });

  (appRows || []).forEach((row: any) => {
    const pid = row.project_id;
    const user = row.user;
    if (!pid || !user?.id) return;
    map[pid] = map[pid] || [];
    map[pid].push({ id: user.id, image: user.image ?? null });
  });

  Object.keys(map).forEach((pid) => {
    const seen = new Set<string>();
    map[pid] = (map[pid] || []).filter((m) => {
      if (!m?.id) return false;
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  });

  return map;
}


