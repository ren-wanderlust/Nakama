import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, SafeAreaView, Alert, Modal, FlatList, Dimensions, RefreshControl, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { getThemeTagColor, getThemeTagTextColor } from '../constants/ThemeConstants';

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

const getTimeAgoText = (createdAt?: string) => {
    if (!createdAt) return '';
    const createdDate = new Date(createdAt);
    if (Number.isNaN(createdDate.getTime())) return '';
    const daysAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    // 3日以内は相対表示、4日以上は日付形式
    return daysAgo === 0
        ? '今日'
        : daysAgo === 1
            ? '昨日'
            : daysAgo <= 3
                ? `${daysAgo}日前`
                : `${createdDate.getMonth() + 1}/${createdDate.getDate()}`;
};

// UserProjectPageと同じProjectCardコンポーネント（自分のプロジェクト用）- サムネイル式
const ProjectCard = ({ project, ownerProfile, onPress }: { project: any; ownerProfile: Profile; onPress: () => void }) => {
    const isClosed = project.status === 'closed';
    const coverImage = project.cover_image;
    const timeAgo = getTimeAgoText(project?.created_at);

    // デフォルトカバー画像
    const defaultCoverImage = require('../assets/default-project-cover.png');

    return (
        <TouchableOpacity
            style={[projectCardStyles.cardNew, isClosed && { opacity: 0.7 }]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            {/* 停止中バッジ */}
            {isClosed && (
                <View style={projectCardStyles.closedBadge}>
                    <Text style={projectCardStyles.closedBadgeText}>停止中</Text>
                </View>
            )}

            {/* 左側: サムネイル画像 */}
            <View style={projectCardStyles.cardThumbnail}>
                <Image
                    source={coverImage ? { uri: coverImage } : defaultCoverImage}
                    style={projectCardStyles.cardThumbnailImage}
                    resizeMode="cover"
                />
            </View>

            {/* 右側: コンテンツ */}
            <View style={projectCardStyles.cardContentNew}>
                {/* タイトル */}
                <Text style={projectCardStyles.cardTitleNew} numberOfLines={1}>{project.title}</Text>

                {/* タグライン/説明 */}
                {project.tagline && (
                    <Text style={projectCardStyles.cardTaglineNew} numberOfLines={2}>{project.tagline}</Text>
                )}

                {/* オーナー情報（タグラインの下） */}
                <View style={projectCardStyles.cardOwnerRow}>
                    {ownerProfile.image ? (
                        <Image
                            source={{ uri: ownerProfile.image }}
                            style={projectCardStyles.cardOwnerAvatar}
                        />
                    ) : (
                        <View style={[projectCardStyles.cardOwnerAvatar, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}>
                            <Ionicons name="person" size={12} color="#9CA3AF" />
                        </View>
                    )}
                    <Text style={projectCardStyles.cardOwnerName} numberOfLines={1}>{ownerProfile.name}</Text>
                    {!!timeAgo && <Text style={projectCardStyles.cardTimeAgo}>{timeAgo}</Text>}
                </View>

                {/* 下部: タグ + 統計 */}
                <View style={projectCardStyles.cardBottomRow}>
                    {/* タグ */}
                    <View style={projectCardStyles.cardTagsRow}>
                        {project.tags?.slice(0, 1).map((tag: string, idx: number) => (
                            <View key={`theme-${idx}`} style={[projectCardStyles.themeTag, { backgroundColor: getThemeTagColor(tag) }]}>
                                <Text style={[projectCardStyles.themeTagText, { color: getThemeTagTextColor(tag) }]}>{tag}</Text>
                            </View>
                        ))}
                        {project.content_tags?.slice(0, 2).map((tag: string, idx: number) => (
                            <View key={`content-${idx}`} style={projectCardStyles.tag}>
                                <Text style={projectCardStyles.tagText}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                    {/* 統計 */}
                    <View style={projectCardStyles.cardStatsRow}>
                        <Ionicons name="document-text-outline" size={12} color="#9CA3AF" />
                        <Text style={projectCardStyles.cardStatText}>{project.pendingCount ?? 0}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export function MyPage({ profile, onLogout, onEditProfile, onOpenNotifications, onSettingsPress, onHelpPress, onChat, onBadgeUpdate, onShowOnboarding }: MyPageProps) {
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<'myProjects' | 'participatingProjects'>('myProjects');
    const [refreshing, setRefreshing] = useState(false);
    const queryClient = useQueryClient();

    // フェードインアニメーション
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, []);

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

    // Discord風ヘッダー（グラデーション拡張）
    const renderDiscordHeader = () => (
        <LinearGradient
            colors={['#F7B555', '#F7B555', '#FFF3E0']}
            locations={[0, 0.5, 1]}
            style={styles.discordHeader}
        >
            {/* ロゴ部分 */}
            <View style={styles.discordBannerContent}>
                <Text style={styles.discordBannerText}>Pogg</Text>
            </View>

            {/* 設定アイコン（右上） */}
            <TouchableOpacity
                style={styles.discordSettingsBtn}
                onPress={() => setIsMenuVisible(true)}
            >
                <Ionicons name="settings-outline" size={20} color="#555" />
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
                <Text style={styles.memberSinceText}>
                    {formatRegistrationDate()}からメンバー
                </Text>
            </View>

            {/* プロフィール編集ボタン - アウトラインスタイルに変更 */}
            <TouchableOpacity
                style={styles.discordEditButton}
                onPress={() => onEditProfile && onEditProfile()}
            >
                <Ionicons name="pencil" size={14} color="#F57C00" style={{ marginRight: 6 }} />
                <Text style={styles.discordEditButtonText}>プロフィール編集</Text>
            </TouchableOpacity>
        </LinearGradient>
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
        const coverImage = item.cover_image;
        const ownerImage = item.profiles?.image || item.owner?.image;
        const ownerName = item.profiles?.name || item.owner?.name || '不明';
        const timeAgo = getTimeAgoText(item?.created_at);

        // デフォルトカバー画像
        const defaultCoverImage = require('../assets/default-project-cover.png');

        return (
            <TouchableOpacity
                style={projectCardStyles.cardNew}
                onPress={() => setSelectedProject(item)}
                activeOpacity={0.85}
            >
                {/* 参加中バッジ */}
                <View style={projectCardStyles.participatingBadgeNew}>
                    <Text style={projectCardStyles.participatingBadgeTextNew}>参加中</Text>
                </View>

                {/* 左側: サムネイル画像 */}
                <View style={projectCardStyles.cardThumbnail}>
                    <Image
                        source={coverImage ? { uri: coverImage } : defaultCoverImage}
                        style={projectCardStyles.cardThumbnailImage}
                        resizeMode="cover"
                    />
                </View>

                {/* 右側: コンテンツ */}
                <View style={projectCardStyles.cardContentNew}>
                    {/* タイトル */}
                    <Text style={projectCardStyles.cardTitleNew} numberOfLines={1}>{item.title}</Text>

                    {/* タグライン/説明 */}
                    {item.tagline && (
                        <Text style={projectCardStyles.cardTaglineNew} numberOfLines={2}>{item.tagline}</Text>
                    )}

                    {/* オーナー情報（タグラインの下） */}
                    <View style={projectCardStyles.cardOwnerRow}>
                        {ownerImage ? (
                            <Image
                                source={{ uri: ownerImage }}
                                style={projectCardStyles.cardOwnerAvatar}
                            />
                        ) : (
                            <View style={[projectCardStyles.cardOwnerAvatar, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}>
                                <Ionicons name="person" size={12} color="#9CA3AF" />
                            </View>
                        )}
                        <Text style={projectCardStyles.cardOwnerName} numberOfLines={1}>{ownerName}</Text>
                        {!!timeAgo && <Text style={projectCardStyles.cardTimeAgo}>{timeAgo}</Text>}
                    </View>

                    {/* 下部: タグ + 統計 */}
                    <View style={projectCardStyles.cardBottomRow}>
                        {/* タグ */}
                        <View style={projectCardStyles.cardTagsRow}>
                            {item.tags?.slice(0, 1).map((tag: string, idx: number) => (
                                <View key={`theme-${idx}`} style={[projectCardStyles.themeTag, { backgroundColor: getThemeTagColor(tag) }]}>
                                    <Text style={[projectCardStyles.themeTagText, { color: getThemeTagTextColor(tag) }]}>{tag}</Text>
                                </View>
                            ))}
                            {item.content_tags?.slice(0, 2).map((tag: string, idx: number) => (
                                <View key={`content-${idx}`} style={projectCardStyles.tag}>
                                    <Text style={projectCardStyles.tagText}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                        {/* 統計 */}
                        <View style={projectCardStyles.cardStatsRow}>
                        <Ionicons name="document-text-outline" size={12} color="#9CA3AF" />
                        <Text style={projectCardStyles.cardStatText}>{item.pendingCount ?? 0}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F39800" />
                }
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[1]}
            >
                {/* Discord風ヘッダー */}
                {renderDiscordHeader()}

                {/* セクションリスト（固定） */}
                <View style={styles.stickyHeaderWrapper}>
                    {/* ステータスバー避け用スペーサー */}
                    <View style={styles.stickyHeaderSpacer} />
                    <View style={styles.discordSectionsContainer}>
                        {/* マイプロジェクト */}
                        <TouchableOpacity
                            style={[styles.discordSectionItem, activeTab === 'myProjects' && styles.discordSectionItemActive]}
                            onPress={() => setActiveTab('myProjects')}
                        >
                            <View style={styles.discordSectionLeft}>
                                <Ionicons name="grid-outline" size={20} color={activeTab === 'myProjects' ? '#F57C00' : '#6B7280'} />
                                <Text style={[styles.discordSectionLabel, activeTab === 'myProjects' && styles.discordSectionLabelActive]}>マイプロジェクト</Text>
                            </View>
                            <View style={styles.discordSectionRight}>
                                <Text style={styles.discordSectionCount}>{projects.length}</Text>
                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                            </View>
                        </TouchableOpacity>

                        {/* 参加中プロジェクト */}
                        <TouchableOpacity
                            style={[styles.discordSectionItem, activeTab === 'participatingProjects' && styles.discordSectionItemActive]}
                            onPress={() => setActiveTab('participatingProjects')}
                        >
                            <View style={styles.discordSectionLeft}>
                                <Ionicons name="people-outline" size={20} color={activeTab === 'participatingProjects' ? '#F57C00' : '#6B7280'} />
                                <Text style={[styles.discordSectionLabel, activeTab === 'participatingProjects' && styles.discordSectionLabelActive]}>参加中プロジェクト</Text>
                            </View>
                            <View style={styles.discordSectionRight}>
                                <Text style={styles.discordSectionCount}>{participatingProjects.length}</Text>
                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* プロジェクトリスト */}
                <View style={styles.projectListContainer}>
                    <FlatList
                        data={activeTab === 'myProjects' ? projects : participatingProjects}
                        renderItem={activeTab === 'myProjects' ? renderProjectItem : renderParticipatingProjectItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.projectListContent}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={false}
                        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                        ListEmptyComponent={
                            (activeTab === 'myProjects' ? !loadingProjects : !loadingParticipating) ? (
                                <MyProjectsEmptyState type={activeTab} />
                            ) : null
                        }
                    />
                </View>
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
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF3E0', // 元のクリーム色
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
        paddingHorizontal: 0,
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
        paddingTop: 60, // ステータスバーエリアをカバー
        paddingBottom: 8, // タブとの間隔を縮める
    },
    discordBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 20,
        gap: 8,
    },
    logoContainer: {
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
    },
    discordBannerLogo: {
        width: 48,
        height: 48,
    },
    discordBannerText: {
        fontSize: 40,
        fontWeight: '700',
        color: 'white',
        letterSpacing: 0.5,
        fontFamily: FONTS.bold,
        marginTop: 10,
    },
    discordSettingsBtn: {
        position: 'absolute',
        top: 60, // ステータスバー + paddingTop
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.9)', // 半透明白
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        ...SHADOWS.sm,
    },
    discordAvatarWrapper: {
        marginLeft: 24,
        marginBottom: 12,
    },
    discordAvatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 4,
        borderColor: 'white', // 背景との境界を白く
        backgroundColor: '#FFF3E0',
    },
    discordProfileInfo: {
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    discordProfileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
        fontFamily: FONTS.bold,
    },
    discordProfileHandle: {
        fontSize: 14,
        color: '#6B7280',
        fontFamily: FONTS.medium,
    },
    memberSinceText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontFamily: FONTS.regular,
        marginTop: 4,
    },
    discordEditButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20, // 丸みを強く
        backgroundColor: 'white',
        borderWidth: 1.5,
        borderColor: '#FFB74D', // 薄めのオレンジ枠
        ...SHADOWS.sm,
    },
    discordEditButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F57C00', // 濃い目のオレンジ文字
        fontFamily: FONTS.semiBold,
    },
    stickyHeaderWrapper: {
        backgroundColor: '#FFF3E0', // 背景色と同じ
    },
    stickyHeaderSpacer: {
        height: 50, // ステータスバーの高さ分
        backgroundColor: '#FFF3E0',
    },
    discordSectionsContainer: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        borderRadius: 16,
        paddingVertical: 8,
        ...SHADOWS.sm,
        marginBottom: 12,
        overflow: 'hidden',
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
        marginLeft: 12,
    },
    discordSectionLabelActive: {
        color: '#F57C00',
        fontWeight: '600',
    },
    discordSectionItemActive: {
        backgroundColor: '#FFF8F0',
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
    // Sticky Tabs Styles
    stickyTabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF3E0', // 背景色と同じにして違和感をなくす
        paddingTop: 50, // 固定時にステータスバーを避けるために上部を広げる
        paddingBottom: 12,
        paddingHorizontal: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        zIndex: 100,
    },
    stickyTab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    stickyTabActive: {
        backgroundColor: 'white',
        borderColor: '#FFB74D',
        ...SHADOWS.sm,
    },
    stickyTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        fontFamily: FONTS.medium,
    },
    stickyTabTextActive: {
        color: '#F57C00',
        fontFamily: FONTS.semiBold,
    },
    projectListContainer: {
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 100,
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

    // 新しいサムネイル式カードスタイル（UserProjectPageと統一）
    cardNew: {
        flexDirection: 'row',
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
    cardThumbnail: {
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardThumbnailImage: {
        width: '100%',
        height: '100%',
    },
    cardContentNew: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    cardOwnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    cardOwnerAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        marginRight: 6,
    },
    cardOwnerName: {
        flexShrink: 1,
        marginRight: 8,
        fontSize: 11,
        fontFamily: FONTS.medium,
        color: '#6B7280',
    },
    cardTimeAgo: {
        fontSize: 10,
        fontFamily: FONTS.regular,
        color: '#9CA3AF',
    },
    cardTitleNew: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: '#111827',
        lineHeight: 21,
        marginBottom: 4,
    },
    cardTaglineNew: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: '#6B7280',
        lineHeight: 16,
        marginBottom: 6,
    },
    cardBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardTagsRow: {
        flexDirection: 'row',
        gap: 4,
        flex: 1,
    },
    cardStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardStatText: {
        fontSize: 11,
        fontFamily: FONTS.regular,
        color: '#9CA3AF',
    },
    closedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#6B7280',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 10,
    },
    closedBadgeText: {
        color: 'white',
        fontSize: 11,
        fontFamily: FONTS.bold,
    },
    participatingBadgeNew: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#009688',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 10,
    },
    participatingBadgeTextNew: {
        color: 'white',
        fontSize: 11,
        fontFamily: FONTS.bold,
    },
});

