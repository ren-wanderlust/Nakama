import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchMessagesPage, Message } from '../api/messages';
import { queryKeys } from '../queryKeys';

interface UseMessagesInfiniteParams {
    roomId: string;
    userId: string;
    isGroup?: boolean;
    enabled?: boolean;
}

export function useMessagesInfinite({
    roomId,
    userId,
    isGroup = false,
    enabled = true,
}: UseMessagesInfiniteParams) {
    const queryClient = useQueryClient();
    const queryKey = queryKeys.messages.list(roomId);

    const query = useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam }) =>
            fetchMessagesPage({
                roomId,
                userId,
                limit: 50,
                cursor: pageParam as string | undefined,
                isGroup,
            }).then(res => {
                console.log('Fetched messages page:', {
                    roomId,
                    cursor: pageParam,
                    count: res.data.length,
                    first: res.data[0]?.created_at,
                    last: res.data[res.data.length - 1]?.created_at
                });
                return res;
            }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled,
        staleTime: Infinity, // Offline-first: Always use cache first, update via Realtime/Background Refetch
        gcTime: 1000 * 60 * 60 * 24, // 24 hours (persist cache)
    });

    // Realtime Subscription
    useEffect(() => {
        if (!enabled || !roomId) return;

        const filter = isGroup
            ? `chat_room_id=eq.${roomId}`
            : `receiver_id=eq.${userId}`; // Listen for messages sent TO me (or I sent, but usually we optimistically update)

        // Note: For individual chats, we might need to listen to sender_id=eq.roomId as well if we want to catch messages from partner.
        // Actually, for individual chat, we want to see messages where (sender=partner AND receiver=me) OR (sender=me AND receiver=partner).
        // Supabase realtime filter is simple.
        // Best approach for individual: Listen to `messages` table where `chat_room_id` is null (if that's how individual chats work) 
        // AND (`sender_id` = partnerId OR `receiver_id` = partnerId).
        // However, Supabase realtime filters are limited.
        // Let's stick to the logic used in ChatRoom.tsx:
        // const filter = isGroup ? `chat_room_id=eq.${partnerId}` : `receiver_id=eq.${userId}`;
        // Wait, `receiver_id=eq.${userId}` only catches incoming messages. What about messages I sent from another device?
        // Ideally we want all messages related to this room.
        // For individual chat, roomId is partnerId.

        const channel = supabase
            .channel(`messages:${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    // Filter logic refinement:
                    // If group: chat_room_id = roomId
                    // If individual: we want messages between me and partner.
                    // Since filter is limited, we can listen to ALL messages involving me, then filter in callback.
                    // Or listen to specific sender/receiver.
                    // Let's use the previous logic but refine the callback filter.
                    filter: isGroup ? `chat_room_id=eq.${roomId}` : undefined,
                },
                async (payload) => {
                    const newMessage = payload.new;

                    // Filter for individual chat relevance
                    if (!isGroup) {
                        const isRelevant =
                            (newMessage.sender_id === userId && newMessage.receiver_id === roomId) ||
                            (newMessage.sender_id === roomId && newMessage.receiver_id === userId);
                        if (!isRelevant) return;
                    }

                    // Fetch sender profile if needed (for name/image)
                    // For optimization, we could just use placeholder or cache, but let's fetch quickly or use existing data.
                    // Actually, we can try to get it from cache or just fetch.
                    let senderName = '';
                    let senderImage = '';

                    if (newMessage.sender_id === userId) {
                        // It's me
                        senderName = 'Me'; // Or get from user context
                    } else {
                        // It's partner or group member
                        const { data } = await supabase.from('profiles').select('name, image').eq('id', newMessage.sender_id).single();
                        senderName = data?.name || '';
                        senderImage = data?.image || '';
                    }

                    const formattedMessage: Message = {
                        id: newMessage.id,
                        text: newMessage.content,
                        image_url: newMessage.image_url,
                        sender: newMessage.sender_id === userId ? 'me' : 'other',
                        senderId: newMessage.sender_id,
                        senderName: senderName,
                        senderImage: senderImage,
                        timestamp: new Date(newMessage.created_at).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                        }),
                        date: new Date(newMessage.created_at).toISOString().split('T')[0],
                        created_at: newMessage.created_at,
                        replyTo: newMessage.reply_to,
                    };

                    // Mark as read if it's an incoming message
                    if (newMessage.sender_id !== userId) {
                        if (!isGroup) {
                            await supabase
                                .from('messages')
                                .update({ is_read: true })
                                .eq('id', newMessage.id)
                                .eq('receiver_id', userId)
                                .eq('is_read', false);
                        } else {
                            await supabase
                                .from('chat_room_read_status')
                                .upsert({
                                    user_id: userId,
                                    chat_room_id: roomId,
                                    last_read_at: new Date().toISOString(),
                                }, {
                                    onConflict: 'user_id,chat_room_id'
                                });
                        }

                        // Invalidate unread counts
                        queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount.detail(userId) });
                    }

                    // Update Cache
                    queryClient.setQueryData(queryKey, (oldData: any) => {
                        if (!oldData || !oldData.pages) return oldData;

                        // Add to the first page (newest)
                        const firstPage = oldData.pages[0];

                        // Check for duplicates
                        const exists = firstPage.data.some((m: Message) => m.id === formattedMessage.id);
                        if (exists) return oldData;

                        const updatedFirstPage = {
                            ...firstPage,
                            data: [formattedMessage, ...firstPage.data],
                        };

                        return {
                            ...oldData,
                            pages: [updatedFirstPage, ...oldData.pages.slice(1)],
                        };
                    });

                    // Also invalidate chat list to update last message/unread
                    queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, userId, isGroup, queryClient, queryKey, enabled]);

    return query;
}
