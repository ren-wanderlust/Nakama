import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, Modal, FlatList, Dimensions, TouchableWithoutFeedback, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { useQueryClient } from '@tanstack/react-query';
import { useMyProjects, useParticipatingProjects } from '../data/hooks/useMyProjects';
import { queryKeys } from '../data/queryKeys';
import { ProjectDetail } from './ProjectDetail';
import { HapticTouchable, triggerHaptic } from './HapticButton';
import { SHADOWS, FONTS } from '../constants/DesignSystem';
import { ModernCard, ModernButton } from './ModernComponents';
import { getImageSource } from '../constants/DefaultImages';

interface MyPageProps {
    profile: Profile;
    onLogout?: () => void;
    onEditProfile?: () => void;
    onOpenNotifications?: () => void;
    onSettingsPress?: () => void;
    onHelpPress?: () => void;
    onChat?: (ownerId: string, ownerName: string, ownerImage: string) => void;
    onBadgeUpdate?: (count: number) => void;
    onShowOnboarding?: () => void; // 追加
}

interface MenuItem {
    id: string;
    icon: any;
    label: string;
    badge?: number;
    color?: string;
}

const { width } = Dimensions.get('window');

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
    'エンジニア': { bg: '#E3F2FD', icon: '#1976D2' },      // Blue
    'デザイナー': { bg: '#F3E5F5', icon: '#7B1FA2' },    // Purple
    'マーケター': { bg: '#FFF3E0', icon: '#E65100' },    // Orange
    'アイディアマン': { bg: '#FFF9C4', icon: '#F57F17' }, // Yellow
    '誰でも': { bg: '#E8F5E9', icon: '#388E3C' },        // Green
};

