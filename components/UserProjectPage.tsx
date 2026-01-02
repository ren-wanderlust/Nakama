import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Alert, Animated, Easing, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { useQueryClient } from '@tanstack/react-query';
import { useProjectsList } from '../data/hooks/useProjectsList';
import { queryKeys } from '../data/queryKeys';
import { CreateProjectModal } from './CreateProjectModal';
import { FilterCriteria } from './FilterModal';
import { ProjectDetail } from './ProjectDetail';
import { ProjectListSkeleton } from './Skeleton';
import { CustomRefreshControl } from './CustomRefreshControl';
import { RADIUS, COLORS, SHADOWS, SPACING, AVATAR, FONTS } from '../constants/DesignSystem';
import { ProjectsEmptyState } from './EmptyState';
import { translateTag } from '../constants/TagConstants';
import { ProjectSummaryCard } from './ProjectSummaryCard';

interface Project {
    id: string;
    title: string;
    tagline?: string;
    description: string;
    image_url: string | null;
    owner_id: string;
    created_at: string;
    deadline?: string | null;
    required_roles?: string[];
    tags?: string[];
    content_tags?: string[];
    owner?: {
        id: string;
        name: string;
        image: string;
        university: string;
    };
    pendingCount?: number; // 参加申請数（pending）
}

interface UserProjectPageProps {
    currentUser: Profile | null;
    onChat: (ownerId: string, ownerName: string, ownerImage: string) => void;
    sortOrder?: 'recommended' | 'newest' | 'deadline';
    filterCriteria?: FilterCriteria | null;
    onScroll?: (scrollY: number) => void;
}

// NOTE: 旧カードUIで使用していたROLE系定数は、ProjectSummaryCard移行により不要になりました。

const ProjectCard = ({ project, onPress, index = 0 }: { project: Project; onPress: () => void; index?: number }) => {
    // created_at は ProjectSummaryCard 側で日付表示

    // 登場アニメーション用
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        // インデックスに応じた遅延で登場アニメーション
        const delay = Math.min(index * 80, 400); // 最大400msの遅延

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                delay,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                delay,
                easing: Easing.out(Easing.back(1.2)),
                useNativeDriver: true,
            }),
        ]).start();
    }, [index]);

    // オーナー情報
    const projectData = project as any;
    const ownerImage = projectData.profiles?.image || projectData.owner?.image;
    const ownerName = projectData.profiles?.name || projectData.owner?.name || '不明';

    return (
        <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
        }}>
            <ProjectSummaryCard
                project={projectData}
                ownerName={ownerName}
                ownerImage={ownerImage}
                onPress={onPress}
            />
        </Animated.View>
    );
};

