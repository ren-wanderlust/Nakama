import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions, Alert, ActivityIndicator, SafeAreaView, FlatList, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { CreateProjectModal } from './CreateProjectModal';
import { ProfileDetail } from './ProfileDetail';
import { getUserPushTokens, sendPushNotification } from '../lib/notifications';
import { getRoleColors, getRoleIcon } from '../constants/RoleConstants';
import { getImageSource } from '../constants/DefaultImages';
import { queryKeys } from '../data/queryKeys';
import { buildSystemMessage } from '../constants/SystemMessage';

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
    status?: string; // 'recruiting' | 'closed'
    commitment_level?: string | null;
    goal?: string | null;
    duration?: string | null;
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
    message?: string | null;
    user: {
        id: string;
        name: string;
        image: string;
        university: string;
    };
}

export function ProjectDetail({ project, currentUser, onClose, onChat, onProjectUpdated }: ProjectDetailProps) {
    const queryClient = useQueryClient();
    const [owner, setOwner] = useState<any>(project.owner || null);
    const [loading, setLoading] = useState(!project.owner);
    const [applying, setApplying] = useState(false);
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [hasApplied, setHasApplied] = useState(false);
    const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

    // ProjectDetailが開いている間の外部更新を即時反映するための Realtime 管理
    const applicationsChannelRef = useRef<any>(null);
    const applicantsDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFetchingApplicantsRef = useRef(false);
    const pendingApplicantsRefetchRef = useRef(false);

    // 募集状態を判定する関数
    // statusは進捗状況（idea, planning, developing等）または募集状態（recruiting, closed）を含む可能性がある
    // 'closed'のみを停止状態として扱い、それ以外は全て募集中とする
    const getRecruitmentStatus = (status?: string): string => {
        if (status === 'closed') {
            return 'closed';
        }
        return 'recruiting'; // 進捗状況や未設定の場合は全て募集中として扱う
    };

    const [currentStatus, setCurrentStatus] = useState<string>(() => {
        return getRecruitmentStatus(project.status);
    });

    // プロジェクトのステータスがプロップス変更で更新された場合に備えて同期
    useEffect(() => {
        setCurrentStatus(getRecruitmentStatus(project.status));
    }, [project.status]);

    const [showEditModal, setShowEditModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState<string | null>(null); // ローディング中のユーザーIDを保持

    // 応募モーダル用のstate
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [applyMessage, setApplyMessage] = useState('');

    useEffect(() => {
        if (!owner) {
            fetchOwner();
        }
        fetchApplicants();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.id]);

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

    const fetchMemberProfile = async (userId: string) => {
        // 既にローディング中なら何もしない
        if (loadingProfile) return;

        setLoadingProfile(userId);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, age, university, company, grade, image, bio, skills, seeking_for, seeking_roles, status_tags, is_student, created_at, github_url')
                .eq('id', userId)
                .single();

            if (error) throw error;

            if (data) {
                const mappedProfile: Profile = {
                    id: data.id,
                    name: data.name,
                    age: data.age || 0,
                    university: data.university,
                    company: data.company,
                    grade: data.grade,
                    image: data.image,
                    challengeTheme: '',
                    theme: '',
                    bio: data.bio || '',
                    skills: data.skills || [],
                    seekingFor: data.seeking_for || [],
                    seekingRoles: data.seeking_roles || [],
                    statusTags: data.status_tags || [],
                    isStudent: data.is_student || false,
                    createdAt: data.created_at,
                    githubUrl: data.github_url,
                };
                setSelectedProfile(mappedProfile);
                setShowProfileModal(true);
            }
        } catch (error) {
            console.error('Error fetching member profile:', error);
            Alert.alert('エラー', 'プロフィールの取得に失敗しました');
        } finally {
            setLoadingProfile(null);
        }
    };

    const fetchApplicants = useCallback(async () => {
        // 多重実行防止（Realtime連打・画面内操作連打を想定）
        if (isFetchingApplicantsRef.current) {
            pendingApplicantsRefetchRef.current = true;
            return;
        }

        isFetchingApplicantsRef.current = true;
        try {
            const { data, error } = await supabase
                .from('project_applications')
                .select(`
          id,
          user_id,
          status,
          message,
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
                    message: item.message,
                    user: item.user
                }));
                setApplicants(formattedApplicants);

                if (currentUser) {
                    const myApp = formattedApplicants.find(a => a.user_id === currentUser.id);
                    setHasApplied(!!myApp);
                    setApplicationStatus(myApp ? myApp.status : null);
                }
            }
        } catch (error) {
            console.error('Error fetching applicants:', error);
        } finally {
            isFetchingApplicantsRef.current = false;
            if (pendingApplicantsRefetchRef.current) {
                pendingApplicantsRefetchRef.current = false;
                // 直後にもう一度だけ追いかける（最新化の取りこぼし防止）
                void fetchApplicants();
            }
        }
    }, [project.id, currentUser]);

    // project_applications の Realtime購読（project_id限定）→ applicants を即時更新
    useEffect(() => {
        if (!project?.id) return;

        // 念のため前回チャンネルが残っていたら掃除
        if (applicationsChannelRef.current) {
            supabase.removeChannel(applicationsChannelRef.current);
            applicationsChannelRef.current = null;
        }

        const channel = supabase
            .channel(`project_detail_applications_${project.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'project_applications', filter: `project_id=eq.${project.id}` },
                () => {
                    // 200msデバウンス（短時間に複数イベントが来ても1回にまとめる）
                    if (applicantsDebounceTimerRef.current) {
                        clearTimeout(applicantsDebounceTimerRef.current);
                    }
                    applicantsDebounceTimerRef.current = setTimeout(() => {
                        void fetchApplicants();
                    }, 200);
                }
            )
            .subscribe();

        applicationsChannelRef.current = channel;

        return () => {
            if (applicantsDebounceTimerRef.current) {
                clearTimeout(applicantsDebounceTimerRef.current);
                applicantsDebounceTimerRef.current = null;
            }
            supabase.removeChannel(channel);
            if (applicationsChannelRef.current === channel) {
                applicationsChannelRef.current = null;
            }
        };
    }, [project.id, fetchApplicants]);

    // 応募ボタンを押したときにモーダルを開く
    const handleApply = () => {
        if (!currentUser) {
            Alert.alert('エラー', 'ログインが必要です');
            return;
        }
        if (currentUser.id === project.owner_id) {
            Alert.alert('通知', '自分のプロジェクトには応募できません');
            return;
        }
        if (hasApplied && applicationStatus !== 'rejected') {
            Alert.alert('通知', 'すでに応募済みです');
            return;
        }
        // モーダルを開く
        setApplyMessage('');
        setShowApplyModal(true);
    };

    // 実際の応募処理
    const submitApplication = async () => {
        if (!currentUser) return;

        setApplying(true);
        setShowApplyModal(false);

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

            const messageToSave = applyMessage.trim() || null;

            if (hasApplied && applicationStatus === 'rejected') {
                // Re-apply: update existing application status to pending
                const { error: updateError } = await supabase
                    .from('project_applications')
                    .update({
                        status: 'pending',
                        created_at: new Date().toISOString(),
                        message: messageToSave
                    })
                    .eq('project_id', project.id)
                    .eq('user_id', currentUser.id);

                if (updateError) throw updateError;
            } else {
                // Create new application record
                const { error: appError } = await supabase
                    .from('project_applications')
                    .insert({
                        project_id: project.id,
                        user_id: currentUser.id,
                        status: 'pending',
                        message: messageToSave
                    });

                if (appError) throw appError;
            }

            // Send notification to owner
            const notificationContent = messageToSave
                ? `${currentUser.name}さんが「${project.title}」に応募しました！\n\n💬 ${messageToSave}`
                : `${currentUser.name}さんが「${project.title}」に応募しました！`;

            const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                    user_id: project.owner_id,
                    sender_id: currentUser.id,
                    project_id: project.id,  // プロジェクトID
                    type: 'application',
                    title: 'プロジェクトへの応募',
                    content: notificationContent,
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
            setApplyMessage('');
            // 応募直後に「応募」一覧（LikesPage等）を即時更新
            queryClient.invalidateQueries({ queryKey: queryKeys.projectApplications.applied(currentUser.id), refetchType: 'active' });
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
                        project_id: project.id,  // プロジェクトID
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

            // 承認/棄却直後に、対象ユーザー側の「応募」一覧を最新化（画面非表示でも次回表示で古いキャッシュが残らない）
            if (applicant?.user_id) {
                queryClient.invalidateQueries({ queryKey: queryKeys.projectApplications.applied(applicant.user_id), refetchType: 'active' });
            }

            let teamChatCreated = false;
            if (newStatus === 'approved') {
                // 承認されたユーザーの「参加中」を即時更新（実行者ではなく対象ユーザー）
                if (applicant?.user_id) {
                    queryClient.invalidateQueries({ queryKey: queryKeys.participatingProjects.detail(applicant.user_id), refetchType: 'active' });
                }

                // Check if total members >= 2 (Owner + at least 1 approved applicant)
                const { count } = await supabase
                    .from('project_applications')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', project.id)
                    .eq('status', 'approved');

                const totalMembers = (count || 0) + 1; // +1 for owner

                if (totalMembers >= 2) {
                    // Check if chat room already exists
                    const { data: existingRoom, error: existingRoomError } = await supabase
                        .from('chat_rooms')
                        .select('id')
                        .eq('project_id', project.id)
                        .eq('type', 'group')
                        .order('created_at', { ascending: true })
                        .limit(1)
                        .maybeSingle();

                    if (existingRoomError) {
                        console.error('Error fetching existing chat room:', existingRoomError);
                    }

                    let chatRoomId: string | null = existingRoom?.id ?? null;

                    if (!existingRoom) {
                        // Create team chat room
                        const { data: createdRoom, error: createRoomError } = await supabase
                            .from('chat_rooms')
                            .insert({
                                project_id: project.id,
                                type: 'group'
                            })
                            .select('id')
                            .single();

                        if (!createRoomError) {
                            // Invalidate chat rooms query to refresh the list in TalkPage
                            if (currentUser?.id) {
                                queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(currentUser.id) });
                            }
                            teamChatCreated = true;
                            chatRoomId = createdRoom?.id ?? null;
                        } else {
                            console.error('Error creating chat room:', createRoomError);
                        }
                    }

                    // 参加承認時: システムメッセージをチームチャットに投稿
                    // NOTE: 既存スキーマを変えずに表示を「システム」扱いにするため、contentにプレフィックスを付ける
                    if (chatRoomId && currentUser?.id) {
                        const systemText = `${userName}がプロジェクトに参加しました`;
                        const { error: systemMsgError } = await supabase
                            .from('messages')
                            .insert({
                                sender_id: currentUser.id,
                                receiver_id: currentUser.id, // グループチャットの既存実装に合わせる
                                chat_room_id: chatRoomId,
                                content: buildSystemMessage(systemText),
                            });
                        if (systemMsgError) {
                            console.error('Error inserting system message:', systemMsgError);
                        }
                        // チャット一覧/未読を即時更新
                        queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(currentUser.id), refetchType: 'active' });
                        queryClient.invalidateQueries({ queryKey: queryKeys.messages.list(chatRoomId), refetchType: 'active' });
                    }
                }
            }

            // Show combined alert for approval and team chat creation
            if (newStatus === 'approved') {
                Alert.alert(
                    '完了',
                    `${userName}さんを承認しました`,
                    [{
                        text: 'OK',
                        onPress: () => {
                            if (teamChatCreated) {
                                Alert.alert(
                                    '🎉 チームチャット作成',
                                    'メンバーが2名以上になったため、チームチャットが自動作成されました！\n\n「トーク」タブから確認できます。'
                                );
                            }
                        }
                    }]
                );
            } else {
                Alert.alert('完了', `${userName}さんを棄却しました`);
            }

            // Invalidate React Query caches to sync with LikesPage
            if (currentUser?.id) {
                queryClient.invalidateQueries({ queryKey: queryKeys.projectApplications.recruiting(currentUser.id) });
                queryClient.invalidateQueries({ queryKey: queryKeys.projectApplications.applied(currentUser.id) });
                queryClient.invalidateQueries({ queryKey: queryKeys.myProjects.detail(currentUser.id) });
                queryClient.invalidateQueries({ queryKey: queryKeys.participatingProjects.detail(currentUser.id) });
            }

            fetchApplicants();

            // Update the project list in MyPage to reflect pending count changes
            if (onProjectUpdated) onProjectUpdated();
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert('エラー', 'ステータスの更新に失敗しました');
        }
    };

    // 棄却確認用のアラート（2段階確認）
    const handleRejectConfirmation = (applicationId: string, userName: string) => {
        Alert.alert(
            '⚠️ 棄却の確認',
            `${userName}さんの申請を棄却しますか？\n\nこの操作は取り消すことができません。\n慎重にご判断ください。`,
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '棄却する',
                    style: 'destructive',
                    onPress: () => {
                        // 2段階目の確認
                        Alert.alert(
                            '最終確認',
                            `本当に${userName}さんを棄却してよろしいですか？`,
                            [
                                { text: 'やめる', style: 'cancel' },
                                {
                                    text: '棄却する',
                                    style: 'destructive',
                                    onPress: () => updateApplicantStatus(applicationId, 'rejected', userName)
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    const handleApplicantPress = (applicant: Applicant) => {
        if (currentUser?.id !== project.owner_id) return;

        if (applicant.status === 'pending') {
            const messageContent = applicant.message
                ? `${applicant.user.name}さんからの申請をどうしますか？\n\n💬 メッセージ:\n「${applicant.message}」`
                : `${applicant.user.name}さんからの申請をどうしますか？`;

            Alert.alert(
                '申請の管理',
                messageContent,
                [
                    { text: 'キャンセル', style: 'cancel' },
                    {
                        text: '棄却する',
                        style: 'destructive',
                        onPress: () => handleRejectConfirmation(applicant.id, applicant.user.name)
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

    // メンバーキック処理
    const handleKickMember = (applicant: Applicant) => {
        if (currentUser?.id !== project.owner_id) return;

        Alert.alert(
            'メンバーを削除',
            `${applicant.user.name}さんをプロジェクトから削除しますか？\n\nこの操作を実行すると、メンバーはチームチャットからも除外されます。`,
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '削除する',
                    style: 'destructive',
                    onPress: () => {
                        // 2段階確認
                        Alert.alert(
                            '最終確認',
                            `本当に${applicant.user.name}さんを削除してよろしいですか？`,
                            [
                                { text: 'やめる', style: 'cancel' },
                                {
                                    text: '削除する',
                                    style: 'destructive',
                                    onPress: () => executeKickMember(applicant)
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    const executeKickMember = async (applicant: Applicant) => {
        try {
            // 1. プロジェクト応募を rejected に変更（削除ではなく履歴を残す）
            const { error: removeError } = await supabase
                .from('project_applications')
                .update({ status: 'rejected' })
                .eq('id', applicant.id);

            if (removeError) throw removeError;

            // 2. 通知を送信
            await supabase
                .from('notifications')
                .insert({
                    user_id: applicant.user_id,
                    sender_id: currentUser?.id,
                    project_id: project.id,
                    type: 'kicked',
                    title: 'プロジェクトからの除外',
                    content: `「${project.title}」からオーナーにより除外されました。`,
                    image_url: project.image_url || currentUser?.image
                });

            // 3. プッシュ通知を送信
            try {
                const tokens = await getUserPushTokens(applicant.user_id);
                for (const token of tokens) {
                    await sendPushNotification(
                        token,
                        'プロジェクトからの除外',
                        `「${project.title}」からオーナーにより除外されました。`,
                        { type: 'kicked', projectId: project.id }
                    );
                }
            } catch (pushError) {
                console.log('Push notification error:', pushError);
            }

            // 4. React Query のキャッシュを更新
            if (applicant.user_id) {
                queryClient.invalidateQueries({ queryKey: queryKeys.participatingProjects.detail(applicant.user_id), refetchType: 'active' });
                queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(applicant.user_id), refetchType: 'active' });
            }
            if (currentUser?.id) {
                queryClient.invalidateQueries({ queryKey: queryKeys.projectApplications.recruiting(currentUser.id) });
                queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(currentUser.id), refetchType: 'active' });
            }

            Alert.alert('完了', `${applicant.user.name}さんをプロジェクトから削除しました`);
            fetchApplicants();

            if (onProjectUpdated) onProjectUpdated();
        } catch (error) {
            console.error('Error kicking member:', error);
            Alert.alert('エラー', 'メンバーの削除に失敗しました');
        }
    };

    // プロジェクト脱退処理（メンバー用）
    const handleLeaveProject = () => {
        if (!currentUser) return;

        // 自分がメンバーかどうか確認
        const myApplication = applicants.find(a => a.user_id === currentUser.id && a.status === 'approved');
        if (!myApplication) {
            Alert.alert('エラー', 'あなたはこのプロジェクトのメンバーではありません');
            return;
        }

        Alert.alert(
            'プロジェクトを脱退',
            `「${project.title}」から脱退しますか？\n\n脱退するとチームチャットからも除外されます。`,
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '脱退する',
                    style: 'destructive',
                    onPress: () => {
                        // 2段階確認
                        Alert.alert(
                            '最終確認',
                            '本当にこのプロジェクトから脱退してよろしいですか？',
                            [
                                { text: 'やめる', style: 'cancel' },
                                {
                                    text: '脱退する',
                                    style: 'destructive',
                                    onPress: () => executeLeaveProject(myApplication.id)
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    const executeLeaveProject = async (applicationId: string) => {
        if (!currentUser) return;

        try {
            // 1. プロジェクト応募を rejected に変更（削除ではなく履歴を残す）
            const { error: leaveError } = await supabase
                .from('project_applications')
                .update({ status: 'rejected' })
                .eq('id', applicationId);

            if (leaveError) throw leaveError;

            // 2. オーナーに通知を送信
            await supabase
                .from('notifications')
                .insert({
                    user_id: project.owner_id,
                    sender_id: currentUser.id,
                    project_id: project.id,
                    type: 'member_left',
                    title: 'メンバーがプロジェクトを脱退しました',
                    content: `${currentUser.name}さんが「${project.title}」から脱退しました。`,
                    image_url: currentUser.image
                });

            // 3. オーナーにプッシュ通知を送信
            try {
                const tokens = await getUserPushTokens(project.owner_id);
                for (const token of tokens) {
                    await sendPushNotification(
                        token,
                        'メンバー脱退のお知らせ',
                        `${currentUser.name}さんが「${project.title}」から脱退しました。`,
                        { type: 'member_left', projectId: project.id }
                    );
                }
            } catch (pushError) {
                console.log('Push notification error:', pushError);
            }

            // 4. チームチャットにシステムメッセージを投稿
            const { data: chatRoom } = await supabase
                .from('chat_rooms')
                .select('id')
                .eq('project_id', project.id)
                .eq('type', 'group')
                .maybeSingle();

            if (chatRoom?.id) {
                const systemText = `${currentUser.name}がプロジェクトから脱退しました`;
                await supabase
                    .from('messages')
                    .insert({
                        sender_id: currentUser.id,
                        receiver_id: currentUser.id,
                        chat_room_id: chatRoom.id,
                        content: buildSystemMessage(systemText),
                    });
            }

            // 5. React Query のキャッシュを更新
            queryClient.invalidateQueries({ queryKey: queryKeys.participatingProjects.detail(currentUser.id), refetchType: 'active' });
            queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(currentUser.id), refetchType: 'active' });
            queryClient.invalidateQueries({ queryKey: queryKeys.projectApplications.applied(currentUser.id), refetchType: 'active' });

            Alert.alert(
                '完了',
                'プロジェクトから脱退しました',
                [{
                    text: 'OK',
                    onPress: () => {
                        if (onProjectUpdated) onProjectUpdated();
                        onClose();
                    }
                }]
            );
        } catch (error) {
            console.error('Error leaving project:', error);
            Alert.alert('エラー', 'プロジェクトからの脱退に失敗しました');
        }
    };

    // 現在のユーザーがメンバーかどうかを判定
    const isMember = currentUser && applicants.some(a => a.user_id === currentUser.id && a.status === 'approved');

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
                {currentUser?.id === project.owner_id ? (
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.actionButton}>
                            <Ionicons name="create-outline" size={24} color="#374151" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
                            <Ionicons name="trash-outline" size={24} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                ) : isMember ? (
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={handleLeaveProject} style={styles.actionButton}>
                            <Ionicons name="exit-outline" size={24} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                ) : null}
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

            {/* Apply Modal */}
            <Modal
                visible={showApplyModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowApplyModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.applyModalOverlay}
                >
                    <View style={styles.applyModalContainer}>
                        <View style={styles.applyModalHeader}>
                            <Text style={styles.applyModalTitle}>プロジェクトに応募</Text>
                            <TouchableOpacity
                                onPress={() => setShowApplyModal(false)}
                                style={styles.applyModalCloseButton}
                            >
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.applyModalSubtitle}>
                            「{project.title}」への参加を希望します
                        </Text>

                        <View style={styles.applyMessageContainer}>
                            <Text style={styles.applyMessageLabel}>
                                一言メッセージ（任意）
                            </Text>
                            <TextInput
                                style={styles.applyMessageInput}
                                placeholder="例: エンジニア経験3年です。&#10;一緒に開発できると嬉しいです！"
                                placeholderTextColor="#9CA3AF"
                                value={applyMessage}
                                onChangeText={setApplyMessage}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                maxLength={200}
                            />
                            <Text style={styles.applyMessageCharCount}>
                                {applyMessage.length}/200
                            </Text>
                        </View>

                        <View style={styles.applyModalButtons}>
                            <TouchableOpacity
                                style={styles.applyModalCancelButton}
                                onPress={() => setShowApplyModal(false)}
                            >
                                <Text style={styles.applyModalCancelText}>キャンセル</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.applyModalSubmitButton}
                                onPress={submitApplication}
                            >
                                <Ionicons name="paper-plane" size={18} color="white" />
                                <Text style={styles.applyModalSubmitText}>応募する</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.infoContainer}>
                    <Text style={styles.title}>{project.title}</Text>

                    {/* Tagline */}
                    {project.tagline && (
                        <Text style={styles.tagline}>{project.tagline}</Text>
                    )}

                    <View style={styles.metaRow}>
                        <TouchableOpacity
                            style={styles.ownerRow}
                            onPress={() => fetchMemberProfile(project.owner_id)}
                            activeOpacity={0.7}
                            disabled={loadingProfile === project.owner_id}
                        >
                            <Image
                                source={getImageSource(owner?.image)}
                                style={styles.ownerImage}
                            />
                            <View style={styles.ownerInfo}>
                                <Text style={styles.ownerLabel}>発起人</Text>
                                <Text style={styles.ownerName}>{owner?.name} ({owner?.university})</Text>
                            </View>
                            {loadingProfile === project.owner_id ? (
                                <ActivityIndicator size="small" color="#009688" />
                            ) : (
                                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            )}
                        </TouchableOpacity>

                        <View style={styles.deadlineBadge}>
                            <Ionicons name="time-outline" size={16} color="#B91C1C" />
                            <Text style={styles.deadlineText}>期限: {formatDate(project.deadline)}</Text>
                        </View>

                        {/* コミット量・ゴール・期間を表示 */}
                        {(project.commitment_level || project.goal || project.duration) && (
                            <View style={styles.projectDetailsContainer}>
                                {project.commitment_level && (
                                    <View style={styles.projectDetailItem}>
                                        <View style={styles.projectDetailIconContainer}>
                                            <Ionicons name="time" size={16} color="#3B82F6" />
                                        </View>
                                        <View style={styles.projectDetailContent}>
                                            <Text style={styles.projectDetailLabel}>求めるコミット量</Text>
                                            <Text style={styles.projectDetailValue}>{project.commitment_level}</Text>
                                        </View>
                                    </View>
                                )}
                                {project.goal && (
                                    <View style={styles.projectDetailItem}>
                                        <View style={styles.projectDetailIconContainer}>
                                            <Ionicons name="flag" size={16} color="#10B981" />
                                        </View>
                                        <View style={styles.projectDetailContent}>
                                            <Text style={styles.projectDetailLabel}>ゴール</Text>
                                            <Text style={styles.projectDetailValue}>{project.goal}</Text>
                                        </View>
                                    </View>
                                )}
                                {project.duration && (
                                    <View style={styles.projectDetailItem}>
                                        <View style={styles.projectDetailIconContainer}>
                                            <Ionicons name="hourglass" size={16} color="#8B5CF6" />
                                        </View>
                                        <View style={styles.projectDetailContent}>
                                            <Text style={styles.projectDetailLabel}>期間</Text>
                                            <Text style={styles.projectDetailValue}>{project.duration}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Applicants Section */}
                    {/* Approved Members Section */}
                    <View style={styles.applicantsSection}>
                        <Text style={styles.sectionTitle}>
                            参加メンバー ({applicants.filter(a => a.status === 'approved').length}人)
                        </Text>
                        {currentUser?.id === project.owner_id && applicants.filter(a => a.status === 'approved').length > 0 && (
                            <Text style={styles.kickHintText}>長押しでメンバーを削除できます</Text>
                        )}
                        {applicants.filter(a => a.status === 'approved').length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.applicantsList}>
                                {applicants.filter(a => a.status === 'approved').map((applicant) => (
                                    <TouchableOpacity
                                        key={applicant.id}
                                        style={styles.applicantItem}
                                        onPress={() => fetchMemberProfile(applicant.user_id)}
                                        onLongPress={() => {
                                            if (currentUser?.id === project.owner_id) {
                                                handleKickMember(applicant);
                                            }
                                        }}
                                        delayLongPress={500}
                                        activeOpacity={0.7}
                                        disabled={loadingProfile === applicant.user_id}
                                    >
                                        {loadingProfile === applicant.user_id ? (
                                            <View style={[styles.applicantImage, styles.applicantImageLoading]}>
                                                <ActivityIndicator size="small" color="#009688" />
                                            </View>
                                        ) : (
                                            <Image
                                                source={getImageSource(applicant.user.image)}
                                                style={styles.applicantImage}
                                            />
                                        )}
                                        <Text style={styles.applicantName} numberOfLines={1}>
                                            {applicant.user.name}
                                        </Text>
                                    </TouchableOpacity>
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
                                                    onPress={() => handleRejectConfirmation(applicant.id, applicant.user.name)}
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
                    {((project.required_roles && project.required_roles.length > 0) || (project.tags && project.tags.length > 0) || (project.content_tags && project.content_tags.length > 0)) && (
                        <View>
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
                                                        key={`role-${index}`}
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
                                                <View key={`theme-${index}`} style={styles.themeTag}>
                                                    <Text style={styles.themeTagText}>{tag}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {project.content_tags && project.content_tags.length > 0 && (
                                    <View style={styles.tagGroup}>
                                        <Text style={styles.tagLabel}>内容タグ</Text>
                                        <View style={styles.tagContainer}>
                                            {project.content_tags.map((tag, index) => (
                                                <View key={`content-${index}`} style={styles.contentTag}>
                                                    <Text style={styles.contentTagText}>{tag}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                            <View style={styles.divider} />
                        </View>
                    )}

                    <Text style={styles.sectionTitle}>プロジェクト詳細</Text>
                    <Text style={styles.description}>{project.description}</Text>
                </View>
                <View style={{ height: 100 }} />
            </ScrollView >

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.applyButton,
                        // 応募中でなく、オーナーでもない場合で、ステータスがclosedならdisabled
                        // rejectedの場合は再応募可能なのでdisabledにしない
                        (currentUser?.id !== project.owner_id && (applying || (hasApplied && applicationStatus !== 'rejected') || currentStatus === 'closed')) && styles.disabledButton,
                        // オーナー用スタイル（募集中の場合は警告色、終了中は再開色）
                        currentUser?.id === project.owner_id && (
                            currentStatus === 'recruiting' ? styles.closeRecruitmentButton : styles.reopenRecruitmentButton
                        ),
                        { flex: 1 }
                    ]}
                    onPress={currentUser?.id === project.owner_id ? handleToggleStatus : handleApply}
                    disabled={currentUser?.id !== project.owner_id && (applying || (hasApplied && applicationStatus !== 'rejected') || currentStatus === 'closed')}
                >
                    {applying ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.applyButtonText}>
                            {currentUser?.id === project.owner_id
                                ? (currentStatus === 'recruiting' ? '募集を停止する' : '募集を再開する')
                                : (hasApplied
                                    ? (applicationStatus === 'rejected' ? '再応募する' : (applicationStatus === 'approved' ? '参加中' : '承認待ち'))
                                    : '応募する')}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Member Profile Modal */}
            <Modal
                visible={showProfileModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowProfileModal(false)}
            >
                {selectedProfile && (
                    <ProfileDetail
                        profile={selectedProfile}
                        onBack={() => setShowProfileModal(false)}
                        onLike={() => { }}
                        onChat={() => {
                            setShowProfileModal(false);
                            if (selectedProfile) {
                                onChat(selectedProfile.id, selectedProfile.name, selectedProfile.image);
                            }
                        }}
                        isLiked={false}
                        isMatched={currentUser?.id !== selectedProfile.id}
                    />
                )}
            </Modal>
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
        marginBottom: 8,
        lineHeight: 32,
    },
    tagline: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 24,
        marginBottom: 16,
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
    ownerInfo: {
        flex: 1,
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
    applicantImageLoading: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
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
    kickHintText: {
        fontSize: 11,
        color: '#EF4444',
        marginBottom: 8,
        fontStyle: 'italic',
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
        backgroundColor: '#3B82F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    themeTagText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'white',
    },
    contentTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    contentTagText: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
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
    projectDetailsContainer: {
        marginTop: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        gap: 12,
    },
    projectDetailItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    projectDetailIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    projectDetailContent: {
        flex: 1,
    },
    projectDetailLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginBottom: 2,
    },
    projectDetailValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
    },
    // Apply Modal Styles
    applyModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    applyModalContainer: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    applyModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    applyModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    applyModalCloseButton: {
        padding: 4,
    },
    applyModalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
    },
    applyMessageContainer: {
        marginBottom: 24,
    },
    applyMessageLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    applyMessageInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: '#111827',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    applyMessageCharCount: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'right',
        marginTop: 4,
    },
    applyModalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    applyModalCancelButton: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    applyModalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    applyModalSubmitButton: {
        flex: 1,
        backgroundColor: '#009688',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    applyModalSubmitText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});
