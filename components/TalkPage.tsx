import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { ChatListSkeleton } from './Skeleton';
import { SimpleRefreshControl } from './CustomRefreshControl';
import { RADIUS, COLORS, SPACING, AVATAR } from '../constants/DesignSystem';
import { ChatEmptyState, EmptyState } from './EmptyState';

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
    isUnreplied: boolean;
    type: 'individual' | 'group';
    rawTimestamp: string;
    projectId?: string;  // For group chats
}

interface TalkPageProps {
    onOpenChat?: (room: ChatRoom) => void;
    onViewProfile?: (partnerId: string) => void;
    onViewProject?: (projectId: string) => void;
}

export function TalkPage({ onOpenChat, onViewProfile, onViewProject }: TalkPageProps) {
    const [talkTab, setTalkTab] = useState<'individual' | 'team'>('team');
    const talkListRef = useRef<FlatList>(null);
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchChatRooms();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchChatRooms();

        // Subscribe to new messages
        const messageSubscription = supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
                fetchChatRooms();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
                fetchChatRooms(); // Handle read status changes
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

        // Polling fallback for reliability (every 5 seconds)
        const pollInterval = setInterval(() => {
            fetchChatRooms();
        }, 5000);

        return () => {
            supabase.removeChannel(messageSubscription);
            supabase.removeChannel(likesSubscription);
            clearInterval(pollInterval);
        };
    }, []);

    const fetchChatRooms = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // --- Individual Chats (Existing Logic) ---
            const { data: myLikes } = await supabase.from('likes').select('receiver_id').eq('sender_id', user.id);
            const { data: receivedLikes } = await supabase.from('likes').select('sender_id').eq('receiver_id', user.id);
            const myLikedIds = new Set(myLikes?.map(l => l.receiver_id) || []);
            const matchedIds = new Set<string>();
            receivedLikes?.forEach(l => {
                if (myLikedIds.has(l.sender_id)) matchedIds.add(l.sender_id);
            });

            const { data: messages, error: messagesError } = await supabase
                .from('messages')
                .select('*')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (messagesError) throw messagesError;

            const individualRoomsMap = new Map<string, any>();
            if (messages) {
                for (const msg of messages) {
                    if (msg.chat_room_id) continue; // Skip group messages for individual list

                    const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
                    if (matchedIds.has(partnerId)) {
                        if (!individualRoomsMap.has(partnerId)) {
                            individualRoomsMap.set(partnerId, {
                                lastMessage: msg.content,
                                timestamp: msg.created_at,
                                unreadCount: 0,
                                lastSenderId: msg.sender_id,
                                type: 'individual'
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
                        type: 'individual'
                    });
                }
            });

            // Fetch unread counts per individual chat
            // Count messages sent TO me that are not read
            const { data: unreadData } = await supabase
                .from('messages')
                .select('sender_id')
                .eq('receiver_id', user.id)
                .or('is_read.is.null,is_read.eq.false');

            const unreadMap = new Map<string, number>();
            unreadData?.forEach((m: any) => {
                unreadMap.set(m.sender_id, (unreadMap.get(m.sender_id) || 0) + 1);
            });

            const partnerIds = Array.from(individualRoomsMap.keys());
            let individualRooms: ChatRoom[] = [];

            if (partnerIds.length > 0) {
                const { data: profiles } = await supabase.from('profiles').select('*').in('id', partnerIds);
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
                        partnerLocation: partnerProfile?.location || '',
                        partnerImage: partnerProfile?.image || 'https://via.placeholder.com/150',
                        lastMessage: roomData.lastMessage,
                        unreadCount: unreadMap.get(partnerId) || 0,
                        timestamp: timestamp,
                        rawTimestamp: roomData.timestamp,
                        isOnline: false,
                        isUnreplied: roomData.lastSenderId === partnerId,
                        type: 'individual'
                    };
                });
            }

            // --- Team Chats (New Logic) ---
            const { data: teamRoomsData } = await supabase
                .from('chat_rooms')
                .select(`
                    id,
                    project_id,
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
            if (teamRoomsData) {
                const teamRoomPromises = teamRoomsData.map(async (room: any) => {
                    // Fetch last message for this room
                    const { data: msgs } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('chat_room_id', room.id)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    const lastMsg = msgs?.[0];
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

                    // Get unread count (messages from others after lastReadTime)
                    const { data: readStatus } = await supabase
                        .from('chat_room_read_status')
                        .select('last_read_at')
                        .eq('user_id', user.id)
                        .eq('chat_room_id', room.id)
                        .single();
                    
                    const lastReadTime = readStatus?.last_read_at || '1970-01-01';
                    const { count: unreadCount } = await supabase
                        .from('messages')
                        .select('id', { count: 'exact', head: true })
                        .eq('chat_room_id', room.id)
                        .gt('created_at', lastReadTime)
                        .neq('sender_id', user.id);

                    return {
                        id: room.id,
                        partnerId: room.id, // Use room ID as partnerId for group
                        partnerName: room.project?.title || 'Team Chat',
                        partnerAge: 0,
                        partnerLocation: '',
                        partnerImage: room.project?.owner?.image || room.project?.image_url || 'https://via.placeholder.com/150',
                        lastMessage: lastMsg?.content || 'チームチャットが作成されました',
                        unreadCount: unreadCount || 0,
                        timestamp: timestamp,
                        rawTimestamp: lastMsg?.created_at || room.created_at || '1970-01-01T00:00:00.000Z', // Fallback to old for empty rooms
                        isOnline: false,
                        isUnreplied: false,
                        type: 'group' as const,
                        projectId: room.project_id || room.project?.id,
                    };
                });

                teamRooms = await Promise.all(teamRoomPromises);
            }

            // Merge and Sort
            const allRooms = [...individualRooms, ...teamRooms];
            allRooms.sort((a, b) => new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime());

            setChatRooms(allRooms);

        } catch (error) {
            console.error('Error fetching chat rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderIndividualList = () => {
        const individualRooms = chatRooms.filter(r => r.type === 'individual');
        if (individualRooms.length > 0) {
            return (
                <FlatList
                    data={individualRooms}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.roomItem}
                            onPress={() => onOpenChat?.(item)}
                            activeOpacity={0.7}
                        >
                            {/* Avatar - Tappable for profile */}
                            <TouchableOpacity
                                style={styles.avatarContainer}
                                onPress={() => onViewProfile?.(item.partnerId)}
                                activeOpacity={0.7}
                            >
                                <Image
                                    source={{ uri: item.partnerImage }}
                                    style={styles.avatar}
                                />
                            </TouchableOpacity>

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
                                </View>
                            </View>

                            {item.unreadCount > 0 ? (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                                </View>
                            ) : (
                                <Ionicons name="chevron-forward" size={20} color="#9ca3af" style={styles.chevronIcon} />
                            )}
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <SimpleRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            );
        } else {
            return <ChatEmptyState />;
        }
    };

    const renderTeamList = () => {
        const teamRooms = chatRooms.filter(r => r.type === 'group');

        if (teamRooms.length > 0) {
            return (
                <FlatList
                    data={teamRooms}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.roomItem}
                            onPress={() => onOpenChat?.(item)}
                            activeOpacity={0.7}
                        >
                            {/* Avatar - Tappable for project detail */}
                            <TouchableOpacity
                                style={styles.avatarContainer}
                                onPress={() => item.projectId && onViewProject?.(item.projectId)}
                                activeOpacity={0.7}
                            >
                                <Image
                                    source={{ uri: item.partnerImage }}
                                    style={styles.avatar}
                                />
                                <View style={styles.groupBadgeOverlay}>
                                    <Ionicons name="people" size={12} color="white" />
                                </View>
                            </TouchableOpacity>

                            {/* Content */}
                            <View style={styles.content}>
                                <View style={styles.topRow}>
                                    <View style={styles.nameContainer}>
                                        <Text style={styles.name}>{item.partnerName}</Text>
                                    </View>
                                    <Text style={styles.timestamp}>{item.timestamp}</Text>
                                </View>

                                <View style={styles.messageRow}>
                                    <Text style={styles.lastMessage} numberOfLines={1}>
                                        {item.lastMessage}
                                    </Text>
                                </View>
                            </View>

                            {item.unreadCount > 0 ? (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                                </View>
                            ) : (
                                <Ionicons name="chevron-forward" size={20} color="#9ca3af" style={styles.chevronIcon} />
                            )}
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <SimpleRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            );
        } else {
            return (
                <EmptyState
                    variant="chat"
                    icon="people-outline"
                    title="まだチームチャットがありません"
                    description="2人以上のメンバーが承認されると、自動的にチームチャットが作成されます"
                />
            );
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity style={[styles.tabButton, styles.tabButtonActive]}>
                            <Text style={[styles.tabText, styles.tabTextActive]}>チーム</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tabButton}>
                            <Text style={styles.tabText}>個人</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <ChatListSkeleton count={6} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, talkTab === 'team' && styles.tabButtonActive]}
                        onPress={() => {
                            setTalkTab('team');
                            talkListRef.current?.scrollToIndex({ index: 0, animated: true });
                        }}
                    >
                        <Text style={[styles.tabText, talkTab === 'team' && styles.tabTextActive]}>チーム</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, talkTab === 'individual' && styles.tabButtonActive]}
                        onPress={() => {
                            setTalkTab('individual');
                            talkListRef.current?.scrollToIndex({ index: 1, animated: true });
                        }}
                    >
                        <Text style={[styles.tabText, talkTab === 'individual' && styles.tabTextActive]}>個人</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            <FlatList
                ref={talkListRef}
                data={['team', 'individual']}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                    setTalkTab(index === 0 ? 'team' : 'individual');
                }}
                getItemLayout={(data, index) => (
                    { length: Dimensions.get('window').width, offset: Dimensions.get('window').width * index, index }
                )}
                initialScrollIndex={0}
                renderItem={({ item }) => (
                    <View style={{ width: Dimensions.get('window').width, flex: 1 }}>
                        {item === 'team' ? renderTeamList() : renderIndividualList()}
                    </View>
                )}
            />
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
        paddingBottom: 0, // Adjusted for tabs
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabButtonActive: {
        borderBottomColor: '#FF5252',
    },
    tabText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#9CA3AF',
    },
    tabTextActive: {
        color: '#FF5252',
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
        marginRight: SPACING.md,
    },
    avatar: {
        width: AVATAR.xl.size - 8,
        height: AVATAR.xl.size - 8,
        borderRadius: (AVATAR.xl.size - 8) / 2,
        backgroundColor: COLORS.background.tertiary,
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
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        flex: 1,
    },
    rightInfo: {
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        gap: 6,
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
    unrepliedBadge: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#FF5252',
        marginTop: 4,
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
        backgroundColor: '#009688', // Brand color (Green)
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        alignSelf: 'flex-end',
        marginBottom: 4,
    },
    chevronIcon: {
        alignSelf: 'flex-end',
        marginBottom: 4,
    },
    unreadText: {
        color: 'white',
        fontSize: 12,
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
    groupBadgeOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#009688', // Brand color
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
    },
});
