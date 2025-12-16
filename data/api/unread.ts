import { supabase } from '../../lib/supabase';

/**
 * 未読メッセージ数を取得（RPC経由）
 * @param userId ユーザーID
 * @returns 未読メッセージ数（個別チャット + グループチャット）
 */
export async function fetchUnreadCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_unread_message_count', {
    p_user_id: userId,
  });

  if (error) {
    console.log('Error fetching unread messages via RPC:', error);
    throw error;
  }

  return data ?? 0;
}
