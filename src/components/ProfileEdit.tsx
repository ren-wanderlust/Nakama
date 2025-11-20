import { useState } from 'react';
import { ArrowLeft, Camera, Search, Flame, Zap, Users, Code, FileText, Check } from 'lucide-react';

interface ProfileEditProps {
  onBack: () => void;
  onSave: () => void;
}

export function ProfileEdit({ onBack, onSave }: ProfileEditProps) {
  // Profile Image
  const [profileImage, setProfileImage] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop');

  // Section I: Activity Status
  const [seekingFor, setSeekingFor] = useState<string[]>(['ビジネスパートナーを探す']);

  // Section II: Basic Info
  const [nickname, setNickname] = useState('タロウ');
  const [age, setAge] = useState('20');
  const [university, setUniversity] = useState('東京大学');
  const [grade, setGrade] = useState('3');

  // Section III: Challenge & Skills
  const [challengeTheme, setChallengeTheme] = useState('AIを活用した学習支援アプリを開発し、教育格差の解消に挑戦しています');
  const [skills, setSkills] = useState<string[]>(['エンジニア', 'デザイナー']);
  const [techDetails, setTechDetails] = useState('React, TypeScript, Figma, Firebase');

  // Section IV: Requirements
  const [seekingRoles, setSeekingRoles] = useState<string[]>(['マーケター', 'セールス']);
  const [requirementDetails, setRequirementDetails] = useState('週10時間以上コミット可能な方、Web3の実務経験がある方を優遇します');

  const seekingForOptions = [
    'ビジネスパートナーを探す',
    'ビジネスメンバーを探す',
    '仕事を探したい',
    '情報収集',
    'その他',
  ];

  const skillOptions = [
    'エンジニア',
    'デザイナー',
    'マーケター',
    'セールス',
    'ライター',
    'プランナー',
    '財務/会計',
    '法務',
  ];

  const seekingOptions = [
    'エンジニア',
    'デザイナー',
    'マーケター',
    'セールス',
    'ライター',
    'プランナー',
    '財務/会計',
    '法務',
    'メンター',
    '投資家',
  ];

  const handleSeekingForToggle = (option: string) => {
    setSeekingFor((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handleSkillToggle = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSeekingToggle = (role: string) => {
    setSeekingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleImageChange = () => {
    // In a real app, this would open file picker
    alert('画像選択機能は実装予定です');
  };

  const isFormValid = () => {
    return (
      nickname &&
      age &&
      seekingFor.length > 0 &&
      challengeTheme &&
      skills.length > 0 &&
      seekingRoles.length > 0
    );
  };

  const handleSave = () => {
    if (isFormValid()) {
      onSave();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-gray-700 active:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-gray-900">プロフィール編集</h1>
        <button
          onClick={handleSave}
          disabled={!isFormValid()}
          className={`px-4 py-2 rounded-lg transition-all ${
            isFormValid()
              ? 'bg-gradient-to-r from-teal-600 to-blue-600 text-white active:opacity-80'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          保存
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="px-4 py-6 space-y-8">
          {/* Section I: Image & Activity Status */}
          <div className="space-y-6">
            {/* Profile Image */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
                <button
                  onClick={handleImageChange}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-lg active:bg-teal-700 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleImageChange}
                className="mt-3 text-sm text-teal-600 active:text-teal-700"
              >
                画像を変更
              </button>
            </div>

            {/* Seeking For */}
            <div className="bg-gradient-to-r from-teal-50 to-blue-50 p-5 rounded-lg border-2 border-teal-200">
              <label className="flex items-center gap-2 mb-3 text-gray-900">
                <Search className="w-6 h-6 text-teal-600" />
                <span className="text-base">🔎 今、何を探していますか？</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {seekingForOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSeekingForToggle(option)}
                    className={`px-4 py-2.5 rounded-lg text-sm transition-all ${
                      seekingFor.includes(option)
                        ? 'bg-teal-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 active:bg-gray-50'
                    }`}
                  >
                    {seekingFor.includes(option) && (
                      <Check className="w-3.5 h-3.5 inline mr-1" />
                    )}
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section II: Basic Info */}
          <div className="space-y-5">
            <h2 className="text-gray-900 flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-teal-600 to-blue-600 rounded-full"></div>
              基本情報
            </h2>

            {/* Nickname */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                ニックネーム
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例: タロウ"
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                年齢
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="例: 20"
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400"
              />
            </div>

            {/* University */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                大学 <span className="text-xs text-gray-500">（任意）</span>
              </label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="例: 東京大学"
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400"
              />
            </div>

            {/* Grade */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                学年 <span className="text-xs text-gray-500">（任意）</span>
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              >
                <option value="">選択してください</option>
                <option value="1">1年生</option>
                <option value="2">2年生</option>
                <option value="3">3年生</option>
                <option value="4">4年生</option>
                <option value="m1">修士1年</option>
                <option value="m2">修士2年</option>
                <option value="d">博士課程</option>
              </select>
            </div>
          </div>

          {/* Section III: Challenge & Skills */}
          <div className="space-y-5">
            <h2 className="text-gray-900 flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></div>
              挑戦と募集の核
            </h2>

            {/* Challenge Theme */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span>🔥 現在の挑戦テーマ</span>
              </label>
              <textarea
                value={challengeTheme}
                onChange={(e) => setChallengeTheme(e.target.value)}
                placeholder="例: AIを活用した学習支援アプリを開発し、教育格差の解消に挑戦しています"
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder:text-gray-400 min-h-[120px]"
              />
            </div>

            {/* Skills */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <Zap className="w-5 h-5 text-teal-600" />
                <span>💪 持っているスキル</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {skillOptions.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => handleSkillToggle(skill)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      skills.includes(skill)
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                    }`}
                  >
                    {skills.includes(skill) && (
                      <Check className="w-3 h-3 inline mr-1" />
                    )}
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Tech Details */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <Code className="w-5 h-5 text-teal-600" />
                <span>💻 得意な技術/ツール <span className="text-xs text-gray-500">（任意）</span></span>
              </label>
              <textarea
                value={techDetails}
                onChange={(e) => setTechDetails(e.target.value)}
                placeholder="例: React, TypeScript, Figma, Firebase, SEO対策"
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400 min-h-[80px]"
              />
            </div>
          </div>

          {/* Section IV: Requirements */}
          <div className="space-y-5">
            <h2 className="text-gray-900 flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></div>
              求める条件
            </h2>

            {/* Seeking Roles */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <Users className="w-5 h-5 text-orange-500" />
                <span>🤝 求める仲間や条件等</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {seekingOptions.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleSeekingToggle(role)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      seekingRoles.includes(role)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                    }`}
                  >
                    {seekingRoles.includes(role) && (
                      <Check className="w-3 h-3 inline mr-1" />
                    )}
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Requirement Details */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <FileText className="w-5 h-5 text-orange-500" />
                <span>📝 募集要項の詳細 <span className="text-xs text-gray-500">（任意）</span></span>
              </label>
              <textarea
                value={requirementDetails}
                onChange={(e) => setRequirementDetails(e.target.value)}
                placeholder="例: 週10時間以上コミット可能な方、Web3の実務経験がある方を優遇します"
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder:text-gray-400 min-h-[100px]"
              />
            </div>
          </div>
        </div>

        {/* Footer - Account Deletion Link */}
        <div className="px-4 py-6 border-t border-gray-200 bg-white">
          <button className="text-sm text-gray-500 hover:text-red-600 transition-colors">
            アカウント削除
          </button>
        </div>
      </div>
    </div>
  );
}
