import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, Modal, FlatList, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { ProjectDetail } from './ProjectDetail';
import { HapticTouchable, triggerHaptic } from './HapticButton';
import { SHADOWS } from '../constants/DesignSystem';

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

// UserProjectPageと同じProjectCardコンポーネント（自分のプロジェクト用）
const ProjectCard = ({ project, ownerProfile, onPress }: { project: any; ownerProfile: Profile; onPress: () => void }) => {
    const deadlineDate = project.deadline ? new Date(project.deadline) : null;
    const deadlineString = deadlineDate
        ? `${deadlineDate.getMonth() + 1}/${deadlineDate.getDate()}まで`
        : '';

    return (
        <TouchableOpacity style={projectCardStyles.card} onPress={onPress} activeOpacity={0.7}>
            {project.pendingCount > 0 && (
                <View style={projectCardStyles.notificationBadge}>
                    <Text style={projectCardStyles.notificationText}>
                        {project.pendingCount}
                    </Text>
                </View>
            )}
            <View style={projectCardStyles.cardInner}>
                <Image
                    source={{ uri: ownerProfile.image || 'https://via.placeholder.com/50' }}
                    style={projectCardStyles.authorIcon}
                />
                <View style={projectCardStyles.cardContent}>
                    <View style={projectCardStyles.cardHeader}>
                        <Text style={projectCardStyles.cardTitle} numberOfLines={1}>{project.title}</Text>
                        {deadlineString ? (
                            <View style={projectCardStyles.deadlineBadge}>
                                <Ionicons name="time-outline" size={14} color="#D32F2F" />
                                <Text style={projectCardStyles.deadlineText}>{deadlineString}</Text>
                            </View>
                        ) : null}
                    </View>
                    <Text style={projectCardStyles.cardDescription} numberOfLines={2}>{project.description}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export function MyPage({ profile, onLogout, onEditProfile, onOpenNotifications, onSettingsPress, onHelpPress, onChat, onBadgeUpdate, onShowOnboarding }: MyPageProps) {
    const [projects, setProjects] = useState<any[]>([]);
    const [participatingProjects, setParticipatingProjects] = useState<any[]>([]);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any | null>(null);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [loadingParticipating, setLoadingParticipating] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<'myProjects' | 'participatingProjects'>('myProjects');

    useEffect(() => {
        fetchMyProjects();
        fetchParticipatingProjects();
    }, [profile.id]);

    const fetchMyProjects = async () => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('owner_id', profile.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) {
                // Fetch pending application counts
                const projectIds = data.map((p: any) => p.id);
                if (projectIds.length > 0) {
                    const { data: apps } = await supabase
                        .from('project_applications')
                        .select('project_id')
                        .in('project_id', projectIds)
                        .eq('status', 'pending');

                    const counts: { [key: string]: number } = {};
                    apps?.forEach((app: any) => {
                        counts[app.project_id] = (counts[app.project_id] || 0) + 1;
                    });

                    const projectsWithCounts = data.map((p: any) => ({
                        ...p,
                        pendingCount: counts[p.id] || 0
                    }));

                    // Sort by pending count (descending) - projects with more pending apps first
                    projectsWithCounts.sort((a: any, b: any) => (b.pendingCount || 0) - (a.pendingCount || 0));

                    const totalPending = projectsWithCounts.reduce((sum: number, p: any) => sum + (p.pendingCount || 0), 0);
                    if (onBadgeUpdate) onBadgeUpdate(totalPending);

                    setProjects(projectsWithCounts);
                } else {
                    setProjects(data);
                }
            }
        } catch (error) {
            console.error('Error fetching my projects:', error);
        } finally {
            setLoadingProjects(false);
        }
    };

    const fetchParticipatingProjects = async () => {
        try {
            // 自分が参加中のプロジェクト（承認済みのみ）を取得
            const { data, error } = await supabase
                .from('project_applications')
                .select(`
                    id,
                    status,
                    project:projects!project_id (
                        id,
                        title,
                        description,
                        image_url,
                        owner_id,
                        created_at,
                        deadline,
                        owner:profiles!owner_id (
                            id,
                            name,
                            image,
                            university
                        )
                    )
                `)
                .eq('user_id', profile.id)
                .eq('status', 'approved')  // 承認済みのみ
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) {
                // プロジェクト情報を抽出してフラット化
                const projectsWithStatus = data
                    .filter((item: any) => item.project)
                    .map((item: any) => ({
                        ...item.project,
                        applicationStatus: item.status,
                        applicationId: item.id
                    }));
                setParticipatingProjects(projectsWithStatus);
            }
        } catch (error) {
            console.error('Error fetching participating projects:', error);
        } finally {
            setLoadingParticipating(false);
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
                        <Ionicons name="school-outline" size={16} color="#6B7280" style={{ marginRight: 4 }} />
                        <Text style={styles.profileUniversity}>
                            {profile.university}
                            {profile.grade ? ` / ${profile.grade}` : ''}
                        </Text>
                    </View>
                    <View style={styles.editRow}>
                        <HapticTouchable style={styles.editButton} onPress={onEditProfile} hapticType="light">
                            <Ionicons name="pencil-outline" size={16} color="#009688" />
                            <Text style={styles.editButtonText}>プロフィールを編集</Text>
                        </HapticTouchable>
                        <HapticTouchable style={styles.settingsButton} onPress={() => setIsMenuVisible(true)} hapticType="light">
                            <Ionicons name="settings-outline" size={18} color="#374151" />
                        </HapticTouchable>
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

    const renderParticipatingProjectItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={projectCardStyles.card} onPress={() => setSelectedProject(item)} activeOpacity={0.7}>
            <View style={projectCardStyles.participatingBadge}>
                <Text style={projectCardStyles.participatingBadgeText}>参加中</Text>
            </View>
            <View style={projectCardStyles.cardInner}>
                <Image
                    source={{ uri: item.owner?.image || 'https://via.placeholder.com/50' }}
                    style={projectCardStyles.authorIcon}
                />
                <View style={projectCardStyles.cardContent}>
                    <View style={projectCardStyles.cardHeader}>
                        <Text style={projectCardStyles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    </View>
                    <Text style={projectCardStyles.cardDescription} numberOfLines={2}>{item.description}</Text>
                    <View style={projectCardStyles.ownerInfo}>
                        <Text style={projectCardStyles.ownerName}>{item.owner?.name || '不明'}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

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
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
                            fetchMyProjects();
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
        backgroundColor: 'white',
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
        fontWeight: 'bold',
        color: 'black',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileCard: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        marginTop: 4, // move slightly upward on screen
        backgroundColor: '#FAFAFA',
        borderRadius: 16,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    profileImage: {
        width: 90,
        height: 90,
        borderRadius: 45,
        // 枠線なし
    },
    profileTextColumn: {
        flex: 1,
        gap: 6,
    },
    profileName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    universityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileUniversity: {
        fontSize: 14,
        color: '#6B7280',
    },
    editRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
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
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 18, // やや楕円形（横長）
        borderWidth: 1,
        borderColor: '#111827', // 少し濃い目の枠線
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabsContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    activeTab: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabLabel: {
        fontSize: 14,
        color: '#999',
        fontWeight: '500',
    },
    tabLabelActive: {
        color: '#009688',
        fontWeight: '600',
    },
    projectListContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
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
        fontWeight: 'bold',
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
        backgroundColor: 'white',
        borderRadius: 16,
        ...SHADOWS.md,
    },
    cardInner: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'flex-start',
    },
    authorIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 16,
        backgroundColor: '#EEE',
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
        marginRight: 8,
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
        fontWeight: 'bold',
        marginLeft: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    // 応募したプロジェクト用の追加スタイル
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
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
    notificationText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
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
        fontWeight: 'bold',
    },
});
