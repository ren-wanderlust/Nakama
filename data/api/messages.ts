import { supabase } from '../../lib/supabase';
import { isSystemMessageText, stripSystemPrefix } from '../../constants/SystemMessage';

export interface Message {
    id: string;
    text: string;
    image_url?: string;
    sender: 'me' | 'other';
    senderId?: string;
    senderName?: string;
    senderImage?: string;
    isSystem?: boolean;
    timestamp: string;
    date: string;
    created_at: string;
    replyTo?: {
        id: string;
        text: string;
        senderName: string;
        image_url?: string | null;
    };
}

interface FetchMessagesParams {
    roomId: string; // partnerId for individual, chatRoomId for group
    userId: string;
    limit?: number;
    cursor?: string; // created_at timestamp for pagination
    isGroup?: boolean;
}

interface FetchMessagesResult {
    data: Message[];
    nextCursor: string | null;
}

export async function fetchMessagesPage({
    roomId,
    userId,
    limit = 50,
    cursor,
    isGroup = false,
}: FetchMessagesParams): Promise<FetchMessagesResult> {
    try {
        let query = supabase
            .from('messages')
            .select('id, content, image_url, sender_id, receiver_id, chat_room_id, created_at, reply_to')
            .order('created_at', { ascending: false }) // Newest first
            .limit(limit);

        if (isGroup) {
            query = query.eq('chat_room_id', roomId);
        } else {
            // For individual chats, check both sender/receiver combinations
            query = query.or(`and(sender_id.eq.${userId},receiver_id.eq.${roomId}),and(sender_id.eq.${roomId},receiver_id.eq.${userId})`);
        }

        if (cursor) {
            query = query.lt('created_at', cursor); // Fetch older messages
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!data || data.length === 0) {
            return { data: [], nextCursor: null };
        }

        // Manually fetch sender profiles to avoid join issues (same logic as before)
        const senderIds = Array.from(new Set(data.map((m: any) => m.sender_id)));
        let profileMap = new Map<string, { name: string; image: string }>();

        if (senderIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, image')
                .in('id', senderIds);

            profiles?.forEach((p: any) => {
                profileMap.set(p.id, { name: p.name, image: p.image });
            });
        }

        const formattedMessages: Message[] = data.map((msg: any) => ({
            id: msg.id,
            text: isSystemMessageText(msg.content) ? stripSystemPrefix(msg.content) : msg.content,
            image_url: msg.image_url,
            sender: isSystemMessageText(msg.content) ? 'other' : (msg.sender_id === userId ? 'me' : 'other'),
            senderId: msg.sender_id,
            senderName: profileMap.get(msg.sender_id)?.name,
            senderImage: profileMap.get(msg.sender_id)?.image,
            isSystem: isSystemMessageText(msg.content),
            timestamp: new Date(msg.created_at).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
            }),
            date: new Date(msg.created_at).toISOString().split('T')[0],
            created_at: msg.created_at,
            replyTo: msg.reply_to,
        }));

        // Determine next cursor
        const nextCursor = data.length === limit ? data[data.length - 1].created_at : null;

        return {
            data: formattedMessages,
            nextCursor,
        };
    } catch (error: any) {
        console.error('Error fetching messages page:', error);
        throw error;
    }
}
