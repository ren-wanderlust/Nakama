// Trigger rebuild
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Platform, ActivityIndicator, Modal, UIManager, LayoutAnimation, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LoginScreen } from './components/LoginScreen';
import { ProfileCard } from './components/ProfileCard';
import { ProfileDetail } from './components/ProfileDetail';
import { BottomNav } from './components/BottomNav';
import { MyPage } from './components/MyPage';
import { LikesPage } from './components/LikesPage';
import { TalkPage } from './components/TalkPage';
import { ChatRoom } from './components/ChatRoom';
import { CreateProjectModal } from './components/CreateProjectModal';
import { NotificationsPage } from './components/NotificationsPage';
import { SignupFlow } from './components/SignupFlow';
import { FilterModal, FilterCriteria } from './components/FilterModal';
import { ProfileEdit } from './components/ProfileEdit';
import { SettingsPage } from './components/SettingsPage';
import { HelpPage } from './components/HelpPage';
import { LegalDocumentPage } from './components/LegalDocumentPage';
import { OnboardingScreen } from './components/OnboardingScreen';
import { MatchingModal } from './components/MatchingModal';
import { UserProjectPage } from './components/UserProjectPage';
import { UsersEmptyState } from './components/EmptyState';
import { Profile } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { Alert } from 'react-native';
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from './constants/LegalTexts';
import { registerForPushNotificationsAsync, savePushToken, setupNotificationListeners, getUserPushTokens, sendPushNotification } from './lib/notifications';
import { FullPageSkeleton, ProfileListSkeleton } from './components/Skeleton';
import { FadeTabContent } from './components/AnimatedTabView';
import { CustomRefreshControl } from './components/CustomRefreshControl';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// Placeholder component for tabs under development
const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.centerContainer}>
    <Text style={styles.placeholderTitle}>{title}</Text>
    <Text style={styles.placeholderText}>開発中</Text>
  </View>
);

