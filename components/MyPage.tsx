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
import { MyProjectsEmptyState } from './EmptyState';

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
    // Determine layout based on icon count (same as UserProjectPage)
    const getIconLayout = () => {
        return (
            <Image
                source={{ uri: ownerProfile.image }}
                style={[projectCardStyles.authorIcon, { marginRight: 0 }]}
            />
        );
    };

    const isClosed = project.status === 'closed';

    return (
        <ModernCard
            onPress={onPress}
            style={[
                projectCardStyles.card,
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

    // 登録日をフォーマット
    const formatRegistrationDate = () => {
        if (!profile.createdAt) return '不明';
        const date = new Date(profile.createdAt);
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    };

    // Discord風ヘッダー
    const renderDiscordHeader = () => (
        <View style={styles.discordHeader}>
            {/* グラデーション背景 + ロゴ */}
            <View style={styles.discordBanner}>
                <View style={styles.discordBannerContent}>
                    <Image
                        source={require('../assets/pogg_logo_orange.png')}
                        style={styles.discordBannerLogo}
                        resizeMode="contain"
                    />
                    <Text style={styles.discordBannerText}>Pogg</Text>
                </View>
            </View>

            {/* 設定アイコン（右上） */}
            <TouchableOpacity
                style={styles.discordSettingsBtn}
                onPress={() => setIsMenuVisible(true)}
            >
                <Ionicons name="settings-outline" size={22} color="white" />
            </TouchableOpacity>

            {/* アバター（左側に大きく配置） */}
            <View style={styles.discordAvatarWrapper}>
                <Image
                    source={getImageSource(profile.image)}
                    style={styles.discordAvatar}
                />
            </View>

            {/* プロフィール情報 */}
            <View style={styles.discordProfileInfo}>
                <Text style={styles.discordProfileName}>{profile.name}</Text>
                <Text style={styles.discordProfileHandle}>
                    {profile.university}{profile.grade ? ` / ${profile.grade}` : ''}
                </Text>
            </View>

            {/* プロフィール編集ボタン */}
            <TouchableOpacity
                style={styles.discordEditButton}
                onPress={() => onEditProfile && onEditProfile()}
            >
                <Ionicons name="pencil" size={16} color="white" style={{ marginRight: 6 }} />
                <Text style={styles.discordEditButtonText}>プロフィール編集</Text>
            </TouchableOpacity>
        </View>
    );

    // Discord風セクション
    const renderSectionItem = (
        icon: string,
        label: string,
        rightContent?: React.ReactNode,
        onPress?: () => void,
        showChevron: boolean = true
    ) => (
        <TouchableOpacity
            style={styles.discordSectionItem}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={styles.discordSectionLeft}>
                <Ionicons name={icon as any} size={20} color="#6B7280" style={{ marginRight: 12 }} />
                <Text style={styles.discordSectionLabel}>{label}</Text>
            </View>
            <View style={styles.discordSectionRight}>
                {rightContent}
                {showChevron && onPress && (
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                )}
            </View>
        </TouchableOpacity>
    );

    const renderTabs = () => (
        <View style={styles.tabsContainer}>
            <HapticTouchable
                style={[styles.tabItem, activeTab === 'myProjects' && styles.activeTab]}
                onPress={() => setActiveTab('myProjects')}
                hapticType="selection"
            >
                <Ionicons name="grid-outline" size={18} color={activeTab === 'myProjects' ? '#F39800' : '#999'} />
                <Text style={[styles.tabLabel, activeTab === 'myProjects' && styles.tabLabelActive]}>マイプロジェクト</Text>
            </HapticTouchable>
            <HapticTouchable
                style={[styles.tabItem, activeTab === 'participatingProjects' && styles.activeTab]}
                onPress={() => setActiveTab('participatingProjects')}
                hapticType="selection"
            >
                <Ionicons name="people-outline" size={18} color={activeTab === 'participatingProjects' ? '#F39800' : '#999'} />
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
            // participatingProjectsのitemにprofilesが含まれていると仮定
            // もし含まれていなければ、プロジェクト作成者の画像を取得する必要があるが
            // ここでは簡易的にitem.profiles?.imageを使用する
            const imageUri = item.profiles?.image || item.owner?.image;

            if (imageUri) {
                return (
                    <Image
                        source={{ uri: imageUri }}
                        style={[projectCardStyles.authorIcon, { marginRight: 0 }]}
                    />
                );
            }

            // 画像がない場合のフォールバック（デフォルトアイコン）
            return (
                <View style={[projectCardStyles.authorIcon, { marginRight: 0, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="person" size={24} color="#9CA3AF" />
                </View>
            );
        };

        // 作成日を取得
        const createdDate = item.created_at ? new Date(item.created_at) : null;
        const createdDateString = createdDate
            ? `${createdDate.getFullYear()}/${createdDate.getMonth() + 1}/${createdDate.getDate()}`
            : '';

        return (
            <ModernCard
                onPress={() => setSelectedProject(item)}
                style={projectCardStyles.card}
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
            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F39800" />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Discord風ヘッダー */}
                {renderDiscordHeader()}

                {/* セクションリスト */}
                <View style={styles.discordSectionsContainer}>
                    {/* マイプロジェクト */}
                    {renderSectionItem(
                        'grid-outline',
                        'マイプロジェクト',
                        <Text style={styles.discordSectionCount}>{projects.length}</Text>,
                        () => setActiveTab('myProjects')
                    )}

                    {/* 参加中プロジェクト */}
                    {renderSectionItem(
                        'people-outline',
                        '参加中プロジェクト',
                        <Text style={styles.discordSectionCount}>{participatingProjects.length}</Text>,
                        () => setActiveTab('participatingProjects')
                    )}

                    {/* 仕切り線 */}
                    <View style={styles.discordDivider} />

                    {/* 登録日 */}
                    {renderSectionItem(
                        'calendar-outline',
                        'メンバーになった日',
                        <Text style={styles.discordSectionMeta}>{formatRegistrationDate()}</Text>,
                        undefined,
                        false
                    )}

                    {/* GitHub / SNS リンク（将来実装用） */}
                    {profile.githubUrl && renderSectionItem(
                        'logo-github',
                        'GitHub',
                        undefined,
                        () => { /* TODO: Open GitHub */ }
                    )}
                </View>

                {/* プロジェクトリスト（タブ選択時に表示） */}
                {(activeTab === 'myProjects' || activeTab === 'participatingProjects') && (
                    <View style={styles.discordProjectSection}>
                        <View style={styles.discordProjectHeader}>
                            <Text style={styles.discordProjectTitle}>
                                {activeTab === 'myProjects' ? 'マイプロジェクト' : '参加中プロジェクト'}
                            </Text>
                            <TouchableOpacity onPress={() => setActiveTab(null as any)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={activeTab === 'myProjects' ? projects : participatingProjects}
                            renderItem={activeTab === 'myProjects' ? renderProjectItem : renderParticipatingProjectItem}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.projectListContent}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                            ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
                            ListEmptyComponent={
                                (activeTab === 'myProjects' ? !loadingProjects : !loadingParticipating) ? (
                                    <MyProjectsEmptyState type={activeTab} />
                                ) : null
                            }
                        />
                    </View>
                )}
            </ScrollView>

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
    headerSettingsButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: '#F9FAFB',
    },
    // Settings button inside profile card
    settingsButtonInCard: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
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
        gap: 6,
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
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    editProfileButtonText: {
        fontSize: 11,
        fontFamily: FONTS.semiBold,
        color: '#4B5563',
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
    tabsContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 14,
        padding: 4,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 11,
        gap: 6,
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
        fontSize: 13,
        color: '#9CA3AF',
        fontFamily: FONTS.medium,
    },
    tabLabelActive: {
        color: '#F39800',
        fontFamily: FONTS.semiBold,
    },
    projectListContent: {
        paddingHorizontal: 16,
        paddingBottom: 100, // ボトムナビゲーション分のスペースを確保
        paddingTop: 8,
        flexGrow: 1,
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
    // Discord風スタイル
    scrollView: {
        flex: 1,
    },
    discordHeader: {
        backgroundColor: 'white',
        paddingBottom: 20,
    },
    discordBanner: {
        height: 100,
        backgroundColor: '#F39800', // アプリのメインカラー
        marginBottom: -40,
        justifyContent: 'center',
    },
    discordBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 10,
    },
    discordBannerLogo: {
        width: 32,
        height: 32,
        marginRight: 8,
    },
    discordBannerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: 1,
    },
    discordSettingsBtn: {
        position: 'absolute',
        top: 12,
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    discordAvatarWrapper: {
        marginLeft: 20,
        marginBottom: 16,
    },
    discordAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#FFF3E0',
        backgroundColor: '#FFF3E0',
    },
    discordOnlineDot: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#10B981',
        borderWidth: 3,
        borderColor: 'white',
    },
    discordProfileInfo: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    discordProfileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 2,
    },
    discordProfileHandle: {
        fontSize: 14,
        color: '#6B7280',
    },
    discordEditButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#F39800', // オレンジ
    },
    discordEditButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: 'white',
    },
    discordSectionsContainer: {
        backgroundColor: 'white',
        marginTop: 12,
        paddingVertical: 8,
    },
    discordSectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    discordSectionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    discordSectionRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    discordSectionLabel: {
        fontSize: 15,
        color: '#111827',
    },
    discordSectionCount: {
        fontSize: 15,
        color: '#6B7280',
        fontWeight: '500',
    },
    discordSectionMeta: {
        fontSize: 14,
        color: '#6B7280',
    },
    discordDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginHorizontal: 20,
        marginVertical: 8,
    },
    discordProjectSection: {
        backgroundColor: 'white',
        marginTop: 12,
        paddingBottom: 100,
    },
    discordProjectHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    discordProjectTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
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
        width: 48,
        height: 48,
        borderRadius: 24,
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
        right: 12,
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

