import { useState } from 'react';
import { ArrowLeft, MoreVertical, Heart, Flame, Zap, Code, Users, FileText, MapPin, GraduationCap, Briefcase, Search } from 'lucide-react';

interface ProfileDetailProps {
  profile: {
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
    seekingFor?: string[];
    techDetails?: string;
    seekingRoles?: string[];
    requirementDetails?: string;
  };
  onBack: () => void;
  onLike: () => void;
  isLiked: boolean;
}

export function ProfileDetail({ profile, onBack, onLike, isLiked }: ProfileDetailProps) {
  const [showOptions, setShowOptions] = useState(false);

  const handleReport = () => {
    setShowOptions(false);
    alert('通報・ブロック機能は実装予定です');
  };

  // Mock data for demonstration
  const seekingFor = profile.seekingFor || ['ビジネスパートナーを探す', 'ビジネスメンバーを探す'];
  const techDetails = profile.techDetails || 'React, TypeScript, Node.js, Firebase, Figma, UI/UX設計、データ分析';
  const seekingRoles = profile.seekingRoles || ['エンジニア', 'デザイナー', 'マーケター'];
  const requirementDetails = profile.requirementDetails || '週10時間以上コミット可能な方、スタートアップ経験がある方を優遇します。オンラインでの打ち合わせに対応できる方を希望。';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-gray-700 active:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-gray-900">{profile.name}</h1>

        {/* Options Menu */}
        <div className="relative">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="p-2 -mr-2 text-gray-700 active:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Options Dropdown */}
          {showOptions && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowOptions(false)}
              ></div>

              {/* Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                <button
                  onClick={handleReport}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  通報・ブロック
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Profile Image & Basic Info */}
        <div className="bg-white px-4 py-6 border-b border-gray-200">
          <div className="flex items-start gap-4">
            {/* Profile Image */}
            <img
              src={profile.image}
              alt={profile.name}
              className="w-24 h-24 rounded-2xl object-cover border-2 border-teal-500 flex-shrink-0"
            />

            {/* Basic Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-gray-900 mb-2">{profile.name}</h2>
              
              {/* Info Tags */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{profile.age}歳</span>
                </div>
                
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{profile.location}</span>
                </div>

                {profile.university && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <GraduationCap className="w-4 h-4 text-gray-400" />
                    <span>{profile.university}</span>
                  </div>
                )}

                {profile.company && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span>{profile.company}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seeking Status Badge */}
          <div className="mt-4 bg-gradient-to-r from-teal-50 to-blue-50 border-2 border-teal-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-5 h-5 text-teal-600" />
              <span className="text-sm text-gray-900">🔎 今、何を探していますか？</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {seekingFor.map((item, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Challenge Theme Section */}
        <div className="bg-white px-4 py-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-6 h-6 text-orange-500" />
            <h3 className="text-gray-900">🔥 現在の挑戦テーマ</h3>
          </div>
          <p className="text-gray-800 leading-relaxed bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200">
            {profile.challengeTheme}
          </p>
        </div>

        {/* Skills Section */}
        <div className="bg-white px-4 py-6 border-b border-gray-200">
          <div className="space-y-4">
            {/* Role Tags */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm text-gray-900">💪 提供できるスキル（役割）</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-2 bg-teal-100 text-teal-700 text-sm rounded-lg border border-teal-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Tech Details */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm text-gray-900">💻 得意な技術/ツール</h3>
              </div>
              <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                {techDetails}
              </p>
            </div>
          </div>
        </div>

        {/* Seeking Requirements Section */}
        <div className="bg-white px-4 py-6">
          <div className="space-y-4">
            {/* Seeking Roles */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm text-gray-900">🤝 求める仲間（役割）</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {seekingRoles.map((role, index) => (
                  <span
                    key={index}
                    className="px-3 py-2 bg-orange-100 text-orange-700 text-sm rounded-lg border border-orange-300"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>

            {/* Requirement Details */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm text-gray-900">📝 募集要項の詳細</h3>
              </div>
              <p className="text-sm text-gray-700 bg-orange-50 p-4 rounded-lg border border-orange-200">
                {requirementDetails}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Action Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 sticky bottom-0">
        <button
          onClick={onLike}
          className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl transition-all active:scale-98 ${
            isLiked
              ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white'
              : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
          }`}
        >
          <Heart
            className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`}
          />
          <span className="text-lg">{isLiked ? 'いいね済み' : 'いいね'}</span>
        </button>
      </div>
    </div>
  );
}
