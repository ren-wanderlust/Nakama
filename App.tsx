// Trigger rebuild
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Platform, ActivityIndicator, Modal, UIManager, LayoutAnimation, Dimensions, ScrollView, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { LoginScreen } from './components/LoginScreen';
import { ProfileCard } from './components/ProfileCard';
import { ProfileDetail } from './components/ProfileDetail';
import { BottomNav } from './components/BottomNav';
import { MyPage } from './components/MyPage';
import { LikesPage } from './components/LikesPage';
import { TalkPage } from './components/TalkPage';
import { ChatRoom } from './components/ChatRoom';
import { ProjectDetail } from './components/ProjectDetail';
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
import { mapProfileRowToProfile } from './utils/profileMapper';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { Message, fetchMessagesPage } from './data/api/messages';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from './lib/queryClient';
import { Alert } from 'react-native';
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from './constants/LegalTexts';
import { useQueryClient } from '@tanstack/react-query';
import { useProfilesList } from './data/hooks/useProfilesList';
import { useUnreadCount } from './data/hooks/useUnreadCount';
import { useMatches } from './data/hooks/useMatches';
import { useReceivedLikes } from './data/hooks/useReceivedLikes';
import { useProjectApplications } from './data/hooks/useProjectApplications';
import { useChatRooms } from './data/hooks/useChatRooms';
import { queryKeys } from './data/queryKeys';
import { registerForPushNotificationsAsync, savePushToken, setupNotificationListeners, getUserPushTokens, sendPushNotification } from './lib/notifications';
import { FullPageSkeleton, ProfileListSkeleton } from './components/Skeleton';
import { FadeTabContent } from './components/AnimatedTabView';
import { CustomRefreshControl } from './components/CustomRefreshControl';
import { SplashScreen } from './components/SplashScreen';

