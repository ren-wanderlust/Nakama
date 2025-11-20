
import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
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
import { SignupFlow } from './components/SignupFlow';
import { FilterModal, FilterCriteria } from './components/FilterModal';
import { Profile } from './types';

// Placeholder component for tabs under development
const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.centerContainer}>
    <Text style={styles.placeholderTitle}>{title}</Text>
    <Text style={styles.placeholderText}>開発中</Text>
  </View>
);

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('search');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [activeChatRoom, setActiveChatRoom] = useState<{
    partnerName: string;
    partnerImage: string;
  } | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria | null>(null);

  // Mock profiles
  const profiles: Profile[] = [
    {
      id: '1',
      name: 'ユウキ',
      age: 22,
      location: '東京',
      university: '東京大学',
      image: 'https://images.unsplash.com/photo-1543132220-e7fef0b974e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMGVudHJepreneur%20portraitfGVufDF8fHx8MTc2MzQ4NTI0MXww&ixlib=rb-4.1.0&q=80&w=1080',
      challengeTheme: 'AIチャットボット開発',
      skills: ['React', 'Python', 'AI/ML'],
      isStudent: true,
    },
    {
      id: '2',
      name: 'アヤカ',
      age: 21,
      location: '大阪',
      university: '大阪大学',
      image: 'https://images.unsplash.com/photo-1553484771-6e117b648d45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxzdGFydHVwJTIwZm91bmRlciUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NjM0NTI1MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      challengeTheme: 'サステナブルファッションブランド立ち上げ',
      skills: ['マーケティング', 'デザイン', 'SNS運用'],
      isStudent: true,
    },
    {
      id: '3',
      name: 'ケンタ',
      age: 24,
      location: '福岡',
      company: '株式会社テクノロジー',
      image: 'https://images.unsplash.com/photo-1760536928911-40831dacdbc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxjcmVhdGl2ZSUyMGRldmVsb3BlciUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NjM1MjAzMzR8MA&ixlib=rb-4.1.0&q=80&w=1080',
      challengeTheme: 'EdTechアプリ開発（学習効率化）',
      skills: ['Flutter', 'Firebase', 'UI/UX'],
      isStudent: false,
    },
    {
      id: '4',
      name: 'ミオ',
      age: 20,
      location: '京都',
      university: '京都大学',
      image: 'https://images.unsplash.com/photo-1752937326758-f130e633b422?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxidXNpbmVzcyUyMHN0dWRlbnQlMjBjb25maWRlbnR8ZW58MXx8fHwxNzYzNTIwMzM1fDA&ixlib=rb-4.1.0&q=80&w=1080',
      challengeTheme: 'ビジコン優勝を目指す地域活性化プロジェクト',
      skills: ['企画力', 'プレゼン', 'データ分析'],
      isStudent: true,
    },
    {
      id: '5',
      name: 'リョウ',
      age: 23,
      location: '神奈川',
      company: '株式会社ブロックチェーン',
      image: 'https://images.unsplash.com/photo-1762341116674-784c5dbedeb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNoJTIwZW50cmVwcmVuZXVyJTIweY91bmd8ZW58MXx8fHwxNzYzNTIwMzM1fDA&ixlib=rb-4.1.0&q=80&w=1080',
      challengeTheme: 'ブロックチェーンゲーム開発',
      skills: ['Solidity', 'Web3', 'Unity'],
      isStudent: false,
    },
    {
      id: '6',
      name: 'サクラ',
      age: 22,
      location: '東京',
      university: '東京大学',
      image: 'https://images.unsplash.com/photo-1709803312782-0c3b175875ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNpZ25lciUyMGNyZWF0aXZlJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2MzUyMDMzNXww&ixlib=rb-4.1.0&q=80&w=1080',
      challengeTheme: 'クリエイター向けポートフォリオプラットフォーム',
      skills: ['Figma', 'デザインシステム', 'ブランディング'],
      isStudent: true,
    },
  ];

  // Filtering logic
  const filteredProfiles = profiles.filter(profile => {
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

    return true;
  });

  const handleLike = (profileId: string) => {
    setLikedProfiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(profileId)) {
        newSet.delete(profileId);
      } else {
        newSet.add(profileId);
      }
      return newSet;
    });
  };

  // Show login screen if not logged in
  if (!isLoggedIn) {
    if (showSignup) {
      return (
        <SafeAreaProvider>
          <SignupFlow
            onComplete={() => {
              setShowSignup(false);
              setIsLoggedIn(true);
            }}
            onCancel={() => setShowSignup(false)}
          />
        </SafeAreaProvider>
      );
    }

    return (
      <LoginScreen
        onCreateAccount={() => setShowSignup(true)}
        onLogin={() => setIsLoggedIn(true)}
      />
    );
  }

  // Show profile detail if selected
  if (selectedProfile) {
    return (
      <SafeAreaProvider>
        <ProfileDetail
          profile={selectedProfile}
          onBack={() => setSelectedProfile(null)}
          onLike={() => handleLike(selectedProfile.id)}
          isLiked={likedProfiles.has(selectedProfile.id)}
        />
      </SafeAreaProvider>
    );
  }

  // Show chat room if active
  if (activeChatRoom) {
    return (
      <SafeAreaProvider>
        <ChatRoom
          partnerName={activeChatRoom.partnerName}
          partnerImage={activeChatRoom.partnerImage}
          onBack={() => setActiveChatRoom(null)}
        />
      </SafeAreaProvider>
    );
  }

  // Authenticated View - Main Screen
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        {/* Header - Only show on search tab */}
        {activeTab === 'search' && (
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>BizYou</Text>
              <Text style={styles.headerSubtitle}>おすすめの仲間</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsFilterOpen(true)}
              style={styles.filterButton}
            >
              <Ionicons name="options-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        )}

        {/* Main Content Area */}
        <View style={styles.contentArea}>
          {activeTab === 'search' && (
            <FlatList
              data={filteredProfiles}
              renderItem={({ item }) => (
                <View style={styles.gridItem}>
                  <ProfileCard
                    profile={item}
                    isLiked={likedProfiles.has(item.id)}
                    onLike={() => handleLike(item.id)}
                    onSelect={() => {
                      console.log('Selected profile:', item.name);
                      setSelectedProfile(item);
                    }}
                  />
                </View>
              )}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.listContent}
              columnWrapperStyle={styles.columnWrapper}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.centerContainer}>
                  <Text style={styles.placeholderText}>条件に一致するユーザーがいません</Text>
                </View>
              }
            />
          )}

          {activeTab === 'likes' && (
            <LikesPage
              likedProfileIds={likedProfiles}
              allProfiles={profiles}
              onProfileSelect={(profile) => setSelectedProfile(profile)}
            />
          )}

          {activeTab === 'talk' && (
            <TalkPage
              onOpenChat={(room) => setActiveChatRoom({
                partnerName: room.partnerName,
                partnerImage: room.partnerImage,
              })}
            />
          )}

          {activeTab === 'profile' && (
            <MyPage
              onLogout={() => setIsLoggedIn(false)}
              onEditProfile={() => console.log('Edit Profile')}
            />
          )}
        </View>

        {/* Bottom Navigation */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Filter Modal */}
        <FilterModal
          visible={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          onApply={(criteria) => {
            setFilterCriteria(criteria);
            setIsFilterOpen(false);
          }}
          initialCriteria={filterCriteria || undefined}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb', // gray-50
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  contentArea: {
    flex: 1,
    paddingBottom: 60, // Space for BottomNav
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  filterButton: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  listContent: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  gridItem: {
    // width is handled in ProfileCard
  },
});
