import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Image, Modal, Alert } from 'react-native';
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
import { getImageSource } from '../constants/DefaultImages';

interface Project {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
    owner_id: string;
    created_at: string;
    deadline?: string | null;
    required_roles?: string[];
    tags?: string[];
    owner?: {
        id: string;
        name: string;
        image: string;
        university: string;
    };
}

interface UserProjectPageProps {
    currentUser: Profile | null;
    onChat: (ownerId: string, ownerName: string, ownerImage: string) => void;
    sortOrder?: 'recommended' | 'newest' | 'deadline';
    filterCriteria?: FilterCriteria | null;
}

// Role to icon mapping (matching CreateProjectModal)
const ROLE_ICONS: { [key: string]: string } = {
    'エンジニア': 'laptop',
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

const ProjectCard = ({ project, onPress }: { project: Project; onPress: () => void }) => {
    const deadlineDate = project.deadline ? new Date(project.deadline) : null;
    const deadlineString = deadlineDate
        ? `${deadlineDate.getMonth() + 1}/${deadlineDate.getDate()}まで`
        : '';
    const createdDate = new Date(project.created_at);
    const daysAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const timeAgo = daysAgo === 0 ? '今日' : daysAgo === 1 ? '昨日' : `${daysAgo}日前`;

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
            // Single icon in center (larger size)
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
            // Two icons side by side, centered vertically
            return (
                <View style={styles.iconsContainer}>
                    <View style={styles.iconSlotTwo}>
                        <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[0].colors.bg }]}>
                            <Ionicons
                                name={rolesWithIcons[0].icon as any}
                                size={20}
                                color={rolesWithIcons[0].colors.icon}
                            />
                        </View>
                    </View>
                    <View style={styles.iconSlotTwo}>
                        <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[1].colors.bg }]}>
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
                <View style={styles.iconsContainer}>
                    <View style={styles.iconSlotTop}>
                        <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[0].colors.bg }]}>
                            <Ionicons
                                name={rolesWithIcons[0].icon as any}
                                size={20}
                                color={rolesWithIcons[0].colors.icon}
                            />
                        </View>
                    </View>
                    <View style={styles.iconSlotTop}>
                        <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[1].colors.bg }]}>
                            <Ionicons
                                name={rolesWithIcons[1].icon as any}
                                size={20}
                                color={rolesWithIcons[1].colors.icon}
                            />
                        </View>
                    </View>
                    <View style={styles.iconSlotBottomCenter}>
                        <View style={[styles.iconCircle, { backgroundColor: rolesWithIcons[2].colors.bg }]}>
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
                <View style={styles.iconsContainer}>
                    {rolesWithIcons.map((item, i) => (
                        <View key={`icon-${i}`} style={styles.iconSlotGrid}>
                            <View style={[styles.iconCircle, { backgroundColor: item.colors.bg }]}>
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

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.cardInner}>
                {/* Role Icons Container */}
                {getIconLayout()}

                {/* Card Content */}
                <View style={styles.cardContent}>
                    {/* Title */}
                    <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle} numberOfLines={2}>{project.title}</Text>
                    </View>

                    {/* Author Info */}
                    <View style={styles.authorRow}>
                        <Image
                            source={getImageSource(project.owner?.image)}
                            style={styles.authorIcon}
                        />
                        <Text style={styles.authorName} numberOfLines={1}>
                            {project.owner?.name || '匿名'}
                            {project.owner?.university ? ` (${project.owner.university})` : ''}
                        </Text>
                        <Text style={styles.timeAgo}>{timeAgo}</Text>
                        {deadlineString ? (
                            <View style={styles.deadlineBadge}>
                                <Ionicons name="time-outline" size={12} color="#FF6B6B" />
                                <Text style={styles.deadlineText}>{deadlineString}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export function UserProjectPage({ currentUser, onChat, sortOrder = 'recommended', filterCriteria }: UserProjectPageProps) {
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const queryClient = useQueryClient();
    const { session } = useAuth();

    // React Query hook
    const projectsQuery = useProjectsList(sortOrder);
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
                queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(sortOrder) });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(sortOrder) });
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'projects' }, () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(sortOrder) });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(projectsChannel);
        };
    }, [sortOrder, queryClient]);

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
                'kabeuchi': '壁打ち相手',
                'other': 'その他'
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
                refreshControl={
                    <CustomRefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        title="プロジェクトを更新"
                    />
                }
            >
                <View style={styles.gridContainer}>
                    {filteredProjects.length > 0 ? (
                        <View style={styles.grid}>
                            {filteredProjects.map((item) => (
                                <ProjectCard
                                    key={item.id}
                                    project={item}
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
    },
    grid: {
        flexDirection: 'column',
        gap: 6,
    },
    card: {
        width: '100%',
        height: 100, // Fixed height
        borderRadius: 16,
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    cardInner: {
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
    cardContent: {
        flex: 1,
        justifyContent: 'center',
        height: '100%',
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
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: '#111827',
        lineHeight: 22,
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
});
