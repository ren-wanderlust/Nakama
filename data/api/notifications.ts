import { supabase } from '../../lib/supabase';

export interface Notification {
  id: string;
  type: 'important' | 'update' | 'psychology' | 'other' | 'like' | 'match' | 'application' | 'application_status';
  title: string;
  content?: string;
  image_url?: string;
  created_at: string;
  project_id?: string;  // プロジェクト関連の通知用
  related_user_id?: string;  // いいね・マッチングの相手ユーザー
  sender_id?: string;  // 通知送信者
}

export interface FormattedNotification {
  id: string;
  type: 'important' | 'update' | 'psychology' | 'other' | 'like' | 'match' | 'application' | 'application_status';
  title: string;
  content?: string;
  date: string;
  imageUrl?: string;
  created_at: string;
  projectId?: string;
  relatedUserId?: string;
  senderId?: string;
}

/**
 * 通知一覧を取得
 * @param userId ユーザーID（nullの場合はパブリック通知のみ）
 * @returns フォーマット済み通知一覧
 */
export async function fetchNotifications(userId: string | null): Promise<FormattedNotification[]> {
  let query = supabase
    .from('notifications')
    .select('id, type, title, content, image_url, created_at, project_id, related_user_id, sender_id')
    .order('created_at', { ascending: false })
    .limit(50);

  if (userId) {
    query = query.or(`user_id.is.null,user_id.eq.${userId}`);
  } else {
    query = query.is('user_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map((item: Notification) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    content: item.content,
    imageUrl: item.image_url,
    created_at: item.created_at,
    projectId: item.project_id,
    relatedUserId: item.related_user_id,
    senderId: item.sender_id,
    date: new Date(item.created_at).toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    }),
  }));
}

/**
 * ユーザー固有の通知を既読にする
 * @param userId ユーザーID
 */
export async function markNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
}
