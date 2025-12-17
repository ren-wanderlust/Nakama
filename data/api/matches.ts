import { supabase } from '../../lib/supabase';

export interface MatchesResult {
  matchIds: Set<string>;
  myLikedIds: Set<string>;
}

/**
 * マッチ一覧と自分が送ったいいねを取得
 * @param userId ユーザーID
 * @returns マッチIDセットと自分が送ったいいねIDセット
 */
export async function fetchMatches(userId: string): Promise<MatchesResult> {
  // 1. 相互いいねの相手IDを RPC で取得
  const { data: matchRows, error: matchError } = await supabase.rpc('get_my_matches', {
    p_user_id: userId,
  });

  if (matchError) throw matchError;

  const matchIds = new Set<string>(
    (matchRows || []).map((row: { match_id: string }) => row.match_id)
  );

  // 2. 「自分が送ったいいね」の一覧（LikedProfiles）は1クエリで取得
  const { data: myLikes } = await supabase
    .from('likes')
    .select('receiver_id')
    .eq('sender_id', userId);

  const myLikedIds = new Set<string>(myLikes?.map(l => l.receiver_id) || []);

  return {
    matchIds,
    myLikedIds,
  };
}
