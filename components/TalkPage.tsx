import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { ChatListSkeleton } from './Skeleton';
import { SimpleRefreshControl } from './CustomRefreshControl';
import { COLORS, SPACING, FONTS, SHADOWS } from '../constants/DesignSystem';
import { EmptyState } from './EmptyState';
import { useQueryClient } from '@tanstack/react-query';
import { useChatRooms } from '../data/hooks/useChatRooms';
import { useMyProjects, useParticipatingProjects } from '../data/hooks/useMyProjects';
import { useProjectMembers } from '../data/hooks/useProjectMembers';
import { queryKeys } from '../data/queryKeys';
import { ChatRoom } from '../data/api/chatRooms';
import { getImageSource } from '../constants/DefaultImages';
import { useAuth } from '../contexts/AuthContext';

// 探すページと同じ「カバー画像未設定時の色」ロジック
const PROJECT_COVER_FALLBACK_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
// オーナータグ内の画像は表示しない（要件）

interface TalkPageProps {
    onOpenChat?: (room: ChatRoom) => void;
    onViewProfile?: (partnerId: string) => void;
    onViewProject?: (projectId: string) => void;
    onOpenNotifications?: () => void;
    unreadNotificationsCount?: number;
    hideHeader?: boolean;
}

export function TalkPage({ onOpenChat, onViewProfile, onViewProject, onOpenNotifications, unreadNotificationsCount = 0, hideHeader = false }: TalkPageProps) {
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const queryClient = useQueryClient();

    // Get current user ID from auth context (synchronous)
    const { session } = useAuth();
    const userId = session?.user?.id;

    // React Query hook for chat rooms
    const chatRoomsQuery = useChatRooms(userId);
    const chatRooms: ChatRoom[] = chatRoomsQuery.data || [];
    const myProjectsQuery = useMyProjects(userId);
    const participatingProjectsQuery = useParticipatingProjects(userId);

    const baseLoading =
        chatRoomsQuery.isLoading ||
        myProjectsQuery.isLoading ||
        participatingProjectsQuery.isLoading;

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            chatRoomsQuery.refetch(),
            myProjectsQuery.refetch(),
            participatingProjectsQuery.refetch(),
        ]);
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

        // Subscribe to chat_rooms changes (team chat creation/updates)
        const chatRoomsSubscription = supabase
            .channel('public:chat_rooms')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_rooms' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_rooms' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
            })
            .subscribe();

        // Subscribe to project participation changes (approved members)
        const projectApplicationsSubscription = supabase
            .channel('public:project_applications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'project_applications' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.participatingProjects.detail(userId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers.all });
            })
            .subscribe();

        // Subscribe to projects updates (title/image changes reflect on dashboard)
        const projectsSubscription = supabase
            .channel('public:projects')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.myProjects.detail(userId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.participatingProjects.detail(userId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(userId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers.all });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(messageSubscription);
            supabase.removeChannel(likesSubscription);
            supabase.removeChannel(chatRoomsSubscription);
            supabase.removeChannel(projectApplicationsSubscription);
            supabase.removeChannel(projectsSubscription);
        };
    }, [userId, queryClient]);

    // Unread totals
    const teamUnreadTotal = chatRooms
        .filter(room => room.type === 'group')
        .reduce((sum, room) => sum + (room.unreadCount || 0), 0);
    const individualUnreadTotal = chatRooms
        .filter(room => room.type === 'individual')
        .reduce((sum, room) => sum + (room.unreadCount || 0), 0);

    const dashboardItems = useMemo(() => {
        const myProjects = myProjectsQuery.data || [];
        const participating = participatingProjectsQuery.data || [];

        // 参加中プロジェクト = 自分の作成 + 承認参加（重複除去）
        const projectMap = new Map<string, any>();
        [...participating, ...myProjects].forEach((p: any) => {
            if (!p?.id) return;
            projectMap.set(p.id, p);
        });
        const projects = Array.from(projectMap.values());

        const teamRooms = chatRooms.filter(r => r.type === 'group');
        const roomByProjectId = new Map<string, ChatRoom>();
        teamRooms.forEach((r) => {
            if (r.projectId) roomByProjectId.set(r.projectId, r);
        });

        const items = projects.map((project) => ({
            project,
            room: roomByProjectId.get(project.id),
        }));

        // 最新メッセージ順（無い場合はプロジェクト作成日）
        items.sort((a, b) => {
            const aTime = a.room?.rawTimestamp || a.project?.created_at || '1970-01-01T00:00:00.000Z';
            const bTime = b.room?.rawTimestamp || b.project?.created_at || '1970-01-01T00:00:00.000Z';
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        return items;
    }, [myProjectsQuery.data, participatingProjectsQuery.data, chatRooms]);

    const dashboardProjectIds = useMemo(
        () => dashboardItems.map((x) => x.project?.id).filter((id): id is string => !!id),
        [dashboardItems]
    );

    const projectMembersQuery = useProjectMembers(dashboardProjectIds);
    const projectMembersMap = projectMembersQuery.data || {};
    const loading = baseLoading || projectMembersQuery.isLoading;

    const renderProjectDashboard = () => {
        const filteredDashboardItems = dashboardItems.filter((it) => {
            const members = projectMembersMap[it.project.id] || [];
            // owner + approved の合計が2人以上のものだけ表示
            return members.length >= 2;
        });

        if (filteredDashboardItems.length === 0) {
            return (
                <EmptyState
                    variant="chat"
                    icon="grid-outline"
                    title="まだチームがありません"
                    description="メンバーが2人以上になると、ここにプロジェクトダッシュボードが表示されます"
                />
            );
        }

        return (
            <FlatList
                data={filteredDashboardItems}
                keyExtractor={(item) => item.project.id}
                renderItem={({ item, index }) => {
                    const project = item.project;
                    const room = item.room;

                    const senderName = room?.lastSenderName || 'システム';
                    const senderImage = room?.lastSenderImage || '';
                    const lastMessage = room?.lastMessage || 'まだメッセージがありません';
                    const timestamp = room?.timestamp || '';
                    const unreadCount = room?.unreadCount || 0;
                    const coverImage = (project as any)?.cover_image as string | null | undefined;
                    const fallbackColor = PROJECT_COVER_FALLBACK_COLORS[index % PROJECT_COVER_FALLBACK_COLORS.length];
                    const themeTag = (project as any)?.tags?.[0] as string | undefined;
                    const members = projectMembersMap[project.id] || [];
                    const maxMembersToShow = 5;
                    const shownMembers = members.slice(0, maxMembersToShow);
                    const remainingCount = members.length - shownMembers.length;
                    const isSystemMessage = !room?.lastSenderId && !room?.lastSenderImage && !room?.lastSenderName;
                    const isOwner = !!userId && (project as any)?.owner_id === userId;

                    const openChatOrProject = () => {
                        if (room) {
                            onOpenChat?.(room);
                        } else {
                            onViewProject?.(project.id);
                        }
                    };

                    return (
                        <TouchableOpacity
                            style={styles.projectCard}
                            onPress={openChatOrProject}
                            activeOpacity={0.88}
                        >
                            {/* 上段: さがすページのカードサイズ（左: cover / 右: タイトル・テーマ・詳細のみ） */}
                            <View style={styles.projectTopSection}>
                                <View style={[styles.projectCardThumbnail, !coverImage && { backgroundColor: fallbackColor }]}>
                                    {coverImage ? (
                                        <Image source={{ uri: coverImage }} style={styles.projectCardThumbnailImage} resizeMode="cover" />
                                    ) : (
                                        <Ionicons name="image-outline" size={36} color="rgba(255,255,255,0.5)" />
                                    )}
                                </View>

                                <View style={styles.projectTopRight}>
                                    <View style={styles.projectTopUpper}>
                                        <Text style={styles.projectTitle} numberOfLines={2}>
                                            {project.title}
                                        </Text>

                                        <View style={styles.memberRow}>
                                            {shownMembers.map((m, i) => (
                                                <Image
                                                    key={`${project.id}:${m.id}`}
                                                    source={getImageSource(m.image)}
                                                    style={[styles.memberAvatar, i !== 0 && styles.memberAvatarOverlap]}
                                                />
                                            ))}
                                            {remainingCount > 0 && (
                                                <View style={[styles.memberMoreBadge, shownMembers.length > 0 && styles.memberAvatarOverlap]}>
                                                    <Text style={styles.memberMoreText}>{`+${remainingCount}`}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    <View style={styles.projectTopBottomRow}>
                                        <View style={styles.projectThemeSlot}>
                                            <View style={styles.projectTagRow}>
                                                {!!themeTag && (
                                                    <View style={styles.projectThemeTag}>
                                                        <Text style={styles.projectThemeTagText}>{themeTag}</Text>
                                                    </View>
                                                )}
                                                {isOwner && (
                                                    <View style={styles.projectOwnerTag}>
                                                        <Text style={styles.projectOwnerTagText}>オーナー</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.detailButton}
                                            onPress={() => onViewProject?.(project.id)}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.detailButtonText}>詳細</Text>
                                            <Ionicons name="chevron-forward" size={14} color="#F39800" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            {/* 下段: チャットUI（カード全幅。メンバーボタンは未実装） */}
                            <View style={styles.projectBottomSection}>
                                <View style={styles.chatRow}>
                                    <View style={styles.chatLeftGroup}>
                                        {isSystemMessage ? (
                                            <View style={styles.systemMessageRow}>
                                                <Text style={styles.lastMessage} numberOfLines={1}>
                                                    {lastMessage}
                                                </Text>
                                                <Text style={styles.timestamp}>{timestamp}</Text>
                                            </View>
                                        ) : (
                                            <>
                                                <Image source={getImageSource(senderImage)} style={styles.senderAvatar} />

                                                <View style={styles.chatContent}>
                                                    <View style={styles.chatTopRow}>
                                                        <Text style={styles.senderName} numberOfLines={1}>
                                                            {senderName}
                                                        </Text>
                                                        <Text style={styles.timestamp}>{timestamp}</Text>
                                                    </View>

                                                    <Text style={styles.lastMessage} numberOfLines={1}>
                                                        {lastMessage}
                                                    </Text>
                                                </View>
                                            </>
                                        )}
                                    </View>

                                    <View style={styles.chatRightAccessory}>
                                        {unreadCount > 0 ? (
                                            <View style={styles.unreadBadge}>
                                                <Text style={styles.unreadText}>{unreadCount}</Text>
                                            </View>
                                        ) : (
                                            <Ionicons name="chevron-forward" size={20} color="#9ca3af" style={styles.chevronIcon} />
                                        )}
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={[
                    styles.listContent,
                    // BottomNav（absolute）に隠れないように十分な下余白を確保
                    { paddingBottom: 120 + Math.max(insets.bottom, 0) },
                ]}
                refreshControl={<SimpleRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
        );
    };

    // Header is now rendered in App.tsx to avoid animation
    const renderHeader = () => null;

    if (loading) {
        return (
            <View style={styles.container}>
                {/* シンプルなヘッダー - チームのみ表示 */}
                {renderHeader()}
                <ChatListSkeleton count={6} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* シンプルなヘッダー - チームのみ表示（個人タブは非表示） */}
            {renderHeader()}

            {/* チームチャットのみ表示 */}
            {renderProjectDashboard()}

            {/* 個人タブは将来的な復活のためにコメントで残す
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
            */}
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
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 10,
    },
    headerGradient: {
        // padding handled in component
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    headerLeft: {
        width: 44,
    },
    headerRight: {
        width: 44,
        alignItems: 'flex-end',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#F39800',
        fontFamily: FONTS.bold,
    },
    notificationButton: {
        padding: 4,
        marginRight: -8,
    },
    notificationBadgeDot: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EF4444',
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
        height: 22, // テキストの高さに合わせて固定（未読アイコンの有無に関わらず一定）
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
        padding: 16,
        paddingTop: 8,
        paddingBottom: 20,
        // gap は使わず、カード側の marginBottom で揃える（探すページと同じ）
    },
    // 探すページ（UserProjectPage）の cardNew と同サイズ感に揃える
    projectCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    projectTopSection: {
        flexDirection: 'row',
        height: 108, // 上段の縦幅を約0.9倍（120 * 0.9）
    },
    projectCardThumbnail: {
        width: 108,
        height: 108,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background.tertiary,
    },
    projectCardThumbnailImage: {
        width: '100%',
        height: '100%',
    },
    projectTopRight: {
        flex: 1,
        padding: 12,
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        gap: 10,
    },
    projectTopUpper: {
        flex: 1,
        gap: 8,
        minHeight: 0,
    },
    projectTitle: {
        fontSize: 15,
        fontFamily: FONTS.bold,
        color: '#111827',
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 2,
        minHeight: 22,
    },
    memberAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.background.tertiary,
        borderWidth: 1.5,
        borderColor: 'white',
    },
    memberAvatarOverlap: {
        marginLeft: -6,
    },
    memberMoreBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
    },
    memberMoreText: {
        fontSize: 10,
        fontFamily: FONTS.bold,
        color: '#6B7280',
    },
    projectTopBottomRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 10,
    },
    projectThemeSlot: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
    },
    projectTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'nowrap',
    },
    projectThemeTag: {
        alignSelf: 'flex-start',
        backgroundColor: '#3B82F6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    projectThemeTagText: {
        fontSize: 10,
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
    },
    // 「詳細」ボタンと同系（枠線/白背景/オレンジ文字）だが、themeタグと同サイズ
    projectOwnerTag: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        backgroundColor: '#F39800',
    },
    projectOwnerTagText: {
        fontSize: 10,
        fontFamily: FONTS.semiBold,
        color: 'white',
    },
    detailButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F39800',
        backgroundColor: 'white',
    },
    detailButtonText: {
        fontSize: 12,
        fontFamily: FONTS.bold,
        color: '#F39800',
    },
    projectBottomSection: {
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 7, // 下段（チャットUI）の縦幅のみ少し縮める
    },
    chatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chatLeftGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginLeft: 6, // 下段のアイコン/ユーザー名/メッセージを僅かに右へ
        flex: 1,
        paddingRight: 8,
    },
    chatRightAccessory: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    systemMessageRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 2, // 通常のテキスト位置とバランスを揃える
    },
    senderAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: COLORS.background.tertiary,
    },
    chatContent: {
        flex: 1,
        marginRight: 6,
        paddingTop: 2, // スクショのようにテキストが僅かに下がるバランスに
        // 縦の中央揃えはしない（自然な上詰め）
        justifyContent: 'flex-start',
    },
    chatTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 1,
        gap: 10,
    },
    senderName: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        fontFamily: FONTS.bold,
        color: '#111827',
    },
    timestamp: {
        fontSize: 10,
        fontFamily: FONTS.regular,
        color: '#9ca3af',
    },
    lastMessage: {
        flex: 1,
        fontSize: 12,
        lineHeight: 16,
        fontFamily: FONTS.regular,
        color: '#4b5563',
        marginRight: 8,
    },
    unreadBadge: {
        backgroundColor: '#009688', // Brand color (Green)
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        marginLeft: 8,
    },
    chevronIcon: {
        marginLeft: 8,
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
});
