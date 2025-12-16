import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { mapProfileRowToProfile } from '../../utils/profileMapper';

export interface FetchProfilesParams {
  pageNumber: number;
  pageSize: number;
}

export interface FetchProfilesResult {
  profiles: Profile[];
  hasMore: boolean;
}

/**
 * プロフィール一覧を取得（ページネーション対応）
 * @param pageNumber ページ番号（0始まり）
 * @param pageSize 1ページあたりの件数
 * @returns プロフィール配列と次ページ有無
 */
export async function fetchProfiles({
  pageNumber,
  pageSize,
}: FetchProfilesParams): Promise<FetchProfilesResult> {
  const from = pageNumber * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, age, university, company, grade, image, bio, skills, seeking_for, seeking_roles, status_tags, is_student, created_at')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const mappedProfiles: Profile[] = (data || []).map((item: any) =>
    mapProfileRowToProfile(item)
  );

  return {
    profiles: mappedProfiles,
    hasMore: (data?.length || 0) === pageSize,
  };
}
