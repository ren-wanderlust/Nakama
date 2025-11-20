import { useState } from 'react';
import { Heart, X, MessageCircle, Clock, UserX } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface LikeProfile {
  id: string;
  name: string;
  age: number;
  location: string;
  image: string;
  challengeTheme: string;
  skills: string[];
  isStudent: boolean;
  status?: 'pending' | 'declined' | 'matched';
  timestamp?: string;
}

export function LikesPage() {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  // Mock data - received likes
  const receivedLikes: LikeProfile[] = [
    {
      id: 'r1',
      name: 'アヤカ',
      age: 21,
      location: '大阪',
      image: 'https://images.unsplash.com/photo-1553484771-6e117b648d45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFydHVwJTIwZm91bmRlciUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NjM0NTI1MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      challengeTheme: 'サステナブルファッションブランド立ち上げ',
      skills: ['マーケティング', 'デザイン', 'SNS運用'],
      isStudent: true,
      timestamp: '2時間前',
    },
    {
      id: 'r2',
      name: 'サクラ',
      age: 22,
      location: '東京',
      image: 'https://images.unsplash.com/photo-1709803312782-0c3b175875ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNpZ25lciUyMGNyZWF0aXZlJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2MzUyMDMzNXww&ixlib=rb-4.1.0&q=80&w=1080',
      challengeTheme: 'クリエイター向けポートフォリオプラットフォーム',
      skills: ['Figma', 'デザインシステム', 'ブランディング'],
      isStudent: true,
      timestamp: '1日前',
    },
  ];

  // Mock data - sent likes
  const sentLikes: LikeProfile[] = [
    {
      id: 's1',
      name: 'ケンタ',
      age: 24,
      location: '福岡',
      image: 'https://images.unsplash.com/photo-1760536928911-40831dacdbc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmVhdGl2ZSUyMGRldmVsb3BlciUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NjM1MjAzMzR8MA&ixlib=rb-4.1.0&q=80&w=1080',
      challengeTheme: 'EdTechアプリ開発（学習効率化）',
      skills: ['Flutter', 'Firebase', 'UI/UX'],
      isStudent: false,
      status: 'pending',
      timestamp: '3日前',
    },
    {
      id: 's2',
      name: 'リョウ',
      age: 23,
      location: '神奈川',
      image: 'https://images.unsplash.com/photo-1762341116674-784c5dbedeb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNoJTIwZW50cmVwcmVuZXVyJTIweY91bmd8ZW58MXx8fHwxNzYzNTIwMzM1fDA&ixlib=rb-4.1.0&q=80&w=1080',
      challengeTheme: 'ブロックチェーンゲーム開発',
      skills: ['Solidity', 'Web3', 'Unity'],
      isStudent: false,
      status: 'matched',
      timestamp: '5日前',
    },
    {
      id: 's3',
      name: 'ミオ',
      age: 20,
      location: '京都',
      image: 'https://images.unsplash.com/photo-1752937326758-f130e633b422?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHN0dWRlbnQlMjBjb25maWRlbnR8ZW58MXx8fHwxNzYzNTIwMzM1fDA&ixlib=rb-4.1.0&q=80&w=1080',
      challengeTheme: 'ビジコン優勝を目指す地域活性化プロジェクト',
      skills: ['企画力', 'プレゼン', 'データ分析'],
      isStudent: true,
      status: 'declined',
      timestamp: '1週間前',
    },
  ];

  const handleMatch = (profileId: string) => {
    console.log('Matched with:', profileId);
  };

  const handleSkip = (profileId: string) => {
    console.log('Skipped:', profileId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-gray-900 text-center mb-4">いいね</h1>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('received')}
              className={`flex-1 py-2.5 rounded-lg transition-colors relative ${
                activeTab === 'received'
                  ? 'bg-gradient-to-r from-teal-600 to-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              <span className="text-sm">あなたに興味あり</span>
              {receivedLikes.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                  {receivedLikes.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 py-2.5 rounded-lg transition-colors ${
                activeTab === 'sent'
                  ? 'bg-gradient-to-r from-teal-600 to-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              <span className="text-sm">あなたが送ったいいね</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {activeTab === 'received' ? (
          receivedLikes.length > 0 ? (
            receivedLikes.map((profile) => (
              <ReceivedLikeCard
                key={profile.id}
                profile={profile}
                onMatch={() => handleMatch(profile.id)}
                onSkip={() => handleSkip(profile.id)}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">まだいいねがありません</p>
              <p className="text-sm text-gray-400 mt-1">
                プロフィールを充実させて待ちましょう！
              </p>
            </div>
          )
        ) : (
          sentLikes.length > 0 ? (
            sentLikes.map((profile) => (
              <SentLikeCard key={profile.id} profile={profile} />
            ))
          ) : (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">まだいいねを送っていません</p>
              <p className="text-sm text-gray-400 mt-1">
                気になる相手を探してみましょう！
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// Received Like Card Component
function ReceivedLikeCard({
  profile,
  onMatch,
  onSkip,
}: {
  profile: LikeProfile;
  onMatch: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
      {/* New Badge */}
      {profile.timestamp && (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-1.5">
          <span className="text-white text-xs">✨ {profile.timestamp}に届きました</span>
        </div>
      )}

      <div className="p-4">
        {/* Profile Info */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-shrink-0">
            <ImageWithFallback
              src={profile.image}
              alt={profile.name}
              className="w-20 h-20 rounded-xl object-cover"
            />
            {profile.isStudent && (
              <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                学生
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-gray-900">{profile.name}</span>
              <span className="text-sm text-gray-500">
                {profile.age}歳 · {profile.location}
              </span>
            </div>
          </div>
        </div>

        {/* Challenge Theme */}
        <div className="mb-4 bg-gradient-to-r from-orange-50 to-yellow-50 p-3 rounded-lg border border-orange-200">
          <div className="flex items-start gap-2">
            <span className="text-base flex-shrink-0">🔥</span>
            <div className="flex-1">
              <div className="text-xs text-orange-700 mb-1">挑戦テーマ</div>
              <div className="text-sm text-orange-900">{profile.challengeTheme}</div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="mb-4">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-sm">💪</span>
            <span className="text-xs text-gray-600">スキル</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl active:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
            <span className="text-sm">スキップ</span>
          </button>
          <button
            onClick={onMatch}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl active:scale-98 transition-transform"
          >
            <Heart className="w-5 h-5 fill-current" />
            <span className="text-sm">マッチング</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Sent Like Card Component
function SentLikeCard({ profile }: { profile: LikeProfile }) {
  const getStatusInfo = () => {
    switch (profile.status) {
      case 'pending':
        return {
          icon: Clock,
          text: '返信待ち',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          iconColor: 'text-yellow-600',
        };
      case 'matched':
        return {
          icon: MessageCircle,
          text: 'マッチング成立',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          iconColor: 'text-green-600',
        };
      case 'declined':
        return {
          icon: UserX,
          text: '辞退されました',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-500',
          iconColor: 'text-gray-400',
        };
      default:
        return {
          icon: Clock,
          text: '返信待ち',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          iconColor: 'text-yellow-600',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
      <div className="p-4">
        {/* Profile Info */}
        <div className="flex gap-3 mb-3">
          <ImageWithFallback
            src={profile.image}
            alt={profile.name}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm text-gray-900">{profile.name}</span>
              <span className="text-xs text-gray-500">
                {profile.age}歳 · {profile.location}
              </span>
            </div>
            <div className="text-xs text-gray-500 mb-2">{profile.timestamp}</div>

            {/* Status Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusInfo.bgColor}`}
            >
              <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.iconColor}`} />
              <span className={`text-xs ${statusInfo.textColor}`}>
                {statusInfo.text}
              </span>
            </div>
          </div>
        </div>

        {/* Challenge Theme - Compact */}
        <div className="bg-gray-50 p-2.5 rounded-lg">
          <div className="flex items-start gap-1.5">
            <span className="text-sm">🔥</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-900 line-clamp-2">
                {profile.challengeTheme}
              </div>
            </div>
          </div>
        </div>

        {/* Action for matched status */}
        {profile.status === 'matched' && (
          <button className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-xl active:opacity-80 transition-all">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">メッセージを送る</span>
          </button>
        )}
      </div>
    </div>
  );
}