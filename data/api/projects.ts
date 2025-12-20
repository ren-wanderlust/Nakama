import { supabase } from '../../lib/supabase';

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
  owner?: {
    id: string;
    name: string;
    image: string;
    university: string;
  };
}

export interface FetchProjectsParams {
  sort: 'recommended' | 'newest' | 'deadline';
}

/**
 * プロジェクト一覧を取得
 * @param sort ソート順
 * @returns プロジェクト配列
 */
export async function fetchProjects({ sort }: FetchProjectsParams): Promise<Project[]> {
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

  return (data || []) as Project[];
}