export function UserProjectPage({ currentUser, onChat, sortOrder = 'recommended', filterCriteria, onScroll }: UserProjectPageProps) {
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const queryClient = useQueryClient();
    const { session } = useAuth();
    const userId = session?.user?.id;

    // React Query hook - ブロックユーザーのプロジェクトを除外
    const projectsQuery = useProjectsList(sortOrder, userId);
    const projects: Project[] = projectsQuery.data || [];
    const loading = projectsQuery.isLoading;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await projectsQuery.refetch();
        setRefreshing(false);
    }, [projectsQuery]);

    // Realtime subscription for projects changes
    useEffect(() => {
        const projectsChannel = supabase
            .channel('public:projects')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(sortOrder, userId), refetchType: 'active' });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(sortOrder, userId), refetchType: 'active' });
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'projects' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(sortOrder, userId), refetchType: 'active' });
            })
            // 参加申請数(pendingCount)は project_applications の変更で変わるため、ここでも更新する
            .on('postgres_changes', { event: '*', schema: 'public', table: 'project_applications' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(sortOrder, userId), refetchType: 'active' });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(projectsChannel);
        };
    }, [sortOrder, userId, queryClient]);

    const handleCreatePress = () => {
        if (!currentUser) {
            Alert.alert('ログインが必要です', 'プロジェクトを作成するにはログインしてください');
            return;
        }
        setShowCreateModal(true);
    };

    // Filter projects
    const filteredProjects = projects.filter(project => {
        if (!filterCriteria) return true;

        const { keyword, themes, seekingRoles } = filterCriteria;

        // Keyword filter (Title, Description, Tags)
        if (keyword) {
            const lowerKeyword = keyword.toLowerCase();
            const matchTitle = project.title.toLowerCase().includes(lowerKeyword);
            const matchDesc = project.description.toLowerCase().includes(lowerKeyword);
            const matchTags = project.tags?.some(tag => tag.toLowerCase().includes(lowerKeyword)) || false;
            const matchRoles = project.required_roles?.some(role => translateTag(role).toLowerCase().includes(lowerKeyword)) || false;

            if (!matchTitle && !matchDesc && !matchTags && !matchRoles) return false;
        }

        // Theme filter (OR logic: show project if it has ANY of the selected themes)
        if (themes && themes.length > 0) {
            const hasMatchingTheme = project.tags?.some(tag => themes.includes(tag)) || false;
            if (!hasMatchingTheme) return false;
        }

        // Seeking Roles filter
        if (seekingRoles && seekingRoles.length > 0) {
            // Check if project requires ANY of the seeking roles
            // role IDs in project.required_roles might be "エンジニア" etc.
            // role IDs in filter might be "engineer" etc.
            // We need to match them. FilterModal uses "engineer", "designer".
            // CreateProjectModal uses "エンジニア", "デザイナー".
            // We need a mapping or check `label`.

            // Actually, CreateProjectModal saves "エンジニア".
            // FilterModal uses IDs "engineer", "designer".
            // SEEKING_ROLE_OPTIONS in FilterModal has labels "エンジニア", "デザイナー".

            // Helper to map filter IDs to Japanese labels
            const roleMap: { [key: string]: string } = {
                'engineer': 'エンジニア',
                'designer': 'デザイナー',
                'marketer': 'マーケター',
                'ideaman': 'アイディアマン',
                'creator': 'クリエイター',
                'anyone': '誰でも'
            };

            const selectedRoleLabels = seekingRoles.map(r => roleMap[r] || r);
            const hasMatchingRole = project.required_roles?.some(role => selectedRoleLabels.includes(role)) || false;

            if (!hasMatchingRole) return false;
        }

        return true;
    });

    if (loading && !refreshing) {
        return (
            <View style={styles.container}>
                <ProjectListSkeleton count={5} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
                    onScroll?.(event.nativeEvent.contentOffset.y);
                }}
                refreshControl={
                    <CustomRefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        title="プロジェクトを更新"
                        progressViewOffset={130}
                    />
                }
            >
                <View style={[
                    styles.gridContainer,
                    // フィルタータグがアクティブな時は追加のパディング
                    ((filterCriteria?.themes && filterCriteria.themes.length > 0) ||
                        (filterCriteria?.seekingRoles && filterCriteria.seekingRoles.length > 0)) &&
                    { paddingTop: 172 }
                ]}>
                    {filteredProjects.length > 0 ? (
                        <View style={styles.grid}>
                            {filteredProjects.map((item, index) => (
                                <ProjectCard
                                    key={item.id}
                                    project={item}
                                    index={index}
                                    onPress={() => {
                                        setSelectedProject(item);
                                    }}
                                />
                            ))}
                        </View>
                    ) : (
                        <ProjectsEmptyState onCreateProject={handleCreatePress} />
                    )}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Create Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCreateModal(false)}
            >
                {currentUser && (
                    <CreateProjectModal
                        currentUser={currentUser}
                        onClose={() => setShowCreateModal(false)}
                        onCreated={() => {
                            setShowCreateModal(false);
                            queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(sortOrder) });
                        }}
                    />
                )}
            </Modal>

            {/* Detail Modal */}
            <Modal
                visible={!!selectedProject}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setSelectedProject(null)}
            >
                {selectedProject && (
                    <ProjectDetail
                        project={selectedProject}
                        currentUser={currentUser}
                        onClose={() => setSelectedProject(null)}
                        onChat={(id, name, image) => {
                            setSelectedProject(null);
                            onChat(id, name, image);
                        }}
                        onProjectUpdated={() => {
                            setSelectedProject(null);
                            queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(sortOrder) });
                        }}
                    />
                )}
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF3E0',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    gridContainer: {
        padding: 16,
        paddingTop: 132, // ヘッダー（absolute）の高さ分 + 余白
    },
    grid: {
        flexDirection: 'column',
        gap: 4,
    },
    card: {
        width: '100%',
        height: 105, // 高さを少し減らす
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
        gap: 10, // アイコンとコンテンツの間隔を調整
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
    cardContent: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    cardTitleContainer: {
        height: 44, // Fixed height for 2 lines (22 * 2)
        justifyContent: 'center',
        marginBottom: 6,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    cardTitle: {
        flex: 1,
        fontSize: 17,
        fontFamily: FONTS.bold,
        color: '#111827',
        lineHeight: 22,
    },
    cardTagline: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: '#6B7280',
        lineHeight: 18,
        marginTop: 2,
    },
    deadlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 107, 107, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginLeft: 8,
    },
    deadlineText: {
        fontSize: 11,
        color: '#FF6B6B',
        fontFamily: FONTS.semiBold,
        marginLeft: 3,
    },
    cardDescription: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    cardTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'nowrap', // 1行に収める
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
        overflow: 'hidden',
    },
    timeAgoContainer: {
        marginLeft: 'auto', // 右端に配置
        paddingLeft: 8,
    },
    timeAgoText: {
        fontSize: 10,
        fontFamily: FONTS.regular,
        color: '#9CA3AF',
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
    miniRoleTag: {
        backgroundColor: 'rgba(0, 150, 136, 0.25)',
        paddingHorizontal: 4,
        paddingVertical: 3,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    miniRoleTagText: {
        fontSize: 8,
        color: '#4DB6AC',
        fontWeight: '600',
    },
    miniThemeTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    miniThemeTagText: {
        fontSize: 11,
        color: '#6B7280',
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    authorIcon: {
        width: 22,
        height: 22,
        borderRadius: 11,
        marginRight: 8,
        backgroundColor: '#F3F4F6',
    },
    authorName: {
        fontSize: 12,
        color: '#111827',
        fontFamily: FONTS.medium,
        marginRight: 8,
        flexShrink: 1, // Allow shrinking if text is too long
    },
    timeAgo: {
        fontSize: 11,
        fontFamily: FONTS.regular,
        color: '#6B7280',
        marginRight: 'auto', // Push subsequent items (badge) to the right? No, removing auto to keep items together
        flexShrink: 0,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 100,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#009688',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
    },
    // 旧 cardNew 系スタイルは ProjectSummaryCard へ移行
});