import { FONTS } from './constants/DesignSystem';

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
    // Check onboarding status - ユーザーIDごとに管理
    const checkOnboarding = async () => {
      if (!session?.user) {
        setHasCompletedOnboarding(true);
        return;
      }

      try {
        // ユーザーIDごとにオンボーディング状態を保存
        const onboardingKey = `hasSeenOnboarding_${session.user.id}`;
        const hasSeenOnboarding = await SecureStore.getItemAsync(onboardingKey);

        if (!hasSeenOnboarding) {
          // 初回起動時、このユーザーはまだオンボーディングを見ていない
          setShowOnboarding(true);
        }
      } catch (error) {
        console.log('Error checking onboarding:', error);
      }
      setHasCompletedOnboarding(true);
    };
    checkOnboarding();
  }, [session?.user?.id]);

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
    projectId?: string;
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

  const [refreshing, setRefreshing] = useState(false);
  const [searchRefreshing, setSearchRefreshing] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [pendingMatches, setPendingMatches] = useState<Profile[]>([]); // Queue of unviewed matches
  const [pendingAppsCount, setPendingAppsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false); // テスト用: falseで開始
  const [chatProjectDetail, setChatProjectDetail] = useState<any | null>(null); // プロジェクト詳細（チャットから）

  // 探すページのスクロール方向を検知してヘッダーを表示/非表示（サイズ固定）
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isHeaderVisible = useRef(true);
  // ヘッダーの高さ（safe area top + paddingTop + paddingBottom + コンテンツ）
  // 実際の高さは insets.top + 20 + 16 + ~40 なので、余裕を持って150に設定
  const HEADER_TOTAL_HEIGHT = 150;

  // スクロールハンドラー（方向を検知）
  const handleSearchScroll = useCallback((scrollY: number) => {
    const isScrollingDown = scrollY > lastScrollY.current && scrollY > 50;
    const isScrollingUp = scrollY < lastScrollY.current;

    if (isScrollingDown && isHeaderVisible.current) {
      // 下スクロール：ヘッダーを隠す
      isHeaderVisible.current = false;
      Animated.timing(headerTranslateY, {
        toValue: -HEADER_TOTAL_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else if (isScrollingUp && !isHeaderVisible.current) {
      // 上スクロール：ヘッダーを表示
      isHeaderVisible.current = true;
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }

    lastScrollY.current = scrollY;
  }, [headerTranslateY]);

  // React Query hooks
  const queryClient = useQueryClient();
  const profilesQuery = useProfilesList(sortOrder === 'newest' ? 'newest' : sortOrder === 'recommended' ? 'recommended' : 'deadline', session?.user?.id);
  const unreadCountQuery = useUnreadCount(session?.user?.id);
  const matchesQuery = useMatches(session?.user?.id);
  const receivedLikesQuery = useReceivedLikes(session?.user?.id);
  const projectApplicationsQuery = useProjectApplications(session?.user?.id);
  const chatRoomsQuery = useChatRooms(session?.user?.id);
  const unreadMessagesCount = unreadCountQuery.data ?? 0;

  // 参加しているチャットルームIDセット（フィルタリング用）
  // 個人チャット: partnerId、グループチャット: chat_room_id
  const participatingRoomIdsRef = useRef<Set<string>>(new Set());

  // Realtimeでのプロフィール取得をスケールさせるためのキャッシュ
  // - senderProfileCacheRef: メモリキャッシュ（同一セッション内での重複取得を防ぐ）
  // - senderProfileInFlightRef: 進行中リクエストを共有（同時到着での重複取得を防ぐ）
  const senderProfileCacheRef = useRef<Map<string, { name: string; image: string }>>(new Map());
  const senderProfileInFlightRef = useRef<Map<string, Promise<{ name: string; image: string } | null>>>(new Map());

  // Realtimeイベントでのinvalidateの連打を防ぐ（短時間のイベントをまとめる）
  const invalidateTimersRef = useRef<{
    unread: ReturnType<typeof setTimeout> | null;
    chatRooms: ReturnType<typeof setTimeout> | null;
  }>({ unread: null, chatRooms: null });

  // チャットルーム一覧から参加しているルームIDセットを構築
  React.useEffect(() => {
    if (!chatRoomsQuery.data) return;

    const roomIds = new Set<string>();
    chatRoomsQuery.data.forEach(room => {
      if (room.id) {
        roomIds.add(room.id);
      }
      // 個人チャットの場合、partnerIdも追加（メッセージ受信時の判定用）
      if (room.type === 'individual' && room.partnerId) {
        roomIds.add(room.partnerId);
      }
    });

    participatingRoomIdsRef.current = roomIds;
  }, [chatRoomsQuery.data]);

  // Matches data from React Query
  const matchedProfileIds: Set<string> = (matchesQuery.data?.matchIds instanceof Set)
    ? matchesQuery.data.matchIds
    : new Set();
  const likedProfiles: Set<string> = (matchesQuery.data?.myLikedIds instanceof Set)
    ? matchesQuery.data.myLikedIds
    : new Set();

  // Calculate unread likes count from React Query data (same as LikesPage)
  // プロジェクトのみ表示に変更したため、募集への応募のみカウント
  const unreadLikesCount = React.useMemo(() => {
    const projectApplicationsData = projectApplicationsQuery.data;

    if (!projectApplicationsData) return 0;

    /* ユーザーマッチング関連は将来的な復活のためにコメントで残す
    const receivedLikesData = receivedLikesQuery.data;
    if (!receivedLikesData) return 0;

    // Unread interest count (未マッチの未読)
    // AsyncStorage永続化復元時に Set がプレーンオブジェクト化する可能性があるため、instanceofで防御
    const unreadInterestIds: Set<string> = (receivedLikesData.unreadInterestIds instanceof Set)
      ? receivedLikesData.unreadInterestIds
      : new Set();
    const unreadInterestCount = unreadInterestIds.size || 0;

    // Unread match count (マッチ済みの未読)
    const unreadMatchIds: Set<string> = (receivedLikesData.unreadMatchIds instanceof Set)
      ? receivedLikesData.unreadMatchIds
      : new Set();
    const unreadMatchCount = unreadMatchIds.size || 0;
    */

    // Unread recruiting count (募集への応募の未読)
    const unreadRecruitingIds: Set<string> = (projectApplicationsData.unreadRecruitingIds instanceof Set)
      ? projectApplicationsData.unreadRecruitingIds
      : new Set();
    const unreadRecruitingCount = unreadRecruitingIds.size || 0;

    // return unreadInterestCount + unreadMatchCount + unreadRecruitingCount; // ユーザーマッチング含む
    return unreadRecruitingCount; // プロジェクトのみ
  }, [projectApplicationsQuery.data]);

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

  // プロフィール一覧をReact Queryから取得（useInfiniteQuery）
  const displayProfiles: Profile[] = profilesQuery.data?.pages.flatMap((page: any) => page.profiles) || [];
  const loadingMore = profilesQuery.isFetchingNextPage;
  const hasMore = profilesQuery.hasNextPage ?? false;

  const loadMoreProfiles = () => {
    if (profilesQuery.hasNextPage && !profilesQuery.isFetchingNextPage) {
      profilesQuery.fetchNextPage();
    }
  };

  // fetchMatchesはReact Queryに置き換え済み（useMatches hookを使用）

  // Check for unviewed matches on app launch/resume
  const checkUnviewedMatches = async () => {
    if (!session?.user) return;

    try {
      // Get stored viewed matches
      const viewedMatchesStr = await SecureStore.getItemAsync(`viewed_matches_${session.user.id}`);
      const viewedMatches = viewedMatchesStr ? JSON.parse(viewedMatchesStr) : [];

      // Get current matches
      const { data: myLikes } = await supabase
        .from('likes')
        .select('receiver_id, created_at')
        .eq('sender_id', session.user.id);

      const { data: receivedLikes } = await supabase
        .from('likes')
        .select('sender_id, created_at')
        .eq('receiver_id', session.user.id);

      const myLikedIdsMap = new Map(myLikes?.map(l => [l.receiver_id, l.created_at]) || []);

      // Find new matches that haven't been viewed
      const newMatches: string[] = [];
      receivedLikes?.forEach(l => {
        if (myLikedIdsMap.has(l.sender_id) && !viewedMatches.includes(l.sender_id)) {
          newMatches.push(l.sender_id);
        }
      });

      // Fetch ALL unviewed matches (✅ Optimized: Single batch query instead of N+1)
      if (newMatches.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, age, university, company, grade, image, bio, skills, seeking_for, seeking_roles, status_tags, is_student, created_at')
          .in('id', newMatches);

        const matchProfiles: Profile[] = (profilesData || []).map((profileData: any) =>
          mapProfileRowToProfile(profileData)
        );

        // Add all matches to the pending queue
        if (matchProfiles.length > 0) {
          setPendingMatches(matchProfiles);

          // Show the first match immediately
          setTimeout(() => {
            setMatchedProfile(matchProfiles[0]);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error checking unviewed matches:', error);
    }
  };

  // Fetch pending applications count function (extracted for reuse)
  const fetchPendingApps = React.useCallback(async () => {
    if (!session?.user) return;

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
  }, [session?.user]);

  // Fetch pending applications count on mount and subscribe to changes
  React.useEffect(() => {
    if (!session?.user) return;

    fetchPendingApps();

    // Subscribe to changes
    const channel = supabase.channel('pending_apps_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_applications' }, () => {
        console.log('Realtime event received for project_applications');
        fetchPendingApps();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user, fetchPendingApps]);

  // Realtime subscription for unread messages count and chat rooms list (invalidateQueries使用)
  React.useEffect(() => {
    if (!session?.user) return;

    // invalidateをデバウンス（ユーザー体験を崩さずサーバー負荷を抑える）
    const scheduleInvalidateUnread = () => {
      if (!session?.user?.id) return;
      if (invalidateTimersRef.current.unread) return;
      invalidateTimersRef.current.unread = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount.detail(session.user.id) });
        invalidateTimersRef.current.unread = null;
      }, 250);
    };

    const scheduleInvalidateChatRooms = () => {
      if (!session?.user?.id) return;
      if (invalidateTimersRef.current.chatRooms) return;
      invalidateTimersRef.current.chatRooms = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms.list(session.user.id) });
        invalidateTimersRef.current.chatRooms = null;
      }, 250);
    };

    // Subscribe to messages (Insert and Update) and invalidate queries
    const channel = supabase
      .channel(`unread_messages_${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMessage = payload.new;

          // ✅ フィルタリング: 自分に関係するメッセージかチェック（早期リターン）
          const isRelevant =
            newMessage.receiver_id === session.user.id || // 自分宛のメッセージ
            newMessage.sender_id === session.user.id || // 自分が送ったメッセージ（他デバイスから）
            (newMessage.chat_room_id && participatingRoomIdsRef.current.has(newMessage.chat_room_id)); // 参加しているグループチャット

          if (!isRelevant) {
            // 無関係なメッセージはスキップ（スケーラビリティ向上）
            return;
          }

          // Determine the chat room ID (query key)
          let roomId: string | null = null;
          if (newMessage.chat_room_id) {
            roomId = newMessage.chat_room_id;
          } else if (newMessage.receiver_id === session.user.id) {
            roomId = newMessage.sender_id;
          } else if (newMessage.sender_id === session.user.id) {
            roomId = newMessage.receiver_id;
          }

          if (roomId) {
            // Fetch sender profile for name/image
            let senderName = '';
            let senderImage = '';

            if (newMessage.sender_id === session.user.id) {
              senderName = '自分';
            } else {
              const senderId: string | null | undefined = newMessage.sender_id;
              if (senderId) {
                // 1) メモリキャッシュ
                const memCached = senderProfileCacheRef.current.get(senderId);
                if (memCached) {
                  senderName = memCached.name || '';
                  senderImage = memCached.image || '';
                } else {
                  // 2) React Queryキャッシュ
                  const profileQueryKey = ['profile', senderId];
                  const cachedProfile = queryClient.getQueryData<any>(profileQueryKey);
                  if (cachedProfile) {
                    senderName = cachedProfile.name || '';
                    senderImage = cachedProfile.image || '';
                    senderProfileCacheRef.current.set(senderId, {
                      name: senderName,
                      image: senderImage,
                    });
                  } else {
                    // 3) in-flight共有（同時到着時の重複リクエストを防止）
                    let inFlight = senderProfileInFlightRef.current.get(senderId);
                    if (!inFlight) {
                      inFlight = (async () => {
                        try {
                          const { data } = await supabase
                            .from('profiles')
                            .select('name, image')
                            .eq('id', senderId)
                            .single();

                          if (!data) return null;
                          return { name: data.name || '', image: data.image || '' };
                        } finally {
                          // 成否に関わらずin-flightは解放
                          senderProfileInFlightRef.current.delete(senderId);
                        }
                      })();
                      senderProfileInFlightRef.current.set(senderId, inFlight);
                    }

                    const fetched = await inFlight;
                    if (fetched) {
                      senderName = fetched.name || '';
                      senderImage = fetched.image || '';
                      senderProfileCacheRef.current.set(senderId, fetched);
                      queryClient.setQueryData(profileQueryKey, fetched);
                    }
                  }
                }
              }
            }

            const formattedMessage: Message = {
              id: newMessage.id,
              text: newMessage.content,
              image_url: newMessage.image_url,
              sender: newMessage.sender_id === session.user.id ? 'me' : 'other',
              senderId: newMessage.sender_id,
              senderName: senderName,
              senderImage: senderImage,
              timestamp: new Date(newMessage.created_at).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              date: new Date(newMessage.created_at).toISOString().split('T')[0],
              created_at: newMessage.created_at,
              replyTo: newMessage.reply_to,
            };

            // Update Cache
            const queryKey = queryKeys.messages.list(roomId);
            queryClient.setQueryData(queryKey, (oldData: any) => {
              if (!oldData || !oldData.pages) {
                // If no cache exists, we might not want to create it from scratch with just one message
                // because we'd miss history. 
                // However, for "offline first", having the new message is better than nothing.
                // But if we create a page with 1 message, next fetch might be weird?
                // useInfiniteQuery handles pages. 
                // If we initialize it, we should set nextCursor to null? No, that implies no more messages.
                // Safer to ONLY update if cache exists. If not, let the component fetch when opened.
                return oldData;
              }

              // Check if message already exists (e.g. optimistic update)
              const firstPage = oldData.pages[0];
              const exists = firstPage.data.some((m: Message) => m.id === formattedMessage.id);
              if (exists) return oldData;

              // Replace optimistic message if it exists (by matching content/timestamp? ID is different)
              // Optimistic update usually handles replacement via its own logic in ChatRoom.
              // Here we just prepend if not present.
              // Note: ChatRoom's optimistic update uses a temp ID. 
              // If we receive the real message here, we might duplicate if we don't clean up temp.
              // But ChatRoom handles the "success" of its own insert.
              // This global listener catches messages from *other* devices or *partners*.
              // For my own messages sent from *this* device, ChatRoom handles it.
              // For my messages sent from *other* devices, this listener handles it.

              return {
                ...oldData,
                pages: [{
                  ...firstPage,
                  data: [formattedMessage, ...firstPage.data]
                }, ...oldData.pages.slice(1)]
              };
            });
          }

          // (2) invalidate / refetch 実行（関係するメッセージのみ）
          // - chatRooms: 最新メッセージ表示のため（送信/受信いずれも影響）
          // - unreadCount: 未読に影響する場合のみ（自分が送ったメッセージでは不要）
          scheduleInvalidateChatRooms();

          const affectsUnread =
            newMessage.sender_id !== session.user.id &&
            (
              // DM: 自分宛
              newMessage.receiver_id === session.user.id ||
              // Group: 参加中ルーム
              (newMessage.chat_room_id && participatingRoomIdsRef.current.has(newMessage.chat_room_id))
            );
          if (affectsUnread) {
            scheduleInvalidateUnread();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMessage = payload.new as any;
          const oldMessage = (payload as any)?.old as any;

          // ✅ フィルタリング: 自分に関係するメッセージの更新かチェック
          const isRelevant =
            updatedMessage.receiver_id === session.user.id ||
            updatedMessage.sender_id === session.user.id ||
            (updatedMessage.chat_room_id && participatingRoomIdsRef.current.has(updatedMessage.chat_room_id));

          if (!isRelevant) {
            // 無関係なメッセージ更新はスキップ
            return;
          }

          // UPDATEはノイズが多いので「未読に影響する更新」だけ拾う
          // - DMの既読化（is_read変更）など
          const isReadChanged = oldMessage?.is_read !== updatedMessage?.is_read;
          const affectsDmUnread =
            (updatedMessage.chat_room_id == null) &&
            (updatedMessage.receiver_id === session.user.id) &&
            isReadChanged;

          if (affectsDmUnread) {
            scheduleInvalidateUnread();
            scheduleInvalidateChatRooms();
          }
        }
      )
      .subscribe();

    return () => {
      // デバウンスタイマーをクリア
      if (invalidateTimersRef.current.unread) {
        clearTimeout(invalidateTimersRef.current.unread);
        invalidateTimersRef.current.unread = null;
      }
      if (invalidateTimersRef.current.chatRooms) {
        clearTimeout(invalidateTimersRef.current.chatRooms);
        invalidateTimersRef.current.chatRooms = null;
      }
      supabase.removeChannel(channel);
    };
  }, [session?.user, queryClient, chatRoomsQuery.data]);

  // Realtime subscription for likes and applications (only invalidate queries)
  React.useEffect(() => {
    if (!session?.user) return;

    // Subscribe to likes changes
    const likesChannel = supabase.channel('unread_likes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
        if (session?.user) {
          queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(session.user.id) });
          queryClient.invalidateQueries({ queryKey: queryKeys.receivedLikes.detail(session.user.id) });
        }
      })
      .subscribe();

    // Subscribe to project_applications changes
    const applicationsChannel = supabase.channel('unread_applications_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_applications' }, (payload) => {
        if (session?.user) {
          // ハート(いいね)バッジ更新のため、即再取得を行う (refetchQueriesを使用)
          queryClient.refetchQueries({ queryKey: queryKeys.projectApplications.detail(session.user.id) });
          queryClient.refetchQueries({ queryKey: queryKeys.myProjects.detail(session.user.id) });
        }

        // 承認(approved) になったユーザーの「参加中」を確実に更新する
        // NOTE: session.user.id ではなく payload の user_id を使う（別ユーザーの承認でも正しくinvalidate）
        try {
          const newRow: any = (payload as any)?.new;
          const oldRow: any = (payload as any)?.old;

          const targetUserId: string | undefined = newRow?.user_id ?? oldRow?.user_id;
          const newStatus: string | undefined = newRow?.status;
          const oldStatus: string | undefined = oldRow?.status;

          const becameApproved = newStatus === 'approved' && oldStatus !== 'approved';
          if (becameApproved && targetUserId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.participatingProjects.detail(targetUserId) });
          }
        } catch (e) {
          console.log('[realtime] project_applications payload parse error:', e);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(applicationsChannel);
    };
  }, [session?.user, queryClient]);

  // Fetch unread notifications count (user-specific notifications only)
  const fetchUnreadNotifications = useCallback(async () => {
    if (!session?.user) return;
    try {
      // Only count user-specific notifications (いいね, マッチング etc.)
      // Public notifications (user_id is null) are shared, so not tracked for read status
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);

      if (!error) {
        setUnreadNotificationsCount(count || 0);
      }
    } catch (e) {
      console.log('Error fetching unread notifications:', e);
    }
  }, [session?.user]);

  React.useEffect(() => {
    if (!session?.user) return;

    fetchUnreadNotifications();

    // Subscribe to notifications changes
    const channel = supabase.channel('unread_notifications_count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        fetchUnreadNotifications();

        // Push通知は届くのにハート(いいね)バッジが増えないケースの対策:
        // 応募通知(= application) が INSERT されたら、応募一覧(projectApplications) を即時再取得して未読バッジを更新する。
        // NOTE: project_applications のRealtimeが無効/不安定でも、notifications のRealtimeが動いていればUIは追従できる。
        try {
          const newRow: any = (payload as any)?.new;
          const type: string | undefined = newRow?.type;
          const targetUserId: string | undefined = newRow?.user_id;

          if (type === 'application' && targetUserId && targetUserId === session.user.id) {
            queryClient.refetchQueries({
              queryKey: queryKeys.projectApplications.detail(session.user.id),
            });
          }
        } catch (e) {
          console.log('[realtime] notifications payload parse error:', e);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, () => {
        fetchUnreadNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user, fetchUnreadNotifications]);

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
            .select('id, created_at')
            .eq('owner_id', session.user.id);

          const { data: approvedApps } = await supabase
            .from('project_applications')
            .select('project_id, approved_at, created_at')
            .eq('user_id', session.user.id)
            .eq('status', 'approved');

          const memberProjectIds = new Set<string>();
          const participationTimeByProject = new Map<string, string>();

          ownedProjects?.forEach((p: any) => {
            memberProjectIds.add(p.id);
            participationTimeByProject.set(p.id, p.created_at);
          });

          approvedApps?.forEach((a: any) => {
            memberProjectIds.add(a.project_id);
            // approved_at があればそれを使用、なければ created_at を使用
            const joinedAt = a.approved_at || a.created_at;
            const existingTime = participationTimeByProject.get(a.project_id);
            // より早い時点を使用（既に設定されていて、それより早い場合）
            if (!existingTime || new Date(joinedAt).getTime() < new Date(existingTime).getTime()) {
              participationTimeByProject.set(a.project_id, joinedAt);
            }
          });

          let groupCount = 0;
          if (memberProjectIds.size > 0) {
            const { data: groups } = await supabase
              .from('chat_rooms')
              .select('id, project_id, created_at')
              .eq('type', 'group')
              .in('project_id', Array.from(memberProjectIds));

            if (groups && groups.length > 0) {
              const groupIds = groups.map((g: any) => g.id);

              // ✅ Batch Query 1: Fetch read statuses for all groups at once
              const { data: readStatuses } = await supabase
                .from('chat_room_read_status')
                .select('chat_room_id, last_read_at')
                .eq('user_id', session.user.id)
                .in('chat_room_id', groupIds);

              const readStatusByRoom = new Map<string, string>();
              readStatuses?.forEach((status: any) => {
                readStatusByRoom.set(status.chat_room_id, status.last_read_at);
              });

              // ✅ Batch Query 2: Fetch unread messages for all groups at once
              // 各ルームごとに、last_read_at または参加時点の早い方を基準に取得
              const baseTimeByRoom = new Map<string, string>();
              groups.forEach((g: any) => {
                const lastReadTime = readStatusByRoom.get(g.id);
                const participationTime = participationTimeByProject.get(g.project_id);
                const roomCreatedTime = g.created_at;

                // 参加時点とチャットルーム作成時点の早い方を基準にする
                const effectiveParticipationTime = participationTime && roomCreatedTime
                  ? (new Date(participationTime).getTime() < new Date(roomCreatedTime).getTime()
                    ? participationTime
                    : roomCreatedTime)
                  : (participationTime || roomCreatedTime || '1970-01-01');

                // last_read_at がある場合はそれを使用、なければ参加時点を使用
                baseTimeByRoom.set(g.id, lastReadTime || effectiveParticipationTime);
              });

              const allBaseTimes = Array.from(baseTimeByRoom.values());
              const globalMinBaseTime =
                allBaseTimes.length > 0
                  ? allBaseTimes.reduce(
                    (min, current) =>
                      new Date(current).getTime() < new Date(min).getTime() ? current : min,
                    allBaseTimes[0]
                  )
                  : '1970-01-01';

              const { data: unreadMessages } = await supabase
                .from('messages')
                .select('chat_room_id, created_at, sender_id')
                .in('chat_room_id', groupIds)
                .gt('created_at', globalMinBaseTime)
                .neq('sender_id', session.user.id);

              // Count unread messages per room on client side
              const unreadCountByRoom = new Map<string, number>();
              unreadMessages?.forEach((msg: any) => {
                const baseTime = baseTimeByRoom.get(msg.chat_room_id) || '1970-01-01';
                if (new Date(msg.created_at).getTime() > new Date(baseTime).getTime()) {
                  unreadCountByRoom.set(
                    msg.chat_room_id,
                    (unreadCountByRoom.get(msg.chat_room_id) || 0) + 1
                  );
                }
              });

              groupCount = Array.from(unreadCountByRoom.values()).reduce((a, b) => a + b, 0);
            }
          }

          // 未読数はReact Queryで管理されているため、invalidateQueriesで更新
          queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount.detail(session.user.id) });
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
        .select('id, name, age, university, company, grade, image, bio, skills, seeking_for, seeking_roles, status_tags, is_student, created_at, github_url')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const mappedUser: Profile = {
          id: data.id,
          name: data.name,
          age: data.age,
          university: data.university,
          company: data.company,
          grade: data.grade,
          image: data.image,
          challengeTheme: '',
          theme: '',
          bio: data.bio,
          skills: data.skills || [],
          seekingFor: data.seeking_for || [],
          seekingRoles: data.seeking_roles || [],
          statusTags: data.status_tags || [],
          isStudent: data.is_student,
          createdAt: data.created_at,
          githubUrl: data.github_url,
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

  // Track previous session to detect login
  const prevSession = React.useRef(session);

  React.useEffect(() => {
    if (session?.user) {
      fetchCurrentUser();

      // Check for unviewed matches after fetching matches
      // Use slight delay to ensure matchedProfileIds is updated first
      if (matchesQuery.data) {
        setTimeout(() => {
          checkUnviewedMatches();
        }, 1000);
      }

      // Reset to default tab when user logs in (session changes from null to user)
      if (!prevSession.current?.user && session?.user) {
        setActiveTab('search');
        setSearchTab('projects');
      }

      // [Offline-First] Launch Sync: Background Refetch of Active Chats
      // We refetch the chat list first, then potentially refetch messages for top chats?
      // Actually, just invalidating chat list is enough to update the "list".
      // To update the "messages" inside rooms, we would need to know WHICH rooms to fetch.
      // A simple approach is to let the user open the room.
      // But user asked for "Save on launch".
      // So we iterate over recent chat rooms and prefetch/refetch their messages.
      const syncMessages = async () => {
        try {
          // Fetch recent chat rooms (limit to top 10 for performance)
          const { data: rooms } = await supabase
            .from('chat_rooms')
            .select('id, project_id, type')
            .order('updated_at', { ascending: false })
            .limit(10); // Sync top 10 rooms

          // Also fetch recent DMs (from messages table grouping? Hard in Supabase)
          // Easier to rely on `useChatRooms` query if we had it.
          // For now, let's just trigger a refetch of the chat list, 
          // and maybe prefetch the *most recent* room if we can identify it.
          // Given the complexity of identifying all DM partners without a dedicated table/query here,
          // we will stick to invalidating the list, which is the prerequisite.
          // If we want to be aggressive, we can prefetch messages for the active chat room if it exists.

          // Ideally, we should iterate over the cached chat rooms list if available.
          let roomsToSync: any[] = [];
          const chatRoomsData = queryClient.getQueryData(queryKeys.chatRooms.list(session.user.id));

          if (chatRoomsData && Array.isArray(chatRoomsData)) {
            roomsToSync = chatRoomsData;
          } else if (rooms && rooms.length > 0) {
            // If cache is empty, use the fetched rooms
            roomsToSync = rooms;
          }

          roomsToSync.forEach((room) => {
            const roomId = room.partnerId || room.id;
            // For group chats, room.type is 'group'. For DMs, we need to know if it's group.
            // The 'rooms' fetched from DB has 'type'.
            // The 'chatRoomsData' from cache has 'isGroup'.
            const isGroup = room.type === 'group' || room.isGroup;

            if (roomId) {
              queryClient.prefetchInfiniteQuery({
                queryKey: queryKeys.messages.list(roomId),
                queryFn: ({ pageParam }) => fetchMessagesPage({
                  roomId,
                  userId: session.user.id,
                  limit: 20, // Fetch smaller batch for sync
                  cursor: pageParam as string | undefined,
                  isGroup,
                }),
                initialPageParam: undefined,
                staleTime: 0, // Force fetch for sync
              });
            }
          });
        } catch (e) {
          console.log('Sync error:', e);
        }
      };
      syncMessages();
    }
    prevSession.current = session;
  }, [session]);

  // Realtime subscription for matching (invalidateQueries使用)
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
          .select('id')
          .eq('sender_id', session.user.id)
          .eq('receiver_id', senderId)
          .maybeSingle();

        if (myLike) {
          // It's a match! (initiated by the other user)
          queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(session.user.id) });

          // Fetch sender's profile to display modal
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('id, name, age, university, company, grade, image, bio, skills, seeking_for, seeking_roles, status_tags, is_student, created_at')
            .eq('id', senderId)
            .single();

          if (senderProfile) {
            const profile: Profile = {
              id: senderProfile.id,
              name: senderProfile.name,
              age: senderProfile.age,
              university: senderProfile.university,
              company: senderProfile.company,
              grade: senderProfile.grade || '',
              image: senderProfile.image,
              challengeTheme: '',
              theme: '',
              bio: senderProfile.bio,
              skills: senderProfile.skills || [],
              seekingFor: senderProfile.seeking_for || [],
              seekingRoles: senderProfile.seeking_roles || [],
              statusTags: senderProfile.status_tags || [],
              isStudent: senderProfile.is_student,
              createdAt: senderProfile.created_at,
            };

            // Mark this match as viewed
            try {
              const viewedMatchesStr = await SecureStore.getItemAsync(`viewed_matches_${session.user.id}`);
              const viewedMatches = viewedMatchesStr ? JSON.parse(viewedMatchesStr) : [];
              if (!viewedMatches.includes(senderId)) {
                viewedMatches.push(senderId);
                await SecureStore.setItemAsync(
                  `viewed_matches_${session.user.id}`,
                  JSON.stringify(viewedMatches)
                );
              }
            } catch (error) {
              console.error('Error saving viewed match:', error);
            }

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
    await Promise.all([
      profilesQuery.refetch(),
      unreadCountQuery.refetch(),
      matchesQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [profilesQuery, unreadCountQuery, matchesQuery]);

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
      // 新着順: 登録日時でソート
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    // Recommended order: アクティブ度（最後にアクティブだったユーザーを優先）
    // lastActiveAtがあればそれを使用、なければcreatedAtにフォールバック
    const aActiveTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : new Date(a.createdAt).getTime();
    const bActiveTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : new Date(b.createdAt).getTime();
    return bActiveTime - aActiveTime;
  });

  const handleLike = async (profileId: string) => {
    if (!session?.user) return;

    // Check if already liked (for unlike confirmation)
    const isCurrentlyLiked = likedProfiles.has(profileId);

    if (isCurrentlyLiked) {
      // Show confirmation dialog before unliking
      Alert.alert(
        'いいねを取り消しますか？',
        'この操作を行うと、いいねが取り消されます。',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '取り消す',
            style: 'destructive',
            onPress: async () => {
              // Delete from database
              try {
                await supabase
                  .from('likes')
                  .delete()
                  .eq('sender_id', session.user.id)
                  .eq('receiver_id', profileId);

                // Invalidate queries to refresh data
                queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(session.user.id) });
              } catch (error) {
                console.error('Error unliking:', error);
              }
            }
          }
        ]
      );
      return;
    }

    // Optimistic updateは削除（React Queryが自動で更新）

    try {
      // Check if already liked (shouldn't happen but just in case)
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('sender_id', session.user.id)
        .eq('receiver_id', profileId)
        .maybeSingle();

      if (existingLike) {
        // Already liked, do nothing (UI already shows liked state)
        return;
      } else {
        // Like
        await supabase
          .from('likes')
          .insert({
            sender_id: session.user.id,
            receiver_id: profileId
          });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(session.user.id) });

        // Create notification for like
        if (currentUser) {
          await supabase.from('notifications').insert({
            user_id: profileId,
            sender_id: session.user.id,
            related_user_id: session.user.id,  // いいねを送った人のID
            type: 'like',
            title: 'いいねが届きました！',
            content: `${currentUser.name}さんからいいねが届きました。`,
            image_url: currentUser.image
          });

          // Invalidate notifications query for the recipient
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(profileId) });

          // Send push notification for like
          try {
            const tokens = await getUserPushTokens(profileId);
            console.log(`[Like Push] Sending to user ${profileId}, found ${tokens.length} token(s):`, tokens);
            if (tokens.length === 0) {
              console.log('[Like Push] No push tokens found for user - notification not sent');
            }
            for (const token of tokens) {
              console.log('[Like Push] Sending notification to token:', token.substring(0, 20) + '...');
              const result = await sendPushNotification(
                token,
                'いいねが届きました！',
                `${currentUser.name}さんからいいねが届きました。`,
                { type: 'like', senderId: session.user.id }
              );
              console.log('[Like Push] Send result:', result);
            }
          } catch (pushError) {
            console.log('[Like Push] Error:', pushError);
          }
        }

        // Check for match
        const { data: reverseLike } = await supabase
          .from('likes')
          .select('id')
          .eq('sender_id', profileId)
          .eq('receiver_id', session.user.id)
          .maybeSingle();

        if (reverseLike) {
          // It's a match!
          queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(session.user.id) });

          // Try to find in displayProfiles first, otherwise fetch from supabase
          let matchedUser = displayProfiles.find(p => p.id === profileId);

          if (!matchedUser) {
            // Fetch profile from supabase if not in displayProfiles
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, name, age, university, company, grade, image, bio, skills, seeking_for, seeking_roles, status_tags, is_student, created_at')
              .eq('id', profileId)
              .single();

            if (profileData) {
              matchedUser = {
                id: profileData.id,
                name: profileData.name,
                age: profileData.age,
                university: profileData.university,
                company: profileData.company,
                grade: profileData.grade || '',
                image: profileData.image,
                challengeTheme: '',
                theme: '',
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

            // Mark this match as viewed
            try {
              const viewedMatchesStr = await SecureStore.getItemAsync(`viewed_matches_${session.user.id}`);
              const viewedMatches = viewedMatchesStr ? JSON.parse(viewedMatchesStr) : [];
              if (!viewedMatches.includes(profileId)) {
                viewedMatches.push(profileId);
                await SecureStore.setItemAsync(
                  `viewed_matches_${session.user.id}`,
                  JSON.stringify(viewedMatches)
                );
              }
            } catch (error) {
              console.error('Error saving viewed match:', error);
            }

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
                    related_user_id: session.user.id,  // マッチング相手のID
                    type: 'match',
                    title: 'マッチング成立！',
                    content: `${currentUserCopy.name}さんとマッチングしました！メッセージを送ってみましょう。`,
                    image_url: currentUserCopy.image
                  });

                  // Notify self
                  await supabase.from('notifications').insert({
                    user_id: session.user.id,
                    sender_id: profileId,
                    related_user_id: profileId,  // マッチング相手のID
                    type: 'match',
                    title: 'マッチング成立！',
                    content: `${matchedUserCopy.name}さんとマッチングしました！メッセージを送ってみましょう。`,
                    image_url: matchedUserCopy.image
                  });

                  // Invalidate notifications queries for both users
                  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(profileId) });
                  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(session.user.id) });

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

  const handleBlockUser = (userId: string) => {
    console.log('Blocking user:', userId);

    // UI反映: リストから削除（React Queryキャッシュを直接更新）
    queryClient.setQueryData(
      queryKeys.profiles.list(20, sortOrder === 'newest' ? 'newest' : sortOrder === 'recommended' ? 'recommended' : 'deadline'),
      (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            profiles: page.profiles.filter((p: Profile) => p.id !== userId),
          })),
        };
      }
    );

    // Invalidate queries to refresh data (likes and matches)
    if (session?.user) {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(session.user.id) });
    }

    // 現在開いているプロフィールやチャットを閉じる
    if (selectedProfile?.id === userId) {
      setSelectedProfile(null);
    }
    if (activeChatRoom?.partnerId === userId) {
      setActiveChatRoom(null);
    }
    if (matchedProfile?.id === userId) {
      setMatchedProfile(null);
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
      profilesQuery.refetch(); // Refresh list to show updates
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
            // Reset to default tab (projects page)
            setActiveTab('search');
            setSearchTab('projects');
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
      <StatusBar style="dark" translucent={true} backgroundColor="transparent" />
      <View style={{ flex: 1 }}>
        {/* Header */}
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={{ width: '100%', backgroundColor: 'white' }}>
            {activeTab !== 'search' && activeTab !== 'likes' && activeTab !== 'talk' && activeTab !== 'challenge' && activeTab !== 'profile' && (
              <View style={[styles.headerTop, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerLeft} />
                <Text style={[styles.headerTitle, { color: '#F39800' }]}>Pogg</Text>
                <TouchableOpacity
                  style={styles.notificationButton}
                  onPress={() => setShowNotifications(true)}
                >
                  <Ionicons name="notifications-outline" size={24} color="#F39800" />
                  {unreadNotificationsCount > 0 && (
                    <View style={styles.notificationBadgeDot} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'search' && (
              <Animated.View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                transform: [{ translateY: headerTranslateY }],
              }}>
                {/* シンプルなヘッダー - 絞り込み/ソートと通知ボタンを同じ行に配置 */}
                <View style={[styles.searchHeader, { backgroundColor: 'white' }]}>
                  <View style={[styles.searchHeaderGradient, { paddingTop: insets.top + 20, paddingBottom: 16, backgroundColor: 'white' }]}>
                    <View style={styles.headerTop}>
                      <View style={styles.headerLeft} />
                      {/* 絞り込み/ソートを中央に配置 */}
                      <View style={styles.searchControlBarInHeader}>
                        <TouchableOpacity
                          style={[styles.filterButton, isFilterActive && styles.filterButtonActive]}
                          onPress={() => setIsFilterOpen(true)}
                        >
                          <Ionicons name="search" size={16} color="#F39800" />
                          {filterCriteria?.keyword ? (
                            <>
                              <Text style={[styles.controlButtonText, styles.controlButtonTextActive, { flex: 1 }]} numberOfLines={1}>
                                {filterCriteria.keyword}
                              </Text>
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  setFilterCriteria(prev => prev ? { ...prev, keyword: '' } : null);
                                }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                style={{ marginLeft: 'auto' }}
                              >
                                <Ionicons name="close-circle" size={16} color="#F39800" />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <Text style={[styles.controlButtonText, isFilterActive && styles.controlButtonTextActive]}>
                              絞り込み
                            </Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.sortButton}
                          onPress={() => setIsSortModalOpen(true)}
                        >
                          <Text style={styles.controlButtonText}>
                            {sortOrder === 'recommended' ? 'おすすめ順' : sortOrder === 'newest' ? '新着順' : '締め切り順'}
                          </Text>
                          <Ionicons name="chevron-down" size={14} color="#F39800" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.headerRight}>
                        <TouchableOpacity
                          style={styles.notificationButton}
                          onPress={() => setShowNotifications(true)}
                        >
                          <Ionicons name="notifications-outline" size={24} color="#F39800" />
                          {unreadNotificationsCount > 0 && (
                            <View style={styles.notificationBadgeDot} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>

                {/* リフレッシュ中のスピナー表示 */}
                {searchRefreshing && (
                  <View style={styles.searchRefreshIndicator}>
                    <ActivityIndicator size="small" color="#F39800" />
                  </View>
                )}

                {/* アクティブフィルタータグ表示 */}
                {((filterCriteria?.themes && filterCriteria.themes.length > 0) || (filterCriteria?.seekingRoles && filterCriteria.seekingRoles.length > 0)) && (
                  <View style={styles.activeFilterTagsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {filterCriteria?.themes?.map((theme) => (
                        <TouchableOpacity
                          key={`theme-${theme}`}
                          style={styles.activeFilterTag}
                          onPress={() => {
                            setFilterCriteria(prev => prev ? {
                              ...prev,
                              themes: prev.themes?.filter(t => t !== theme) || []
                            } : null);
                          }}
                        >
                          <Text style={styles.activeFilterTagText}>{theme}</Text>
                          <Ionicons name="close" size={14} color="#F39800" />
                        </TouchableOpacity>
                      ))}
                      {filterCriteria?.seekingRoles?.map((roleId) => {
                        const roleLabels: { [key: string]: string } = {
                          'engineer': 'エンジニア',
                          'designer': 'デザイナー',
                          'marketer': 'マーケター',
                          'ideaman': 'アイディアマン',
                          'creator': 'クリエイター',
                          'other': 'その他'
                        };
                        return (
                          <TouchableOpacity
                            key={`role-${roleId}`}
                            style={styles.activeFilterTag}
                            onPress={() => {
                              setFilterCriteria(prev => prev ? {
                                ...prev,
                                seekingRoles: prev.seekingRoles?.filter(r => r !== roleId) || []
                              } : null);
                            }}
                          >
                            <Text style={styles.activeFilterTagText}>{roleLabels[roleId] || roleId}</Text>
                            <Ionicons name="close" size={14} color="#F39800" />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* ユーザータブは将来的な復活のためにコメントで残す
                <View style={[styles.searchHeader, { backgroundColor: 'white' }]}>
                  <View style={[styles.searchHeaderGradient, { paddingTop: insets.top + 16, backgroundColor: 'white' }]}>
                    <View style={styles.headerTop}>
                      <View style={styles.headerLeft} />
                      <Text style={[styles.headerTitle, { color: '#F39800' }]}>プロジェクト</Text>
                      <View style={styles.tabContainer}>
                        <TouchableOpacity
                          style={[styles.tabButton, searchTab === 'projects' && styles.tabButtonActive]}
                          onPress={() => {
                            setSearchTab('projects');
                            searchListRef.current?.scrollToIndex({ index: 0, animated: true });
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={searchTab === 'projects' ? "folder" : "folder-outline"}
                            size={20}
                            color={searchTab === 'projects' ? 'white' : '#F39800'}
                            style={styles.tabIcon}
                          />
                          <Text style={[styles.tabText, searchTab === 'projects' && styles.tabTextActive]}>プロジェクト</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.tabButton, searchTab === 'users' && styles.tabButtonActive]}
                          onPress={() => {
                            setSearchTab('users');
                            searchListRef.current?.scrollToIndex({ index: 1, animated: true });
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={searchTab === 'users' ? "people" : "people-outline"}
                            size={20}
                            color={searchTab === 'users' ? 'white' : '#F39800'}
                            style={styles.tabIcon}
                          />
                          <Text style={[styles.tabText, searchTab === 'users' && styles.tabTextActive]}>ユーザー</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.headerRight}>
                        <TouchableOpacity
                          style={styles.notificationButton}
                          onPress={() => setShowNotifications(true)}
                        >
                          <Ionicons name="notifications-outline" size={24} color="#F39800" />
                          {unreadNotificationsCount > 0 && (
                            <View style={styles.notificationBadgeDot} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.searchControlBar}>
                  <TouchableOpacity
                    style={[styles.filterButton, isFilterActive && styles.filterButtonActive]}
                    onPress={() => setIsFilterOpen(true)}
                  >
                    <Ionicons name="search" size={16} color="#F39800" />
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
                    <Ionicons name="chevron-down" size={14} color="#F39800" />
                  </TouchableOpacity>
                </View>
                */}
              </Animated.View>
            )}

            {activeTab === 'talk' && (
              <View style={[styles.searchHeader, { backgroundColor: 'white' }]}>
                <View style={[styles.searchHeaderGradient, { paddingTop: insets.top + 20, paddingBottom: 16, backgroundColor: 'white' }]}>
                  <View style={styles.headerTop}>
                    <View style={styles.headerLeft} />
                    <View style={styles.talkHeaderTitleContainer}>
                      <Text style={styles.talkHeaderTitle}>プロジェクトダッシュボード</Text>
                    </View>
                    <View style={styles.headerRight}>
                      <TouchableOpacity
                        style={styles.notificationButton}
                        onPress={() => setShowNotifications(true)}
                      >
                        <Ionicons name="notifications-outline" size={24} color="#F39800" />
                        {unreadNotificationsCount > 0 && (
                          <View style={styles.notificationBadgeDot} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentArea}>
          <FadeTabContent activeTab={activeTab} tabId="search">
            {/* プロジェクトのみ表示（ユーザー検索は非表示） */}
            <UserProjectPage
              sortOrder={sortOrder}
              currentUser={currentUser}
              filterCriteria={filterCriteria}
              onChat={(partnerId, partnerName, partnerImage) => {
                setActiveChatRoom({
                  partnerId,
                  partnerName,
                  partnerImage,
                  isGroup: false,
                });
              }}
              onScroll={handleSearchScroll}
              onRefreshingChange={setSearchRefreshing}
            />
            {/* ユーザー検索は将来的な復活のためにコメントで残す
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
                      renderItem={({ item, index }) => (
                        <View style={styles.gridItem}>
                          <ProfileCard
                            profile={item}
                            isLiked={likedProfiles.has(item.id)}
                            onLike={() => handleLike(item.id)}
                            onSelect={() => setSelectedProfile(item)}
                            animateOnLike={true}
                            index={index}
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
                      filterCriteria={filterCriteria}
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
            */}
          </FadeTabContent>
          <FadeTabContent activeTab={activeTab} tabId="likes">
            <LikesPage
              likedProfileIds={likedProfiles}
              allProfiles={displayProfiles}
              onProfileSelect={setSelectedProfile}
              onLike={handleLike}
              onOpenNotifications={() => setShowNotifications(true)}
              unreadNotificationsCount={unreadNotificationsCount}
              onApplicantStatusChange={fetchPendingApps}
            />
          </FadeTabContent>
          <FadeTabContent activeTab={activeTab} tabId="talk">
            <TalkPage
              onOpenChat={(room) => setActiveChatRoom({
                partnerId: room.partnerId,
                partnerName: room.partnerName,
                partnerImage: room.partnerImage,
                isGroup: room.type === 'group',
                projectId: room.projectId,
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
                    .select('id, name, age, university, company, grade, image, bio, skills, seeking_for, seeking_roles, status_tags, is_student, created_at')
                    .eq('id', partnerId)
                    .single()
                    .then(({ data, error }) => {
                      if (data && !error) {
                        const mappedProfile: Profile = {
                          id: data.id,
                          name: data.name,
                          age: data.age,
                          university: data.university,
                          company: data.company,
                          grade: data.grade || '',
                          image: data.image,
                          challengeTheme: '',
                          theme: '',
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
                // Open project detail (same behavior as tapping header in team chat)
                try {
                  const { data: project, error } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', projectId)
                    .single();

                  if (error) throw error;
                  if (project) {
                    setChatProjectDetail(project);
                  }
                } catch (error) {
                  console.error('Error fetching project:', error);
                }
              }}
              onOpenNotifications={() => setShowNotifications(true)}
              unreadNotificationsCount={unreadNotificationsCount}
              hideHeader={true}
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
                onShowOnboarding={() => setShowOnboarding(true)}
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
          badges={{ talk: unreadMessagesCount, likes: unreadLikesCount }}
          onCreateProject={() => {
            if (!currentUser) {
              Alert.alert('ログインが必要です', 'プロジェクトを作成するにはログインしてください');
              return;
            }
            setShowCreateProjectModal(true);
          }}
        />
      </View >

      {/* Modals */}
      < Modal visible={showCreateProjectModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateProjectModal(false)
      }>
        <SafeAreaProvider>
          {currentUser && (
            <CreateProjectModal
              currentUser={currentUser}
              onClose={() => setShowCreateProjectModal(false)}
              onCreated={() => {
                setShowCreateProjectModal(false);
                // Refresh projects list immediately
                queryClient.invalidateQueries({
                  queryKey: queryKeys.projects.lists(),
                  refetchType: 'all' // マウントされていなくても再取得
                });
                queryClient.invalidateQueries({
                  queryKey: queryKeys.myProjects.detail(currentUser.id),
                  refetchType: 'all' // マウントされていなくても再取得
                });
              }}
            />
          )}
        </SafeAreaProvider>
      </Modal >
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
                  onBlock={() => handleBlockUser(selectedProfile.id)}
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
                  projectId={activeChatRoom.projectId}
                  onBack={() => setActiveChatRoom(null)}
                  onBlock={() => handleBlockUser(activeChatRoom.partnerId)}
                  onViewProjectDetail={async (projectId) => {
                    // Fetch project details and show in modal
                    try {
                      const { data: project, error } = await supabase
                        .from('projects')
                        .select('*')
                        .eq('id', projectId)
                        .single();

                      if (error) throw error;
                      if (project) {
                        setChatProjectDetail(project);
                      }
                    } catch (error) {
                      console.error('Error fetching project:', error);
                    }
                  }}
                  onPartnerProfilePress={() => {
                    const partner = displayProfiles.find(p => p.name === activeChatRoom.partnerName);
                    if (partner) {
                      setSelectedProfile(partner);
                    } else {
                      // Fetch if not in list
                      supabase
                        .from('profiles')
                        .select('id, name, age, university, company, grade, image, bio, skills, seeking_for, seeking_roles, status_tags, is_student, created_at')
                        .eq('name', activeChatRoom.partnerName)
                        .single()
                        .then(({ data, error }) => {
                          if (data && !error) {
                            const mappedProfile: Profile = {
                              id: data.id,
                              name: data.name,
                              age: data.age,
                              university: data.university,
                              company: data.company,
                              grade: data.grade || '',
                              image: data.image,
                              challengeTheme: '',
                              theme: '',
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
                        .select('id, name, age, university, company, grade, image, bio, skills, seeking_for, seeking_roles, status_tags, is_student, created_at')
                        .eq('id', memberId)
                        .single()
                        .then(({ data, error }) => {
                          if (data && !error) {
                            const mappedProfile: Profile = {
                              id: data.id,
                              name: data.name,
                              age: data.age,
                              university: data.university,
                              company: data.company,
                              grade: data.grade || '',
                              image: data.image,
                              challengeTheme: '',
                              theme: '',
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

              {/* Project Detail Modal (shown when tapping group chat header) */}
              <Modal
                visible={!!chatProjectDetail}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setChatProjectDetail(null)}
              >
                {chatProjectDetail && currentUser && (
                  <ProjectDetail
                    project={chatProjectDetail}
                    currentUser={currentUser}
                    onClose={() => setChatProjectDetail(null)}
                    onChat={() => setChatProjectDetail(null)}
                    onProjectUpdated={() => setChatProjectDetail(null)}
                  />
                )}
              </Modal>
            </>
          )}
        </SafeAreaProvider>
      </Modal>

      {/* Project Detail Modal (from team chat list OR from inside chat header) */}
      <Modal
        visible={!!chatProjectDetail && !activeChatRoom}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setChatProjectDetail(null)}
      >
        {chatProjectDetail && currentUser && (
          <ProjectDetail
            project={chatProjectDetail}
            currentUser={currentUser}
            onClose={() => setChatProjectDetail(null)}
            onChat={() => setChatProjectDetail(null)}
            onProjectUpdated={() => setChatProjectDetail(null)}
          />
        )}
      </Modal>

      {/* Profile Detail Modal - Rendered after ChatRoom so it appears on top */}
      <Modal visible={!!selectedProfile} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedProfile(null)}>
        <SafeAreaProvider>
          {selectedProfile && (
            <ProfileDetail
              profile={selectedProfile}
              onBack={() => setSelectedProfile(null)}
              onLike={() => handleLike(selectedProfile.id)}
              onBlock={() => handleBlockUser(selectedProfile.id)}
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
          {currentUser && (
            <ProfileEdit
              initialProfile={currentUser}
              onSave={handleSaveProfile}
              onCancel={() => setShowProfileEdit(false)}
            />
          )}
        </SafeAreaProvider>
      </Modal>

      <Modal visible={showNotifications} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNotifications(false)}>
        <SafeAreaProvider>
          <NotificationsPage
            onBack={() => setShowNotifications(false)}
            onNotificationsRead={fetchUnreadNotifications}
            onViewProject={async (projectId) => {
              setShowNotifications(false);
              // Fetch project and show owner's profile
              const { data: project, error } = await supabase
                .from('projects')
                .select('id, owner_id')
                .eq('id', projectId)
                .single();

              if (project && !error) {
                // Fetch owner profile
                const { data: ownerProfile, error: profileError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', project.owner_id)
                  .single();

                if (ownerProfile && !profileError) {
                  setSelectedProfile(ownerProfile);
                  setActiveTab('search');
                }
              }
            }}
            onViewProfile={async (userId) => {
              setShowNotifications(false);
              // Fetch profile and show
              const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

              if (profile && !error) {
                setSelectedProfile(profile);
                setActiveTab('search');
              }
            }}
          />
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
        mode={searchTab === 'projects' ? 'projects' : 'users'}
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
        onClose={async () => {
          if (matchedProfile && session?.user) {
            // Mark this match as viewed
            try {
              const viewedMatchesStr = await SecureStore.getItemAsync(`viewed_matches_${session.user.id}`);
              const viewedMatches = viewedMatchesStr ? JSON.parse(viewedMatchesStr) : [];
              if (!viewedMatches.includes(matchedProfile.id)) {
                viewedMatches.push(matchedProfile.id);
                await SecureStore.setItemAsync(
                  `viewed_matches_${session.user.id}`,
                  JSON.stringify(viewedMatches)
                );
              }
            } catch (error) {
              console.error('Error saving viewed match:', error);
            }

            // Check if there are more pending matches to show
            const remainingMatches = pendingMatches.filter(p => p.id !== matchedProfile.id);
            setPendingMatches(remainingMatches);

            if (remainingMatches.length > 0) {
              // Show next match after a brief delay
              setTimeout(() => {
                setMatchedProfile(remainingMatches[0]);
              }, 300);
            } else {
              setMatchedProfile(null);
            }
          } else {
            setMatchedProfile(null);
          }
        }}
        onChat={() => {
          if (matchedProfile) {
            setActiveChatRoom({
              partnerId: matchedProfile.id,
              partnerName: matchedProfile.name,
              partnerImage: matchedProfile.image,
            });
            setMatchedProfile(null);
            setPendingMatches([]); // Clear queue when going to chat
          }
        }}
      />

      {/* Onboarding Tutorial Modal */}
      <Modal
        visible={showOnboarding}
        animationType="fade"
        presentationStyle="fullScreen"
      >
        <OnboardingScreen
          onComplete={async () => {
            setShowOnboarding(false);
            // 表示済みフラグを保存（ユーザーIDごと）
            try {
              if (session?.user?.id) {
                const onboardingKey = `hasSeenOnboarding_${session.user.id}`;
                await SecureStore.setItemAsync(onboardingKey, 'true');
              }
            } catch (error) {
              console.log('Error saving onboarding status:', error);
            }
          }}
        />
      </Modal>
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
    backgroundColor: '#FFF3E0',
    // paddingBottom handled in FlatList contentContainerStyle
  },
  placeholderTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
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
    backgroundColor: 'transparent',
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
    paddingVertical: 0,
  },
  headerLeft: {
    width: 44,
  },
  headerRight: {
    width: 44,
    alignItems: 'flex-end',
    paddingRight: 0,
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
    marginRight: -8,
  },
  notificationBadgeDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  talkHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F39800',
    fontFamily: FONTS.bold,
  },
  talkHeaderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    height: 36,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilterTagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF3E0',
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F39800',
    gap: 4,
  },
  activeFilterTagText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#F39800',
  },
  searchControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 0,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  // ヘッダー内に配置する絞り込み/ソートボタン
  searchControlBarInHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  filterButton: {
    flex: 6, // 60%
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    height: 36,
    paddingHorizontal: 14,
    gap: 6,
    justifyContent: 'flex-start', // Left aligned content
    borderWidth: 1,
    borderColor: '#F39800',
  },
  filterButtonActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F39800',
  },
  sortButton: {
    flex: 4, // 40% (approx 35% requested, adjusted for gap)
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    height: 36,
    paddingHorizontal: 12,
    gap: 4,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F39800',
  },
  controlButtonText: {
    fontSize: 13,
    color: '#F39800',
    fontFamily: FONTS.medium,
  },
  controlButtonTextActive: {
    color: '#F39800',
    fontFamily: FONTS.bold,
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
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginLeft: -4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'transparent',
    gap: 8,
    borderBottomWidth: 0, // Remove old bottom border
  },
  tabButtonActive: {
    backgroundColor: '#F39800',
  },
  tabIcon: {
    marginRight: 4,
  },
  tabText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F39800',
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: 'white',
  },
  searchHeader: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  searchHeaderGradient: {
    paddingTop: 16,
    paddingBottom: 8,
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
  searchRefreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFF3E0',
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // プリロードするアセット（ログイン画面で使用する画像）
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const { Asset } = await import('expo-asset');
        await Asset.loadAsync([
          require('./assets/pogg_logo.png'),
          require('./assets/network-pattern.png'),
        ]);
        setAssetsLoaded(true);
      } catch (error) {
        console.error('Error loading assets:', error);
        setAssetsLoaded(true); // エラーでも続行
      }
    };
    loadAssets();
  }, []);

  const isReady = fontsLoaded && assetsLoaded;

  // スプラッシュのフェードアウト完了時のコールバック
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        {/* メインコンテンツ（準備完了時のみレンダリング） */}
        {isReady && (
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister: asyncStoragePersister,
              maxAge: 30 * 60 * 1000, // 30分
            }}
          >
            <AuthProvider queryClient={queryClient}>
              <AppContent />
            </AuthProvider>
          </PersistQueryClientProvider>
        )}

        {/* スプラッシュスクリーン（オーバーレイ） */}
        {showSplash && (
          <SplashScreen
            isReady={isReady}
            onAnimationComplete={handleSplashComplete}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

