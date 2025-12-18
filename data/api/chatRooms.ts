import { supabase } from '../../lib/supabase';

export interface ChatRoom {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAge: number;
  partnerImage: string;
  lastMessage: string;
  unreadCount: number;
  timestamp: string;
  isOnline?: boolean;
  isUnreplied: boolean;
  type: 'individual' | 'group';
  rawTimestamp: string;
  projectId?: string;
}

/**
 * チャット一覧を取得（個別チャット + グループチャット）
 * @param userId 現在のユーザーID
 * @returns チャットルーム配列
 */
export async function fetchChatRooms(userId: string): Promise<ChatRoom[]> {
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
    .select('id, content, sender_id, receiver_id, chat_room_id, created_at')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (messagesError) throw messagesError;

  const individualRoomsMap = new Map<string, any>();
  if (messages) {
    for (const msg of messages) {
      if (msg.chat_room_id) continue; // Skip group messages for individual list

      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (matchedIds.has(partnerId)) {
        if (!individualRoomsMap.has(partnerId)) {
          individualRoomsMap.set(partnerId, {
            lastMessage: msg.content,
            timestamp: msg.created_at,
            unreadCount: 0,
            lastSenderId: msg.sender_id,
            type: 'individual',
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

  const partnerIds = Array.from(individualRoomsMap.keys());
  let individualRooms: ChatRoom[] = [];

  if (partnerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, age, image')
      .in('id', partnerIds);

    individualRooms = partnerIds.map(partnerId => {
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

      return {
        id: partnerId,
        partnerId: partnerId,
        partnerName: partnerProfile?.name || 'Unknown',
        partnerAge: partnerProfile?.age || 0,
        partnerImage: partnerProfile?.image || '',
        lastMessage: roomData.lastMessage,
        unreadCount: unreadMap.get(partnerId) || 0,
        timestamp: timestamp,
        rawTimestamp: roomData.timestamp,
        isOnline: false,
        isUnreplied: roomData.lastSenderId === partnerId,
        type: 'individual',
      };
    });
  }

  // --- Team Chats (Optimized - No N+1) ---
  const { data: teamRoomsData } = await supabase
    .from('chat_rooms')
    .select(`
      id,
      project_id,
      created_at,
      project:projects (
        id,
        title,
        image_url,
        owner:profiles!owner_id (
          image
        )
      )
    `)
    .eq('type', 'group');

  let teamRooms: ChatRoom[] = [];
  if (teamRoomsData && teamRoomsData.length > 0) {
    const roomIds = teamRoomsData.map(room => room.id);

    // Batch Query 1: Fetch latest messages for all rooms at once
    const { data: latestMessages } = await supabase
      .from('messages')
      .select('chat_room_id, content, created_at, sender_id')
      .in('chat_room_id', roomIds)
      .order('chat_room_id', { ascending: true })
      .order('created_at', { ascending: false });

    // Group messages by room_id (get the first/latest one per room)
    const messagesByRoom = new Map<string, any>();
    latestMessages?.forEach(msg => {
      if (!messagesByRoom.has(msg.chat_room_id)) {
        messagesByRoom.set(msg.chat_room_id, msg);
      }
    });

    // Batch Query 2: Fetch read status for all rooms at once
    const { data: readStatuses } = await supabase
      .from('chat_room_read_status')
      .select('chat_room_id, last_read_at')
      .eq('user_id', userId)
      .in('chat_room_id', roomIds);

    const readStatusByRoom = new Map<string, string>();
    readStatuses?.forEach(status => {
      readStatusByRoom.set(status.chat_room_id, status.last_read_at);
    });

    // Batch Query 3: Fetch unread messages for all rooms at once
    const allLastReadTimes = Array.from(readStatusByRoom.values());
    const globalMinLastRead =
      allLastReadTimes.length > 0
        ? allLastReadTimes.reduce(
          (min, current) =>
            new Date(current).getTime() < new Date(min).getTime() ? current : min,
          allLastReadTimes[0]
        )
        : '1970-01-01';

    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('chat_room_id, created_at, sender_id')
      .in('chat_room_id', roomIds)
      .gt('created_at', globalMinLastRead)
      .neq('sender_id', userId);

    const unreadCountByRoom = new Map<string, number>();
    unreadMessages?.forEach((msg: any) => {
      const lastReadTime = readStatusByRoom.get(msg.chat_room_id) || '1970-01-01';
      if (new Date(msg.created_at).getTime() > new Date(lastReadTime).getTime()) {
        unreadCountByRoom.set(
          msg.chat_room_id,
          (unreadCountByRoom.get(msg.chat_room_id) || 0) + 1
        );
      }
    });

    // Merge all data on client side
    teamRooms = teamRoomsData.map((room: any) => {
      const lastMsg = messagesByRoom.get(room.id);

      let timestamp = '';
      if (lastMsg) {
        const lastMsgDate = new Date(lastMsg.created_at);
        const now = new Date();
        const diff = now.getTime() - lastMsgDate.getTime();
        if (diff < 24 * 60 * 60 * 1000) {
          timestamp = lastMsgDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        } else {
          timestamp = `${lastMsgDate.getMonth() + 1}/${lastMsgDate.getDate()}`;
        }
      }

      return {
        id: room.id,
        partnerId: room.id,
        partnerName: room.project?.title || 'Team Chat',
        partnerAge: 0,
        partnerImage: room.project?.owner?.image || room.project?.image_url || '',
        lastMessage: lastMsg?.content || 'チームチャットが作成されました',
        unreadCount: unreadCountByRoom.get(room.id) || 0,
        timestamp: timestamp,
        rawTimestamp: lastMsg?.created_at || room.created_at || '1970-01-01T00:00:00.000Z',
        isOnline: false,
        isUnreplied: false,
        type: 'group' as const,
        projectId: room.project_id || room.project?.id,
      };
    });
  }

  // Merge and Sort
  const allRooms = [...individualRooms, ...teamRooms];
  allRooms.sort((a, b) => new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime());

  return allRooms;
}
