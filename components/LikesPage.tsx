import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image, Dimensions, Alert, Modal, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Profile } from '../types';
import { mapProfileRowToProfile } from '../utils/profileMapper';
import { ProfileCard } from './ProfileCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useReceivedLikes } from '../data/hooks/useReceivedLikes';
import { useProjectApplications } from '../data/hooks/useProjectApplications';
import { useMyProjects } from '../data/hooks/useMyProjects';
import { queryKeys } from '../data/queryKeys';
import { ProfileListSkeleton, ProjectListSkeleton } from './Skeleton';
import { LikesEmptyState, ApplicantsEmptyState, ApplicationsEmptyState } from './EmptyState';
import { translateTag } from '../constants/TagConstants';
import { FONTS } from '../constants/DesignSystem';
import { ProjectDetail } from './ProjectDetail';
import { getImageSource } from '../constants/DefaultImages';
import { getUserPushTokens, sendPushNotification } from '../lib/notifications';
import { ProjectSelectModal, SimpleProject } from './ProjectSelectModal';

// Project型とApplication型はdata/apiからインポート
import { Application } from '../data/api/applications';
import { Project as MyProject } from '../data/api/myProjects';

interface LikesPageProps {
    likedProfileIds: Set<string>;
    allProfiles: Profile[];
    onProfileSelect: (profile: Profile) => void;
    onLike: (profileId: string) => void;
    onOpenNotifications?: () => void;
    unreadNotificationsCount?: number;
    onApplicantStatusChange?: () => void;
}

