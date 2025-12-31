import { supabase } from '../../lib/supabase';

export interface Project {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  cover_image?: string | null;
  owner_id: string;
  created_at: string;
  deadline?: string | null;
  required_roles?: string[];
  tags?: string[];
  status?: string;
  pendingCount?: number;
  applicantCount?: number; // これまで参加申請したユーザー数（status問わず、同一userは1）
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

  // Fetch application counts (pending + applicantCount)
  const projectIds = data.map((p: any) => p.id);
  const { data: apps, error: appsError } = await supabase
    .from('project_applications')
    .select('project_id, user_id, status')
    .in('project_id', projectIds);

  if (appsError) throw appsError;

  const pendingCounts: { [key: string]: number } = {};
  const userSets: { [key: string]: Set<string> } = {};
  apps?.forEach((app: any) => {
    const pid = app.project_id as string | undefined;
    const uid = app.user_id as string | undefined;
    const status = app.status as string | undefined;
    if (!pid || !uid) return;
    if (!userSets[pid]) userSets[pid] = new Set<string>();
    userSets[pid].add(uid);
    if (status === 'pending') {
      pendingCounts[pid] = (pendingCounts[pid] || 0) + 1;
    }
  });

  const projectsWithCounts = data.map((p: any) => ({
    ...p,
    pendingCount: pendingCounts[p.id] || 0,
    applicantCount: userSets[p.id]?.size || 0,
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
        cover_image,
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

  if (projectsWithStatus.length === 0) {
    return [];
  }

  // 参加申請ユーザー数（累計/重複なし）と pending 数を付与
  const projectIds = projectsWithStatus.map((p: any) => p.id);
  const { data: apps, error: appsError } = await supabase
    .from('project_applications')
    .select('project_id, user_id, status')
    .in('project_id', projectIds);

  if (appsError) throw appsError;

  const pendingCounts: { [key: string]: number } = {};
  const userSets: { [key: string]: Set<string> } = {};
  apps?.forEach((app: any) => {
    const pid = app.project_id as string | undefined;
    const uid = app.user_id as string | undefined;
    const status = app.status as string | undefined;
    if (!pid || !uid) return;
    if (!userSets[pid]) userSets[pid] = new Set<string>();
    userSets[pid].add(uid);
    if (status === 'pending') {
      pendingCounts[pid] = (pendingCounts[pid] || 0) + 1;
    }
  });

  const projectsWithCounts = projectsWithStatus.map((p: any) => ({
    ...p,
    pendingCount: pendingCounts[p.id] || 0,
    applicantCount: userSets[p.id]?.size || 0,
  }));

  return projectsWithCounts;
}