function AppContent() {
  const insets = useSafeAreaInsets();
  const { session, loading: authLoading, signOut, refreshSession } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [showSignup, setShowSignup] = useState(false);

  React.useEffect(() => {
    // Simulate checking onboarding status
    const checkOnboarding = async () => {
      // In a real app, check AsyncStorage here
      setTimeout(() => {
        setHasCompletedOnboarding(true);
      }, 1000);
    };
    checkOnboarding();
  }, []);

  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [matchedProfileIds, setMatchedProfileIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('search');
  const [previousTab, setPreviousTab] = useState<string | null>(null);
  const [searchTab, setSearchTab] = useState<'users' | 'projects'>('projects');
  const searchListRef = useRef<FlatList>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [activeChatRoom, setActiveChatRoom] = useState<{
    partnerId: string;
    partnerName: string;
    partnerImage: string;
    isGroup?: boolean;
  } | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [legalDocument, setLegalDocument] = useState<{ title: string; content: string } | null>(null);

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  const [sortOrder, setSortOrder] = useState<'recommended' | 'newest' | 'deadline'>('recommended');
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);

  const [displayProfiles, setDisplayProfiles] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [pendingAppsCount, setPendingAppsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadLikesCount, setUnreadLikesCount] = useState(0);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  // Initialize push notifications
  React.useEffect(() => {
    if (!session?.user) return;

    const initPushNotifications = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setExpoPushToken(token);
        await savePushToken(token);
      }
    };

    initPushNotifications();

    // Setup notification listeners
    const unsubscribe = setupNotificationListeners(
      (notification) => {
        // Handle notification received while app is open
        console.log('Notification received:', notification.request.content.title);
      },
      (response) => {
        // Handle notification tap
        const data = response.notification.request.content.data;
        if (data?.type === 'message') {
          // Navigate to chat
          setActiveTab('talk');
        } else if (data?.type === 'like') {
          // Navigate to likes
          setActiveTab('likes');
        } else if (data?.type === 'application') {
          // Navigate to profile/my projects
          setActiveTab('profile');
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [session?.user]);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  // Fetch profiles from Supabase
  const fetchProfiles = async (pageNumber = 0, shouldRefresh = false) => {
    if (!shouldRefresh && (!hasMore || loadingMore)) return;

    try {
      if (pageNumber > 0) setLoadingMore(true);

      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        const mappedProfiles: Profile[] = data.map((item: any) => ({
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

        if (shouldRefresh) {
          setDisplayProfiles(mappedProfiles);
        } else {
          setDisplayProfiles(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newProfiles = mappedProfiles.filter(p => !existingIds.has(p.id));
            return [...prev, ...newProfiles];
          });
        }

        setHasMore(data.length === PAGE_SIZE);
        setPage(pageNumber);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
      Alert.alert('エラー', 'データの取得に失敗しました');
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMoreProfiles = () => {
    if (!loadingMore && hasMore) {
      fetchProfiles(page + 1);
    }
  };

  // Fetch matches and liked profiles
  const fetchMatches = async () => {
    if (!session?.user) return;
    try {
      const { data: myLikes } = await supabase
        .from('likes')
        .select('receiver_id')
        .eq('sender_id', session.user.id);

      const { data: receivedLikes } = await supabase
        .from('likes')
        .select('sender_id')
        .eq('receiver_id', session.user.id);

      const myLikedIdsSet = new Set(myLikes?.map(l => l.receiver_id) || []);
      setLikedProfiles(myLikedIdsSet);

      const matches = new Set<string>();
      receivedLikes?.forEach(l => {
        if (myLikedIdsSet.has(l.sender_id)) {
          matches.add(l.sender_id);
        }
      });
      setMatchedProfileIds(matches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  // Fetch pending applications count
  React.useEffect(() => {
    if (!session?.user) return;
    const fetchPendingApps = async () => {
      // Step 1: Get my project IDs
      const { data: myProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', session.user.id);

      const projectIds = myProjects?.map((p: any) => p.id) || [];

      if (projectIds.length === 0) {
        setPendingAppsCount(0);
        return;
      }

      // Step 2: Count pending applications for these projects
      const { count } = await supabase
        .from('project_applications')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('status', 'pending');

      setPendingAppsCount(count || 0);
    };
    fetchPendingApps();
    // Subscribe to changes
    const channel = supabase.channel('pending_apps_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_applications' }, () => {
        console.log('Realtime event received for project_applications');
        fetchPendingApps();
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchPendingApps();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [session?.user]);

  // Fetch unread messages count (Individual + Group)
  React.useEffect(() => {
    if (!session?.user) return;
    const fetchUnreadMessages = async () => {
      try {
        // 1. Individual Chats (DB is_read) - only DMs (not group messages)
        const { count: dmCount, error: dmError } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', session.user.id)
          .is('chat_room_id', null)  // Exclude group messages
          .or('is_read.is.null,is_read.eq.false');  // Unread messages

        // 2. Group Chats (Local Storage Time) - only count groups where user is a member
        // First, get groups where user is owner or approved member
        const { data: ownedProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('owner_id', session.user.id);

        const { data: approvedApps } = await supabase
          .from('project_applications')
          .select('project_id')
          .eq('user_id', session.user.id)
          .eq('status', 'approved');

        const memberProjectIds = new Set<string>();
        ownedProjects?.forEach((p: any) => memberProjectIds.add(p.id));
        approvedApps?.forEach((a: any) => memberProjectIds.add(a.project_id));

        // Get group chat rooms for these projects
        let groupCount = 0;
        if (memberProjectIds.size > 0) {
          const { data: groups } = await supabase
            .from('chat_rooms')
            .select('id, project_id')
            .eq('type', 'group')
            .in('project_id', Array.from(memberProjectIds));

          if (groups && groups.length > 0) {
            const groupPromises = groups.map(async (group: any) => {
              // Get last read time from database
              const { data: readStatus } = await supabase
                .from('chat_room_read_status')
                .select('last_read_at')
                .eq('user_id', session.user.id)
                .eq('chat_room_id', group.id)
                .single();

              const lastReadTime = readStatus?.last_read_at || '1970-01-01';

              const { count } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('chat_room_id', group.id)
                .gt('created_at', lastReadTime)
                .neq('sender_id', session.user.id);
              return count || 0;
            });
            const counts = await Promise.all(groupPromises);
            groupCount = counts.reduce((a, b) => a + b, 0);
          }
        }

        if (!dmError) {
          setUnreadMessagesCount((dmCount || 0) + groupCount);
        }
      } catch (e) {
        console.log('Error fetching unread messages:', e);
      }
    };

    fetchUnreadMessages();

    // Subscribe to messages (Insert and Update)
    const channel = supabase.channel('unread_messages_count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchUnreadMessages();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
        fetchUnreadMessages(); // Listen for ALL updates (including is_read changes)
      })
      .subscribe();

    const interval = setInterval(fetchUnreadMessages, 3000); // Poll every 3s for responsiveness

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [session?.user]);

  // Fetch unread likes count ("興味あり" + "未確認マッチング" badge)
  React.useEffect(() => {
    if (!session?.user) return;

    const fetchUnreadLikes = async () => {
      try {
        // Get my likes (to determine matches)
        const { data: myLikes } = await supabase
          .from('likes')
          .select('receiver_id')
          .eq('sender_id', session.user.id);
        
        const myLikedIds = new Set(myLikes?.map(l => l.receiver_id) || []);

        // Get blocked users
        const { data: blocks } = await supabase
          .from('blocks')
          .select('blocked_id')
          .eq('blocker_id', session.user.id);
        
        const blockedIds = new Set(blocks?.map(b => b.blocked_id) || []);

        // Get all received likes with both read statuses
        const { data: receivedLikes } = await supabase
          .from('likes')
          .select('sender_id, is_read, is_read_as_match')
          .eq('receiver_id', session.user.id);

        // Count unread:
        // - 興味あり: is_read = false AND not matched (I haven't liked them back)
        // - マッチング: is_read_as_match = false AND matched (I have liked them back)
        const unreadCount = receivedLikes?.filter(l => {
          if (blockedIds.has(l.sender_id)) return false;
          
          const isMatched = myLikedIds.has(l.sender_id);
          if (isMatched) {
            // Matched: count if is_read_as_match is false
            return !l.is_read_as_match;
          } else {
            // Interest only: count if is_read is false
            return !l.is_read;
          }
        }).length || 0;

        setUnreadLikesCount(unreadCount);
      } catch (e) {
        console.log('Error fetching unread likes:', e);
      }
    };

    fetchUnreadLikes();

    // Subscribe to likes changes
    const channel = supabase.channel('unread_likes_count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, () => {
        fetchUnreadLikes();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'likes' }, () => {
        fetchUnreadLikes();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'likes' }, () => {
        fetchUnreadLikes();
      })
      .subscribe();

    const interval = setInterval(fetchUnreadLikes, 5000); // Poll every 5s

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [session?.user]);

  // Refresh unread count when closing a chat
  const prevActiveChatRoom = React.useRef(activeChatRoom);
  React.useEffect(() => {
    // If chat was open and is now closed, refresh unread count immediately
    if (prevActiveChatRoom.current !== null && activeChatRoom === null && session?.user) {
      // Trigger immediate refresh by re-running the fetch logic
      const refreshUnreadCounts = async () => {
        try {
          const { count: dmCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('receiver_id', session.user.id)
            .is('chat_room_id', null)  // Exclude group messages
            .or('is_read.is.null,is_read.eq.false');  // Unread messages

          // Get groups where user is owner or approved member
          const { data: ownedProjects } = await supabase
            .from('projects')
            .select('id')
            .eq('owner_id', session.user.id);

          const { data: approvedApps } = await supabase
            .from('project_applications')
            .select('project_id')
            .eq('user_id', session.user.id)
            .eq('status', 'approved');

          const memberProjectIds = new Set<string>();
          ownedProjects?.forEach((p: any) => memberProjectIds.add(p.id));
          approvedApps?.forEach((a: any) => memberProjectIds.add(a.project_id));

          let groupCount = 0;
          if (memberProjectIds.size > 0) {
            const { data: groups } = await supabase
              .from('chat_rooms')
              .select('id, project_id')
              .eq('type', 'group')
              .in('project_id', Array.from(memberProjectIds));

            if (groups && groups.length > 0) {
              const groupPromises = groups.map(async (group: any) => {
                // Get last read time from database
                const { data: readStatus } = await supabase
                  .from('chat_room_read_status')
                  .select('last_read_at')
                  .eq('user_id', session.user.id)
                  .eq('chat_room_id', group.id)
                  .single();

                const lastReadTime = readStatus?.last_read_at || '1970-01-01';

                const { count } = await supabase
                  .from('messages')
                  .select('id', { count: 'exact', head: true })
                  .eq('chat_room_id', group.id)
                  .gt('created_at', lastReadTime)
                  .neq('sender_id', session.user.id);
                return count || 0;
              });
              const counts = await Promise.all(groupPromises);
              groupCount = counts.reduce((a, b) => a + b, 0);
            }
          }

          setUnreadMessagesCount((dmCount || 0) + groupCount);
        } catch (e) {
          console.log('Error refreshing unread count:', e);
        }
      };
      refreshUnreadCounts();
    }
    prevActiveChatRoom.current = activeChatRoom;
  }, [activeChatRoom, session?.user]);

  // Fetch current user profile
  const fetchCurrentUser = async () => {
    if (!session?.user) return;
    setIsLoadingUser(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const mappedUser: Profile = {
          id: data.id,
          name: data.name,
          age: data.age,
          location: data.location || '',
          university: data.university,
          company: data.company,
          grade: data.grade || '',
          image: data.image,
          challengeTheme: data.challenge_theme || '',
          theme: data.theme || '',
          bio: data.bio,
          skills: data.skills || [],
          seekingFor: data.seeking_for || [],
          seekingRoles: data.seeking_roles || [],
          statusTags: data.status_tags || [],
          isStudent: data.is_student,
          createdAt: data.created_at,
        };
        setCurrentUser(mappedUser);
      } else {
        console.log('No profile found for user');
      }
    } catch (error: any) {
      console.error('Error fetching current user:', error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  React.useEffect(() => {
    if (session?.user) {
      fetchCurrentUser();
      fetchProfiles();
      fetchMatches();
    }
  }, [session]);

  // Realtime subscription for matching
  React.useEffect(() => {
    if (!session?.user) return;

    const subscription = supabase
      .channel('public:likes:matching')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'likes',
        filter: `receiver_id=eq.${session.user.id}`
      }, async (payload) => {
        const newLike = payload.new;
        const senderId = newLike.sender_id;

        // Check if I have already liked this user
        const { data: myLike } = await supabase
          .from('likes')
          .select('*')
          .eq('sender_id', session.user.id)
          .eq('receiver_id', senderId)
          .maybeSingle();

        if (myLike) {
          // It's a match! (initiated by the other user)
          setMatchedProfileIds(prev => new Set(prev).add(senderId));

          // Fetch sender's profile to display modal
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', senderId)
            .single();

          if (senderProfile) {
            const profile: Profile = {
              id: senderProfile.id,
              name: senderProfile.name,
              age: senderProfile.age,
              location: senderProfile.location || '',
              university: senderProfile.university,
              company: senderProfile.company,
              grade: senderProfile.grade || '',
              image: senderProfile.image,
              challengeTheme: senderProfile.challenge_theme || '',
              theme: senderProfile.theme || '',
              bio: senderProfile.bio,
              skills: senderProfile.skills || [],
              seekingFor: senderProfile.seeking_for || [],
              seekingRoles: senderProfile.seeking_roles || [],
              statusTags: senderProfile.status_tags || [],
              isStudent: senderProfile.is_student,
              createdAt: senderProfile.created_at,
            };
            setMatchedProfile(profile);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [session]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    await fetchProfiles(0, true);
    await fetchMatches();
    setRefreshing(false);
  }, []);

  // Determine if filter is active
  const isFilterActive = React.useMemo(() => {
    if (!filterCriteria) return false;
    const { keyword, university, grades, seekingRoles } = filterCriteria;
    return (
      (keyword && keyword !== '') ||
      (university && university !== '') ||
      (grades && grades.length > 0) ||
      (seekingRoles && seekingRoles.length > 0)
    );
  }, [filterCriteria]);

  // Filtering logic
  const filteredProfiles = displayProfiles.filter(profile => {
    // Exclude current user
    if (session?.user && profile.id === session.user.id) return false;
    // Exclude matched users
    if (matchedProfileIds.has(profile.id)) return false;
    // Exclude users I already liked
    if (likedProfiles.has(profile.id)) return false;

    if (!filterCriteria) return true;

    // Keyword filter
    if (filterCriteria.keyword) {
      const lowerKeyword = filterCriteria.keyword.toLowerCase();
      const matchName = profile.name.toLowerCase().includes(lowerKeyword);
      const matchTheme = profile.challengeTheme.toLowerCase().includes(lowerKeyword);
      const matchBio = profile.bio?.toLowerCase().includes(lowerKeyword) || false;
      const matchSkills = profile.skills.some(skill => skill.toLowerCase().includes(lowerKeyword));
      const matchUniversity = profile.university?.toLowerCase().includes(lowerKeyword) || false;
      if (!matchName && !matchTheme && !matchBio && !matchSkills && !matchUniversity) return false;
    }

    // University filter
    if (filterCriteria.university && filterCriteria.university !== '') {
      if (profile.university !== filterCriteria.university) return false;
    }

    // Grade filter
    if (filterCriteria.grades && filterCriteria.grades.length > 0) {
      if (!profile.grade || !filterCriteria.grades.includes(profile.grade)) return false;
    }

    // Seeking roles filter
    if (filterCriteria.seekingRoles && filterCriteria.seekingRoles.length > 0) {
      const profileRoles = profile.seekingRoles || [];
      const hasMatchingRole = filterCriteria.seekingRoles.some(role =>
        profileRoles.includes(role) ||
        profileRoles.some(r => r.toLowerCase().includes(role.toLowerCase()))
      );
      if (!hasMatchingRole) return false;
    }

    return true;
  });

  // Sorting logic
  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0; // Recommended order (default)
  });

  const handleLike = async (profileId: string) => {
    if (!session?.user) return;

    // Optimistic update
    setLikedProfiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(profileId)) {
        newSet.delete(profileId);
      } else {
        newSet.add(profileId);
      }
      return newSet;
    });

    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('likes')
        .select('*')
        .eq('sender_id', session.user.id)
        .eq('receiver_id', profileId)
        .maybeSingle();

      if (existingLike) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);
      } else {
        // Like
        await supabase
          .from('likes')
          .insert({
            sender_id: session.user.id,
            receiver_id: profileId
          });

        // Create notification for like
        if (currentUser) {
          await supabase.from('notifications').insert({
            user_id: profileId,
            sender_id: session.user.id,
            type: 'like',
            title: 'いいねが届きました！',
            content: `${currentUser.name}さんからいいねが届きました。`,
            image_url: currentUser.image
          });

          // Send push notification for like
          try {
            const tokens = await getUserPushTokens(profileId);
            for (const token of tokens) {
              await sendPushNotification(
                token,
                'いいねが届きました！',
                `${currentUser.name}さんからいいねが届きました。`,
                { type: 'like', senderId: session.user.id }
              );
            }
          } catch (pushError) {
            console.log('Push notification error:', pushError);
          }
        }

        // Check for match
        const { data: reverseLike } = await supabase
          .from('likes')
          .select('*')
          .eq('sender_id', profileId)
          .eq('receiver_id', session.user.id)
          .maybeSingle();

        if (reverseLike) {
          // It's a match!
          setMatchedProfileIds(prev => new Set(prev).add(profileId));

          // Try to find in displayProfiles first, otherwise fetch from supabase
          let matchedUser = displayProfiles.find(p => p.id === profileId);

          if (!matchedUser) {
            // Fetch profile from supabase if not in displayProfiles
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', profileId)
              .single();

            if (profileData) {
              matchedUser = {
                id: profileData.id,
                name: profileData.name,
                age: profileData.age,
                location: profileData.location || '',
                university: profileData.university,
                company: profileData.company,
                grade: profileData.grade || '',
                image: profileData.image,
                challengeTheme: profileData.challenge_theme || '',
                theme: profileData.theme || '',
                bio: profileData.bio,
                skills: profileData.skills || [],
                seekingFor: profileData.seeking_for || [],
                seekingRoles: profileData.seeking_roles || [],
                statusTags: profileData.status_tags || [],
                isStudent: profileData.is_student,
                createdAt: profileData.created_at,
              };
            }
          }

          if (matchedUser) {
            // Close any open profile modal first
            setSelectedProfile(null);

            // Show match modal with slight delay
            const matchedUserCopy = { ...matchedUser };
            setTimeout(() => {
              setMatchedProfile(matchedUserCopy);
            }, 300);

            // Create notifications for match in background
            if (currentUser) {
              const currentUserCopy = { ...currentUser };
              (async () => {
                try {
                  // Notify partner
                  await supabase.from('notifications').insert({
                    user_id: profileId,
                    sender_id: session.user.id,
                    type: 'match',
                    title: 'マッチング成立！',
                    content: `${currentUserCopy.name}さんとマッチングしました！メッセージを送ってみましょう。`,
                    image_url: currentUserCopy.image
                  });

                  // Notify self
                  await supabase.from('notifications').insert({
                    user_id: session.user.id,
                    sender_id: profileId,
                    type: 'match',
                    title: 'マッチング成立！',
                    content: `${matchedUserCopy.name}さんとマッチングしました！メッセージを送ってみましょう。`,
                    image_url: matchedUserCopy.image
                  });

                  // Send push notification for match
                  const tokens = await getUserPushTokens(profileId);
                  for (const token of tokens) {
                    await sendPushNotification(
                      token,
                      'マッチング成立！ 🎉',
                      `${currentUserCopy.name}さんとマッチングしました！メッセージを送ってみましょう。`,
                      { type: 'match', senderId: session.user.id }
                    );
                  }
                } catch (bgError) {
                  console.log('Background notification error:', bgError);
                }
              })();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling like:', error);
    }
  };

  const handleSaveProfile = async (updatedProfile: Profile) => {
    if (!session?.user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updatedProfile.name,
          age: updatedProfile.age,
          university: updatedProfile.university,
          company: updatedProfile.company,
          bio: updatedProfile.bio,
          skills: updatedProfile.skills,
          seeking_for: updatedProfile.seekingFor,
          seeking_roles: updatedProfile.seekingRoles,
          image: updatedProfile.image,
          // status_tags: updatedProfile.statusTags, // Assuming this is derived or editable
        })
        .eq('id', session.user.id);

      if (error) throw error;

      setCurrentUser(updatedProfile);
      setShowProfileEdit(false);
      Alert.alert('完了', 'プロフィールを更新しました');
      fetchProfiles(); // Refresh list to show updates
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('エラー', 'プロフィールの更新に失敗しました');
    }
  };

  const handleEditProfile = () => {
    setShowProfileEdit(true);
  };

  // Show loading screen while checking onboarding status or auth status
  if (hasCompletedOnboarding === null || authLoading) {
    return (
      <SafeAreaProvider>
        <FullPageSkeleton />
      </SafeAreaProvider>
    );
  }

  if (showSignup) {
    return (
      <SafeAreaProvider>
        <SignupFlow
          onComplete={async () => {
            await refreshSession();
            setShowSignup(false);
          }}
          onCancel={() => setShowSignup(false)}
        />
      </SafeAreaProvider>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        onCreateAccount={() => setShowSignup(true)}
      />
    );
  }

  // Main App Render with Modals
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar style="auto" />
      <View style={{ flex: 1 }}>
        {/* Header */}
        {/* Header */}
        <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
          {activeTab !== 'search' && activeTab !== 'likes' && activeTab !== 'talk' && activeTab !== 'challenge' && activeTab !== 'profile' && (
            <View style={styles.headerTop}>
              <View style={styles.headerLeft} />
              <Text style={styles.headerTitle}>Nakama</Text>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => setShowNotifications(true)}
              >
                <Ionicons name="notifications-outline" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'search' && (
            <View>
              <View style={styles.headerTop}>
                <View style={{ flex: 1 }} />
                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    style={[styles.tabButton, searchTab === 'projects' && styles.tabButtonActive]}
                    onPress={() => {
                      setSearchTab('projects');
                      searchListRef.current?.scrollToIndex({ index: 0, animated: true });
                    }}
                  >
                    <Text style={[styles.tabText, searchTab === 'projects' && styles.tabTextActive]}>プロジェクト</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tabButton, searchTab === 'users' && styles.tabButtonActive]}
                    onPress={() => {
                      setSearchTab('users');
                      searchListRef.current?.scrollToIndex({ index: 1, animated: true });
                    }}
                  >
                    <Text style={[styles.tabText, searchTab === 'users' && styles.tabTextActive]}>さがす</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <TouchableOpacity
                    style={styles.notificationButton}
                    onPress={() => setShowNotifications(true)}
                  >
                    <Ionicons name="notifications-outline" size={24} color="#374151" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.searchControlBar}>
                <TouchableOpacity
                  style={[styles.filterButton, isFilterActive && styles.filterButtonActive]}
                  onPress={() => setIsFilterOpen(true)}
                >
                  <Ionicons name="search" size={20} color={isFilterActive ? "#FF5252" : "#9CA3AF"} />
                  <Text style={[styles.controlButtonText, isFilterActive && styles.controlButtonTextActive]}>
                    絞り込み
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sortButton}
                  onPress={() => setIsSortModalOpen(true)}
                >
                  <Text style={styles.controlButtonText}>
                    {sortOrder === 'recommended' ? 'おすすめ順' : sortOrder === 'newest' ? '新着順' : '締め切り順'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentArea}>
          <FadeTabContent activeTab={activeTab} tabId="search">
            <FlatList
              ref={searchListRef}
              data={['projects', 'users']}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                setSearchTab(index === 0 ? 'projects' : 'users');
              }}
              getItemLayout={(data, index) => (
                { length: Dimensions.get('window').width, offset: Dimensions.get('window').width * index, index }
              )}
              initialScrollIndex={searchTab === 'projects' ? 0 : 1}
              renderItem={({ item }) => (
                <View style={{ width: Dimensions.get('window').width, flex: 1 }}>
                  {item === 'users' ? (
                    <FlatList
                      data={sortedProfiles}
                      renderItem={({ item }) => (
                        <View style={styles.gridItem}>
                          <ProfileCard
                            profile={item}
                            isLiked={likedProfiles.has(item.id)}
                            onLike={() => handleLike(item.id)}
                            onSelect={() => setSelectedProfile(item)}
                          />
                        </View>
                      )}
                      keyExtractor={(item) => item.id}
                      numColumns={2}
                      contentContainerStyle={styles.listContent}
                      columnWrapperStyle={sortedProfiles.length > 0 ? styles.columnWrapper : undefined}
                      showsVerticalScrollIndicator={false}
                      onEndReached={loadMoreProfiles}
                      onEndReachedThreshold={0.5}
                      ListEmptyComponent={
                        <UsersEmptyState
                          onReset={() => {
                            setFilterCriteria(null);
                            onRefresh();
                          }}
                        />
                      }
                      ListFooterComponent={
                        loadingMore ? (
                          <View style={{ paddingVertical: 20 }}>
                            <ActivityIndicator size="small" color="#009688" />
                          </View>
                        ) : null
                      }
                      refreshControl={
                        <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} title="ユーザーを更新" />
                      }
                    />
                  ) : (
                    <UserProjectPage
                      sortOrder={sortOrder}
                      currentUser={currentUser}
                      onChat={(partnerId, partnerName, partnerImage) => {
                        setActiveChatRoom({
                          partnerId,
                          partnerName,
                          partnerImage,
                          isGroup: false,
                        });
                      }}
                    />
                  )}
                </View>
              )}
            />
          </FadeTabContent>
          <FadeTabContent activeTab={activeTab} tabId="likes">
            <LikesPage
              likedProfileIds={likedProfiles}
              allProfiles={displayProfiles}
              onProfileSelect={setSelectedProfile}
              onLike={handleLike}
            />
          </FadeTabContent>
          <FadeTabContent activeTab={activeTab} tabId="talk">
            <TalkPage
              onOpenChat={(room) => setActiveChatRoom({
                partnerId: room.partnerId,
                partnerName: room.partnerName,
                partnerImage: room.partnerImage,
                isGroup: room.type === 'group',
              })}
              onViewProfile={(partnerId) => {
                // Find the profile from displayProfiles or fetch it
                const profile = displayProfiles.find((p: Profile) => p.id === partnerId);
                if (profile) {
                  setSelectedProfile(profile);
                } else {
                  // Fetch profile if not in local list
                  supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', partnerId)
                    .single()
                    .then(({ data, error }) => {
                      if (data && !error) {
                        const mappedProfile: Profile = {
                          id: data.id,
                          name: data.name,
                          age: data.age,
                          location: data.location || '',
                          university: data.university,
                          company: data.company,
                          grade: data.grade || '',
                          image: data.image,
                          challengeTheme: data.challenge_theme || '',
                          theme: data.theme || '',
                          bio: data.bio,
                          skills: data.skills || [],
                          seekingFor: data.seeking_for || [],
                          seekingRoles: data.seeking_roles || [],
                          statusTags: data.status_tags || [],
                          isStudent: data.is_student ?? false,
                          createdAt: data.created_at || '',
                        };
                        setSelectedProfile(mappedProfile);
                      }
                    });
                }
              }}
              onViewProject={async (projectId) => {
                // Fetch project and show in UserProjectPage
                const { data: project, error } = await supabase
                  .from('projects')
                  .select('*')
                  .eq('id', projectId)
                  .single();

                if (project && !error) {
                  // Navigate to project owner's project page
                  const ownerProfile = displayProfiles.find((p: Profile) => p.id === project.owner_id);
                  if (ownerProfile) {
                    setSelectedProfile(ownerProfile);
                  }
                }
              }}
            />
          </FadeTabContent>
          <FadeTabContent activeTab={activeTab} tabId="profile">
            {isLoadingUser ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#009688" />
                <Text>プロフィールを読み込み中...</Text>
              </View>
            ) : currentUser ? (
              <MyPage
                profile={currentUser}
                onLogout={signOut}
                onEditProfile={handleEditProfile}
                onOpenNotifications={() => setShowNotifications(true)}
                onSettingsPress={() => setShowSettings(true)}
                onHelpPress={() => setShowHelp(true)}
                onBadgeUpdate={setPendingAppsCount}
              />
            ) : (
              <View style={styles.centerContainer}>
                <Text>プロフィールの読み込みに失敗しました。</Text>
                <TouchableOpacity onPress={fetchCurrentUser} style={{ marginTop: 10, padding: 10, backgroundColor: '#009688', borderRadius: 5 }}>
                  <Text style={{ color: 'white' }}>再読み込み</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={signOut} style={{ marginTop: 20 }}>
                  <Text style={{ color: 'red' }}>ログアウト</Text>
                </TouchableOpacity>
              </View>
            )}
          </FadeTabContent>
        </View>

        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab: any) => {
            setPreviousTab(activeTab);
            setActiveTab(tab);
          }}
          currentUser={currentUser}
          badges={{ profile: pendingAppsCount, talk: unreadMessagesCount, likes: unreadLikesCount }}
          onCreateProject={() => {
            if (!currentUser) {
              Alert.alert('ログインが必要です', 'プロジェクトを作成するにはログインしてください');
              return;
            }
            setShowCreateProjectModal(true);
          }}
        />
      </View>

      {/* Modals */}
      <Modal visible={showCreateProjectModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateProjectModal(false)}>
        <SafeAreaProvider>
          {currentUser && (
            <CreateProjectModal
              currentUser={currentUser}
              onClose={() => setShowCreateProjectModal(false)}
              onCreated={() => {
                setShowCreateProjectModal(false);
                // Optionally refresh projects list
                setActiveTab('search');
              }}
            />
          )}
        </SafeAreaProvider>
      </Modal>
      <Modal visible={!!activeChatRoom} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setActiveChatRoom(null)}>
        <SafeAreaProvider>
          {activeChatRoom && (
            <>
              {/* Show ProfileDetail on top if selectedProfile is set while in chat */}
              {selectedProfile ? (
                <ProfileDetail
                  profile={selectedProfile}
                  onBack={() => setSelectedProfile(null)}
                  onLike={() => handleLike(selectedProfile.id)}
                  onChat={() => {
                    // Already in chat context, just close the profile
                    setSelectedProfile(null);
                  }}
                  isLiked={likedProfiles.has(selectedProfile.id)}
                  isMatched={matchedProfileIds.has(selectedProfile.id)}
                />
              ) : (
                <ChatRoom
                  partnerId={activeChatRoom.partnerId}
                  partnerName={activeChatRoom.partnerName}
                  partnerImage={activeChatRoom.partnerImage}
                  isGroup={activeChatRoom.isGroup}
                  onBack={() => setActiveChatRoom(null)}
                  onPartnerProfilePress={() => {
                    const partner = displayProfiles.find(p => p.name === activeChatRoom.partnerName);
                    if (partner) {
                      setSelectedProfile(partner);
                    } else {
                      // Fetch if not in list
                      supabase
                        .from('profiles')
                        .select('*')
                        .eq('name', activeChatRoom.partnerName)
                        .single()
                        .then(({ data, error }) => {
                          if (data && !error) {
                            const mappedProfile: Profile = {
                              id: data.id,
                              name: data.name,
                              age: data.age,
                              location: data.location || '',
                              university: data.university,
                              company: data.company,
                              grade: data.grade || '',
                              image: data.image,
                              challengeTheme: data.challenge_theme || '',
                              theme: data.theme || '',
                              bio: data.bio,
                              skills: data.skills || [],
                              seekingFor: data.seeking_for || [],
                              seekingRoles: data.seeking_roles || [],
                              statusTags: data.status_tags || [],
                              isStudent: data.is_student ?? false,
                              createdAt: data.created_at || '',
                            };
                            setSelectedProfile(mappedProfile);
                          }
                        });
                    }
                  }}
                  onMemberProfilePress={(memberId) => {
                    const member = displayProfiles.find(p => p.id === memberId);
                    if (member) {
                      setSelectedProfile(member);
                    } else {
                      supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', memberId)
                        .single()
                        .then(({ data, error }) => {
                          if (data && !error) {
                            const mappedProfile: Profile = {
                              id: data.id,
                              name: data.name,
                              age: data.age,
                              location: data.location || '',
                              university: data.university,
                              company: data.company,
                              grade: data.grade || '',
                              image: data.image,
                              challengeTheme: data.challenge_theme || '',
                              theme: data.theme || '',
                              bio: data.bio,
                              skills: data.skills || [],
                              seekingFor: data.seeking_for || [],
                              seekingRoles: data.seeking_roles || [],
                              statusTags: data.status_tags || [],
                              isStudent: data.is_student ?? false,
                              createdAt: data.created_at || '',
                            };
                            setSelectedProfile(mappedProfile);
                          }
                        });
                    }
                  }}
                />
              )}
            </>
          )}
        </SafeAreaProvider>
      </Modal>

      {/* Profile Detail Modal - Rendered after ChatRoom so it appears on top */}
      <Modal visible={!!selectedProfile} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedProfile(null)}>
        <SafeAreaProvider>
          {selectedProfile && (
            <ProfileDetail
              profile={selectedProfile}
              onBack={() => setSelectedProfile(null)}
              onLike={() => handleLike(selectedProfile.id)}
              onChat={() => {
                setSelectedProfile(null);  // Close profile first
                setActiveChatRoom({
                  partnerId: selectedProfile.id,
                  partnerName: selectedProfile.name,
                  partnerImage: selectedProfile.image,
                  isGroup: false,
                });
              }}
              isLiked={likedProfiles.has(selectedProfile.id)}
              isMatched={matchedProfileIds.has(selectedProfile.id)}
            />
          )}
        </SafeAreaProvider>
      </Modal>

      <Modal visible={showProfileEdit} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowProfileEdit(false)}>
        <SafeAreaProvider>
          <ProfileEdit
            initialProfile={currentUser!}
            onSave={handleSaveProfile}
            onCancel={() => setShowProfileEdit(false)}
          />
        </SafeAreaProvider>
      </Modal>

      <Modal visible={showNotifications} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNotifications(false)}>
        <SafeAreaProvider>
          <NotificationsPage onBack={() => setShowNotifications(false)} />
        </SafeAreaProvider>
      </Modal>

      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettings(false)}>
        <SafeAreaProvider>
          <SettingsPage
            onBack={() => setShowSettings(false)}
            onLogout={signOut}
          />
        </SafeAreaProvider>
      </Modal>

      <Modal visible={showHelp} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHelp(false)}>
        <SafeAreaProvider>
          <HelpPage onBack={() => setShowHelp(false)} />
        </SafeAreaProvider>
      </Modal>

      <Modal visible={!!legalDocument} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLegalDocument(null)}>
        <SafeAreaProvider>
          <LegalDocumentPage
            title={legalDocument?.title || ''}
            content={legalDocument?.content || ''}
            onBack={() => setLegalDocument(null)}
          />
        </SafeAreaProvider>
      </Modal>

      <FilterModal
        visible={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={(criteria) => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setFilterCriteria(criteria);
          setIsFilterOpen(false);
        }}
        initialCriteria={filterCriteria || undefined}
      />

      <Modal
        visible={isSortModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSortModalOpen(false)}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsSortModalOpen(false)}
          />
          <View style={styles.sortModalContent}>
            <Text style={styles.sortModalTitle}>並び替え</Text>

            <TouchableOpacity
              style={styles.sortOption}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setSortOrder('recommended');
                setIsSortModalOpen(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                sortOrder === 'recommended' && styles.sortOptionTextActive
              ]}>おすすめ順</Text>
              {sortOrder === 'recommended' && <Ionicons name="checkmark" size={20} color="#0d9488" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortOption}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setSortOrder('newest');
                setIsSortModalOpen(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                sortOrder === 'newest' && styles.sortOptionTextActive
              ]}>新着順</Text>
              {sortOrder === 'newest' && <Ionicons name="checkmark" size={20} color="#0d9488" />}
            </TouchableOpacity>

            {/* Show deadline option only for projects tab */}
            {searchTab === 'projects' && (
              <TouchableOpacity
                style={styles.sortOption}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSortOrder('deadline');
                  setIsSortModalOpen(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortOrder === 'deadline' && styles.sortOptionTextActive
                ]}>締め切り順</Text>
                {sortOrder === 'deadline' && <Ionicons name="checkmark" size={20} color="#0d9488" />}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
      <MatchingModal
        visible={!!matchedProfile}
        profile={matchedProfile}
        onClose={() => setMatchedProfile(null)}
        onChat={() => {
          if (matchedProfile) {
            setActiveChatRoom({
              partnerId: matchedProfile.id,
              partnerName: matchedProfile.name,
              partnerImage: matchedProfile.image,
            });
            setMatchedProfile(null);
          }
        }}
      />
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  // ... (existing styles)
  container: {
    flex: 1,
    backgroundColor: 'white', // Updated to match header
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    // paddingBottom handled in FlatList contentContainerStyle
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
  },
  placeholderText: {
    fontSize: 16,
    color: '#6b7280',
  },
  link: {
    color: 'blue',
    textDecorationLine: 'underline',
    padding: 10,
  },
  headerContainer: {
    backgroundColor: 'white',
    paddingBottom: 16,
    // Remove shadow/elevation for flat look
    shadowColor: "transparent",
    elevation: 0,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerLeft: {
    width: 24, // Balance right icon
  },
  headerTitle: {
    fontSize: 32,
    color: '#009688',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontWeight: 'normal', // Let the font family handle weight
  },
  notificationButton: {
    padding: 4,
  },
  searchControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 12,
  },
  filterButton: {
    flex: 6, // 60%
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 100,
    height: 44,
    paddingHorizontal: 16,
    gap: 8,
    justifyContent: 'flex-start', // Left aligned content
  },
  filterButtonActive: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FF8A80',
  },
  sortButton: {
    flex: 4, // 40% (approx 35% requested, adjusted for gap)
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 100,
    height: 44,
    paddingHorizontal: 16,
    gap: 4,
    justifyContent: 'center',
  },
  controlButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  controlButtonTextActive: {
    color: '#FF5252',
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
    // width is handled in ProfileCard
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sortModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#111827',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  sortOptionTextActive: {
    color: '#0d9488',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#009688',
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#FF5252',
  },
  tabText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#FF5252',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyStateIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#009688',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
