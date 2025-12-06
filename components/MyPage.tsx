import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, Modal, FlatList, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { ProjectDetail } from './ProjectDetail';

interface MyPageProps {
    profile: Profile;
    onLogout?: () => void;
    onEditProfile?: () => void;
    onOpenNotifications?: () => void;
    onSettingsPress?: () => void;
    onHelpPress?: () => void;
    onChat?: (ownerId: string, ownerName: string, ownerImage: string) => void;
    onBadgeUpdate?: (count: number) => void;
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
                        申請 {project.pendingCount}件
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

// 応募したプロジェクト用のカードコンポーネント
const AppliedProjectCard = ({ project, onPress }: { project: any; onPress: () => void }) => {
    const deadlineDate = project.deadline ? new Date(project.deadline) : null;
    const deadlineString = deadlineDate
        ? `${deadlineDate.getMonth() + 1}/${deadlineDate.getDate()}まで`
        : '';

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return { text: '承認済み', color: '#4CAF50', bgColor: '#E8F5E9' };
            case 'rejected':
                return { text: '不承認', color: '#F44336', bgColor: '#FFEBEE' };
            default:
                return { text: '審査中', color: '#FF9800', bgColor: '#FFF3E0' };
        }
    };

    const statusBadge = getStatusBadge(project.applicationStatus);

    return (
        <TouchableOpacity style={projectCardStyles.card} onPress={onPress} activeOpacity={0.7}>
            <View style={projectCardStyles.cardInner}>
                <Image
                    source={{ uri: project.owner?.image || 'https://via.placeholder.com/50' }}
                    style={projectCardStyles.authorIcon}
                />
                <View style={projectCardStyles.cardContent}>
                    <View style={projectCardStyles.cardHeader}>
                        <Text style={projectCardStyles.cardTitle} numberOfLines={1}>{project.title}</Text>
                        <View style={[projectCardStyles.statusBadge, { backgroundColor: statusBadge.bgColor }]}>
                            <Text style={[projectCardStyles.statusText, { color: statusBadge.color }]}>{statusBadge.text}</Text>
                        </View>
                    </View>
                    <Text style={projectCardStyles.cardDescription} numberOfLines={2}>{project.description}</Text>
                    <View style={projectCardStyles.ownerInfo}>
                        <Text style={projectCardStyles.ownerName}>{project.owner?.name || '不明'}</Text>
                        {deadlineString ? (
                            <View style={projectCardStyles.deadlineBadgeSmall}>
                                <Ionicons name="time-outline" size={12} color="#D32F2F" />
                                <Text style={projectCardStyles.deadlineTextSmall}>{deadlineString}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export function MyPage({ profile, onLogout, onEditProfile, onOpenNotifications, onSettingsPress, onHelpPress, onChat, onBadgeUpdate }: MyPageProps) {
    const [projects, setProjects] = useState<any[]>([]);
    const [appliedProjects, setAppliedProjects] = useState<any[]>([]);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any | null>(null);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [loadingAppliedProjects, setLoadingAppliedProjects] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<'myProjects' | 'appliedProjects'>('myProjects');

    useEffect(() => {
        fetchMyProjects();
        fetchAppliedProjects();
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

    const fetchAppliedProjects = async () => {
        try {
            // 自分が応募したプロジェクトを取得
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
                setAppliedProjects(projectsWithStatus);
            }
        } catch (error) {
            console.error('Error fetching applied projects:', error);
        } finally {
            setLoadingAppliedProjects(false);
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
        { id: 'billing', icon: 'card-outline', label: '課金・プラン管理' },
        { id: 'notifications', icon: 'notifications-outline', label: 'お知らせ' },
        { id: 'favorites', icon: 'star-outline', label: 'お気に入り' },
        { id: 'settings', icon: 'settings-outline', label: '各種設定' },
        { id: 'help', icon: 'help-circle-outline', label: 'ヘルプ・ガイドライン' },
        { id: 'logout', icon: 'log-out-outline', label: 'ログアウト', color: '#EF4444' },
    ];

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <Ionicons name="lock-closed-outline" size={16} color="black" style={{ marginRight: 4 }} />
                <Text style={styles.headerUsername}>{profile.name}</Text>
                <Ionicons name="chevron-down" size={16} color="black" style={{ marginLeft: 4 }} />
            </View>
            <View style={styles.headerRight}>
                <TouchableOpacity onPress={() => setIsMenuVisible(true)}>
                    <Ionicons name="menu-outline" size={32} color="black" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderProfileInfo = () => (
        <View style={styles.profileInfoContainer}>
            <View style={styles.profileImageWrapper}>
                <Image
                    source={{ uri: profile.image }}
                    style={styles.profileImage}
                />
            </View>
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{projects.length}</Text>
                    <Text style={styles.statLabel}>投稿</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>0</Text>
                    <Text style={styles.statLabel}>フォロワー</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>0</Text>
                    <Text style={styles.statLabel}>フォロー中</Text>
                </View>
            </View>
        </View>
    );

    const renderBio = () => (
        <View style={styles.bioContainer}>
            <Text style={styles.bioName}>{profile.name}</Text>
            <Text style={styles.bioUniversity}>{profile.university}</Text>
            {profile.bio && <Text style={styles.bioText}>{profile.bio}</Text>}
        </View>
    );

    const renderActions = () => (
        <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={onEditProfile}>
                <Text style={styles.actionButtonText}>プロフィールを編集</Text>
            </TouchableOpacity>
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabsContainer}>
            <TouchableOpacity
                style={[styles.tabItem, activeTab === 'myProjects' && styles.activeTab]}
                onPress={() => setActiveTab('myProjects')}
            >
                <Ionicons name="grid-outline" size={24} color={activeTab === 'myProjects' ? 'black' : '#999'} />
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tabItem, activeTab === 'appliedProjects' && styles.activeTab]}
                onPress={() => setActiveTab('appliedProjects')}
            >
                <Ionicons name="person-outline" size={24} color={activeTab === 'appliedProjects' ? 'black' : '#999'} />
            </TouchableOpacity>
        </View>
    );

    const renderProjectItem = ({ item }: { item: any }) => (
        <ProjectCard
            project={item}
            ownerProfile={profile}
            onPress={() => setSelectedProject(item)}
        />
    );

    const renderAppliedProjectItem = ({ item }: { item: any }) => (
        <AppliedProjectCard
            project={item}
            onPress={() => setSelectedProject(item)}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}

            <FlatList
                data={activeTab === 'myProjects' ? projects : appliedProjects}
                renderItem={activeTab === 'myProjects' ? renderProjectItem : renderAppliedProjectItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                    <>
                        {renderProfileInfo()}
                        {renderBio()}
                        {renderActions()}
                        {renderTabs()}
                    </>
                }
                contentContainerStyle={styles.projectListContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                ListEmptyComponent={
                    (activeTab === 'myProjects' ? !loadingProjects : !loadingAppliedProjects) ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons
                                    name={activeTab === 'myProjects' ? "folder-open-outline" : "document-text-outline"}
                                    size={48}
                                    color="black"
                                />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'myProjects' ? 'プロジェクトはまだありません' : '応募したプロジェクトはありません'}
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
    profileInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    profileImageWrapper: {
        marginRight: 20,
    },
    profileImage: {
        width: 86,
        height: 86,
        borderRadius: 43,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    statsContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'black',
    },
    statLabel: {
        fontSize: 13,
        color: 'black',
    },
    bioContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    bioName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'black',
        marginBottom: 2,
    },
    bioUniversity: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    bioText: {
        fontSize: 14,
        color: 'black',
        lineHeight: 20,
    },
    actionsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 20,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#EFEFEF',
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'black',
    },
    tabsContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#EFEFEF',
        marginBottom: 16,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
    },
    activeTab: {
        borderBottomWidth: 1,
        borderBottomColor: 'black',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
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
        fontSize: 18,
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
        top: 8,
        right: 8,
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 10,
    },
    notificationText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
