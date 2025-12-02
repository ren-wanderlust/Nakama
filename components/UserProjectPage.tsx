import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, ImageBackground, RefreshControl, ActivityIndicator, Modal, Alert } from 'react-native';
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
}

interface UserProjectPageProps {
    currentUser: Profile | null;
    onChat: (ownerId: string, ownerName: string, ownerImage: string) => void;
}

const ProjectCard = ({ project, onPress }: { project: Project; onPress: () => void }) => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
        <ImageBackground
            source={{ uri: project.image_url || 'https://via.placeholder.com/300x200?text=No+Image' }}
            style={styles.cardBackground}
            imageStyle={{ borderRadius: 16 }}
        >
            <View style={styles.cardOverlay}>
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{project.title}</Text>
                </View>
                <View style={styles.cardFooter}>
                    <View style={styles.actionLink}>
                        <Text style={styles.actionLinkText}>👉 詳細を見る</Text>
                    </View>
                </View>
            </View>
        </ImageBackground>
    </TouchableOpacity>
);

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
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                setProjects(data);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
            // Don't alert on initial load if table doesn't exist yet to avoid annoying user before setup
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
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    card: {
        width: (Dimensions.get('window').width - 32 - 12) / 2,
        height: (Dimensions.get('window').width - 32 - 12) / 2 * 1.1,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 4,
    },
    cardBackground: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    cardOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 12,
        justifyContent: 'flex-end',
    },
    cardContent: {
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    cardFooter: {
        width: '100%',
    },
    actionLink: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.3)',
        paddingTop: 6,
    },
    actionLinkText: {
        fontSize: 11,
        color: '#FFEB3B',
        fontWeight: 'bold',
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
        bottom: 100, // Adjusted to avoid overlap with bottom nav
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
