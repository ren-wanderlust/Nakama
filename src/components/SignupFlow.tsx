import { useState } from 'react';
import { ChevronRight, Mail, Lock, User, GraduationCap, Flame, Zap, Users, Check, Calendar, Search } from 'lucide-react';

interface SignupFlowProps {
  onComplete: () => void;
}

export function SignupFlow({ onComplete }: SignupFlowProps) {
  const [step, setStep] = useState<'auth' | 'profile' | 'complete'>('auth');

  // Step 1: Auth data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Step 2: Profile data
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [university, setUniversity] = useState('');
  const [grade, setGrade] = useState('');
  const [seekingFor, setSeekingFor] = useState<string[]>([]); // What are you looking for?
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDetails, setSkillDetails] = useState(''); // Optional detailed skills
  const [seekingRoles, setSeekingRoles] = useState<string[]>([]);
  const [requirementDetails, setRequirementDetails] = useState(''); // Optional requirement details

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

  const seekingForOptions = [
    'ビジネスパートナーを探す',
    'ビジネスメンバーを探す',
    '仕事を探したい',
    '情報収集',
    'その他',
  ];

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

  const handleSeekingForToggle = (option: string) => {
    setSeekingFor((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handleAuthSubmit = () => {
    // Validation would go here
    if (email && password && password === passwordConfirm && agreedToTerms) {
      setStep('profile');
    }
  };

  const handleProfileSubmit = () => {
    // Validation - nickname, age, seekingFor, skills, and seekingRoles are required
    if (nickname && age && seekingFor.length > 0 && skills.length > 0 && seekingRoles.length > 0) {
      setStep('complete');
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  if (step === 'auth') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
        {/* Progress Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-gray-900">アカウント作成</h1>
            <span className="text-sm text-gray-500">Step 1/2</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-gradient-to-r from-teal-600 to-blue-600 h-1.5 rounded-full w-1/2"></div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@bizyou.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8文字以上"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password Confirm */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                パスワード（確認）
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="もう一度入力してください"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded bg-white border border-gray-300 text-teal-600 checked:bg-white checked:border-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                />
                <span className="text-sm text-gray-700">
                  <a href="#" className="text-teal-600 underline">利用規約</a>
                  と
                  <a href="#" className="text-teal-600 underline">プライバシーポリシー</a>
                  に同意します
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Bottom Button */}
        <div className="bg-white border-t border-gray-200 px-4 py-4">
          <button
            onClick={handleAuthSubmit}
            disabled={!email || !password || password !== passwordConfirm || !agreedToTerms}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg transition-all active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>次へ</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
        {/* Progress Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-gray-900">プロフィール基本情報</h1>
            <span className="text-sm text-gray-500">Step 2/2</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-gradient-to-r from-teal-600 to-blue-600 h-1.5 rounded-full w-full"></div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Nickname */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                ニックネーム
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="例: タロウ"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400"
                />
              </div>
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
                所属大学名 <span className="text-xs text-gray-500">（任意）</span>
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="例: 東京大学"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400"
                />
              </div>
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

            {/* Seeking For - What are you looking for? (Most Important) */}
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

            {/* Skills - What you can provide */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <Zap className="w-5 h-5 text-teal-600" />
                <span>持っているスキル</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">あなたが提供できる役割を選んでください</p>
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

            {/* Skill Details - Optional */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                詳細 <span className="text-xs text-gray-500">（任意）</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Go言語、Figma、高度なSEOなど、具体的な得意技術やツールを記述してください
              </p>
              <textarea
                value={skillDetails}
                onChange={(e) => setSkillDetails(e.target.value)}
                placeholder="例: Go言語でのバックエンド開発、Figmaでのプロトタイピング、高度なSEO対策"
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400 min-h-[80px]"
              />
            </div>

            {/* Seeking Roles - Who you're looking for */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>求める仲間や条件等</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
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

            {/* Requirement Details - Optional */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                募集要項の詳細 <span className="text-xs text-gray-500">（任意）</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                週10時間コミット希望、Web3経験者優遇など、求める具体的な条件を記述してください
              </p>
              <textarea
                value={requirementDetails}
                onChange={(e) => setRequirementDetails(e.target.value)}
                placeholder="例: 週10時間以上コミット可能な方、Web3の実務経験がある方を優遇します"
                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400 min-h-[80px]"
              />
            </div>
          </div>
        </div>

        {/* Bottom Button */}
        <div className="bg-white border-t border-gray-200 px-4 py-4">
          <button
            onClick={handleProfileSubmit}
            disabled={!nickname || !age || seekingFor.length === 0 || skills.length === 0 || seekingRoles.length === 0}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg transition-all active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>BizYouを始める</span>
          </button>
        </div>
      </div>
    );
  }

  // Complete screen
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center max-w-md mx-auto px-4">
      <div className="text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-teal-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-white" />
        </div>

        {/* Message */}
        <h1 className="text-gray-900 mb-3">登録完了！</h1>
        <p className="text-gray-600 mb-8">
          すぐに仲間を探しに行きましょう
        </p>

        {/* CTA */}
        <button
          onClick={handleComplete}
          className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg transition-all active:opacity-80"
        >
          <span>ホーム画面へ</span>
        </button>
      </div>
    </div>
  );
}