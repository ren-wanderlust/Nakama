import { X, Search } from 'lucide-react';
import { useState } from 'react';

interface FilterModalProps {
  onClose: () => void;
}

export function FilterModal({ onClose }: FilterModalProps) {
  const [keyword, setKeyword] = useState('');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('25');
  const [location, setLocation] = useState('');
  const [isStudentOnly, setIsStudentOnly] = useState(false);
  const [isWorkerOnly, setIsWorkerOnly] = useState(false);
  const [activityStatuses, setActivityStatuses] = useState<string[]>([]);
  const [skillTags, setSkillTags] = useState<string[]>([]);

  const activityStatusList = [
    'ビジネスパートナーを探す',
    'ビジネスメンバーを探す',
    '仕事を探したい',
    '情報収集',
    'その他',
  ];

  const skillTagList = [
    'エンジニア',
    'デザイナー',
    'マーケター',
    'セールス',
    'ライター',
    'プランナー',
    '財務/会計',
    '法務',
  ];

  const handleActivityStatusToggle = (status: string) => {
    setActivityStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handleSkillTagToggle = (skill: string) => {
    setSkillTags((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleApply = () => {
    console.log('Applying filters:', {
      keyword,
      ageMin,
      ageMax,
      location,
      isStudentOnly,
      isWorkerOnly,
      activityStatuses,
      skillTags,
    });
    onClose();
  };

  const handleReset = () => {
    setKeyword('');
    setAgeMin('18');
    setAgeMax('25');
    setLocation('');
    setIsStudentOnly(false);
    setIsWorkerOnly(false);
    setActivityStatuses([]);
    setSkillTags([]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-end">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-2xl max-h-[90vh] flex flex-col border-t border-gray-200">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-gray-900">絞り込み</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
            aria-label="閉じる"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Section I: Basic Attributes */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
              <h3 className="text-sm text-orange-600">基本属性</h3>
            </div>

            {/* Age Range */}
            <div className="mb-4">
              <label className="block text-xs text-gray-700 mb-2">年齢</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  placeholder="18"
                  className="flex-1 px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  min="18"
                  max="25"
                />
                <span className="text-gray-500 text-sm">〜</span>
                <input
                  type="number"
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  placeholder="25"
                  className="flex-1 px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  min="18"
                  max="25"
                />
              </div>
            </div>

            {/* Location */}
            <div className="mb-4">
              <label className="block text-xs text-gray-700 mb-2">地域</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              >
                <option value="">すべて</option>
                <option value="tokyo">東京</option>
                <option value="osaka">大阪</option>
                <option value="fukuoka">福岡</option>
                <option value="kyoto">京都</option>
                <option value="kanagawa">神奈川</option>
                <option value="hokkaido">北海道</option>
                <option value="aichi">愛知</option>
                <option value="hyogo">兵庫</option>
              </select>
            </div>

            {/* Attribute Checkboxes */}
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 active:bg-gray-50 py-1.5 -mx-1 px-1 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={isStudentOnly}
                  onChange={(e) => setIsStudentOnly(e.target.checked)}
                  className="w-4 h-4 rounded bg-white border border-gray-300 text-teal-600 checked:bg-white checked:border-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                />
                <span className="text-sm text-gray-700">学生のみ表示</span>
              </label>
              <label className="flex items-center gap-2.5 active:bg-gray-50 py-1.5 -mx-1 px-1 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWorkerOnly}
                  onChange={(e) => setIsWorkerOnly(e.target.checked)}
                  className="w-4 h-4 rounded bg-white border border-gray-300 text-teal-600 checked:bg-white checked:border-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                />
                <span className="text-sm text-gray-700">職場経験者のみ表示</span>
              </label>
            </div>
          </section>

          {/* Section II: Activity Status (大目的) */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
              <h3 className="text-sm text-orange-600">活動状況</h3>
            </div>

            <div className="space-y-2">
              {activityStatusList.map((status) => (
                <label
                  key={status}
                  className="flex items-center gap-2.5 active:bg-gray-50 py-1.5 -mx-1 px-1 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={activityStatuses.includes(status)}
                    onChange={() => handleActivityStatusToggle(status)}
                    className="w-4 h-4 rounded bg-white border border-gray-300 text-teal-600 checked:bg-white checked:border-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">{status}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Section III: Skill Tag (役割) */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
              <h3 className="text-sm text-orange-600">スキルタグ</h3>
              <span className="text-xs text-gray-500">役割</span>
            </div>

            <div className="space-y-2">
              {skillTagList.map((skill) => (
                <label
                  key={skill}
                  className="flex items-center gap-2.5 active:bg-gray-50 py-1.5 -mx-1 px-1 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={skillTags.includes(skill)}
                    onChange={() => handleSkillTagToggle(skill)}
                    className="w-4 h-4 rounded bg-white border border-gray-300 text-teal-600 checked:bg-white checked:border-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">{skill}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Keyword Search - Moved to bottom */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
              <h3 className="text-sm text-orange-600">キーワード検索</h3>
            </div>

            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="キーワードを入力"
                className="w-full px-3 py-2 pr-10 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-gray-400"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
          <div className="flex gap-3 mb-2">
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 bg-white border border-teal-600 text-teal-600 rounded-lg transition-colors active:bg-teal-50"
            >
              <span className="text-sm">リセット</span>
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-blue-600 active:opacity-80 text-white rounded-lg transition-all"
            >
              <span className="text-sm">適用する</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full text-teal-600 text-sm py-2"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}