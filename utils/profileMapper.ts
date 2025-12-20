import { Profile } from '../types';

// DB行やJOIN結果から共通のProfileオブジェクトへ変換するヘルパー
// - profilesテーブルの行
// - JOINで得られた sender: profiles!sender_id (*) 等
// を想定しています。
export function mapProfileRowToProfile(row: any): Profile {
  if (!row) {
    // 型上は呼び出し側でnullチェックしている想定だが、安全のためデフォルト値を返す
    return {
      id: '',
      name: '',
      age: 0,
      university: '',
      company: '',
      grade: '',
      image: '',
      challengeTheme: '',
      theme: '',
      bio: '',
      skills: [],
      seekingFor: [],
      seekingRoles: [],
      statusTags: [],
      isStudent: false,
      createdAt: '',
    };
  }

  return {
    id: row.id,
    name: row.name,
    age: row.age,
    university: row.university,
    company: row.company,
    grade: row.grade || '',
    image: row.image,
    // DBにchallenge_theme/themeカラムが無い環境でも壊れないよう、存在しなければ空文字
    challengeTheme: row.challenge_theme ?? row.challengeTheme ?? '',
    theme: row.theme ?? row.user_theme ?? '',
    bio: row.bio,
    skills: row.skills || [],
    seekingFor: row.seeking_for ?? row.seekingFor ?? [],
    seekingRoles: row.seeking_roles ?? row.seekingRoles ?? [],
    statusTags: row.status_tags ?? row.statusTags ?? [],
    isStudent: row.is_student ?? row.isStudent ?? false,
    createdAt: row.created_at ?? row.createdAt ?? '',
    lastActiveAt: row.last_active_at ?? row.lastActiveAt ?? '',
  };
}
