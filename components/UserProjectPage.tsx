import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Image, RefreshControl, ActivityIndicator, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { CreateProjectModal } from './CreateProjectModal';
import { ProjectDetail } from './ProjectDetail';

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
}

const ProjectCard = ({ project, onPress }: { project: Project; onPress: () => void }) => {
    const deadlineDate = project.deadline ? new Date(project.deadline) : null;
    const deadlineString = deadlineDate
        ? `${deadlineDate.getMonth() + 1}/${deadlineDate.getDate()}まで`
        : '';

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.cardInner}>
                <Image
                    source={{ uri: project.owner?.image || 'https://via.placeholder.com/50' }}
                    style={styles.authorIcon}
                />
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{project.title}</Text>
                        {deadlineString ? (
                            <View style={styles.deadlineBadge}>
                                <Ionicons name="time-outline" size={14} color="#D32F2F" />
                                <Text style={styles.deadlineText}>{deadlineString}</Text>
                            </View>
                        ) : null}
                    </View>
                    <Text style={styles.cardDescription} numberOfLines={2}>{project.description}</Text>

                    {((project.required_roles && project.required_roles.length > 0) || (project.tags && project.tags.length > 0)) && (
                        <View style={styles.cardTags}>
                            {project.required_roles?.map((role, i) => (
                                <View key={`role-${i}`} style={styles.miniRoleTag}>
                                    <Text style={styles.miniRoleTagText}>{role}</Text>
                                </View>
                            ))}
                            {project.tags?.map((tag, i) => (
                                <View key={`tag-${i}`} style={styles.miniThemeTag}>
                                    <Text style={styles.miniThemeTagText}>#{tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export function UserProjectPage({ currentUser, onChat }: UserProjectPageProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const fetchProjects = async () => {
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
                .order('created_at', { ascending: false });

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
    }, []);

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

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#009688" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#009688']}
                        tintColor="#009688"
                    />
                }
            >
                <View style={styles.gridContainer}>
                    {projects.length > 0 ? (
                        <View style={styles.grid}>
                            {projects.map((item) => (
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
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>まだプロジェクトがありません</Text>
                            <Text style={styles.emptySubText}>右下のボタンから最初のプロジェクトを作成しましょう！</Text>
                        </View>
                    )}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={handleCreatePress}>
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>

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
        gap: 12,
    },
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
    cardTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    miniRoleTag: {
        backgroundColor: '#E0F2F1',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    miniRoleTagText: {
        fontSize: 11,
        color: '#009688',
        fontWeight: '600',
    },
    miniThemeTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    miniThemeTagText: {
        fontSize: 11,
        color: '#4B5563',
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
