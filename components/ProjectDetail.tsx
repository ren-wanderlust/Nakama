import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions, Alert, ActivityIndicator, SafeAreaView, FlatList, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { CreateProjectModal } from './CreateProjectModal';
import { getUserPushTokens, sendPushNotification } from '../lib/notifications';
import { getRoleColors, getRoleIcon } from '../constants/RoleConstants';
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
    status?: string; // 'recruiting' | 'closed'
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
    onProjectUpdated?: () => void;
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

export function ProjectDetail({ project, currentUser, onClose, onChat, onProjectUpdated }: ProjectDetailProps) {
    const [owner, setOwner] = useState<any>(project.owner || null);
    const [loading, setLoading] = useState(!project.owner);
    const [applying, setApplying] = useState(false);
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [hasApplied, setHasApplied] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<string>(project.status || 'recruiting');

    // プロジェクトのステータスがプロップス変更で更新された場合に備えて同期
    useEffect(() => {
        if (project.status) {
            setCurrentStatus(project.status);
        }
    }, [project.status]);

    const [showEditModal, setShowEditModal] = useState(false);

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
            // Check current application count (pending + approved applications)
            const { count, error: countError } = await supabase
                .from('project_applications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', currentUser.id)
                .in('status', ['pending', 'approved']);

            if (countError) throw countError;

            if (count !== null && count >= 5) {
                Alert.alert(
                    '応募制限',
                    '同時に応募できるプロジェクトは最大5つまでです。\n\n既存の応募がステータス更新されるか、プロジェクトから退出してから新たに応募してください。'
                );
                setApplying(false);
                return;
            }

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
                    type: 'application',
                    title: 'プロジェクトへの応募',
                    content: `${currentUser.name}さんが「${project.title}」に応募しました！`,
                    image_url: currentUser.image
                });

            if (notifError) console.error('Notification error:', notifError);

            // Send push notification to project owner
            try {
                const tokens = await getUserPushTokens(project.owner_id);
                for (const token of tokens) {
                    await sendPushNotification(
                        token,
                        'プロジェクトへの応募 📋',
                        `${currentUser.name}さんが「${project.title}」に応募しました！`,
                        { type: 'application', senderId: currentUser.id, projectId: project.id }
                    );
                }
            } catch (pushError) {
                console.log('Push notification error:', pushError);
            }

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

    const updateApplicantStatus = async (applicationId: string, newStatus: 'approved' | 'rejected', userName: string) => {
        try {
            const { error } = await supabase
                .from('project_applications')
                .update({ status: newStatus })
                .eq('id', applicationId);

            if (error) throw error;

            // Send notification to the applicant
            const applicant = applicants.find(a => a.id === applicationId);
            if (applicant) {
                const { error: notifError } = await supabase
                    .from('notifications')
                    .insert({
                        user_id: applicant.user_id,
                        sender_id: currentUser?.id,
                        type: 'application_status',
                        title: newStatus === 'approved' ? 'プロジェクト参加承認' : 'プロジェクト参加見送り',
                        content: newStatus === 'approved'
                            ? `「${project.title}」への参加が承認されました！`
                            : `「${project.title}」への参加は見送られました。`,
                        image_url: project.image_url || currentUser?.image
                    });

                if (notifError) console.error('Notification error:', notifError);

                // Send push notification to applicant
                try {
                    const tokens = await getUserPushTokens(applicant.user_id);
                    for (const token of tokens) {
                        await sendPushNotification(
                            token,
                            newStatus === 'approved' ? 'プロジェクト参加承認 🎉' : 'プロジェクト参加見送り',
                            newStatus === 'approved'
                                ? `「${project.title}」への参加が承認されました！`
                                : `「${project.title}」への参加は見送られました。`,
                            { type: 'application_status', status: newStatus, projectId: project.id }
                        );
                    }
                } catch (pushError) {
                    console.log('Push notification error:', pushError);
                }
            }

            Alert.alert('完了', `${userName}さんを${newStatus === 'approved' ? '承認' : '棄却'}しました`);

            if (newStatus === 'approved') {
                // Check if total members >= 2 (Owner + at least 1 approved applicant)
                const { count } = await supabase
                    .from('project_applications')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', project.id)
                    .eq('status', 'approved');

                const totalMembers = (count || 0) + 1; // +1 for owner

                if (totalMembers >= 2) {
                    // Check if chat room already exists
                    const { data: existingRoom } = await supabase
                        .from('chat_rooms')
                        .select('id')
                        .eq('project_id', project.id)
                        .single();

                    if (!existingRoom) {
                        // Create team chat room
                        const { error: createRoomError } = await supabase
                            .from('chat_rooms')
                            .insert({
                                project_id: project.id,
                                type: 'group'
                            });

                        if (!createRoomError) {
                            Alert.alert('チームチャット作成', 'メンバーが2名以上になったため、チームチャットが自動作成されました！「トーク」タブから確認できます。');
                        } else {
                            console.error('Error creating chat room:', createRoomError);
                        }
                    }
                }
            }

            fetchApplicants();

            // Update the project list in MyPage to reflect pending count changes
            if (onProjectUpdated) onProjectUpdated();
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert('エラー', 'ステータスの更新に失敗しました');
        }
    };

    const handleApplicantPress = (applicant: Applicant) => {
        if (currentUser?.id !== project.owner_id) return;

        if (applicant.status === 'pending') {
            Alert.alert(
                '申請の管理',
                `${applicant.user.name}さんからの申請をどうしますか？`,
                [
                    { text: 'キャンセル', style: 'cancel' },
                    {
                        text: '棄却する',
                        style: 'destructive',
                        onPress: () => updateApplicantStatus(applicant.id, 'rejected', applicant.user.name)
                    },
                    {
                        text: '承認する',
                        style: 'default',
                        onPress: () => updateApplicantStatus(applicant.id, 'approved', applicant.user.name)
                    }
                ]
            );
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'プロジェクト削除',
            '本当にこのプロジェクトを削除しますか？この操作は取り消せません。',
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '削除',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const { error } = await supabase
                                .from('projects')
                                .delete()
                                .eq('id', project.id);
                            if (error) throw error;

                            Alert.alert(
                                '完了',
                                'プロジェクトを削除しました',
                                [{
                                    text: 'OK',
                                    onPress: () => {
                                        if (onProjectUpdated) onProjectUpdated();
                                        else onClose();
                                    }
                                }]
                            );
                        } catch (error) {
                            console.error('Error deleting project:', error);
                            Alert.alert('エラー', '削除に失敗しました');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleToggleStatus = () => {
        const newStatus = currentStatus === 'recruiting' ? 'closed' : 'recruiting';
        const actionText = newStatus === 'closed' ? '募集を終了' : '募集を再開';

        Alert.alert(
            `${actionText}しますか？`,
            newStatus === 'closed'
                ? '募集を終了すると、新規の応募を受け付けられなくなります。'
                : '募集を再開すると、再び応募を受け付けられるようになります。',
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '実行',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('projects')
                                .update({ status: newStatus })
                                .eq('id', project.id);

                            if (error) throw error;

                            setCurrentStatus(newStatus);
                            if (onProjectUpdated) onProjectUpdated();

                            Alert.alert('完了', `プロジェクトの${actionText}しました`);
                        } catch (error) {
                            console.error('Error updating status:', error);
                            Alert.alert('エラー', 'ステータスの更新に失敗しました。データベースのカラム設定が必要な場合があります。');
                        }
                    }
                }
            ]
        );
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
                {currentUser?.id === project.owner_id && (
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.actionButton}>
                            <Ionicons name="create-outline" size={24} color="#374151" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
                            <Ionicons name="trash-outline" size={24} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <Modal
                visible={showEditModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowEditModal(false)}
            >
                {currentUser && (
                    <CreateProjectModal
                        currentUser={currentUser}
                        onClose={() => setShowEditModal(false)}
                        onCreated={() => {
                            setShowEditModal(false);
                            // Wait for modal to close before closing parent to avoid black screen
                            setTimeout(() => {
                                if (onProjectUpdated) onProjectUpdated();
                                else onClose();
                            }, 500);
                        }}
                        project={project}
                    />
                )}
            </Modal>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.infoContainer}>
                    <Text style={styles.title}>{project.title}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.ownerRow}>
                            <Image
                                source={getImageSource(owner?.image)}
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
                    {/* Approved Members Section */}
                    <View style={styles.applicantsSection}>
                        <Text style={styles.sectionTitle}>
                            参加メンバー ({applicants.filter(a => a.status === 'approved').length}人)
                        </Text>
                        {applicants.filter(a => a.status === 'approved').length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.applicantsList}>
                                {applicants.filter(a => a.status === 'approved').map((applicant) => (
                                    <View key={applicant.id} style={styles.applicantItem}>
                                        <Image
                                            source={getImageSource(applicant.user.image)}
                                            style={styles.applicantImage}
                                        />
                                        <Text style={styles.applicantName} numberOfLines={1}>
                                            {applicant.user.name}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.noApplicantsText}>まだ参加メンバーはいません</Text>
                        )}
                    </View>

                    {/* Pending Applications Section (Owner Only) */}
                    {currentUser?.id === project.owner_id && (
                        <View style={styles.applicantsSection}>
                            <Text style={styles.sectionTitle}>
                                申請中のメンバー ({applicants.filter(a => a.status === 'pending').length}人)
                            </Text>
                            {applicants.filter(a => a.status === 'pending').length > 0 ? (
                                <View style={styles.pendingCardsList}>
                                    {applicants.filter(a => a.status === 'pending').map((applicant) => (
                                        <View key={applicant.id} style={styles.pendingCard}>
                                            <View style={styles.pendingCardHeader}>
                                                <Image
                                                    source={getImageSource(applicant.user.image)}
                                                    style={styles.pendingCardImage}
                                                />
                                                <View style={styles.pendingCardInfo}>
                                                    <Text style={styles.pendingCardName} numberOfLines={1}>
                                                        {applicant.user.name}
                                                    </Text>
                                                    <Text style={styles.pendingCardUniversity} numberOfLines={1}>
                                                        {applicant.user.university || '所属なし'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.pendingCardActions}>
                                                <TouchableOpacity
                                                    style={styles.rejectButton}
                                                    onPress={() => updateApplicantStatus(applicant.id, 'rejected', applicant.user.name)}
                                                >
                                                    <Ionicons name="close" size={18} color="#EF4444" />
                                                    <Text style={styles.rejectButtonText}>棄却</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.approveButton}
                                                    onPress={() => updateApplicantStatus(applicant.id, 'approved', applicant.user.name)}
                                                >
                                                    <Ionicons name="checkmark" size={18} color="white" />
                                                    <Text style={styles.approveButtonText}>承認</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <Text style={styles.noApplicantsText}>現在、申請はありません</Text>
                            )}
                        </View>
                    )}

                    <View style={styles.divider} />

                    {/* Tags Section */}
                    {((project.required_roles && project.required_roles.length > 0) || (project.tags && project.tags.length > 0)) && (
                        <>
                            <View style={styles.tagsSection}>
                                {project.required_roles && project.required_roles.length > 0 && (
                                    <View style={styles.tagGroup}>
                                        <Text style={styles.tagLabel}>募集メンバー</Text>
                                        <View style={styles.tagContainer}>
                                            {project.required_roles.map((role, index) => {
                                                const roleColors = getRoleColors(role);
                                                const roleIcon = getRoleIcon(role);
                                                return (
                                                    <View
                                                        key={index}
                                                        style={[
                                                            styles.roleTag,
                                                            { backgroundColor: roleColors.bg, borderColor: roleColors.border }
                                                        ]}
                                                    >
                                                        <View style={[styles.roleTagIcon, { backgroundColor: roleColors.bg }]}>
                                                            <Ionicons name={roleIcon as any} size={14} color={roleColors.icon} />
                                                        </View>
                                                        <Text style={[styles.roleTagText, { color: roleColors.icon }]}>{role}</Text>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}

                                {project.tags && project.tags.length > 0 && (
                                    <View style={styles.tagGroup}>
                                        <Text style={styles.tagLabel}>テーマ</Text>
                                        <View style={styles.tagContainer}>
                                            {project.tags.map((tag, index) => (
                                                <View key={index} style={styles.themeTag}>
                                                    <Text style={styles.themeTagText}>#{tag}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                            <View style={styles.divider} />
                        </>
                    )}

                    <Text style={styles.sectionTitle}>プロジェクト詳細</Text>
                    <Text style={styles.description}>{project.description}</Text>
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.applyButton,
                        // 応募中でなく、オーナーでもない場合で、ステータスがclosedならdisabled
                        // オーナーは常に押せるようにする
                        (currentUser?.id !== project.owner_id && (applying || hasApplied || currentStatus === 'closed')) && styles.disabledButton,
                        // オーナー用スタイル（募集中の場合は警告色、終了中は再開色）
                        currentUser?.id === project.owner_id && (
                            currentStatus === 'recruiting' ? styles.closeRecruitmentButton : styles.reopenRecruitmentButton
                        ),
                        { flex: 1 }
                    ]}
                    onPress={currentUser?.id === project.owner_id ? handleToggleStatus : handleApply}
                    disabled={currentUser?.id !== project.owner_id && (applying || hasApplied || currentStatus === 'closed')}
                >
                    {applying ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.applyButtonText}>
                            {currentUser?.id === project.owner_id
                                ? (currentStatus === 'closed' ? '募集を再開する' : '募集を終了する')
                                : (currentStatus === 'closed'
                                    ? '募集終了'
                                    : hasApplied
                                        ? '応募済み'
                                        : '参加を申請する')
                            }
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView >
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
        right: 0,
        zIndex: 10,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
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
    infoContainer: {
        padding: 24,
        paddingTop: 100,
        backgroundColor: 'white',
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
    // New pending application card styles
    pendingCardsList: {
        gap: 12,
        marginTop: 12,
    },
    pendingCard: {
        backgroundColor: '#FFFBEB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    pendingCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    pendingCardImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#F59E0B',
    },
    pendingCardInfo: {
        flex: 1,
        marginLeft: 12,
    },
    pendingCardName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    pendingCardUniversity: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    pendingCardActions: {
        flexDirection: 'row',
        gap: 10,
    },
    rejectButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FECACA',
        gap: 4,
    },
    rejectButtonText: {
        color: '#EF4444',
        fontWeight: '600',
        fontSize: 14,
    },
    approveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#009688',
        gap: 4,
    },
    approveButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginBottom: 24,
    },
    tagsSection: {
        marginBottom: 24,
        gap: 16,
    },
    tagGroup: {
        gap: 8,
    },
    tagLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    roleTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F2F1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#B2DFDB',
    },
    roleTagIcon: {
        width: 22,
        height: 22,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    roleTagText: {
        fontSize: 13,
        fontWeight: '600',
    },
    themeTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    themeTagText: {
        color: '#4B5563',
        fontSize: 13,
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
    closeRecruitmentButton: {
        backgroundColor: '#EF4444', // 赤色（終了）
        shadowColor: '#EF4444',
    },
    reopenRecruitmentButton: {
        backgroundColor: '#F59E0B', // アンバー色（再開）
        shadowColor: '#F59E0B',
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    pendingBadgeContainer: {
        position: 'relative',
    },
    badgeIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'white',
        borderRadius: 8,
    },
    actionHint: {
        fontSize: 10,
        color: '#F59E0B',
        marginTop: 2,
    },
});
