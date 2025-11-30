import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface ChatRoom {
    id: string;
    partnerId: string;
    partnerName: string;
    partnerAge: number;
    partnerLocation: string;
    partnerImage: string;
    lastMessage: string;
    unreadCount: number;
    timestamp: string;
    isOnline?: boolean;
}

interface TalkPageProps {
    onOpenChat?: (room: ChatRoom) => void;
}

export function TalkPage({ onOpenChat }: TalkPageProps) {
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChatRooms();

        // Subscribe to new messages
        const messageSubscription = supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
                fetchChatRooms();
            })
            .subscribe();

        // Subscribe to new likes (matches)
        const likesSubscription = supabase
            .channel('public:likes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, () => {
                fetchChatRooms();
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'likes' }, () => {
                fetchChatRooms(); // Handle unmatch
            })
            .subscribe();

        return () => {
            supabase.removeChannel(messageSubscription);
            supabase.removeChannel(likesSubscription);
        };
    }, []);

    const fetchChatRooms = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch matches (mutual likes)
            const { data: myLikes } = await supabase
                .from('likes')
                .select('receiver_id')
                .eq('sender_id', user.id);

            const { data: receivedLikes } = await supabase
                .from('likes')
                .select('sender_id')
                .eq('receiver_id', user.id);

            const myLikedIds = new Set(myLikes?.map(l => l.receiver_id) || []);
            const matchedIds = new Set<string>();

            receivedLikes?.forEach(l => {
                if (myLikedIds.has(l.sender_id)) {
                    matchedIds.add(l.sender_id);
                }
            });

            // 2. Fetch messages
            const { data: messages, error: messagesError } = await supabase
                .from('messages')
                .select('*')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (messagesError) throw messagesError;

            // Group messages by partner
            const roomsMap = new Map<string, any>();
            if (messages) {
                for (const msg of messages) {
                    const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

                    // Only show chat if currently matched
                    if (matchedIds.has(partnerId)) {
                        if (!roomsMap.has(partnerId)) {
                            roomsMap.set(partnerId, {
                                lastMessage: msg.content,
                                timestamp: msg.created_at,
                                unreadCount: 0
                            });
                        }
                    }
                }
            }

            // Add matched users who don't have messages yet
            matchedIds.forEach(partnerId => {
                if (!roomsMap.has(partnerId)) {
                    roomsMap.set(partnerId, {
                        lastMessage: 'マッチングしました！メッセージを送ってみましょう',
                        timestamp: new Date().toISOString(),
                        unreadCount: 0,
                        isNewMatch: true
                    });
                }
            });

            // Fetch partner profiles
            const partnerIds = Array.from(roomsMap.keys());
            if (partnerIds.length === 0) {
                setChatRooms([]);
                setLoading(false);
                return;
            }

            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .in('id', partnerIds);

            if (profilesError) throw profilesError;

            // Combine data
            const formattedRooms: ChatRoom[] = partnerIds.map(partnerId => {
                const partnerProfile = profiles?.find(p => p.id === partnerId);
                const roomData = roomsMap.get(partnerId);
                const lastMsgDate = new Date(roomData.timestamp);

                // Format timestamp
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
                    partnerLocation: partnerProfile?.location || '',
                    partnerImage: partnerProfile?.image || 'https://via.placeholder.com/150',
                    lastMessage: roomData.lastMessage,
                    unreadCount: roomData.unreadCount,
                    timestamp: timestamp,
                    isOnline: false,
                };
            });

            // Sort by timestamp descending
            formattedRooms.sort((a, b) => {
                const timeA = new Date(roomsMap.get(a.partnerId).timestamp).getTime();
                const timeB = new Date(roomsMap.get(b.partnerId).timestamp).getTime();
                return timeB - timeA;
            });

            setChatRooms(formattedRooms);
        } catch (error) {
            console.error('Error fetching chat rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#009688" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>トーク</Text>
            </View>

            {/* Chat Rooms List */}
            {chatRooms.length > 0 ? (
                <FlatList
                    data={chatRooms}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.roomItem}
                            onPress={() => onOpenChat?.(item)}
                            activeOpacity={0.7}
                        >
                            {/* Avatar */}
                            <View style={styles.avatarContainer}>
                                <Image
                                    source={{ uri: item.partnerImage }}
                                    style={styles.avatar}
                                />
                            </View>

                            {/* Content */}
                            <View style={styles.content}>
                                <View style={styles.topRow}>
                                    <View style={styles.nameContainer}>
                                        <Text style={styles.name}>{item.partnerName}</Text>
                                        <Text style={styles.details}>
                                            {item.partnerAge}歳 · {item.partnerLocation}
                                        </Text>
                                    </View>
                                    <Text style={styles.timestamp}>{item.timestamp}</Text>
                                </View>

                                <View style={styles.messageRow}>
                                    <Text style={styles.lastMessage} numberOfLines={1}>
                                        {item.lastMessage}
                                    </Text>
                                    {item.unreadCount > 0 ? (
                                        <View style={styles.unreadBadge}>
                                            <Text style={styles.unreadText}>{item.unreadCount}</Text>
                                        </View>
                                    ) : (
                                        <Ionicons name="checkmark-done" size={16} color="#14b8a6" />
                                    )}
                                </View>
                            </View>

                            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.listContent}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyText}>まだトークがありません</Text>
                    <Text style={styles.emptySubText}>
                        マッチングした相手とメッセージを始めましょう！
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: 'white',
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    listContent: {
        paddingBottom: 20,
    },
    roomItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#e5e7eb',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#22c55e', // green-500
        borderWidth: 2,
        borderColor: 'white',
    },
    content: {
        flex: 1,
        marginRight: 8,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 4,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    details: {
        fontSize: 12,
        color: '#6b7280',
    },
    timestamp: {
        fontSize: 12,
        color: '#9ca3af',
    },
    messageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        flex: 1,
        fontSize: 14,
        color: '#4b5563',
        marginRight: 8,
    },
    unreadBadge: {
        backgroundColor: '#f97316', // orange-500
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 16,
        marginBottom: 4,
    },
    emptySubText: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
    },
});
