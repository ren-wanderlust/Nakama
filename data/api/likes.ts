import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { mapProfileRowToProfile } from '../../utils/profileMapper';

export interface ReceivedLike {
  sender_id: string;
  is_read: boolean;
  is_read_as_match: boolean;
  sender?: Profile;
}

export interface ReceivedLikesResult {
  profiles: Profile[];
  unreadInterestIds: Set<string>;
  unreadMatchIds: Set<string>;
}

/**
 * 受信いいねを取得
 * @param userId ユーザーID
 * @returns プロフィール配列と未読IDセット
 */
export async function fetchReceivedLikes(userId: string): Promise<ReceivedLikesResult> {
  // Get my likes to determine matches
  const { data: myLikes } = await supabase
    .from('likes')
    .select('receiver_id')
    .eq('sender_id', userId);

  const myLikedIds = new Set(myLikes?.map(l => l.receiver_id) || []);

  // Get blocked users
  const { data: blocks } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', userId);

  const blockedIds = new Set(blocks?.map(b => b.blocked_id) || []);

  const { data: likes, error } = await supabase
    .from('likes')
    .select(`
      sender_id,
      is_read,
      is_read_as_match,
      sender:profiles!sender_id (
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
      )
    `)
    .eq('receiver_id', userId);

  if (error) throw error;

  if (!likes || likes.length === 0) {
    return {
      profiles: [],
      unreadInterestIds: new Set(),
      unreadMatchIds: new Set(),
    };
  }

  // Extract unread IDs based on match status and excluding blocked users
  const unreadInterestIds = new Set<string>();
  const unreadMatchIds = new Set<string>();

  likes.forEach(l => {
    // Skip blocked users
    if (blockedIds.has(l.sender_id)) return;

    const isMatched = myLikedIds.has(l.sender_id);
    if (isMatched) {
      // Matched: add to unreadMatchIds if is_read_as_match is false
      if (!l.is_read_as_match) {
        unreadMatchIds.add(l.sender_id);
      }
    } else {
      // Interest only: add to unreadInterestIds if is_read is false
      if (!l.is_read) {
        unreadInterestIds.add(l.sender_id);
      }
    }
  });

  // Map profiles directly from the joined data, excluding blocked users
  const profiles: Profile[] = likes
    .filter(like => like.sender && !blockedIds.has(like.sender_id))
    .map((like: any) => mapProfileRowToProfile(like.sender));

  return {
    profiles,
    unreadInterestIds,
    unreadMatchIds,
  };
}