export function LikesPage({ likedProfileIds, allProfiles, onProfileSelect, onLike, onOpenNotifications, unreadNotificationsCount = 0, onApplicantStatusChange }: LikesPageProps) {
    const { session } = useAuth();
    const insets = useSafeAreaInsets();

    // Top level tab: Project or User
    const [mainTab, setMainTab] = useState<'project' | 'user'>('project');

    // User sub-tabs
    const [userTab, setUserTab] = useState<'received' | 'sent' | 'matched'>('received');

    // Project sub-tabs
    const [projectTab, setProjectTab] = useState<'recruiting' | 'applied'>('recruiting');

    // Applied applications sort/filter
    const [appliedFilter, setAppliedFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');

    // Selected project for detail view
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
    const queryClient = useQueryClient();

    const userListRef = useRef<FlatList>(null);
    const projectListRef = useRef<FlatList>(null);

    // Refresh state
    const [refreshing, setRefreshing] = useState(false);

    // Recruiting filter (project-based)
    const [isRecruitingFilterOpen, setIsRecruitingFilterOpen] = useState(false);
    const [selectedRecruitingProjectId, setSelectedRecruitingProjectId] = useState<string | null>(null);

    // React Query hooks
    const receivedLikesQuery = useReceivedLikes(session?.user?.id);
    const projectApplicationsQuery = useProjectApplications(session?.user?.id);
    const myProjectsQuery = useMyProjects(session?.user?.id);

    // User data from React Query
    const receivedLikes: Profile[] = receivedLikesQuery.data?.profiles || [];
    // AsyncStorageから復元されたSetは通常のオブジェクトになる可能性があるため、instanceofチェックを追加
    const unreadInterestIds: Set<string> = (receivedLikesQuery.data?.unreadInterestIds instanceof Set)
        ? receivedLikesQuery.data.unreadInterestIds
        : new Set();
    const unreadMatchIds: Set<string> = (receivedLikesQuery.data?.unreadMatchIds instanceof Set)
        ? receivedLikesQuery.data.unreadMatchIds
        : new Set();
    const loadingUser = receivedLikesQuery.isLoading;

    // Project data from React Query
    const recruitingApplications: Application[] = projectApplicationsQuery.data?.recruiting || [];
    const appliedApplications: Application[] = projectApplicationsQuery.data?.applied || [];
    // AsyncStorageから復元されたSetは通常のオブジェクトになる可能性があるため、instanceofチェックを追加
    const unreadRecruitingIds: Set<string> = (projectApplicationsQuery.data?.unreadRecruitingIds instanceof Set)
        ? projectApplicationsQuery.data.unreadRecruitingIds
        : new Set();
    const loadingProject = projectApplicationsQuery.isLoading;

    // My recruiting projects (募集中: status !== 'closed')
    const myProjects: MyProject[] = myProjectsQuery.data || [];
    const myRecruitingProjects: SimpleProject[] = myProjects
        .filter(p => p.status !== 'closed')
        .map(p => ({
            id: p.id,
            title: p.title,
            status: p.status,
            pendingCount: p.pendingCount,
        }));
    const selectedRecruitingProject = selectedRecruitingProjectId
        ? myRecruitingProjects.find(p => p.id === selectedRecruitingProjectId) || null
        : null;

    // Fetch current user profile
    useEffect(() => {
        const fetchCurrentUser = async () => {
            if (!session?.user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, age, university, company, grade, image, bio, skills, seeking_for, seeking_roles, status_tags, is_student, created_at')
                .eq('id', session.user.id)
                .single();

            if (data && !error) {
                setCurrentUserProfile(mapProfileRowToProfile(data));
            }
        };

        fetchCurrentUser();
    }, [session]);

    // Realtime subscription for likes and project_applications changes
    useEffect(() => {
        if (!session?.user) return;

        const likesChannel = supabase
            .channel(`likes_page_${session.user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `receiver_id=eq.${session.user.id}` }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.receivedLikes.detail(session.user.id) });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'project_applications' }, () => {
                // チャットと同じ思想: 表示中（active）なら即再取得してUIをすぐ更新する
                queryClient.invalidateQueries({ queryKey: queryKeys.projectApplications.recruiting(session.user.id), refetchType: 'active' });
                queryClient.invalidateQueries({ queryKey: queryKeys.projectApplications.applied(session.user.id), refetchType: 'active' });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(likesChannel);
        };
    }, [session?.user, queryClient]);

    // Pull to refresh handler
    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                receivedLikesQuery.refetch(),
                projectApplicationsQuery.refetch(),
            ]);
        } catch (error) {
            console.error('Error refreshing:', error);
        } finally {
            setRefreshing(false);
        }
    };

    // Fetch project details for viewing
    const handleProjectSelect = async (projectId: string) => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select(`
                    *,
                    owner:profiles!owner_id (
                        id,
                        name,
                        image,
                        university
                    )
                `)
                .eq('id', projectId)
                .single();

            if (data && !error) {
                setSelectedProject(data);
            }
        } catch (error) {
            console.error('Error fetching project details:', error);
        }
    };

    // Mark "興味あり" as read
    const markInterestAsRead = async (senderId: string) => {
        if (!session?.user || !unreadInterestIds.has(senderId)) return;

        try {
            await supabase
                .from('likes')
                .update({ is_read: true })
                .eq('receiver_id', session.user.id)
                .eq('sender_id', senderId);

            queryClient.invalidateQueries({ queryKey: queryKeys.receivedLikes.detail(session.user.id) });
        } catch (error) {
            console.error('Error marking interest as read:', error);
        }
    };

    // Mark "マッチング" as read
    const markMatchAsRead = async (senderId: string) => {
        if (!session?.user || !unreadMatchIds.has(senderId)) return;

        try {
            await supabase
                .from('likes')
                .update({ is_read_as_match: true })
                .eq('receiver_id', session.user.id)
                .eq('sender_id', senderId);

            queryClient.invalidateQueries({ queryKey: queryKeys.receivedLikes.detail(session.user.id) });
        } catch (error) {
            console.error('Error marking match as read:', error);
        }
    };

    // Mark "募集" application as read
    const markRecruitingAsRead = async (applicationId: string) => {
        if (!session?.user || !unreadRecruitingIds.has(applicationId)) return;

        try {
            await supabase
                .from('project_applications')
                .update({ is_read: true })
                .eq('id', applicationId);

            queryClient.invalidateQueries({ queryKey: queryKeys.projectApplications.recruiting(session.user.id) });
        } catch (error) {
            console.error('Error marking recruiting application as read:', error);
        }
    };

    const handleInterestProfileSelect = (profile: Profile) => {
        markInterestAsRead(profile.id);
        onProfileSelect(profile);
    };

    const handleMatchProfileSelect = (profile: Profile) => {
        markMatchAsRead(profile.id);
        onProfileSelect(profile);
    };

    // Handle applicant profile select from "募集" tab
    const handleApplicantProfileSelect = (application: Application) => {
        markRecruitingAsRead(application.id);
        if (application.user) {
            onProfileSelect(application.user);
        }
    };

    // Update applicant status (approve/reject)
    const updateApplicantStatus = async (applicationId: string, newStatus: 'approved' | 'rejected', userName: string) => {
        if (!session?.user) return;

        try {
            // First, get the application details including project info
            const { data: applicationData, error: appQueryError } = await supabase
                .from('project_applications')
                .select('project_id, user_id, project:projects!project_id(id, title, image_url)')
                .eq('id', applicationId)
                .single();

            if (appQueryError) throw appQueryError;

            const projectId = applicationData?.project_id;
            const applicantUserId = applicationData?.user_id;
            const projectInfo = applicationData?.project;

            // Update the status
            const { error } = await supabase
                .from('project_applications')
                .update({ status: newStatus })
                .eq('id', applicationId);

            if (error) throw error;

            // Send notification to the applicant
            if (applicantUserId && projectInfo) {
                const { error: notifError } = await supabase
                    .from('notifications')
                    .insert({
                        user_id: applicantUserId,
                        sender_id: session.user.id,
                        project_id: projectId,
                        type: 'application_status',
                        title: newStatus === 'approved' ? 'プロジェクト参加承認' : 'プロジェクト参加見送り',
                        content: newStatus === 'approved'
                            ? `「${(projectInfo as any).title}」への参加が承認されました！`
                            : `「${(projectInfo as any).title}」への参加は見送られました。`,
                        image_url: (projectInfo as any).image_url || currentUserProfile?.image
                    });

                if (notifError) console.error('Notification error:', notifError);

                // Send push notification to applicant
                try {
                    const tokens = await getUserPushTokens(applicantUserId);
                    for (const token of tokens) {
                        await sendPushNotification(
                            token,
                            newStatus === 'approved' ? 'プロジェクト参加承認 🎉' : 'プロジェクト参加見送り',
                            newStatus === 'approved'
                                ? `「${(projectInfo as any).title}」への参加が承認されました！`
                                : `「${(projectInfo as any).title}」への参加は見送られました。`,
                            { type: 'application_status', status: newStatus, projectId }
                        );
                    }
                } catch (pushError) {
                    console.log('Push notification error:', pushError);
                }
            }

            // Handle team chat creation when approved
            let teamChatCreated = false;
            if (newStatus === 'approved' && projectId) {
                // Check if total members >= 2 (Owner + at least 1 approved applicant)
                const { count } = await supabase
                    .from('project_applications')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', projectId)
                    .eq('status', 'approved');

                const totalMembers = (count || 0) + 1; // +1 for owner

                if (totalMembers >= 2) {
                    // Check if chat room already exists
                    const { data: existingRoom } = await supabase
                        .from('chat_rooms')
                        .select('id')
                        .eq('project_id', projectId)
                        .single();

                    if (!existingRoom) {
                        // Create team chat room
                        const { error: createRoomError } = await supabase
                            .from('chat_rooms')
                            .insert({
                                project_id: projectId,
                                type: 'group'
                            });

                        if (!createRoomError) {
                            // Invalidate chat rooms query to refresh the list in TalkPage
                            queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(session.user.id) });
                            teamChatCreated = true;
                        } else {
                            console.error('Error creating chat room:', createRoomError);
                        }
                    }
                }
            }

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: queryKeys.projectApplications.recruiting(session.user.id), refetchType: 'active' });
            queryClient.invalidateQueries({ queryKey: queryKeys.projectApplications.applied(session.user.id), refetchType: 'active' });
            queryClient.invalidateQueries({ queryKey: queryKeys.myProjects.detail(session.user.id), refetchType: 'active' });
            queryClient.invalidateQueries({ queryKey: queryKeys.participatingProjects.detail(session.user.id), refetchType: 'active' });

            if (newStatus === 'rejected') {
                // Show alert for rejection
                Alert.alert('完了', `${userName}さんを見送りしました`);
            } else if (newStatus === 'approved') {
                // Show approval alert first, then team chat alert if applicable
                Alert.alert(
                    '完了',
                    `${userName}さんを承認しました`,
                    [{
                        text: 'OK',
                        onPress: () => {
                            if (teamChatCreated) {
                                Alert.alert(
                                    '🎉 チームチャット作成',
                                    'メンバーが2名以上になったため、チームチャットが自動作成されました！\n\n「トーク」タブから確認できます。'
                                );
                            }
                        }
                    }]
                );
            }

            // Notify parent to update badge count
            if (onApplicantStatusChange) {
                onApplicantStatusChange();
            }
        } catch (error) {
            console.error('Error updating applicant status:', error);
            Alert.alert('エラー', 'ステータスの更新に失敗しました');
        }
    };

    // 棄却確認用のアラート（2段階確認）
    const handleRejectConfirmation = (applicationId: string, userName: string) => {
        Alert.alert(
            '⚠️ 棄却の確認',
            `${userName}さんの申請を棄却しますか？\n\nこの操作は取り消すことができません。\n慎重にご判断ください。`,
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '棄却する',
                    style: 'destructive',
                    onPress: () => {
                        // 2段階目の確認
                        Alert.alert(
                            '最終確認',
                            `本当に${userName}さんを棄却してよろしいですか？`,
                            [
                                { text: 'やめる', style: 'cancel' },
                                {
                                    text: '棄却する',
                                    style: 'destructive',
                                    onPress: () => updateApplicantStatus(applicationId, 'rejected', userName)
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    // Filter user profiles
    const receivedLikeIds = new Set(receivedLikes.map(p => p.id));
    const sentLikes = allProfiles.filter(profile =>
        likedProfileIds.has(profile.id) && !receivedLikeIds.has(profile.id)
    );
    const displayReceivedLikes = receivedLikes.filter(profile =>
        !likedProfileIds.has(profile.id)
    );
    const matchedProfiles = receivedLikes.filter(profile =>
        likedProfileIds.has(profile.id)
    );

    const unreadInterestCount = displayReceivedLikes.filter(profile =>
        unreadInterestIds.has(profile.id)
    ).length;
    const unreadMatchCount = matchedProfiles.filter(profile =>
        unreadMatchIds.has(profile.id)
    ).length;

    // Count unread applications for recruiting
    const unreadRecruitingCount = unreadRecruitingIds.size;

    // ===== RENDER FUNCTIONS =====

    // Role to icon mapping (matching UserProjectPage)
    const ROLE_ICONS: { [key: string]: string } = {
        'エンジニア': 'code-slash',
        'デザイナー': 'color-palette',
        'マーケター': 'megaphone',
        'アイディアマン': 'bulb',
        '誰でも': 'people',
    };

    // Role to color mapping
    const ROLE_COLORS: { [key: string]: { bg: string; icon: string } } = {
        'エンジニア': { bg: '#E3F2FD', icon: '#1976D2' },
        'デザイナー': { bg: '#F3E5F5', icon: '#7B1FA2' },
        'マーケター': { bg: '#FFF3E0', icon: '#E65100' },
        'アイディアマン': { bg: '#FFF9C4', icon: '#F57F17' },
        '誰でも': { bg: '#E8F5E9', icon: '#388E3C' },
    };

    // Project Card for "応募" tab
    const renderApplicationProjectCard = ({ item }: { item: Application }) => {
        const project = item.project;
        if (!project) return null;

        const getStatusInfo = () => {
            switch (item.status) {
                case 'pending':
                    return { icon: 'time-outline', color: '#F59E0B', text: '承認待ち' };
                case 'approved':
                    return { icon: 'checkmark-circle', color: '#10B981', text: '参加決定' };
                case 'rejected':
                    return { icon: 'close-circle', color: '#EF4444', text: '見送り' };
                default:
                    return { icon: 'help-circle-outline', color: '#6B7280', text: '不明' };
            }
        };

        const statusInfo = getStatusInfo();

        // Get roles with icons and colors, limit to 4
        const rolesWithIcons = project.required_roles
            ?.slice(0, 4)
            .map(role => ({
                role,
                icon: ROLE_ICONS[role] || 'help-circle-outline',
                colors: ROLE_COLORS[role] || { bg: '#F3F4F6', icon: '#6B7280' }
            })) || [];

        const iconCount = rolesWithIcons.length;

        // Determine layout based on icon count
        const getIconLayout = () => {
            if (iconCount === 0) {
                return null;
            } else if (iconCount === 1) {
                return (
                    <View style={styles.iconsContainer}>
                        <View style={styles.iconSlotCenter}>
                            <View style={[styles.iconCircleLarge, { backgroundColor: rolesWithIcons[0].colors.bg }]}>
                                <Ionicons
                                    name={rolesWithIcons[0].icon as any}
                                    size={30}
                                    color={rolesWithIcons[0].colors.icon}
                                />
                            </View>
                        </View>
                    </View>
                );
            } else if (iconCount === 2) {
                return (
                    <View style={styles.iconsContainer}>
                        <View style={styles.iconSlotTwo}>
                            <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[0].colors.bg }]}>
                                <Ionicons name={rolesWithIcons[0].icon as any} size={20} color={rolesWithIcons[0].colors.icon} />
                            </View>
                        </View>
                        <View style={styles.iconSlotTwo}>
                            <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[1].colors.bg }]}>
                                <Ionicons name={rolesWithIcons[1].icon as any} size={20} color={rolesWithIcons[1].colors.icon} />
                            </View>
                        </View>
                    </View>
                );
            } else if (iconCount === 3) {
                return (
                    <View style={styles.iconsContainer}>
                        <View style={styles.iconSlotTop}>
                            <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[0].colors.bg }]}>
                                <Ionicons name={rolesWithIcons[0].icon as any} size={20} color={rolesWithIcons[0].colors.icon} />
                            </View>
                        </View>
                        <View style={styles.iconSlotTop}>
                            <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[1].colors.bg }]}>
                                <Ionicons name={rolesWithIcons[1].icon as any} size={20} color={rolesWithIcons[1].colors.icon} />
                            </View>
                        </View>
                        <View style={styles.iconSlotBottomCenter}>
                            <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[2].colors.bg }]}>
                                <Ionicons name={rolesWithIcons[2].icon as any} size={20} color={rolesWithIcons[2].colors.icon} />
                            </View>
                        </View>
                    </View>
                );
            } else {
                return (
                    <View style={styles.iconsContainer}>
                        {rolesWithIcons.map((iconItem, i) => (
                            <View key={`icon-${i}`} style={styles.iconSlotGrid}>
                                <View style={[styles.iconCircle, { backgroundColor: iconItem.colors.bg }]}>
                                    <Ionicons name={iconItem.icon as any} size={20} color={iconItem.colors.icon} />
                                </View>
                            </View>
                        ))}
                    </View>
                );
            }
        };

        return (
            <TouchableOpacity
                style={styles.appliedProjectCard}
                activeOpacity={0.85}
                onPress={() => handleProjectSelect(project.id)}
            >
                {/* Status Badge - Top Right */}
                <View style={[styles.appliedStatusBadgeCorner, { backgroundColor: statusInfo.color + '20' }]}>
                    <Ionicons name={statusInfo.icon as any} size={14} color={statusInfo.color} />
                    <Text style={[styles.appliedStatusTextCorner, { color: statusInfo.color }]}>{statusInfo.text}</Text>
                </View>

                <View style={styles.appliedCardInner}>
                    {/* Role Icons Container */}
                    {getIconLayout()}

                    {/* Card Content */}
                    <View style={styles.appliedCardContent}>
                        {/* Title */}
                        <Text style={styles.appliedCardTitle} numberOfLines={1}>{project.title}</Text>

                        {/* Tagline */}
                        {project.tagline && (
                            <Text style={styles.appliedCardTagline} numberOfLines={1}>{project.tagline}</Text>
                        )}

                        {/* Tags - Theme + Content Tags */}
                        {((project.tags && project.tags.length > 0) || (project.content_tags && project.content_tags.length > 0)) && (
                            <View style={styles.appliedTagsRow}>
                                {/* Theme Tag (大枠) */}
                                {project.tags?.slice(0, 1).map((tag: string, index: number) => (
                                    <View key={`theme-${index}`} style={styles.appliedThemeTag}>
                                        <Text style={styles.appliedThemeTagText}>{tag}</Text>
                                    </View>
                                ))}
                                {/* Content Tags - 最大4つまで */}
                                {project.content_tags?.slice(0, 4).map((tag: string, index: number) => (
                                    <View key={`content-${index}`} style={styles.appliedContentTag}>
                                        <Text style={styles.appliedContentTagText}>{tag}</Text>
                                    </View>
                                ))}
                                {/* 省略表示 */}
                                {(project.content_tags?.length || 0) > 4 && (
                                    <Text style={styles.appliedMoreTagsText}>...</Text>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Applicant Card for "募集" tab
    const renderApplicantCard = ({ item }: { item: Application }) => {
        const user = item.user;
        if (!user) return null;

        const isUnread = unreadRecruitingIds.has(item.id);
        const isPending = item.status === 'pending';
        const isApproved = item.status === 'approved';

        return (
            <TouchableOpacity
                style={styles.recruitingCard}
                onPress={() => handleApplicantProfileSelect(item)}
                activeOpacity={0.7}
            >
                {/* Unread indicator */}
                {isUnread && <View style={styles.recruitingUnreadDot} />}

                <View style={styles.recruitingCardInner}>
                    {/* Left: Avatar */}
                    <Image
                        source={getImageSource(user.image)}
                        style={styles.recruitingAvatar}
                    />

                    {/* Middle: Info */}
                    <View style={styles.recruitingUserInfo}>
                        <Text style={styles.recruitingUserName} numberOfLines={1}>
                            {user.name}
                        </Text>
                        <Text style={styles.recruitingUserUniversity} numberOfLines={1}>
                            {user.university || '所属なし'}
                        </Text>
                        <View style={styles.appliedProjectContainer}>
                            <Text style={styles.appliedProjectLabel}>応募先:</Text>
                            <Text style={styles.appliedProjectName} numberOfLines={1}>
                                {item.project?.title}
                            </Text>
                        </View>
                    </View>

                    {/* Right: Actions */}
                    <View style={styles.recruitingActionsRight}>
                        {isPending ? (
                            <>
                                <TouchableOpacity
                                    style={styles.actionIconButtonReject}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleRejectConfirmation(item.id, user.name);
                                    }}
                                >
                                    <Ionicons name="close" size={20} color="#EF4444" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionIconButtonApprove}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        updateApplicantStatus(item.id, 'approved', user.name);
                                    }}
                                >
                                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={[
                                styles.statusBadgeCompact,
                                { backgroundColor: isApproved ? '#D1FAE5' : '#FEE2E2' }
                            ]}>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: isApproved ? '#10B981' : '#EF4444' }}>
                                    {isApproved ? '決定' : '見送り'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // User tab - Received likes
    const renderReceivedList = () => {
        if (loadingUser) return <ProfileListSkeleton count={4} />;

        return (
            <FlatList
                data={displayReceivedLikes}
                renderItem={({ item }) => (
                    <View style={styles.gridItem}>
                        <ProfileCard
                            profile={item}
                            isLiked={false}
                            onLike={() => onLike(item.id)}
                            onSelect={() => handleInterestProfileSelect(item)}
                        />
                    </View>
                )}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={[styles.listContent, displayReceivedLikes.length === 0 && { flex: 1 }]}
                columnWrapperStyle={displayReceivedLikes.length > 0 ? styles.columnWrapper : undefined}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F39800" />
                }
                ListEmptyComponent={<LikesEmptyState type="received" />}
            />
        );
    };

    // User tab - Sent likes
    const renderSentList = () => {
        return (
            <FlatList
                data={sentLikes}
                renderItem={({ item }) => (
                    <View style={styles.gridItem}>
                        <ProfileCard
                            profile={item}
                            isLiked={true}
                            onLike={() => onLike(item.id)}
                            onSelect={() => onProfileSelect(item)}
                        />
                    </View>
                )}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={[styles.listContent, sentLikes.length === 0 && { flex: 1 }]}
                columnWrapperStyle={sentLikes.length > 0 ? styles.columnWrapper : undefined}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F39800" />
                }
                ListEmptyComponent={<LikesEmptyState type="sent" />}
            />
        );
    };

    // User tab - Matched profiles
    const renderMatchedList = () => {
        return (
            <FlatList
                data={matchedProfiles}
                renderItem={({ item }) => (
                    <View style={styles.gridItem}>
                        <ProfileCard
                            profile={item}
                            isLiked={true}
                            onLike={() => { }}
                            onSelect={() => handleMatchProfileSelect(item)}
                            hideHeartButton={true}
                            isNewMatch={unreadMatchIds.has(item.id)}
                        />
                    </View>
                )}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={[styles.listContent, matchedProfiles.length === 0 && { flex: 1 }]}
                columnWrapperStyle={matchedProfiles.length > 0 ? styles.columnWrapper : undefined}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F39800" />
                }
                ListEmptyComponent={<LikesEmptyState type="matched" />}
            />
        );
    };

    // Project tab - Recruiting (応募者一覧)
    const renderRecruitingList = () => {
        if (loadingProject) return <ProfileListSkeleton count={4} />;

        const filteredRecruitingApps = selectedRecruitingProjectId
            ? recruitingApplications.filter(a => a.project_id === selectedRecruitingProjectId)
            : recruitingApplications;

        const pendingApps = filteredRecruitingApps.filter(a => a.status === 'pending');

        const RecruitingEmptyComponent = () => (
            <ApplicantsEmptyState projectName={selectedRecruitingProject?.title} />
        );

        return (
            <View style={{ flex: 1 }}>
                {/* Filter tag (like Search tab) */}
                <View style={styles.recruitingFilterContainer}>
                    <TouchableOpacity
                        style={[
                            styles.recruitingFilterButton,
                            selectedRecruitingProjectId && styles.recruitingFilterButtonActive
                        ]}
                        onPress={() => setIsRecruitingFilterOpen(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="search" size={16} color="#F39800" />
                        <Text style={[
                            styles.recruitingFilterButtonText,
                            selectedRecruitingProjectId && styles.recruitingFilterButtonTextActive
                        ]}>
                            絞り込み
                        </Text>
                        {selectedRecruitingProject && (
                            <Text
                                style={styles.recruitingFilterSelectedText}
                                numberOfLines={1}
                            >
                                : {selectedRecruitingProject.title}
                            </Text>
                        )}
                        <Ionicons name="chevron-down" size={14} color="#F39800" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={pendingApps}
                    renderItem={renderApplicantCard}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.listContent, pendingApps.length === 0 && { flex: 1 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F39800" />
                    }
                    ListEmptyComponent={<RecruitingEmptyComponent />}
                />
            </View>
        );
    };

    // Project tab - Applied (応募したプロジェクト)
    const renderAppliedList = () => {
        if (loadingProject) return <ProjectListSkeleton count={4} />;

        // Filter and sort applied applications based on selected filter
        const getFilteredAndSortedApplications = () => {
            let filtered = [...appliedApplications];

            // Apply filter
            if (appliedFilter !== 'all') {
                filtered = filtered.filter(app => app.status === appliedFilter);
            }

            // Sort by status priority: approved > pending > rejected
            const statusPriority: { [key: string]: number } = {
                'approved': 1,
                'pending': 2,
                'rejected': 3,
            };

            filtered.sort((a, b) => {
                const priorityA = statusPriority[a.status] || 4;
                const priorityB = statusPriority[b.status] || 4;
                return priorityA - priorityB;
            });

            return filtered;
        };

        const filteredApplications = getFilteredAndSortedApplications();

        const AppliedEmptyComponent = () => (
            <ApplicationsEmptyState filter={appliedFilter} />
        );

        // Filter button component
        const FilterButton = ({ filter, label, icon, color }: { filter: typeof appliedFilter; label: string; icon: string; color: string }) => (
            <TouchableOpacity
                style={[
                    styles.appliedFilterButton,
                    appliedFilter === filter && { backgroundColor: color + '20', borderColor: color }
                ]}
                onPress={() => setAppliedFilter(filter)}
                activeOpacity={0.7}
            >
                <Ionicons
                    name={icon as any}
                    size={14}
                    color={appliedFilter === filter ? color : '#9CA3AF'}
                />
                <Text style={[
                    styles.appliedFilterButtonText,
                    appliedFilter === filter && { color: color }
                ]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );

        return (
            <View style={{ flex: 1 }}>
                {/* Filter buttons */}
                <View style={styles.appliedFilterContainer}>
                    <FilterButton filter="all" label="すべて" icon="list-outline" color="#F39800" />
                    <FilterButton filter="approved" label="参加決定" icon="checkmark-circle" color="#10B981" />
                    <FilterButton filter="pending" label="承認待ち" icon="time-outline" color="#F59E0B" />
                    <FilterButton filter="rejected" label="見送り" icon="close-circle" color="#EF4444" />
                </View>

                <FlatList
                    data={filteredApplications}
                    renderItem={renderApplicationProjectCard}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.listContent, { paddingTop: 8 }, filteredApplications.length === 0 && { flex: 1 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F39800" />
                    }
                    ListEmptyComponent={<AppliedEmptyComponent />}
                />
            </View>
        );
    };

    const userTabs = ['received', 'sent', 'matched'] as const;
    const projectTabs = ['recruiting', 'applied'] as const;

    return (
        <View style={styles.container}>
            {/* シンプルなヘッダー - 募集/応募タブと通知ボタンを同じ行に配置 */}
            <View style={styles.header}>
                <View style={[styles.headerGradient, { paddingTop: insets.top + 20, paddingBottom: 16, backgroundColor: 'white' }]}>
                    <View style={styles.headerTop}>
                        <View style={styles.headerLeft} />
                        {/* 募集/応募タブを中央に配置 */}
                        <View style={styles.subTabContainerInHeader}>
                            <TouchableOpacity
                                style={[styles.subTabButton, projectTab === 'recruiting' && styles.subTabButtonActive]}
                                onPress={() => {
                                    setProjectTab('recruiting');
                                    projectListRef.current?.scrollToIndex({ index: 0, animated: true });
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.subTabText, projectTab === 'recruiting' && styles.subTabTextActive]}>
                                    募集
                                </Text>
                                {unreadRecruitingCount > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{unreadRecruitingCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.subTabButton, projectTab === 'applied' && styles.subTabButtonActive]}
                                onPress={() => {
                                    setProjectTab('applied');
                                    projectListRef.current?.scrollToIndex({ index: 1, animated: true });
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.subTabText, projectTab === 'applied' && styles.subTabTextActive]}>
                                    応募
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.headerRight}>
                            {onOpenNotifications && (
                                <TouchableOpacity
                                    style={styles.notificationButton}
                                    onPress={onOpenNotifications}
                                >
                                    <Ionicons name="notifications-outline" size={24} color="#F39800" />
                                    {unreadNotificationsCount > 0 && (
                                        <View style={styles.notificationBadgeDot} />
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            {/* ユーザータブは将来的な復活のためにコメントで残す
            <View style={styles.header}>
                <View style={[styles.headerGradient, { paddingTop: insets.top + 16, paddingBottom: 8, backgroundColor: 'white' }]}>
                    <View style={styles.headerTop}>
                        <View style={styles.headerLeft} />
                        <Text style={[styles.headerTitle, { color: '#F39800', fontSize: 18, fontWeight: '600' }]}>プロジェクト</Text>
                        <View style={styles.mainTabContainer}>
                            <TouchableOpacity
                                style={[styles.mainTabButton, mainTab === 'project' && styles.mainTabButtonActive]}
                                onPress={() => setMainTab('project')}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={mainTab === 'project' ? "folder" : "folder-outline"}
                                    size={20}
                                    color={mainTab === 'project' ? 'white' : '#F39800'}
                                    style={styles.mainTabIcon}
                                />
                                <Text style={[styles.mainTabText, mainTab === 'project' && styles.mainTabTextActive]}>
                                    プロジェクト
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.mainTabButton, mainTab === 'user' && styles.mainTabButtonActive]}
                                onPress={() => setMainTab('user')}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={mainTab === 'user' ? "people" : "people-outline"}
                                    size={20}
                                    color={mainTab === 'user' ? 'white' : '#F39800'}
                                    style={styles.mainTabIcon}
                                />
                                <Text style={[styles.mainTabText, mainTab === 'user' && styles.mainTabTextActive]}>
                                    ユーザー
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.headerRight}>
                            {onOpenNotifications && (
                                <TouchableOpacity
                                    style={styles.notificationButton}
                                    onPress={onOpenNotifications}
                                >
                                    <Ionicons name="notifications-outline" size={24} color="#F39800" />
                                    {unreadNotificationsCount > 0 && (
                                        <View style={styles.notificationBadgeDot} />
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            {mainTab === 'user' ? (
                <View style={styles.subTabContainer}>
                    <TouchableOpacity
                        style={[styles.subTabButton, userTab === 'received' && styles.subTabButtonActive]}
                        onPress={() => {
                            setUserTab('received');
                            userListRef.current?.scrollToIndex({ index: 0, animated: true });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.subTabText, userTab === 'received' && styles.subTabTextActive]}>
                            もらったいいね
                        </Text>
                        {unreadInterestCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unreadInterestCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.subTabButton, userTab === 'sent' && styles.subTabButtonActive]}
                        onPress={() => {
                            setUserTab('sent');
                            userListRef.current?.scrollToIndex({ index: 1, animated: true });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.subTabText, userTab === 'sent' && styles.subTabTextActive]}>
                            おくったいいね
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.subTabButton, userTab === 'matched' && styles.subTabButtonActive]}
                        onPress={() => {
                            setUserTab('matched');
                            userListRef.current?.scrollToIndex({ index: 2, animated: true });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.subTabText, userTab === 'matched' && styles.subTabTextActive]}>
                            マッチング
                        </Text>
                        {unreadMatchCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unreadMatchCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.subTabContainer}>
                    <TouchableOpacity
                        style={[styles.subTabButton, projectTab === 'recruiting' && styles.subTabButtonActive]}
                        onPress={() => {
                            setProjectTab('recruiting');
                            projectListRef.current?.scrollToIndex({ index: 0, animated: true });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.subTabText, projectTab === 'recruiting' && styles.subTabTextActive]}>
                            募集
                        </Text>
                        {unreadRecruitingCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unreadRecruitingCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.subTabButton, projectTab === 'applied' && styles.subTabButtonActive]}
                        onPress={() => {
                            setProjectTab('applied');
                            projectListRef.current?.scrollToIndex({ index: 1, animated: true });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.subTabText, projectTab === 'applied' && styles.subTabTextActive]}>
                            応募
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
            */}

            {/* Content - プロジェクトのみ表示 */}
            {/* ユーザータブのコンテンツは将来的な復活のためにコメントで残す
            {mainTab === 'user' ? (
                <FlatList
                    ref={userListRef}
                    data={userTabs}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item}
                    onMomentumScrollEnd={(e) => {
                        const index = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                        setUserTab(userTabs[index]);
                    }}
                    getItemLayout={(data, index) => (
                        { length: Dimensions.get('window').width, offset: Dimensions.get('window').width * index, index }
                    )}
                    initialScrollIndex={0}
                    renderItem={({ item }) => (
                        <View style={{ width: Dimensions.get('window').width, flex: 1 }}>
                            {item === 'received' && renderReceivedList()}
                            {item === 'sent' && renderSentList()}
                            {item === 'matched' && renderMatchedList()}
                        </View>
                    )}
                />
            ) : (
            */}
            <FlatList
                ref={projectListRef}
                data={projectTabs}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                    setProjectTab(projectTabs[index]);
                }}
                getItemLayout={(data, index) => (
                    { length: Dimensions.get('window').width, offset: Dimensions.get('window').width * index, index }
                )}
                initialScrollIndex={0}
                renderItem={({ item }) => (
                    <View style={{ width: Dimensions.get('window').width, flex: 1 }}>
                        {item === 'recruiting' && renderRecruitingList()}
                        {item === 'applied' && renderAppliedList()}
                    </View>
                )}
            />
            {/* ユーザータブのクローズ括弧
            )}
            */}

            {/* Project Detail Modal */}
            <Modal
                visible={!!selectedProject}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedProject(null)}
            >
                {selectedProject && currentUserProfile && (
                    <ProjectDetail
                        project={selectedProject}
                        currentUser={currentUserProfile}
                        onClose={() => setSelectedProject(null)}
                        onChat={() => {
                            // Chat functionality could be passed from parent
                            setSelectedProject(null);
                        }}
                        onProjectUpdated={() => {
                            queryClient.invalidateQueries({ queryKey: queryKeys.projectApplications.recruiting(session?.user?.id || '') });
                            queryClient.invalidateQueries({ queryKey: queryKeys.projectApplications.applied(session?.user?.id || '') });
                            // Refresh applied projects
                            setSelectedProject(null);
                        }}
                    />
                )}
            </Modal>

            {/* Recruiting project filter modal */}
            <ProjectSelectModal
                visible={isRecruitingFilterOpen}
                onClose={() => setIsRecruitingFilterOpen(false)}
                projects={myRecruitingProjects}
                selectedProjectId={selectedRecruitingProjectId}
                onSelectProject={(project) => setSelectedRecruitingProjectId(project.id)}
                onClearSelection={() => setSelectedRecruitingProjectId(null)}
                title="絞り込み"
                subtitle="募集中のプロジェクトを選択"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF3E0',
    },
    header: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 6,
        borderBottomWidth: 0, // 削除
    },
    headerGradient: {
        // paddingTop handled in component
        paddingBottom: 8,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 0,
    },
    headerLeft: {
        width: 44,
    },
    headerRight: {
        width: 44,
        alignItems: 'flex-end',
        paddingRight: 0,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#F39800',
    },
    // Main tabs (Project / User)
    mainTabContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginLeft: -4,
    },
    mainTabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: 'transparent',
        gap: 8,
    },
    mainTabButtonActive: {
        backgroundColor: '#F39800',
    },
    mainTabIcon: {
        marginRight: 4,
    },
    mainTabText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#F39800',
        letterSpacing: 0.2,
    },
    mainTabTextActive: {
        color: 'white',
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
    // ヘッダー内に配置する募集/応募タブ
    subTabContainerInHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    // Sub tabs
    subTabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    subTabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 100,
        height: 36,
        paddingHorizontal: 14,
        gap: 6,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F39800',
    },
    subTabButtonActive: {
        backgroundColor: '#F39800',
        borderWidth: 1,
        borderColor: '#F39800',
    },
    subTabText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#F39800',
        fontFamily: FONTS.medium,
    },
    subTabTextActive: {
        color: 'white',
        fontFamily: FONTS.medium,
    },
    badge: {
        backgroundColor: '#FF7F11',
        height: 18,
        minWidth: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
        paddingHorizontal: 4,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        gap: 12,
    },
    gridItem: {
        // width handled in ProfileCard
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 120,
        paddingHorizontal: 32,
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
    // Project Card styles
    projectCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    projectCardInner: {
        flexDirection: 'row',
        padding: 12,
    },
    projectAuthorIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    projectCardContent: {
        flex: 1,
    },
    projectCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    projectCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
        marginRight: 8,
    },
    projectCardDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 8,
    },
    deadlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    deadlineText: {
        fontSize: 12,
        color: '#D32F2F',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Recruiting card styles (応募者カード)
    recruitingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 8,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        padding: 12,
    },
    recruitingUnreadDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
        zIndex: 20,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    recruitingCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recruitingAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        backgroundColor: '#F3F4F6',
    },
    recruitingUserInfo: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 8,
    },
    recruitingUserName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 2,
    },
    recruitingUserUniversity: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    appliedProjectContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    appliedProjectLabel: {
        fontSize: 10,
        color: '#9CA3AF',
        marginRight: 4,
    },
    appliedProjectName: {
        fontSize: 10,
        color: '#4B5563',
        fontWeight: '500',
    },
    recruitingActionsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 4,
    },
    actionIconButtonReject: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    actionIconButtonApprove: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#009688', // テーマカラー
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#009688",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
    },
    statusBadgeCompact: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
    },
    // Legacy applicant card styles (keep for compatibility)
    applicantCardWrapper: {
        position: 'relative',
    },
    unreadDot: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10B981',
        zIndex: 20,
        borderWidth: 2,
        borderColor: 'white',
    },
    applicantStatusBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        zIndex: 10,
    },
    applicantStatusText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    projectNameBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    projectNameText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '500',
    },
    // Applied Project Card Styles (matching UserProjectPage)
    appliedProjectCard: {
        width: '100%',
        height: 120,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    appliedCardInner: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: 'white',
        height: '100%',
    },
    iconsContainer: {
        width: 70,
        height: 70,
        borderRadius: 12,
        backgroundColor: 'transparent',
        marginRight: 14,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    iconSlotCenter: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconSlotTwo: {
        width: '50%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconSlotTop: {
        width: '50%',
        height: '50%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconSlotBottomCenter: {
        width: '100%',
        height: '50%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconSlotGrid: {
        width: '50%',
        height: '50%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircleLarge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    appliedCardContent: {
        flex: 1,
        justifyContent: 'center',
        height: '100%',
    },
    appliedTitleContainer: {
        marginBottom: 4,
    },
    appliedCardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#111827',
        lineHeight: 20,
    },
    appliedAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 6,
    },
    appliedAuthorIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginRight: 6,
        backgroundColor: '#F3F4F6',
    },
    appliedAuthorName: {
        fontSize: 11,
        color: '#111827',
        fontWeight: '500',
        marginRight: 6,
        maxWidth: 80,
    },
    appliedTimeAgo: {
        fontSize: 10,
        color: '#6B7280',
        marginRight: 'auto',
    },
    appliedDeadlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 107, 107, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 4,
    },
    appliedDeadlineText: {
        fontSize: 10,
        color: '#FF6B6B',
        fontWeight: '600',
        marginLeft: 2,
    },
    appliedStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        alignSelf: 'flex-start',
        gap: 4,
    },
    appliedStatusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    appliedStatusBadgeCorner: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
        zIndex: 10,
    },
    appliedStatusTextCorner: {
        fontSize: 11,
        fontWeight: '600',
    },
    appliedCardTagline: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: '#6B7280',
        lineHeight: 18,
        marginTop: 2,
    },
    appliedTagsRow: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: 4,
        marginTop: 4,
        overflow: 'hidden',
    },
    appliedThemeTag: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    appliedThemeTagText: {
        fontSize: 10,
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
    },
    appliedContentTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    appliedContentTagText: {
        fontSize: 10,
        fontFamily: FONTS.medium,
        color: '#6B7280',
    },
    appliedMoreTagsText: {
        fontSize: 11,
        fontFamily: FONTS.medium,
        color: '#9CA3AF',
        alignSelf: 'center',
    },
    // Applied filter styles
    appliedFilterContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 6,
        gap: 8,
        backgroundColor: '#FFF3E0',
    },
    appliedFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 4,
    },
    appliedFilterButtonText: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: '#9CA3AF',
    },

    // Recruiting filter (project-based)
    recruitingFilterContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
        backgroundColor: '#FFF3E0',
    },
    recruitingFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 6,
        maxWidth: '100%',
    },
    recruitingFilterButtonActive: {
        backgroundColor: '#F3980020',
        borderColor: '#F39800',
    },
    recruitingFilterButtonText: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: '#F39800',
    },
    recruitingFilterButtonTextActive: {
        color: '#F39800',
    },
    recruitingFilterSelectedText: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: '#6B7280',
        maxWidth: 220,
    },
});

