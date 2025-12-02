import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions, Alert, ActivityIndicator, SafeAreaView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface Project {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
    owner_id: string;
    created_at: string;
    deadline?: string | null;
    owner?: {
        id: string;
        name: string;
        image: string;
        university: string;
    };
}

interface ProjectDetailProps {
    project: Project;
    currentUser: Profile | null;
    onClose: () => void;
    onChat: (ownerId: string, ownerName: string, ownerImage: string) => void;
}

interface Applicant {
    id: string;
    user_id: string;
    status: 'pending' | 'approved' | 'rejected';
    user: {
        id: string;
        name: string;
        image: string;
        university: string;
    };
}

export function ProjectDetail({ project, currentUser, onClose, onChat }: ProjectDetailProps) {
    const [owner, setOwner] = useState<any>(project.owner || null);
    const [loading, setLoading] = useState(!project.owner);
    const [applying, setApplying] = useState(false);
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [hasApplied, setHasApplied] = useState(false);

    useEffect(() => {
        if (!owner) {
            fetchOwner();
        }
        fetchApplicants();
    }, []);

    const fetchOwner = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, image, university')
                .eq('id', project.owner_id)
                .single();

            if (error) throw error;
            setOwner(data);
        } catch (error) {
            console.error('Error fetching owner:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchApplicants = async () => {
        try {
            const { data, error } = await supabase
                .from('project_applications')
                .select(`
          id,
          user_id,
          status,
          user:profiles!user_id (
            id,
            name,
            image,
            university
          )
        `)
                .eq('project_id', project.id);

            if (error) throw error;

            if (data) {
                // Cast data to Applicant[] because supabase types might not be perfectly inferred
                const formattedApplicants = data.map((item: any) => ({
                    id: item.id,
                    user_id: item.user_id,
                    status: item.status,
                    user: item.user
                }));
                setApplicants(formattedApplicants);

                if (currentUser) {
                    const applied = formattedApplicants.some(a => a.user_id === currentUser.id);
                    setHasApplied(applied);
                }
            }
        } catch (error) {
            console.error('Error fetching applicants:', error);
        }
    };

    const handleApply = async () => {
        if (!currentUser) {
            Alert.alert('エラー', 'ログインが必要です');
            return;
        }
        if (currentUser.id === project.owner_id) {
            Alert.alert('通知', '自分のプロジェクトには応募できません');
            return;
        }
        if (hasApplied) {
            Alert.alert('通知', 'すでに応募済みです');
            return;
        }

        setApplying(true);
        try {
            // Create application record
            const { error: appError } = await supabase
                .from('project_applications')
                .insert({
                    project_id: project.id,
                    user_id: currentUser.id,
                    status: 'pending'
                });

            if (appError) throw appError;

            // Send notification to owner
            const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                    user_id: project.owner_id,
                    sender_id: currentUser.id,
                    type: 'match',
                    title: 'プロジェクトへの応募',
                    content: `${currentUser.name}さんが「${project.title}」に応募しました！`,
                    image_url: currentUser.image
                });

            if (notifError) console.error('Notification error:', notifError);

            Alert.alert('完了', '応募が完了しました！オーナーからの連絡をお待ちください。');
            setHasApplied(true);
            fetchApplicants(); // Refresh list
        } catch (error) {
            console.error('Error applying:', error);
            Alert.alert('エラー', '応募に失敗しました');
        } finally {
            setApplying(false);
        }
    };

    const handleMessage = () => {
        if (!currentUser) {
            Alert.alert('エラー', 'ログインが必要です');
            return;
        }
        if (currentUser.id === project.owner_id) {
            Alert.alert('通知', '自分自身にはメッセージを送れません');
            return;
        }
        if (owner) {
            onChat(owner.id, owner.name, owner.image);
        }
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '期限なし';
        const date = new Date(dateString);
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#009688" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color="#374151" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Image
                    source={{ uri: project.image_url || 'https://via.placeholder.com/400x300?text=No+Image' }}
                    style={styles.coverImage}
                />

                <View style={styles.infoContainer}>
                    <Text style={styles.title}>{project.title}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.ownerRow}>
                            <Image
                                source={{ uri: owner?.image || 'https://via.placeholder.com/40' }}
                                style={styles.ownerImage}
                            />
                            <View>
                                <Text style={styles.ownerLabel}>発起人</Text>
                                <Text style={styles.ownerName}>{owner?.name} ({owner?.university})</Text>
                            </View>
                        </View>

                        <View style={styles.deadlineBadge}>
                            <Ionicons name="time-outline" size={16} color="#B91C1C" />
                            <Text style={styles.deadlineText}>期限: {formatDate(project.deadline)}</Text>
                        </View>
                    </View>

                    {/* Applicants Section */}
                    <View style={styles.applicantsSection}>
                        <Text style={styles.sectionTitle}>
                            参加申請中のメンバー ({applicants.length}人)
                        </Text>
                        {applicants.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.applicantsList}>
                                {applicants.map((applicant) => (
                                    <View key={applicant.id} style={styles.applicantItem}>
                                        <Image
                                            source={{ uri: applicant.user.image || 'https://via.placeholder.com/40' }}
                                            style={styles.applicantImage}
                                        />
                                        <Text style={styles.applicantName} numberOfLines={1}>
                                            {applicant.user.name}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.noApplicantsText}>まだ申請者はいません</Text>
                        )}
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>プロジェクト詳細</Text>
                    <Text style={styles.description}>{project.description}</Text>
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                    <Ionicons name="chatbubble-outline" size={20} color="#009688" />
                    <Text style={styles.messageButtonText}>メッセージ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.applyButton,
                        (applying || hasApplied || currentUser?.id === project.owner_id) && styles.disabledButton
                    ]}
                    onPress={handleApply}
                    disabled={applying || hasApplied || currentUser?.id === project.owner_id}
                >
                    {applying ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.applyButtonText}>
                            {hasApplied ? '応募済み' : currentUser?.id === project.owner_id ? '自分のプロジェクト' : '参加を申請する'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        position: 'absolute',
        top: 40,
        left: 0,
        zIndex: 10,
        padding: 16,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    content: {
        flex: 1,
    },
    coverImage: {
        width: '100%',
        height: 300,
        resizeMode: 'cover',
    },
    infoContainer: {
        padding: 24,
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
        lineHeight: 32,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 12,
    },
    ownerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ownerImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    ownerLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    ownerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    deadlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        gap: 4,
    },
    deadlineText: {
        fontSize: 14,
        color: '#B91C1C',
        fontWeight: '600',
    },
    applicantsSection: {
        marginBottom: 24,
    },
    applicantsList: {
        flexDirection: 'row',
        marginTop: 12,
    },
    applicantItem: {
        alignItems: 'center',
        marginRight: 16,
        width: 60,
    },
    applicantImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginBottom: 4,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    applicantName: {
        fontSize: 12,
        color: '#4B5563',
        textAlign: 'center',
    },
    noApplicantsText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontStyle: 'italic',
        marginTop: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        color: '#4B5563',
        lineHeight: 26,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 34,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        backgroundColor: 'white',
        gap: 12,
    },
    messageButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F0FDFA',
        borderWidth: 1,
        borderColor: '#009688',
        gap: 8,
    },
    messageButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#009688',
    },
    applyButton: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#009688',
        shadowColor: '#009688',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        backgroundColor: '#9CA3AF',
        shadowOpacity: 0,
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
});
