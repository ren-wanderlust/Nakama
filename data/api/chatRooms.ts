import { supabase } from '../../lib/supabase';
import { fetchBlockedUserIds } from './blocks';

export interface ChatRoom {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAge: number;
  partnerImage: string;
  projectImage?: string;
  lastMessage: string;
  unreadCount: number;
  timestamp: string;
  isOnline?: boolean;
  isUnreplied: boolean;
  type: 'individual' | 'group';
  rawTimestamp: string;
  projectId?: string;
  lastSenderId?: string | null;
  lastSenderName?: string | null;
  lastSenderImage?: string | null;
}

/**
 * チャット一覧を取得（個別チャット + グループチャット）
 * @param userId 現在のユーザーID
 * @returns チャットルーム配列
 */
export async function fetchChatRooms(userId: string): Promise<ChatRoom[]> {
  // ブロックユーザー取得（双方向）
  const blockedIds = await fetchBlockedUserIds(userId);

  // --- Individual Chats (Existing Logic) ---
  const { data: myLikes } = await supabase
    .from('likes')
    .select('receiver_id')
    .eq('sender_id', userId);

  const { data: receivedLikes } = await supabase
    .from('likes')
    .select('sender_id')
    .eq('receiver_id', userId);

  const myLikedIds = new Set(myLikes?.map(l => l.receiver_id) || []);
  const matchedIds = new Set<string>();
  receivedLikes?.forEach(l => {
    if (myLikedIds.has(l.sender_id)) matchedIds.add(l.sender_id);
  });

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, content, image_url, sender_id, receiver_id, chat_room_id, created_at')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (messagesError) throw messagesError;

  // パートナー名を後で取得するため、画像メッセージの情報を保持
  const individualRoomsMap = new Map<string, any>();
  if (messages) {
    for (const msg of messages) {
      if (msg.chat_room_id) continue; // Skip group messages for individual list

      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (matchedIds.has(partnerId)) {
        if (!individualRoomsMap.has(partnerId)) {
          // 画像メッセージかどうかを判定
          const isImageMessage = !!msg.image_url && (!msg.content || msg.content.trim() === '');
          const isSentByMe = msg.sender_id === userId;

          individualRoomsMap.set(partnerId, {
            lastMessage: msg.content,
            timestamp: msg.created_at,
            unreadCount: 0,
            lastSenderId: msg.sender_id,
            type: 'individual',
            isImageMessage,
            isSentByMe,
          });
        }
      }
    }
  }

  matchedIds.forEach(partnerId => {
    if (!individualRoomsMap.has(partnerId)) {
      individualRoomsMap.set(partnerId, {
        lastMessage: 'マッチングしました！メッセージを送ってみましょう',
        timestamp: new Date().toISOString(),
        unreadCount: 0,
        isNewMatch: true,
        lastSenderId: null,
        type: 'individual',
      });
    }
  });

  // Fetch unread counts per individual chat
  const { data: unreadData } = await supabase
    .from('messages')
    .select('sender_id')
    .eq('receiver_id', userId)
    .or('is_read.is.null,is_read.eq.false');

  const unreadMap = new Map<string, number>();
  unreadData?.forEach((m: any) => {
    unreadMap.set(m.sender_id, (unreadMap.get(m.sender_id) || 0) + 1);
  });

  // ブロックユーザーを除外した partnerIds を取得
  const filteredPartnerIds = Array.from(individualRoomsMap.keys()).filter(
    partnerId => !blockedIds.has(partnerId)
  );
  let individualRooms: ChatRoom[] = [];

  if (filteredPartnerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, age, image')
      .in('id', filteredPartnerIds);

    individualRooms = filteredPartnerIds.map(partnerId => {
      const partnerProfile = profiles?.find(p => p.id === partnerId);
      const roomData = individualRoomsMap.get(partnerId);
      const lastMsgDate = new Date(roomData.timestamp);
      const now = new Date();
      const diff = now.getTime() - lastMsgDate.getTime();
      let timestamp = '';
      if (diff < 24 * 60 * 60 * 1000) {
        timestamp = lastMsgDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      } else {
        timestamp = `${lastMsgDate.getMonth() + 1}/${lastMsgDate.getDate()}`;
      }

      // 画像メッセージの場合のテキスト生成
      let lastMessage = roomData.lastMessage;
      if (roomData.isImageMessage) {
        if (roomData.isSentByMe) {
          lastMessage = '写真を送信しました';
        } else {
          const partnerName = partnerProfile?.name || 'Unknown';
          lastMessage = `${partnerName}が写真を送信しました`;
        }
      }

      return {
        id: partnerId,
        partnerId: partnerId,
        partnerName: partnerProfile?.name || 'Unknown',
        partnerAge: partnerProfile?.age || 0,
        partnerImage: partnerProfile?.image || '',
        lastMessage: lastMessage,
        unreadCount: unreadMap.get(partnerId) || 0,
        timestamp: timestamp,
        rawTimestamp: roomData.timestamp,
        isOnline: false,
        isUnreplied: roomData.lastSenderId === partnerId,
        type: 'individual',
      };
    });
  }

  // --- Team Chats (Server-side aggregation via RPC) ---
  // 注意: チームチャットはブロックの影響を受けない（仕様#4）
  // 個人チャットと同じ思想: サーバー側で最新メッセージ・未読数を確定させる
  const { data: teamRoomsData, error: teamRoomsError } = await supabase.rpc('get_team_chat_rooms', {
    p_user_id: userId,
  });

  if (teamRoomsError) {
    console.error('Error fetching team chat rooms:', teamRoomsError);
    throw teamRoomsError;
  }

  let teamRooms: ChatRoom[] = [];
  if (teamRoomsData && teamRoomsData.length > 0) {
    // 最新送信者のアイコンを出すため、送信者プロフィールをまとめて取得
    const senderIds = Array.from(
      new Set(
        teamRoomsData
          .map((r: any) => r.last_message_sender_id)
          .filter((id: any) => !!id)
      )
    );

    const { data: senderProfiles } = senderIds.length > 0
      ? await supabase
        .from('profiles')
        .select('id, name, image')
        .in('id', senderIds)
      : { data: [] as any[] };

    const senderMap = new Map<string, { id: string; name: string | null; image: string | null }>();
    senderProfiles?.forEach((p: any) => {
      senderMap.set(p.id, { id: p.id, name: p.name ?? null, image: p.image ?? null });
    });

    teamRooms = teamRoomsData.map((room: any) => {
      const lastMsgDate = room.last_message_created_at
        ? new Date(room.last_message_created_at)
        : room.room_created_at
          ? new Date(room.room_created_at)
          : new Date();

      const now = new Date();
      const diff = now.getTime() - lastMsgDate.getTime();
      let timestamp = '';
      if (diff < 24 * 60 * 60 * 1000) {
        timestamp = lastMsgDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      } else {
        timestamp = `${lastMsgDate.getMonth() + 1}/${lastMsgDate.getDate()}`;
      }

      // 画像メッセージの場合のテキスト生成
      let lastMessage = room.last_message_content || 'チームチャットが作成されました';
      const isImageMessage = !!room.last_message_image_url && (!room.last_message_content || room.last_message_content.trim() === '');
      if (isImageMessage) {
        const isSentByMe = room.last_message_sender_id === userId;
        if (isSentByMe) {
          lastMessage = '写真を送信しました';
        } else {
          const senderName = room.last_message_sender_name || 'Unknown';
          lastMessage = `${senderName}が写真を送信しました`;
        }
      }

      const senderProfile = room.last_message_sender_id ? senderMap.get(room.last_message_sender_id) : undefined;

      return {
        id: room.chat_room_id,
        partnerId: room.chat_room_id,
        partnerName: room.project_title || 'Team Chat',
        partnerAge: 0,
        // グループチャットのヘッダー/一覧ではプロジェクト画像を優先
        partnerImage: room.project_image_url || room.owner_image || '',
        projectImage: room.project_image_url || '',
        lastMessage: lastMessage,
        unreadCount: Number(room.unread_count) || 0,
        timestamp: timestamp,
        rawTimestamp: room.last_message_created_at || room.room_created_at || '1970-01-01T00:00:00.000Z',
        isOnline: false,
        isUnreplied: false,
        type: 'group' as const,
        projectId: room.project_id,
        lastSenderId: room.last_message_sender_id || null,
        lastSenderName: senderProfile?.name || room.last_message_sender_name || null,
        lastSenderImage: senderProfile?.image || null,
      };
    });
  }

  // Merge and Sort
  const allRooms = [...individualRooms, ...teamRooms];
  allRooms.sort((a, b) => new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime());

  return allRooms;
}
