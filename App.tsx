// Trigger rebuild
import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, Platform, RefreshControl, ActivityIndicator, Modal, UIManager, LayoutAnimation, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LoginScreen } from './components/LoginScreen';
import { ProfileCard } from './components/ProfileCard';
import { ProfileDetail } from './components/ProfileDetail';
import { BottomNav } from './components/BottomNav';
import { MyPage } from './components/MyPage';
import { LikesPage } from './components/LikesPage';
import { TalkPage } from './components/TalkPage';
import { ChatRoom } from './components/ChatRoom';
import { ChallengeCardPage } from './components/ChallengeCardPage';
import { NotificationsPage } from './components/NotificationsPage';
import { SignupFlow } from './components/SignupFlow';
import { FilterModal, FilterCriteria } from './components/FilterModal';
import { ProfileEdit } from './components/ProfileEdit';
import { SettingsPage } from './components/SettingsPage';
import { HelpPage } from './components/HelpPage';
import { ThemeDetailPage } from './components/ThemeDetailPage';
import { LegalDocumentPage } from './components/LegalDocumentPage';
import { OnboardingScreen } from './components/OnboardingScreen';
import { MatchingModal } from './components/MatchingModal';
import { UserProjectPage } from './components/UserProjectPage';
import { Profile, Theme } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { Alert } from 'react-native';
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from './constants/LegalTexts';

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
  const { session, loading: authLoading, signOut } = useAuth();
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
  const [searchTab, setSearchTab] = useState<'users' | 'projects'>('users');
  const searchListRef = useRef<FlatList>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [activeChatRoom, setActiveChatRoom] = useState<{
    partnerId: string;
    partnerName: string;
    partnerImage: string;
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

  const [sortOrder, setSortOrder] = useState<'recommended' | 'newest'>('recommended');
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);

  const [displayProfiles, setDisplayProfiles] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);

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
    const { ageMin, ageMax, location, isStudentOnly, statuses, keyword } = filterCriteria;
    return (
      (ageMin && ageMin !== '18') ||
      (ageMax && ageMax !== '25') ||
      (location && location !== '') ||
      isStudentOnly ||
      (statuses && statuses.length > 0) ||
      (keyword && keyword !== '')
    );
  }, [filterCriteria]);

  // Filtering logic
  const filteredProfiles = displayProfiles.filter(profile => {
    // Exclude current user
    if (session?.user && profile.id === session.user.id) return false;
    // Exclude matched users
    if (matchedProfileIds.has(profile.id)) return false;

    if (!filterCriteria) return true;

    // Keyword filter
    if (filterCriteria.keyword) {
      const lowerKeyword = filterCriteria.keyword.toLowerCase();
      const matchName = profile.name.toLowerCase().includes(lowerKeyword);
      const matchTheme = profile.challengeTheme.toLowerCase().includes(lowerKeyword);
      const matchSkills = profile.skills.some(skill => skill.toLowerCase().includes(lowerKeyword));
      if (!matchName && !matchTheme && !matchSkills) return false;
    }

    // Age filter
    if (filterCriteria.ageMin && profile.age < parseInt(filterCriteria.ageMin)) return false;
    if (filterCriteria.ageMax && profile.age > parseInt(filterCriteria.ageMax)) return false;

    // Location filter
    if (filterCriteria.location && !profile.location.includes(filterCriteria.location)) return false;

    // Student filter
    if (filterCriteria.isStudentOnly && !profile.isStudent) return false;

    // Status filter
    if (filterCriteria.statuses && filterCriteria.statuses.length > 0) {
      const matchStatus = profile.statusTags?.some(tag => filterCriteria.statuses!.includes(tag)) ||
        profile.seekingFor?.some(tag => filterCriteria.statuses!.includes(tag));
      if (!matchStatus) return false;
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
          const matchedUser = displayProfiles.find(p => p.id === profileId);
          if (matchedUser) {
            setMatchedProfile(matchedUser);

            // Create notifications for match
            if (currentUser) {
              // Notify partner
              await supabase.from('notifications').insert({
                user_id: profileId,
                sender_id: session.user.id,
                type: 'match',
                title: 'マッチング成立！',
                content: `${currentUser.name}さんとマッチングしました！メッセージを送ってみましょう。`,
                image_url: currentUser.image
              });

              // Notify self
              await supabase.from('notifications').insert({
                user_id: session.user.id,
                sender_id: profileId,
                type: 'match',
                title: 'マッチング成立！',
                content: `${matchedUser.name}さんとマッチングしました！メッセージを送ってみましょう。`,
                image_url: matchedUser.image
              });
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009688" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (showSignup) {
    return (
      <SafeAreaProvider>
        <SignupFlow
          onComplete={() => {
            setShowSignup(false);
            // Session is handled by AuthProvider
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
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={{ flex: 1 }}>
        {/* Header */}
        {/* Header */}
        <View style={styles.headerContainer}>
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
                    style={[styles.tabButton, searchTab === 'users' && styles.tabButtonActive]}
                    onPress={() => {
                      setSearchTab('users');
                      searchListRef.current?.scrollToIndex({ index: 0, animated: true });
                    }}
                  >
                    <Text style={[styles.tabText, searchTab === 'users' && styles.tabTextActive]}>さがす</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tabButton, searchTab === 'projects' && styles.tabButtonActive]}
                    onPress={() => {
                      setSearchTab('projects');
                      searchListRef.current?.scrollToIndex({ index: 1, animated: true });
                    }}
                  >
                    <Text style={[styles.tabText, searchTab === 'projects' && styles.tabTextActive]}>For You</Text>
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

              {searchTab === 'users' && (
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
                      {sortOrder === 'recommended' ? 'おすすめ順' : '新着順'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#374151" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentArea}>
          {activeTab === 'search' && (
            <FlatList
              ref={searchListRef}
              data={['users', 'projects']}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                setSearchTab(index === 0 ? 'users' : 'projects');
              }}
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
                      columnWrapperStyle={styles.columnWrapper}
                      showsVerticalScrollIndicator={false}
                      onEndReached={loadMoreProfiles}
                      onEndReachedThreshold={0.5}
                      ListFooterComponent={
                        loadingMore ? (
                          <View style={{ paddingVertical: 20 }}>
                            <ActivityIndicator size="small" color="#009688" />
                          </View>
                        ) : null
                      }
                      refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#009688']} />
                      }
                    />
                  ) : (
                    <UserProjectPage
                      currentUser={currentUser}
                      onChat={(partnerId, partnerName, partnerImage) => {
                        setActiveChatRoom({
                          partnerId,
                          partnerName,
                          partnerImage,
                        });
                      }}
                    />
                  )}
                </View>
              )}
            />
          )}
          {activeTab === 'likes' && (
            <LikesPage
              likedProfileIds={likedProfiles}
              allProfiles={displayProfiles}
              onProfileSelect={setSelectedProfile}
              onLike={handleLike}
            />
          )}
          {activeTab === 'challenge' && (
            <ChallengeCardPage onThemeSelect={setSelectedTheme} />
          )}
          {activeTab === 'talk' && (
            <TalkPage
              onOpenChat={(room) => setActiveChatRoom({
                partnerId: room.partnerId,
                partnerName: room.partnerName,
                partnerImage: room.partnerImage,
              })}
            />
          )}
          {activeTab === 'profile' && (
            isLoadingUser ? (
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
            )
          )}
        </View>

        <BottomNav activeTab={activeTab} onTabChange={(tab) => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setActiveTab(tab);
        }} />
      </View>

      {/* Modals */}
      <Modal visible={!!selectedTheme} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedTheme(null)}>
        <SafeAreaProvider>
          {selectedTheme && (
            <ThemeDetailPage
              theme={selectedTheme}
              onBack={() => setSelectedTheme(null)}
              profiles={displayProfiles}
              onProfileSelect={setSelectedProfile}
              onLike={handleLike}
              likedProfileIds={likedProfiles}
              currentUser={currentUser}
            />
          )}
        </SafeAreaProvider>
      </Modal>

      <Modal visible={!!selectedProfile} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedProfile(null)}>
        <SafeAreaProvider>
          {selectedProfile && (
            <ProfileDetail
              profile={selectedProfile}
              onBack={() => setSelectedProfile(null)}
              onLike={() => handleLike(selectedProfile.id)}
              onChat={() => {
                setActiveChatRoom({
                  partnerId: selectedProfile.id,
                  partnerName: selectedProfile.name,
                  partnerImage: selectedProfile.image,
                });
              }}
              isLiked={likedProfiles.has(selectedProfile.id)}
            />
          )}
        </SafeAreaProvider>
      </Modal>

      <Modal visible={!!activeChatRoom} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setActiveChatRoom(null)}>
        <SafeAreaProvider>
          {activeChatRoom && (
            <ChatRoom
              partnerId={activeChatRoom.partnerId}
              partnerName={activeChatRoom.partnerName}
              partnerImage={activeChatRoom.partnerImage}
              onBack={() => setActiveChatRoom(null)}
              onPartnerProfilePress={() => {
                const partner = displayProfiles.find(p => p.name === activeChatRoom.partnerName);
                if (partner) {
                  setSelectedProfile(partner);
                }
              }}
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
            onOpenTerms={() => {
              setLegalDocument({ title: '利用規約', content: TERMS_OF_SERVICE });
            }}
            onOpenPrivacy={() => {
              setLegalDocument({ title: 'プライバシーポリシー', content: PRIVACY_POLICY });
            }}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... (existing styles)
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Updated to requested color
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  contentArea: {
    flex: 1,
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
