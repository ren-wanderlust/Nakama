import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { ChatListSkeleton } from './Skeleton';
import { SimpleRefreshControl } from './CustomRefreshControl';
import { RADIUS, COLORS, SPACING, AVATAR, FONTS } from '../constants/DesignSystem';
import { ChatEmptyState, EmptyState } from './EmptyState';
import { useQueryClient } from '@tanstack/react-query';
import { useChatRooms } from '../data/hooks/useChatRooms';
import { queryKeys } from '../data/queryKeys';
import { ChatRoom } from '../data/api/chatRooms';
import { getImageSource } from '../constants/DefaultImages';

interface TalkPageProps {
    onOpenChat?: (room: ChatRoom) => void;
    onViewProfile?: (partnerId: string) => void;
    onViewProject?: (projectId: string) => void;
}

export function TalkPage({ onOpenChat, onViewProfile, onViewProject }: TalkPageProps) {
    const insets = useSafeAreaInsets();
    const [talkTab, setTalkTab] = useState<'individual' | 'team'>('team');
    const talkListRef = useRef<FlatList>(null);
    const [refreshing, setRefreshing] = useState(false);
    const queryClient = useQueryClient();

    // Get current user ID
    const [userId, setUserId] = useState<string | undefined>(undefined);
    useEffect(() => {
        const getUserId = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUserId(user?.id);
        };
        getUserId();
    }, []);

    // React Query hook for chat rooms
    const chatRoomsQuery = useChatRooms(userId);
    const chatRooms: ChatRoom[] = chatRoomsQuery.data || [];
    const loading = chatRoomsQuery.isLoading;

    const onRefresh = async () => {
        setRefreshing(true);
        await chatRoomsQuery.refetch();
        setRefreshing(false);
    };

    useEffect(() => {
        if (!userId) return;

        // Subscribe to new messages
        const messageSubscription = supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
            })
            .subscribe();

        // Subscribe to new likes (matches)
        const likesSubscription = supabase
            .channel('public:likes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'likes' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(messageSubscription);
            supabase.removeChannel(likesSubscription);
        };
    }, [userId, queryClient]);

    // Unread totals
    const teamUnreadTotal = chatRooms
        .filter(room => room.type === 'group')
        .reduce((sum, room) => sum + (room.unreadCount || 0), 0);
    const individualUnreadTotal = chatRooms
        .filter(room => room.type === 'individual')
        .reduce((sum, room) => sum + (room.unreadCount || 0), 0);


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
                                    source={getImageSource(item.partnerImage)}
                                    style={styles.avatar}
                                />
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
                                <Ionicons
                                    name="chevron-forward"
                                    size={20}
                                    color="#9ca3af"
                                    style={styles.chevronIcon}
                                />
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
                                    source={getImageSource(item.partnerImage)}
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
                    <View style={{ width: '100%', paddingTop: insets.top + 16, paddingBottom: 8, alignItems: 'center', backgroundColor: 'white' }}>
                        <View style={styles.tabContainer}>
                            <TouchableOpacity style={[styles.tabButton, styles.tabButtonActive]}>
                                <View style={styles.tabLabelRow}>
                                    <Text style={[styles.tabText, styles.tabTextActive]}>チーム</Text>
                                    {teamUnreadTotal > 0 && (
                                        <View style={styles.tabBadge}>
                                            <Text style={styles.tabBadgeText}>{teamUnreadTotal}</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.tabButton}>
                                <View style={styles.tabLabelRow}>
                                    <Text style={styles.tabText}>個人</Text>
                                    {individualUnreadTotal > 0 && (
                                        <View style={styles.tabBadge}>
                                            <Text style={styles.tabBadgeText}>{individualUnreadTotal}</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>
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
                <View style={{ width: '100%', paddingTop: insets.top + 16, paddingBottom: 8, alignItems: 'center', backgroundColor: 'white' }}>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tabButton, talkTab === 'team' && styles.tabButtonActive]}
                            onPress={() => {
                                setTalkTab('team');
                                talkListRef.current?.scrollToIndex({ index: 0, animated: true });
                            }}
                        >
                            <View style={styles.tabLabelRow}>
                                <Text style={[styles.tabText, talkTab === 'team' && styles.tabTextActive]}>チーム</Text>
                                {teamUnreadTotal > 0 && (
                                    <View style={styles.tabBadge}>
                                        <Text style={styles.tabBadgeText}>{teamUnreadTotal}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabButton, talkTab === 'individual' && styles.tabButtonActive]}
                            onPress={() => {
                                setTalkTab('individual');
                                talkListRef.current?.scrollToIndex({ index: 1, animated: true });
                            }}
                        >
                            <View style={styles.tabLabelRow}>
                                <Text style={[styles.tabText, talkTab === 'individual' && styles.tabTextActive]}>個人</Text>
                                {individualUnreadTotal > 0 && (
                                    <View style={styles.tabBadge}>
                                        <Text style={styles.tabBadgeText}>{individualUnreadTotal}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
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
        backgroundColor: '#FFF3E0',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: 'transparent',
        // paddingTop handled in component
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
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
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    tabButtonActive: {
        backgroundColor: '#F39800',
    },
    tabText: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: '#F39800',
    },
    tabTextActive: {
        color: 'white',
    },
    tabLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tabBadge: {
        backgroundColor: '#FF7F11',
        height: 18,
        minWidth: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    tabBadgeText: {
        color: 'white',
        fontSize: 10,
        fontFamily: FONTS.bold,
    },
    listContent: {
        paddingTop: 8,
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
        fontFamily: FONTS.bold,
        color: '#111827',
    },
    details: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: '#6b7280',
    },
    timestamp: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: '#9ca3af',
    },
    unrepliedBadge: {
        fontSize: 11,
        fontFamily: FONTS.bold,
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
        fontFamily: FONTS.regular,
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
        fontFamily: FONTS.bold,
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
