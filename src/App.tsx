import { useState } from 'react';
import { Header } from './components/Header';
import { ProfileCard } from './components/ProfileCard';
import { FilterModal } from './components/FilterModal';
import { BottomNav } from './components/BottomNav';
import { LikesPage } from './components/LikesPage';
import { TalkPage } from './components/TalkPage';
import { ChallengeCardPage } from './components/ChallengeCardPage';
import { MyPage } from './components/MyPage';
import { LoginScreen } from './components/LoginScreen';
import { SignupFlow } from './components/SignupFlow';
import { ProfileEdit } from './components/ProfileEdit';
import { ChatRoom } from './components/ChatRoom';
import { ProfileDetail } from './components/ProfileDetail';

export interface Profile {
  id: string;
  name: string;
  age: number;
  location: string;
  university?: string;
  company?: string;
  image: string;
  challengeTheme: string;
  skills: string[];
  isStudent: boolean;
}

function App() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('search');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [activeChatRoom, setActiveChatRoom] = useState<{
    partnerName: string;
    partnerImage: string;
  } | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  // Mock profiles
  const profiles: Profile[] = [
    {
      id: '1',
      name: 'ユウキ',
      age: 22,
      location: '東京',
      university: '東京大学',
      image: 'https://images.unsplash.com/photo-1543132220-e7fef0b974e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMGVudHJlcHJlbmV1ciUyMHBvcnRyYWl0fGVufDF8fHx8MTc2MzQ4NTI0MXww&ixlib=rb-4.1.0&q=80&w=1080',
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
      image: 'https://images.unsplash.com/photo-1553484771-6e117b648d45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFydHVwJTIwZm91bmRlciUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NjM0NTI1MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
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
      image: 'https://images.unsplash.com/photo-1760536928911-40831dacdbc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmVhdGl2ZSUyMGRldmVsb3BlciUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NjM1MjAzMzR8MA&ixlib=rb-4.1.0&q=80&w=1080',
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
      image: 'https://images.unsplash.com/photo-1752937326758-f130e633b422?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHN0dWRlbnQlMjBjb25maWRlbnR8ZW58MXx8fHwxNzYzNTIwMzM1fDA&ixlib=rb-4.1.0&q=80&w=1080',
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
    // Show signup flow if user clicked create account
    if (showSignup) {
      return (
        <SignupFlow
          onComplete={() => {
            setShowSignup(false);
            setIsLoggedIn(true);
          }}
        />
      );
    }

    // Show login screen
    return (
      <LoginScreen
        onCreateAccount={() => setShowSignup(true)}
        onLogin={() => setIsLoggedIn(true)}
      />
    );
  }

  // Show profile edit screen
  if (showProfileEdit) {
    return (
      <ProfileEdit
        onBack={() => setShowProfileEdit(false)}
        onSave={() => {
          setShowProfileEdit(false);
          // In a real app, save profile data here
        }}
      />
    );
  }

  // Show chat room
  if (activeChatRoom) {
    return (
      <ChatRoom
        onBack={() => setActiveChatRoom(null)}
        partnerName={activeChatRoom.partnerName}
        partnerImage={activeChatRoom.partnerImage}
      />
    );
  }

  // Show profile detail
  if (selectedProfile) {
    return (
      <ProfileDetail
        profile={selectedProfile}
        onBack={() => setSelectedProfile(null)}
        onLike={() => handleLike(selectedProfile.id)}
        isLiked={likedProfiles.has(selectedProfile.id)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Conditional Header - only show on search tab */}
      {activeTab === 'search' && (
        <Header onFilterClick={() => setIsFilterOpen(true)} />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'search' && (
          <div className="px-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              {profiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  isLiked={likedProfiles.has(profile.id)}
                  onLike={() => handleLike(profile.id)}
                  onSelect={() => setSelectedProfile(profile)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'likes' && <LikesPage />}

        {activeTab === 'talk' && (
          <TalkPage
            onOpenChat={(room) =>
              setActiveChatRoom({
                partnerName: room.partnerName,
                partnerImage: room.partnerImage,
              })
            }
          />
        )}

        {activeTab === 'tags' && <ChallengeCardPage />}

        {activeTab === 'profile' && (
          <MyPage
            onLogout={() => setIsLoggedIn(false)}
            onEditProfile={() => setShowProfileEdit(true)}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Filter Modal */}
      {isFilterOpen && <FilterModal onClose={() => setIsFilterOpen(false)} />}
    </div>
  );
}

export default App;