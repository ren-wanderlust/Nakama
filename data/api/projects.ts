import { supabase } from '../../lib/supabase';
import { fetchBlockedUserIds } from './blocks';

export interface Project {
  id: string;
  title: string;
  tagline?: string;
  description: string;
  image_url: string | null;
  owner_id: string;
  created_at: string;
  deadline?: string | null;
  required_roles?: string[];
  tags?: string[];
  content_tags?: string[];
  status?: string;
  pendingCount?: number; // pending数（互換のため残す）
  applicantCount?: number; // これまで参加申請したユーザー数（status問わず、同一userは1）
  owner?: {
    id: string;
    name: string;
    image: string;
    university: string;
  };
}

export interface FetchProjectsParams {
  sort: 'recommended' | 'newest' | 'deadline';
  userId?: string; // 現在のユーザーID（ブロックフィルタ用）
}

/**
 * プロジェクト一覧を取得
 * @param sort ソート順
 * @param userId 現在のユーザーID（ブロックフィルタ用）
 * @returns プロジェクト配列
 */
export async function fetchProjects({ sort, userId }: FetchProjectsParams): Promise<Project[]> {
  // ブロックユーザー取得
  let blockedIds = new Set<string>();
  if (userId) {
    blockedIds = await fetchBlockedUserIds(userId);
  }

  let query = supabase
    .from('projects')
    .select(`
      *,
      owner:profiles!owner_id (
        id,
        name,
        image,
        university
      )
    `)
    .neq('status', 'closed');

  if (sort === 'deadline') {
    query = query.order('deadline', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) throw error;

  // ブロックユーザーのプロジェクトを除外
  const filteredData = (data || []).filter((project: any) => {
    if (blockedIds.has(project.owner_id)) return false;
    return true;
  });

  if (filteredData.length === 0) return [];

  // 参加申請ユーザー数（累計/重複なし）を付与
  const projectIds = filteredData.map((p: any) => p.id);
  const { data: apps, error: appsError } = await supabase
    .from('project_applications')
    .select('project_id, user_id')
    .in('project_id', projectIds);

  if (appsError) throw appsError;

  const userSets: Record<string, Set<string>> = {};
  apps?.forEach((app: any) => {
    const pid = app.project_id as string | undefined;
    const uid = app.user_id as string | undefined;
    if (!pid || !uid) return;
    if (!userSets[pid]) userSets[pid] = new Set<string>();
    userSets[pid].add(uid);
  });

  const projectsWithCounts = filteredData.map((p: any) => ({
    ...p,
    applicantCount: userSets[p.id]?.size || 0,
  }));

  return projectsWithCounts as Project[];
}
