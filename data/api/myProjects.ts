import { supabase } from '../../lib/supabase';

export interface Project {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  owner_id: string;
  created_at: string;
  deadline?: string | null;
  required_roles?: string[];
  tags?: string[];
  status?: string;
  pendingCount?: number;
}

/**
 * マイプロジェクトを取得（pendingCount付き）
 * @param userId ユーザーID
 * @returns プロジェクト配列（pendingCount付き、pendingCount降順でソート）
 */
export async function fetchMyProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  if (!data || data.length === 0) {
    return [];
  }

  // Fetch pending application counts
  const projectIds = data.map((p: any) => p.id);
  const { data: apps } = await supabase
    .from('project_applications')
    .select('project_id')
    .in('project_id', projectIds)
    .eq('status', 'pending');

  const counts: { [key: string]: number } = {};
  apps?.forEach((app: any) => {
    counts[app.project_id] = (counts[app.project_id] || 0) + 1;
  });

  const projectsWithCounts = data.map((p: any) => ({
    ...p,
    pendingCount: counts[p.id] || 0,
  }));

  // Sort by pending count (descending) - projects with more pending apps first
  projectsWithCounts.sort((a: any, b: any) => (b.pendingCount || 0) - (a.pendingCount || 0));

  return projectsWithCounts as Project[];
}

/**
 * 参加中プロジェクトを取得
 * @param userId ユーザーID
 * @returns プロジェクト配列（applicationStatus, applicationId付き）
 */
export async function fetchParticipatingProjects(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('project_applications')
    .select(`
      id,
      status,
      project:projects!project_id (
        id,
        title,
        description,
        tagline,
        image_url,
        owner_id,
        created_at,
        deadline,
        required_roles,
        tags,
        content_tags,
        owner:profiles!owner_id (
          id,
          name,
          image,
          university
        )
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) throw error;

  if (!data) {
    return [];
  }

  // プロジェクト情報を抽出してフラット化
  const projectsWithStatus = data
    .filter((item: any) => item.project)
    .map((item: any) => ({
      ...item.project,
      applicationStatus: item.status,
      applicationId: item.id,
    }));

  return projectsWithStatus;
}
