import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { mapProfileRowToProfile } from '../../utils/profileMapper';

export interface Application {
  id: string;
  user_id: string;
  project_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  is_read?: boolean;
  message?: string;
  user?: Profile;
  project?: {
    id: string;
    title: string;
    description?: string;
    tagline?: string;
    image_url?: string | null;
    owner_id?: string;
    created_at?: string;
    deadline?: string | null;
    required_roles?: string[];
    tags?: string[];
    content_tags?: string[];
    pendingCount?: number; // 参加申請数（pending）
    owner?: {
      id: string;
      name: string;
      image: string;
      university: string;
    };
  };
}

export interface ProjectApplicationsResult {
  recruiting: Application[];
  applied: Application[];
  unreadRecruitingIds: Set<string>;
}

/**
 * プロジェクト応募一覧を取得（募集・応募の両方）
 * @param userId ユーザーID
 * @returns 応募配列と未読IDセット
 */
export async function fetchProjectApplications(userId: string): Promise<ProjectApplicationsResult> {
  // 1. Fetch my projects
  const { data: myProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', userId);

  const myProjectIds = myProjects?.map(p => p.id) || [];

  let recruiting: Application[] = [];
  let unreadRecruitingIds = new Set<string>();

  if (myProjectIds.length > 0) {
    // Fetch applications to my projects (募集)
    const { data: recruitingData, error: recruitingError } = await supabase
      .from('project_applications')
      .select(`
        *,
        user:profiles!user_id (
          id,
          name,
          age,
          university,
          company,
          grade,
          image,
          bio,
          skills,
          seeking_for,
          seeking_roles,
          status_tags,
          is_student,
          created_at
        ),
        project:projects!project_id (
          id,
          title
        )
      `)
      .in('project_id', myProjectIds)
      .order('created_at', { ascending: false });

    if (recruitingError) {
      console.error('Error fetching recruiting applications:', recruitingError);
    } else if (recruitingData) {
      // Track unread applications (pending only)
      unreadRecruitingIds = new Set<string>(
        recruitingData
          .filter((app: any) => app.status === 'pending' && !app.is_read)
          .map((app: any) => app.id)
      );

      recruiting = recruitingData.map((app: any) => ({
        id: app.id,
        user_id: app.user_id,
        project_id: app.project_id,
        status: app.status,
        created_at: app.created_at,
        is_read: app.is_read,
        user: app.user ? mapProfileRowToProfile(app.user) : undefined,
        project: app.project,
      }));
    }
  }

  // 2. Fetch my applications (応募)
  const { data: appliedData, error: appliedError } = await supabase
    .from('project_applications')
    .select(`
      id,
      user_id,
      project_id,
      status,
      created_at,
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
    .order('created_at', { ascending: false });

  let applied: Application[] = [];

  if (appliedError) {
    console.error('Error fetching applied applications:', appliedError);
  } else if (appliedData) {
    applied = appliedData.map((app: any) => ({
      id: app.id,
      user_id: app.user_id,
      project_id: app.project_id,
      status: app.status,
      created_at: app.created_at,
      project: app.project,
    }));
  }

  // 3. Attach pending application count per project
  const allProjectIds = Array.from(
    new Set<string>([
      ...recruiting.map(a => a.project_id),
      ...applied.map(a => a.project_id),
    ].filter(Boolean))
  );

  if (allProjectIds.length > 0) {
    const { data: apps, error: countError } = await supabase
      .from('project_applications')
      .select('project_id')
      .in('project_id', allProjectIds)
      .eq('status', 'pending');

    if (countError) {
      console.error('Error fetching pending counts:', countError);
    } else {
      const counts: Record<string, number> = {};
      apps?.forEach((app: any) => {
        counts[app.project_id] = (counts[app.project_id] || 0) + 1;
      });

      recruiting = recruiting.map((a) => ({
        ...a,
        project: a.project ? { ...a.project, pendingCount: counts[a.project_id] || 0 } : a.project,
      }));
      applied = applied.map((a) => ({
        ...a,
        project: a.project ? { ...a.project, pendingCount: counts[a.project_id] || 0 } : a.project,
      }));
    }
  }

  return {
    recruiting,
    applied,
    unreadRecruitingIds,
  };
}
