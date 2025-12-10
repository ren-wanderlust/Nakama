import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../types';
import { ProfileCard } from './ProfileCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ProfileListSkeleton, ProjectListSkeleton } from './Skeleton';
import { LikesEmptyState } from './EmptyState';
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

interface Application {
    id: string;
    user_id: string;
    project_id: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    is_read?: boolean;
    user?: Profile;
    project?: Project;
}

interface LikesPageProps {
    likedProfileIds: Set<string>;
    allProfiles: Profile[];
    onProfileSelect: (profile: Profile) => void;
    onLike: (profileId: string) => void;
}

export function LikesPage({ likedProfileIds, allProfiles, onProfileSelect, onLike }: LikesPageProps) {
    const { session } = useAuth();
    
    // Top level tab: Project or User
    const [mainTab, setMainTab] = useState<'project' | 'user'>('project');
    
    // User sub-tabs
    const [userTab, setUserTab] = useState<'received' | 'sent' | 'matched'>('received');
    
    // Project sub-tabs
    const [projectTab, setProjectTab] = useState<'recruiting' | 'applied'>('recruiting');
    
    // User data
    const [receivedLikes, setReceivedLikes] = useState<Profile[]>([]);
    const [unreadInterestIds, setUnreadInterestIds] = useState<Set<string>>(new Set());
    const [unreadMatchIds, setUnreadMatchIds] = useState<Set<string>>(new Set());
    const [loadingUser, setLoadingUser] = useState(true);
    
    // Project data
    const [recruitingApplications, setRecruitingApplications] = useState<Application[]>([]);
    const [appliedApplications, setAppliedApplications] = useState<Application[]>([]);
    const [unreadRecruitingIds, setUnreadRecruitingIds] = useState<Set<string>>(new Set()); // Track unread applications by id
    const [loadingProject, setLoadingProject] = useState(true);
    
    const userListRef = useRef<FlatList>(null);
    const projectListRef = useRef<FlatList>(null);

    // Fetch user likes data
    useEffect(() => {
        const fetchReceivedLikes = async () => {
            if (!session?.user) {
                setLoadingUser(false);
                return;
            }

            try {
                const { data: likes, error } = await supabase
                    .from('likes')
                    .select('sender_id, is_read, is_read_as_match')
                    .eq('receiver_id', session.user.id);

                if (error) {
                    console.error('Error fetching received likes:', error);
                    return;
                }

                if (likes && likes.length > 0) {
                    const unreadInterest = new Set<string>(
                        likes.filter(l => !l.is_read).map(l => l.sender_id)
                    );
                    setUnreadInterestIds(unreadInterest);

                    const unreadMatch = new Set<string>(
                        likes.filter(l => !l.is_read_as_match).map(l => l.sender_id)
                    );
                    setUnreadMatchIds(unreadMatch);

                    const senderIds = likes.map(l => l.sender_id);
                    const { data: profiles, error: profilesError } = await supabase
                        .from('profiles')
                        .select('*')
                        .in('id', senderIds);

                    if (profilesError) {
                        console.error('Error fetching profiles for received likes:', profilesError);
                        return;
                    }

                    if (profiles) {
                        const mappedProfiles: Profile[] = profiles.map((item: any) => ({
                            id: item.id,
                            name: item.name,
                            age: item.age,
                            location: item.location || '',
                            university: item.university,
                            company: item.company,
                            grade: item.grade || '',
                            image: item.image,
                            challengeTheme: item.challenge_theme || '',
                            theme: item.theme || '',
                            bio: item.bio,
                            skills: item.skills || [],
                            seekingFor: item.seeking_for || [],
                            seekingRoles: item.seeking_roles || [],
                            statusTags: item.status_tags || [],
                            isStudent: item.is_student,
                            createdAt: item.created_at,
                        }));
                        setReceivedLikes(mappedProfiles);
                    }
                } else {
                    setReceivedLikes([]);
                    setUnreadInterestIds(new Set());
                    setUnreadMatchIds(new Set());
                }
            } catch (error) {
                console.error('Error in fetchReceivedLikes:', error);
            } finally {
                setLoadingUser(false);
            }
        };

        fetchReceivedLikes();
    }, [session]);

    // Fetch project applications data
    useEffect(() => {
        const fetchProjectApplications = async () => {
            if (!session?.user) {
                setLoadingProject(false);
                return;
            }

            try {
                // 1. Fetch applications to my projects (募集)
                const { data: myProjects } = await supabase
                    .from('projects')
                    .select('id')
                    .eq('owner_id', session.user.id);

                const myProjectIds = myProjects?.map(p => p.id) || [];

                if (myProjectIds.length > 0) {
                    const { data: recruiting, error: recruitingError } = await supabase
                        .from('project_applications')
                        .select(`
                            *,
                            user:profiles!user_id (*),
                            project:projects!project_id (
                                id,
                                title
                            )
                        `)
                        .in('project_id', myProjectIds)
                        .order('created_at', { ascending: false });

                    if (recruitingError) {
                        console.error('Error fetching recruiting applications:', recruitingError);
                    } else if (recruiting) {
                        // Track unread applications
                        const unreadIds = new Set<string>(
                            recruiting.filter((app: any) => !app.is_read).map((app: any) => app.id)
                        );
                        setUnreadRecruitingIds(unreadIds);

                        const mappedRecruiting = recruiting.map((app: any) => ({
                            id: app.id,
                            user_id: app.user_id,
                            project_id: app.project_id,
                            status: app.status,
                            created_at: app.created_at,
                            is_read: app.is_read,
                            user: app.user ? {
                                id: app.user.id,
                                name: app.user.name,
                                age: app.user.age,
                                location: app.user.location || '',
                                university: app.user.university,
                                company: app.user.company,
                                grade: app.user.grade || '',
                                image: app.user.image,
                                challengeTheme: app.user.challenge_theme || '',
                                theme: app.user.theme || '',
                                bio: app.user.bio,
                                skills: app.user.skills || [],
                                seekingFor: app.user.seeking_for || [],
                                seekingRoles: app.user.seeking_roles || [],
                                statusTags: app.user.status_tags || [],
                                isStudent: app.user.is_student,
                                createdAt: app.user.created_at,
                            } : undefined,
                            project: app.project,
                        }));
                        setRecruitingApplications(mappedRecruiting);
                    }
                }

                // 2. Fetch my applications (応募)
                const { data: applied, error: appliedError } = await supabase
                    .from('project_applications')
                    .select(`
                        id,
                        user_id,
                        project_id,
                        status,
                        created_at,
                        project:projects!project_id (
                            id,
                            title,
                            description,
                            image_url,
                            owner_id,
                            created_at,
                            deadline,
                            required_roles,
                            tags,
                            owner:profiles!owner_id (
                                id,
                                name,
                                image,
                                university
                            )
                        )
                    `)
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false });

                if (appliedError) {
                    console.error('Error fetching applied applications:', appliedError);
                } else if (applied) {
                    const mappedApplied = applied.map((app: any) => ({
                        id: app.id,
                        user_id: app.user_id,
                        project_id: app.project_id,
                        status: app.status,
                        created_at: app.created_at,
                        project: app.project,
                    }));
                    setAppliedApplications(mappedApplied);
                }
            } catch (error) {
                console.error('Error fetching project applications:', error);
            } finally {
                setLoadingProject(false);
            }
        };

        fetchProjectApplications();
    }, [session]);

    // Mark "興味あり" as read
    const markInterestAsRead = async (senderId: string) => {
        if (!session?.user || !unreadInterestIds.has(senderId)) return;

        try {
            await supabase
                .from('likes')
                .update({ is_read: true })
                .eq('receiver_id', session.user.id)
                .eq('sender_id', senderId);

            setUnreadInterestIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(senderId);
                return newSet;
            });
        } catch (error) {
            console.error('Error marking interest as read:', error);
        }
    };

    // Mark "マッチング" as read
    const markMatchAsRead = async (senderId: string) => {
        if (!session?.user || !unreadMatchIds.has(senderId)) return;

        try {
            await supabase
                .from('likes')
                .update({ is_read_as_match: true })
                .eq('receiver_id', session.user.id)
                .eq('sender_id', senderId);

            setUnreadMatchIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(senderId);
                return newSet;
            });
        } catch (error) {
            console.error('Error marking match as read:', error);
        }
    };

    // Mark "募集" application as read
    const markRecruitingAsRead = async (applicationId: string) => {
        if (!session?.user || !unreadRecruitingIds.has(applicationId)) return;

        try {
            await supabase
                .from('project_applications')
                .update({ is_read: true })
                .eq('id', applicationId);

            setUnreadRecruitingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(applicationId);
                return newSet;
            });
        } catch (error) {
            console.error('Error marking recruiting application as read:', error);
        }
    };

    const handleInterestProfileSelect = (profile: Profile) => {
        markInterestAsRead(profile.id);
        onProfileSelect(profile);
    };

    const handleMatchProfileSelect = (profile: Profile) => {
        markMatchAsRead(profile.id);
        onProfileSelect(profile);
    };

    // Handle applicant profile select from "募集" tab
    const handleApplicantProfileSelect = (application: Application) => {
        markRecruitingAsRead(application.id);
        if (application.user) {
            onProfileSelect(application.user);
        }
    };

    // Update applicant status (approve/reject)
    const updateApplicantStatus = async (applicationId: string, newStatus: 'approved' | 'rejected', userName: string) => {
        try {
            const { error } = await supabase
                .from('project_applications')
                .update({ status: newStatus })
                .eq('id', applicationId);

            if (error) throw error;

            // Update local state
            setRecruitingApplications(prev => 
                prev.map(app => 
                    app.id === applicationId ? { ...app, status: newStatus } : app
                )
            );

            Alert.alert('完了', `${userName}さんを${newStatus === 'approved' ? '承認' : '見送り'}しました`);
        } catch (error) {
            console.error('Error updating applicant status:', error);
            Alert.alert('エラー', 'ステータスの更新に失敗しました');
        }
    };

    // Filter user profiles
    const receivedLikeIds = new Set(receivedLikes.map(p => p.id));
    const sentLikes = allProfiles.filter(profile =>
        likedProfileIds.has(profile.id) && !receivedLikeIds.has(profile.id)
    );
    const displayReceivedLikes = receivedLikes.filter(profile =>
        !likedProfileIds.has(profile.id)
    );
    const matchedProfiles = receivedLikes.filter(profile =>
        likedProfileIds.has(profile.id)
    );

    const unreadInterestCount = displayReceivedLikes.filter(profile =>
        unreadInterestIds.has(profile.id)
    ).length;
    const unreadMatchCount = matchedProfiles.filter(profile =>
        unreadMatchIds.has(profile.id)
    ).length;

    // Count unread applications for recruiting
    const unreadRecruitingCount = unreadRecruitingIds.size;

    // ===== RENDER FUNCTIONS =====

    // Project Card for "応募" tab
    const renderApplicationProjectCard = ({ item }: { item: Application }) => {
        const project = item.project;
        if (!project) return null;

        const deadlineDate = project.deadline ? new Date(project.deadline) : null;
        const deadlineString = deadlineDate
            ? `${deadlineDate.getMonth() + 1}/${deadlineDate.getDate()}まで`
            : '';

        const getStatusInfo = () => {
            switch (item.status) {
                case 'pending':
                    return { icon: 'time-outline', color: '#F59E0B', text: '承認待ち' };
                case 'approved':
                    return { icon: 'checkmark-circle', color: '#10B981', text: '参加決定' };
                case 'rejected':
                    return { icon: 'close-circle', color: '#EF4444', text: '見送り' };
                default:
                    return { icon: 'help-circle-outline', color: '#6B7280', text: '不明' };
            }
        };

        const statusInfo = getStatusInfo();

        return (
            <TouchableOpacity style={styles.projectCard} activeOpacity={0.7}>
                <View style={styles.projectCardInner}>
                    <Image
                        source={{ uri: project.owner?.image || 'https://via.placeholder.com/50' }}
                        style={styles.projectAuthorIcon}
                    />
                    <View style={styles.projectCardContent}>
                        <View style={styles.projectCardHeader}>
                            <Text style={styles.projectCardTitle} numberOfLines={1}>{project.title}</Text>
                            {deadlineString ? (
                                <View style={styles.deadlineBadge}>
                                    <Ionicons name="time-outline" size={14} color="#D32F2F" />
                                    <Text style={styles.deadlineText}>{deadlineString}</Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={styles.projectCardDescription} numberOfLines={2}>{project.description}</Text>
                        
                        {/* Status Badge */}
                        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                            <Ionicons name={statusInfo.icon as any} size={16} color={statusInfo.color} />
                            <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Applicant Card for "募集" tab
    const renderApplicantCard = ({ item }: { item: Application }) => {
        const user = item.user;
        if (!user) return null;

        const isUnread = unreadRecruitingIds.has(item.id);
        const isPending = item.status === 'pending';
        const isApproved = item.status === 'approved';
        const isRejected = item.status === 'rejected';

        return (
            <View style={styles.recruitingCard}>
                {/* Unread indicator */}
                {isUnread && (
                    <View style={styles.recruitingUnreadDot} />
                )}
                
                {/* Profile confirm button - top right */}
                <TouchableOpacity 
                    style={styles.profileConfirmButton}
                    onPress={() => handleApplicantProfileSelect(item)}
                >
                    <Text style={styles.profileConfirmButtonText}>プロフィールを確認</Text>
                </TouchableOpacity>

                {/* Header: Avatar + Name + University */}
                <View style={styles.recruitingCardHeader}>
                    <TouchableOpacity onPress={() => handleApplicantProfileSelect(item)}>
                        <Image
                            source={{ uri: user.image || 'https://via.placeholder.com/50' }}
                            style={styles.recruitingAvatar}
                        />
                    </TouchableOpacity>
                    <View style={styles.recruitingUserInfo}>
                        <Text style={styles.recruitingUserName} numberOfLines={1}>
                            {user.name}
                        </Text>
                        <Text style={styles.recruitingUserUniversity} numberOfLines={1}>
                            {user.university || '所属なし'}
                        </Text>
                    </View>
                </View>

                {/* Project name */}
                <Text style={styles.recruitingProjectName} numberOfLines={1}>
                    {item.project?.title || 'プロジェクト'}への応募
                </Text>

                {/* Action buttons or Status */}
                {isPending ? (
                    <View style={styles.recruitingActions}>
                        <TouchableOpacity
                            style={styles.rejectButton}
                            onPress={() => updateApplicantStatus(item.id, 'rejected', user.name)}
                        >
                            <Ionicons name="close" size={18} color="#EF4444" />
                            <Text style={styles.rejectButtonText}>棄却</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.approveButton}
                            onPress={() => updateApplicantStatus(item.id, 'approved', user.name)}
                        >
                            <Ionicons name="checkmark" size={18} color="white" />
                            <Text style={styles.approveButtonText}>承認</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[
                        styles.statusResultBadge, 
                        { backgroundColor: isApproved ? '#D1FAE5' : '#FEE2E2' }
                    ]}>
                        <Ionicons 
                            name={isApproved ? 'checkmark-circle' : 'close-circle'} 
                            size={16} 
                            color={isApproved ? '#10B981' : '#EF4444'} 
                        />
                        <Text style={[
                            styles.statusResultText,
                            { color: isApproved ? '#10B981' : '#EF4444' }
                        ]}>
                            {isApproved ? '参加決定' : '見送り'}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    // User tab - Received likes
    const renderReceivedList = () => {
        if (loadingUser) return <ProfileListSkeleton count={4} />;
        if (displayReceivedLikes.length === 0) return <LikesEmptyState type="received" />;

        return (
            <FlatList
                data={displayReceivedLikes}
                renderItem={({ item }) => (
                    <View style={styles.gridItem}>
                        <ProfileCard
                            profile={item}
                            isLiked={false}
                            onLike={() => onLike(item.id)}
                            onSelect={() => handleInterestProfileSelect(item)}
                        />
                    </View>
                )}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
            />
        );
    };

    // User tab - Sent likes
    const renderSentList = () => {
        if (sentLikes.length === 0) return <LikesEmptyState type="sent" />;

        return (
            <FlatList
                data={sentLikes}
                renderItem={({ item }) => (
                    <View style={styles.gridItem}>
                        <ProfileCard
                            profile={item}
                            isLiked={true}
                            onLike={() => onLike(item.id)}
                            onSelect={() => onProfileSelect(item)}
                        />
                    </View>
                )}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
            />
        );
    };

    // User tab - Matched profiles
    const renderMatchedList = () => {
        if (matchedProfiles.length === 0) return <LikesEmptyState type="matched" />;

        return (
            <FlatList
                data={matchedProfiles}
                renderItem={({ item }) => (
                    <View style={styles.gridItem}>
                        <ProfileCard
                            profile={item}
                            isLiked={true}
                            onLike={() => {}}
                            onSelect={() => handleMatchProfileSelect(item)}
                            hideHeartButton={true}
                            isNewMatch={unreadMatchIds.has(item.id)}
                        />
                    </View>
                )}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
            />
        );
    };

    // Project tab - Recruiting (応募者一覧)
    const renderRecruitingList = () => {
        if (loadingProject) return <ProfileListSkeleton count={4} />;
        if (recruitingApplications.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={64} color="#d1d5db" />
                    <Text style={styles.emptyText}>応募者はまだいません</Text>
                    <Text style={styles.emptySubText}>プロジェクトを作成すると、応募者がここに表示されます</Text>
                </View>
            );
        }

        return (
            <FlatList
                data={recruitingApplications}
                renderItem={renderApplicantCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        );
    };

    // Project tab - Applied (応募したプロジェクト)
    const renderAppliedList = () => {
        if (loadingProject) return <ProjectListSkeleton count={4} />;
        if (appliedApplications.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="briefcase-outline" size={64} color="#d1d5db" />
                    <Text style={styles.emptyText}>応募したプロジェクトはありません</Text>
                    <Text style={styles.emptySubText}>気になるプロジェクトに応募してみましょう</Text>
                </View>
            );
        }

        return (
            <FlatList
                data={appliedApplications}
                renderItem={renderApplicationProjectCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        );
    };

    const userTabs = ['received', 'sent', 'matched'] as const;
    const projectTabs = ['recruiting', 'applied'] as const;

    return (
        <View style={styles.container}>
            {/* Main Tab Header */}
            <View style={styles.header}>
                {/* Top Level Tabs: プロジェクト / ユーザー */}
                <View style={styles.mainTabContainer}>
                    <TouchableOpacity
                        style={[styles.mainTabButton, mainTab === 'project' && styles.mainTabButtonActive]}
                        onPress={() => setMainTab('project')}
                    >
                        <Text style={[styles.mainTabText, mainTab === 'project' && styles.mainTabTextActive]}>
                            プロジェクト
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.mainTabButton, mainTab === 'user' && styles.mainTabButtonActive]}
                        onPress={() => setMainTab('user')}
                    >
                        <Text style={[styles.mainTabText, mainTab === 'user' && styles.mainTabTextActive]}>
                            ユーザー
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Sub Tabs */}
                {mainTab === 'user' ? (
                    <View style={styles.subTabContainer}>
                        <TouchableOpacity
                            style={[styles.subTabButton, userTab === 'received' && styles.subTabButtonActive]}
                            onPress={() => {
                                setUserTab('received');
                                userListRef.current?.scrollToIndex({ index: 0, animated: true });
                            }}
                        >
                            <Text style={[styles.subTabText, userTab === 'received' && styles.subTabTextActive]}>
                                興味あり
                            </Text>
                            {unreadInterestCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unreadInterestCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.subTabButton, userTab === 'sent' && styles.subTabButtonActive]}
                            onPress={() => {
                                setUserTab('sent');
                                userListRef.current?.scrollToIndex({ index: 1, animated: true });
                            }}
                        >
                            <Text style={[styles.subTabText, userTab === 'sent' && styles.subTabTextActive]}>
                                送った
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.subTabButton, userTab === 'matched' && styles.subTabButtonActive]}
                            onPress={() => {
                                setUserTab('matched');
                                userListRef.current?.scrollToIndex({ index: 2, animated: true });
                            }}
                        >
                            <Text style={[styles.subTabText, userTab === 'matched' && styles.subTabTextActive]}>
                                マッチング
                            </Text>
                            {unreadMatchCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unreadMatchCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.subTabContainer}>
                        <TouchableOpacity
                            style={[styles.subTabButton, projectTab === 'recruiting' && styles.subTabButtonActive]}
                            onPress={() => {
                                setProjectTab('recruiting');
                                projectListRef.current?.scrollToIndex({ index: 0, animated: true });
                            }}
                        >
                            <Text style={[styles.subTabText, projectTab === 'recruiting' && styles.subTabTextActive]}>
                                募集
                            </Text>
                            {unreadRecruitingCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unreadRecruitingCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.subTabButton, projectTab === 'applied' && styles.subTabButtonActive]}
                            onPress={() => {
                                setProjectTab('applied');
                                projectListRef.current?.scrollToIndex({ index: 1, animated: true });
                            }}
                        >
                            <Text style={[styles.subTabText, projectTab === 'applied' && styles.subTabTextActive]}>
                                応募
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Content */}
            {mainTab === 'user' ? (
                <FlatList
                    ref={userListRef}
                    data={userTabs}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item}
                    onMomentumScrollEnd={(e) => {
                        const index = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                        setUserTab(userTabs[index]);
                    }}
                    getItemLayout={(data, index) => (
                        { length: Dimensions.get('window').width, offset: Dimensions.get('window').width * index, index }
                    )}
                    initialScrollIndex={0}
                    renderItem={({ item }) => (
                        <View style={{ width: Dimensions.get('window').width, flex: 1 }}>
                            {item === 'received' && renderReceivedList()}
                            {item === 'sent' && renderSentList()}
                            {item === 'matched' && renderMatchedList()}
                        </View>
                    )}
                />
            ) : (
                <FlatList
                    ref={projectListRef}
                    data={projectTabs}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item}
                    onMomentumScrollEnd={(e) => {
                        const index = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                        setProjectTab(projectTabs[index]);
                    }}
                    getItemLayout={(data, index) => (
                        { length: Dimensions.get('window').width, offset: Dimensions.get('window').width * index, index }
                    )}
                    initialScrollIndex={0}
                    renderItem={({ item }) => (
                        <View style={{ width: Dimensions.get('window').width, flex: 1 }}>
                            {item === 'recruiting' && renderRecruitingList()}
                            {item === 'applied' && renderAppliedList()}
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        backgroundColor: 'white',
        paddingTop: 8,
        paddingBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    // Main tabs (Project / User)
    mainTabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 32,
        paddingBottom: 8,
    },
    mainTabButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    mainTabButtonActive: {},
    mainTabText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#D1D5DB',
    },
    mainTabTextActive: {
        color: '#111827',
    },
    // Sub tabs
    subTabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 8,
    },
    subTabButton: {
        paddingVertical: 8,
        paddingHorizontal: 4,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    subTabButtonActive: {
        borderBottomColor: '#FF5252',
    },
    subTabText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#9CA3AF',
    },
    subTabTextActive: {
        color: '#FF5252',
    },
    badge: {
        backgroundColor: '#FF7F11',
        height: 18,
        minWidth: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
        paddingHorizontal: 4,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        gap: 12,
    },
    gridItem: {
        // width handled in ProfileCard
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 120,
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 16,
        marginBottom: 4,
    },
    emptySubText: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
    },
    // Project Card styles
    projectCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    projectCardInner: {
        flexDirection: 'row',
        padding: 12,
    },
    projectAuthorIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    projectCardContent: {
        flex: 1,
    },
    projectCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    projectCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
        marginRight: 8,
    },
    projectCardDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 8,
    },
    deadlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    deadlineText: {
        fontSize: 12,
        color: '#D32F2F',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Recruiting card styles (応募者カード)
    recruitingCard: {
        backgroundColor: '#FFF9E6',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        position: 'relative',
    },
    recruitingUnreadDot: {
        position: 'absolute',
        top: 12,
        left: 12,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
        zIndex: 20,
    },
    profileConfirmButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
    },
    profileConfirmButtonText: {
        fontSize: 12,
        color: '#6B7280',
        textDecorationLine: 'underline',
    },
    recruitingCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        marginTop: 8,
    },
    recruitingAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 12,
    },
    recruitingUserInfo: {
        flex: 1,
    },
    recruitingUserName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 2,
    },
    recruitingUserUniversity: {
        fontSize: 14,
        color: '#6B7280',
    },
    recruitingProjectName: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 12,
    },
    recruitingActions: {
        flexDirection: 'row',
        gap: 12,
    },
    rejectButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        backgroundColor: '#FEE2E2',
        borderRadius: 12,
        gap: 6,
    },
    rejectButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#EF4444',
    },
    approveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        backgroundColor: '#009688',
        borderRadius: 12,
        gap: 6,
    },
    approveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    statusResultBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    statusResultText: {
        fontSize: 14,
        fontWeight: '600',
    },
    // Legacy applicant card styles (keep for compatibility)
    applicantCardWrapper: {
        position: 'relative',
    },
    unreadDot: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10B981',
        zIndex: 20,
        borderWidth: 2,
        borderColor: 'white',
    },
    applicantStatusBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        zIndex: 10,
    },
    applicantStatusText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    projectNameBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    projectNameText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '500',
    },
});