// UserProjectPageと同じProjectCardコンポーネント（自分のプロジェクト用）
const ProjectCard = ({ project, ownerProfile, onPress }: { project: any; ownerProfile: Profile; onPress: () => void }) => {
    const deadlineDate = project.deadline ? new Date(project.deadline) : null;
    const deadlineString = deadlineDate
        ? `${deadlineDate.getMonth() + 1}/${deadlineDate.getDate()}まで`
        : '';

    // 作成日を取得
    const createdDate = project.created_at ? new Date(project.created_at) : null;
    const createdDateString = createdDate
        ? `${createdDate.getFullYear()}/${createdDate.getMonth() + 1}/${createdDate.getDate()}`
        : '';

    // Get roles with icons and colors, limit to 4
    const rolesWithIcons = project.required_roles
        ?.slice(0, 4)
        .map((role: string) => ({
            role,
            icon: ROLE_ICONS[role] || 'help-circle-outline',
            colors: ROLE_COLORS[role] || { bg: '#F3F4F6', icon: '#6B7280' }
        })) || [];

    const iconCount = rolesWithIcons.length;

    // Determine layout based on icon count (same as UserProjectPage)
    const getIconLayout = () => {
        if (iconCount === 0) {
            return null;
        } else if (iconCount === 1) {
            // Single icon in center (larger size)
            return (
                <View style={projectCardStyles.iconsContainer}>
                    <View style={projectCardStyles.iconSlotCenter}>
                        <View style={[projectCardStyles.iconCircleLarge, { backgroundColor: rolesWithIcons[0].colors.bg }]}>
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
            // Two icons side by side, centered vertically
            return (
                <View style={projectCardStyles.iconsContainer}>
                    <View style={projectCardStyles.iconSlotTwo}>
                        <View style={[projectCardStyles.iconCircle, { backgroundColor: rolesWithIcons[0].colors.bg }]}>
                            <Ionicons
                                name={rolesWithIcons[0].icon as any}
                                size={20}
                                color={rolesWithIcons[0].colors.icon}
                            />
                        </View>
                    </View>
                    <View style={projectCardStyles.iconSlotTwo}>
                        <View style={[projectCardStyles.iconCircle, { backgroundColor: rolesWithIcons[1].colors.bg }]}>
                            <Ionicons
                                name={rolesWithIcons[1].icon as any}
                                size={20}
                                color={rolesWithIcons[1].colors.icon}
                            />
                        </View>
                    </View>
                </View>
            );
        } else if (iconCount === 3) {
            // Top two, bottom one centered
            return (
                <View style={projectCardStyles.iconsContainer}>
                    <View style={projectCardStyles.iconSlotTop}>
                        <View style={[projectCardStyles.iconCircle, { backgroundColor: rolesWithIcons[0].colors.bg }]}>
                            <Ionicons
                                name={rolesWithIcons[0].icon as any}
                                size={20}
                                color={rolesWithIcons[0].colors.icon}
                            />
                        </View>
                    </View>
                    <View style={projectCardStyles.iconSlotTop}>
                        <View style={[projectCardStyles.iconCircle, { backgroundColor: rolesWithIcons[1].colors.bg }]}>
                            <Ionicons
                                name={rolesWithIcons[1].icon as any}
                                size={20}
                                color={rolesWithIcons[1].colors.icon}
                            />
                        </View>
                    </View>
                    <View style={projectCardStyles.iconSlotBottomCenter}>
                        <View style={[projectCardStyles.iconCircle, { backgroundColor: rolesWithIcons[2].colors.bg }]}>
                            <Ionicons
                                name={rolesWithIcons[2].icon as any}
                                size={20}
                                color={rolesWithIcons[2].colors.icon}
                            />
                        </View>
                    </View>
                </View>
            );
        } else {
            // Four icons in 2x2 grid
            return (
                <View style={projectCardStyles.iconsContainer}>
                    {rolesWithIcons.map((item: { role: string; icon: string; colors: { bg: string; icon: string } }, i: number) => (
                        <View key={`icon-${i}`} style={projectCardStyles.iconSlotGrid}>
                            <View style={[projectCardStyles.iconCircle, { backgroundColor: item.colors.bg }]}>
                                <Ionicons
                                    name={item.icon as any}
                                    size={20}
                                    color={item.colors.icon}
                                />
                            </View>
                        </View>
                    ))}
                </View>
            );
        }
    };

    const isClosed = project.status === 'closed';

    return (
        <ModernCard
            onPress={onPress}
            style={[
                projectCardStyles.card,
                { marginTop: 2, marginBottom: 4 },
                isClosed && { backgroundColor: '#F3F4F6' }
            ]}
            padding="none"
        >
            {isClosed && (
                <View style={projectCardStyles.recruitmentClosedBadge}>
                    <Text style={projectCardStyles.recruitmentClosedText}>停止中</Text>
                </View>
            )}

            <View style={[projectCardStyles.cardInner, isClosed && { opacity: 0.7 }]}>
                {/* Role Icons Container */}
                {getIconLayout()}
                <View style={projectCardStyles.cardContent}>
                    {/* Title */}
                    <Text style={projectCardStyles.cardTitle} numberOfLines={1}>{project.title}</Text>

                    {/* Tagline */}
                    {project.tagline && (
                        <Text style={projectCardStyles.cardTagline} numberOfLines={1}>{project.tagline}</Text>
                    )}

                    {/* Tags - Theme + Content Tags */}
                    {((project.tags && project.tags.length > 0) || (project.content_tags && project.content_tags.length > 0)) && (
                        <View style={projectCardStyles.tagsRow}>
                            {/* Theme Tag (大枠) */}
                            {project.tags?.slice(0, 1).map((tag: string, index: number) => (
                                <View key={`theme-${index}`} style={projectCardStyles.themeTag}>
                                    <Text style={projectCardStyles.themeTagText}>{tag}</Text>
                                </View>
                            ))}
                            {/* Content Tags - 最大4つまで */}
                            {project.content_tags?.slice(0, 4).map((tag: string, index: number) => (
                                <View key={`content-${index}`} style={projectCardStyles.tag}>
                                    <Text style={projectCardStyles.tagText}>{tag}</Text>
                                </View>
                            ))}
                            {/* 省略表示 */}
                            {(project.content_tags?.length || 0) > 4 && (
                                <Text style={projectCardStyles.moreTagsText}>...</Text>
                            )}
                        </View>
                    )}
                </View>
                {/* Pending notification badge */}
                {!isClosed && project.pendingCount > 0 && (
                    <View style={projectCardStyles.notificationBadge}>
                        <Text style={projectCardStyles.notificationText}>
                            {project.pendingCount}
                        </Text>
                    </View>
                )}
            </View>
        </ModernCard>
    );
};

export function MyPage({ profile, onLogout, onEditProfile, onOpenNotifications, onSettingsPress, onHelpPress, onChat, onBadgeUpdate, onShowOnboarding }: MyPageProps) {
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<'myProjects' | 'participatingProjects'>('myProjects');
    const [refreshing, setRefreshing] = useState(false);
    const queryClient = useQueryClient();

    // React Query hooks
    const myProjectsQuery = useMyProjects(profile.id);
    const participatingProjectsQuery = useParticipatingProjects(profile.id);

    const projects: any[] = myProjectsQuery.data || [];
    const participatingProjects: any[] = participatingProjectsQuery.data || [];
    const loadingProjects = myProjectsQuery.isLoading;
    const loadingParticipating = participatingProjectsQuery.isLoading;

    // Update badge when projects data changes
    useEffect(() => {
        if (projects.length > 0 && onBadgeUpdate) {
            const totalPending = projects.reduce((sum: number, p: any) => sum + (p.pendingCount || 0), 0);
            onBadgeUpdate(totalPending);
        }
    }, [projects, onBadgeUpdate]);

    // Realtime subscription for projects and project_applications changes
    useEffect(() => {
        if (!profile.id) return;

        const projectsChannel = supabase
            .channel(`my_projects_${profile.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `owner_id=eq.${profile.id}` }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.myProjects.detail(profile.id) });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'project_applications' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.myProjects.detail(profile.id) });
                queryClient.invalidateQueries({ queryKey: queryKeys.participatingProjects.detail(profile.id) });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(projectsChannel);
        };
    }, [profile.id, queryClient]);

    // Pull to refresh handler
    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                myProjectsQuery.refetch(),
                participatingProjectsQuery.refetch(),
            ]);
        } catch (error) {
            console.error('Error refreshing:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // 1. Delete avatar images
            const { data: avatarFiles } = await supabase.storage
                .from('avatars')
                .list(`${user.id}/`);

            if (avatarFiles && avatarFiles.length > 0) {
                const filesToRemove = avatarFiles.map(x => `${user.id}/${x.name}`);
                await supabase.storage.from('avatars').remove(filesToRemove);
            }

            // 2. Delete chat images
            const { data: chatFiles } = await supabase.storage
                .from('chat-images')
                .list(`${user.id}/`);

            if (chatFiles && chatFiles.length > 0) {
                const filesToRemove = chatFiles.map(x => `${user.id}/${x.name}`);
                await supabase.storage.from('chat-images').remove(filesToRemove);
            }

            // 3. Delete account data
            const { error } = await supabase.rpc('delete_account');
            if (error) throw error;

            Alert.alert("完了", "アカウントを削除しました。", [
                { text: "OK", onPress: onLogout }
            ]);
        } catch (error: any) {
            console.error('Error deleting account:', error);
            Alert.alert("エラー", "アカウントの削除に失敗しました。");
            setIsDeleting(false);
        }
    };

    const menuItems: MenuItem[] = [
        { id: 'notifications', icon: 'notifications-outline', label: 'お知らせ' },
        { id: 'tutorial', icon: 'book-outline', label: 'チュートリアル' },
        { id: 'settings', icon: 'settings-outline', label: '各種設定' },
        { id: 'help', icon: 'help-circle-outline', label: 'ヘルプ・ガイドライン' },
        { id: 'logout', icon: 'log-out-outline', label: 'ログアウト', color: '#EF4444' },
    ];

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerLeft} />
            <View style={styles.headerRight} />
        </View>
    );

    const renderProfileCard = () => (
        <View style={styles.profileCard}>
            <View style={styles.profileRow}>
                <Image
                    source={{ uri: profile.image }}
                    style={styles.profileImage}
                />
                <View style={styles.profileTextColumn}>
                    <Text style={styles.profileName}>{profile.name}</Text>
                    <View style={styles.universityContainer}>
                        <Ionicons name="school-outline" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
                        <Text style={styles.profileUniversity}>
                            {profile.university}
                            {profile.grade ? ` / ${profile.grade}` : ''}
                        </Text>
                    </View>
                    <View style={styles.editRow}>
                        <TouchableOpacity style={styles.editProfileButton} onPress={() => onEditProfile && onEditProfile()}>
                            <Ionicons name="pencil" size={14} color="#009688" />
                            <Text style={styles.editProfileButtonText}>プロフィールを編集</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.settingsButton} onPress={() => setIsMenuVisible(true)}>
                            <Ionicons name="settings-outline" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabsContainer}>
            <HapticTouchable
                style={[styles.tabItem, activeTab === 'myProjects' && styles.activeTab]}
                onPress={() => setActiveTab('myProjects')}
                hapticType="selection"
            >
                <Ionicons name="grid-outline" size={22} color={activeTab === 'myProjects' ? '#009688' : '#999'} />
                <Text style={[styles.tabLabel, activeTab === 'myProjects' && styles.tabLabelActive]}>マイプロジェクト</Text>
            </HapticTouchable>
            <HapticTouchable
                style={[styles.tabItem, activeTab === 'participatingProjects' && styles.activeTab]}
                onPress={() => setActiveTab('participatingProjects')}
                hapticType="selection"
            >
                <Ionicons name="people-outline" size={22} color={activeTab === 'participatingProjects' ? '#009688' : '#999'} />
                <Text style={[styles.tabLabel, activeTab === 'participatingProjects' && styles.tabLabelActive]}>参加中</Text>
            </HapticTouchable>
        </View>
    );

    const renderProjectItem = ({ item }: { item: any }) => (
        <ProjectCard
            project={item}
            ownerProfile={profile}
            onPress={() => setSelectedProject(item)}
        />
    );

    const renderParticipatingProjectItem = ({ item }: { item: any }) => {
        // Get roles with icons and colors, limit to 4
        const rolesWithIcons = item.required_roles
            ?.slice(0, 4)
            .map((role: string) => ({
                role,
                icon: ROLE_ICONS[role] || 'help-circle-outline',
                colors: ROLE_COLORS[role] || { bg: '#F3F4F6', icon: '#6B7280' }
            })) || [];

        const iconCount = rolesWithIcons.length;

        // Same icon layout logic as ProjectCard
        const getIconLayout = () => {
            if (iconCount === 0) {
                return null;
            } else if (iconCount === 1) {
                return (
                    <View style={projectCardStyles.iconsContainer}>
                        <View style={projectCardStyles.iconSlotCenter}>
                            <View style={[projectCardStyles.iconCircleLarge, { backgroundColor: rolesWithIcons[0].colors.bg }]}>
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
                    <View style={projectCardStyles.iconsContainer}>
                        <View style={projectCardStyles.iconSlotTwo}>
                            <View style={[projectCardStyles.iconCircle, { backgroundColor: rolesWithIcons[0].colors.bg }]}>
                                <Ionicons
                                    name={rolesWithIcons[0].icon as any}
                                    size={20}
                                    color={rolesWithIcons[0].colors.icon}
                                />
                            </View>
                        </View>
                        <View style={projectCardStyles.iconSlotTwo}>
                            <View style={[projectCardStyles.iconCircle, { backgroundColor: rolesWithIcons[1].colors.bg }]}>
                                <Ionicons
                                    name={rolesWithIcons[1].icon as any}
                                    size={20}
                                    color={rolesWithIcons[1].colors.icon}
                                />
                            </View>
                        </View>
                    </View>
                );
            } else if (iconCount === 3) {
                return (
                    <View style={projectCardStyles.iconsContainer}>
                        <View style={projectCardStyles.iconSlotTop}>
                            <View style={[projectCardStyles.iconCircle, { backgroundColor: rolesWithIcons[0].colors.bg }]}>
                                <Ionicons
                                    name={rolesWithIcons[0].icon as any}
                                    size={20}
                                    color={rolesWithIcons[0].colors.icon}
                                />
                            </View>
                        </View>
                        <View style={projectCardStyles.iconSlotTop}>
                            <View style={[projectCardStyles.iconCircle, { backgroundColor: rolesWithIcons[1].colors.bg }]}>
                                <Ionicons
                                    name={rolesWithIcons[1].icon as any}
                                    size={20}
                                    color={rolesWithIcons[1].colors.icon}
                                />
                            </View>
                        </View>
                        <View style={projectCardStyles.iconSlotBottomCenter}>
                            <View style={[projectCardStyles.iconCircle, { backgroundColor: rolesWithIcons[2].colors.bg }]}>
                                <Ionicons
                                    name={rolesWithIcons[2].icon as any}
                                    size={20}
                                    color={rolesWithIcons[2].colors.icon}
                                />
                            </View>
                        </View>
                    </View>
                );
            } else {
                return (
                    <View style={projectCardStyles.iconsContainer}>
                        {rolesWithIcons.map((roleItem: { role: string; icon: string; colors: { bg: string; icon: string } }, i: number) => (
                            <View key={`icon-${i}`} style={projectCardStyles.iconSlotGrid}>
                                <View style={[projectCardStyles.iconCircle, { backgroundColor: roleItem.colors.bg }]}>
                                    <Ionicons
                                        name={roleItem.icon as any}
                                        size={20}
                                        color={roleItem.colors.icon}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                );
            }
        };

        // 作成日を取得
        const createdDate = item.created_at ? new Date(item.created_at) : null;
        const createdDateString = createdDate
            ? `${createdDate.getFullYear()}/${createdDate.getMonth() + 1}/${createdDate.getDate()}`
            : '';

        return (
            <ModernCard
                onPress={() => setSelectedProject(item)}
                style={[projectCardStyles.card, { marginTop: 2, marginBottom: 4 }]}
                padding="none"
            >
                <View style={projectCardStyles.participatingBadge}>
                    <Text style={projectCardStyles.participatingBadgeText}>参加中</Text>
                </View>
                <View style={projectCardStyles.cardInner}>
                    {getIconLayout()}
                    <View style={projectCardStyles.cardContent}>
                        {/* Title */}
                        <Text style={projectCardStyles.cardTitle} numberOfLines={1}>{item.title}</Text>

                        {/* Tagline */}
                        {item.tagline && (
                            <Text style={projectCardStyles.cardTagline} numberOfLines={1}>{item.tagline}</Text>
                        )}

                        {/* Tags - Theme + Content Tags */}
                        {((item.tags && item.tags.length > 0) || (item.content_tags && item.content_tags.length > 0)) && (
                            <View style={projectCardStyles.tagsRow}>
                                {/* Theme Tag (大枠) */}
                                {item.tags?.slice(0, 1).map((tag: string, index: number) => (
                                    <View key={`theme-${index}`} style={projectCardStyles.themeTag}>
                                        <Text style={projectCardStyles.themeTagText}>{tag}</Text>
                                    </View>
                                ))}
                                {/* Content Tags - 最大4つまで */}
                                {item.content_tags?.slice(0, 4).map((tag: string, index: number) => (
                                    <View key={`content-${index}`} style={projectCardStyles.tag}>
                                        <Text style={projectCardStyles.tagText}>{tag}</Text>
                                    </View>
                                ))}
                                {/* 省略表示 */}
                                {(item.content_tags?.length || 0) > 4 && (
                                    <Text style={projectCardStyles.moreTagsText}>...</Text>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </ModernCard>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}

            <FlatList
                data={activeTab === 'myProjects' ? projects : participatingProjects}
                renderItem={activeTab === 'myProjects' ? renderProjectItem : renderParticipatingProjectItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                    <>
                        {renderProfileCard()}
                        {renderTabs()}
                    </>
                }
                contentContainerStyle={styles.projectListContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#009688" />
                }
                ItemSeparatorComponent={() => <View style={{ height: 3 }} />}
                ListEmptyComponent={
                    (activeTab === 'myProjects' ? !loadingProjects : !loadingParticipating) ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons
                                    name={activeTab === 'myProjects' ? "folder-open-outline" : "people-outline"}
                                    size={48}
                                    color="#009688"
                                />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'myProjects' ? 'プロジェクトはまだありません' : '参加中のプロジェクトはありません'}
                            </Text>
                            <Text style={styles.emptySubText}>
                                {activeTab === 'myProjects'
                                    ? 'プロジェクトを作成して公開しましょう'
                                    : '気になるプロジェクトに応募してみましょう'}
                            </Text>
                        </View>
                    ) : null
                }
            />

            {/* Menu Modal */}
            <Modal
                visible={isMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setIsMenuVisible(false)}
                >
                    <View style={styles.menuContent}>
                        <View style={styles.menuHeader}>
                            <View style={styles.menuIndicator} />
                        </View>
                        {menuItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.menuRow}
                                onPress={() => {
                                    setIsMenuVisible(false);
                                    if (item.id === 'notifications' && onOpenNotifications) onOpenNotifications();
                                    else if (item.id === 'tutorial' && onShowOnboarding) onShowOnboarding();
                                    else if (item.id === 'settings' && onSettingsPress) onSettingsPress();
                                    else if (item.id === 'help' && onHelpPress) onHelpPress();
                                    else if (item.id === 'logout' && onLogout) onLogout();
                                }}
                            >
                                <Ionicons name={item.icon} size={24} color={item.color || "black"} />
                                <Text style={[styles.menuRowText, item.color && { color: item.color }]}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity
                            style={styles.menuRow}
                            onPress={() => {
                                setIsMenuVisible(false);
                                Alert.alert(
                                    "アカウント削除",
                                    "本当にアカウントを削除しますか？",
                                    [
                                        { text: "キャンセル", style: "cancel" },
                                        { text: "削除する", style: "destructive", onPress: handleDeleteAccount }
                                    ]
                                );
                            }}
                        >
                            <Ionicons name="trash-outline" size={24} color="#EF4444" />
                            <Text style={[styles.menuRowText, { color: '#EF4444' }]}>アカウント削除</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Project Detail Modal */}
            <Modal
                visible={!!selectedProject}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setSelectedProject(null)}
            >
                {selectedProject && (
                    <ProjectDetail
                        project={selectedProject}
                        currentUser={profile}
                        onClose={() => setSelectedProject(null)}
                        onChat={(id, name, image) => {
                            setSelectedProject(null);
                            if (onChat) onChat(id, name, image);
                        }}
                        onProjectUpdated={() => {
                            setSelectedProject(null);
                            queryClient.invalidateQueries({ queryKey: queryKeys.myProjects.detail(profile.id) });
                        }}
                    />
                )}
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF3E0',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerUsername: {
        fontSize: 20,
        fontFamily: FONTS.bold,
        color: 'black',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileCard: {
        paddingVertical: 24,
        paddingHorizontal: 20,
        marginHorizontal: 16,
        marginBottom: 12,
        marginTop: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#F3F4F6',
    },
    profileTextColumn: {
        flex: 1,
        gap: 8,
    },
    profileName: {
        fontSize: 22,
        fontFamily: FONTS.bold,
        color: '#111827',
        letterSpacing: -0.5,
    },
    universityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileUniversity: {
        fontSize: 13,
        color: '#6B7280',
        fontFamily: FONTS.regular,
    },
    editRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 8,
    },
    editProfileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF9',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: '#009688',
        gap: 6,
    },
    editProfileButtonText: {
        fontSize: 13,
        fontFamily: FONTS.semiBold,
        color: '#009688',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#009688',
        gap: 4,
    },
    editButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#009688',
    },
    settingsButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabsContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 14,
        padding: 5,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 11,
        gap: 8,
    },
    activeTab: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    tabLabel: {
        fontSize: 14,
        color: '#9CA3AF',
        fontFamily: FONTS.medium,
    },
    tabLabelActive: {
        color: '#009688',
        fontFamily: FONTS.semiBold,
    },
    projectListContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        flexGrow: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    emptyIconContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 2,
        borderColor: 'black',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: FONTS.bold,
        color: 'black',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    menuContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        paddingTop: 10,
    },
    menuHeader: {
        alignItems: 'center',
        marginBottom: 10,
    },
    menuIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 16,
    },
    menuRowText: {
        fontSize: 16,
        color: 'black',
    },
});

// UserProjectPageと同じProjectCardスタイル
const projectCardStyles = StyleSheet.create({
    card: {
        width: '100%',
        height: 105,
        borderRadius: 14,
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    cardInner: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 14,
        backgroundColor: 'white',
        height: '100%',
        gap: 10,
    },
    iconsContainer: {
        width: 60,
        height: 60,
        borderRadius: 10,
        backgroundColor: 'transparent',
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
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircleLarge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    authorIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 14,
        backgroundColor: '#EEE',
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    cardTitle: {
        fontSize: 17,
        fontFamily: FONTS.bold,
        color: '#111827',
        lineHeight: 22,
    },
    deadlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    deadlineText: {
        fontSize: 12,
        color: '#D32F2F',
        fontFamily: FONTS.bold,
        marginLeft: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    createdDateText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontFamily: FONTS.bold,
    },
    ownerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    ownerName: {
        fontSize: 13,
        color: '#6B7280',
    },
    deadlineBadgeSmall: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deadlineTextSmall: {
        fontSize: 11,
        color: '#D32F2F',
        marginLeft: 2,
    },
    notificationBadge: {
        position: 'absolute',
        top: '50%',
        right: 8,
        transform: [{ translateY: -10 }],
        backgroundColor: '#EF4444',
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        zIndex: 10,
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inlineNotificationBadge: {
        backgroundColor: '#EF4444',
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    notificationText: {
        color: 'white',
        fontSize: 12,
        fontFamily: FONTS.bold,
        textAlign: 'center',
    },
    participatingBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#009688',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 10,
    },
    participatingBadgeText: {
        color: 'white',
        fontSize: 11,
        fontFamily: FONTS.bold,
    },
    recruitmentClosedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#6B7280',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 10,
    },
    recruitmentClosedText: {
        color: 'white',
        fontSize: 11,
        fontFamily: FONTS.bold,
    },
    cardTagline: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: '#6B7280',
        lineHeight: 18,
        marginTop: 2,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: 4,
        marginTop: 4,
        overflow: 'hidden',
    },
    themeTag: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    themeTagText: {
        fontSize: 10,
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
    },
    tag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    tagText: {
        fontSize: 10,
        fontFamily: FONTS.medium,
        color: '#6B7280',
    },
    moreTagsText: {
        fontSize: 11,
        fontFamily: FONTS.medium,
        color: '#9CA3AF',
        alignSelf: 'center',
    },
});

