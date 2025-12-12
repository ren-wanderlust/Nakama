import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Image, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { CreateProjectModal } from './CreateProjectModal';
import { FilterCriteria } from './FilterModal';
import { ProjectDetail } from './ProjectDetail';
import { ProjectListSkeleton } from './Skeleton';
import { CustomRefreshControl } from './CustomRefreshControl';
import { RADIUS, COLORS, SHADOWS, SPACING, AVATAR } from '../constants/DesignSystem';
import { ProjectsEmptyState } from './EmptyState';
import { translateTag } from '../constants/TagConstants';

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

// Random emoji generator for project cards
const PROJECT_EMOJIS = ['🎉', '🚀', '🔥', '⚡', '💡', '✨', '🎯', '💪', '🌟', '🏆'];
const getRandomEmoji = (projectId: string) => {
    // Use project ID to consistently get same emoji for same project
    const hash = projectId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return PROJECT_EMOJIS[hash % PROJECT_EMOJIS.length];
};

// Dark gradient colors for cards
const CARD_GRADIENTS = [
    ['#1e3a5f', '#2d4a6f'], // Deep blue
    ['#1a2f4a', '#2a3f5a'], // Navy
    ['#0f2027', '#203a43'], // Dark teal
    ['#232526', '#414345'], // Charcoal
    ['#141e30', '#243b55'], // Midnight blue
];
const getCardGradient = (projectId: string) => {
    const hash = projectId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return CARD_GRADIENTS[hash % CARD_GRADIENTS.length];
};

const ProjectCard = ({ project, onPress }: { project: Project; onPress: () => void }) => {
    const deadlineDate = project.deadline ? new Date(project.deadline) : null;
    const deadlineString = deadlineDate
        ? `${deadlineDate.getMonth() + 1}/${deadlineDate.getDate()}まで`
        : '';
    const emoji = getRandomEmoji(project.id);
    const gradientColors = getCardGradient(project.id);
    const createdDate = new Date(project.created_at);
    const daysAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const timeAgo = daysAgo === 0 ? '今日' : daysAgo === 1 ? '昨日' : `${daysAgo}日前`;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.cardInner}>
                {/* Emoji Icon */}
                <View style={styles.emojiContainer}>
                    <Text style={styles.emojiText}>{emoji}</Text>
                </View>

                {/* Card Content */}
                <View style={styles.cardContent}>
                    {/* Title */}
                    <Text style={styles.cardTitle} numberOfLines={2}>{project.title}</Text>

                    {/* Tags */}
                    {project.required_roles && project.required_roles.length > 0 && (
                        <View style={styles.cardTags}>
                            {project.required_roles.slice(0, 2).map((role, i) => (
                                <View key={`role-${i}`} style={styles.miniRoleTag}>
                                    <Text style={styles.miniRoleTagText}>{translateTag(role)}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Author Info */}
                    <View style={styles.authorRow}>
                        <Image
                            source={{ uri: project.owner?.image || 'https://via.placeholder.com/50' }}
                            style={styles.authorIcon}
                        />
                        <Text style={styles.authorName} numberOfLines={1}>{project.owner?.name || '匿名'}</Text>
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
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const fetchProjects = async () => {
        try {
            let query = supabase
                .from('projects')
                .select(`
                    *,
                    owner:profiles!owner_id (
                        id,
                        name,
                        image,
                        university
                    )
                `);

            if (sortOrder === 'deadline') {
                query = query.order('deadline', { ascending: true });
            } else {
                query = query.order('created_at', { ascending: false });
            }

            const { data, error } = await query;

            if (error) throw error;

            if (data) {
                // Map the data to match the Project interface if necessary
                // Supabase returns owner as an object or array depending on relation type
                // Assuming one-to-one or many-to-one, it returns object.
                setProjects(data as any);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [sortOrder]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchProjects();
    }, []);

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
                            onRefresh();
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
                            onRefresh();
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
        backgroundColor: '#FAFAFA',
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
        gap: 16,
    },
    card: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    cardInner: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'flex-start',
        borderRadius: 16,
        backgroundColor: 'white',
    },
    emojiContainer: {
        width: 52,
        height: 52,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    emojiText: {
        fontSize: 28,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'flex-start',
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
        lineHeight: 22,
        marginBottom: 8,
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
        fontWeight: '600',
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
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    miniRoleTagText: {
        fontSize: 11,
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
        fontWeight: '500',
        marginRight: 8,
        maxWidth: 100,
    },
    timeAgo: {
        fontSize: 11,
        color: '#6B7280',
        marginRight: 'auto',
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
