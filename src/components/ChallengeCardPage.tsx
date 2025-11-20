import { useState } from 'react';
import { Flame, Code, Users, GraduationCap, Sparkles, TrendingUp, Clock, Target } from 'lucide-react';

type FilterCategory = 'challenge' | 'skill' | 'role' | 'attribute' | 'values';

interface TopicCard {
  id: string;
  title: string;
  icon: string;
  count: number;
  color: string;
}

const filterCategories = [
  { id: 'challenge' as FilterCategory, label: '挑戦テーマ', icon: Flame },
  { id: 'skill' as FilterCategory, label: 'スキル', icon: Code },
  { id: 'role' as FilterCategory, label: '募集役割', icon: Users },
  { id: 'attribute' as FilterCategory, label: '属性', icon: GraduationCap },
  { id: 'values' as FilterCategory, label: '価値観', icon: Sparkles },
];

export function ChallengeCardPage() {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('challenge');

  // おすすめ（AI推薦）
  const recommendedCards: TopicCard[] = [
    {
      id: 'r1',
      title: 'AIプロダクト開発',
      icon: '🤖',
      count: 127,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'r2',
      title: 'サステナブルビジネス',
      icon: '🌱',
      count: 89,
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'r3',
      title: 'EdTech/教育革新',
      icon: '📚',
      count: 156,
      color: 'from-purple-500 to-violet-500',
    },
    {
      id: 'r4',
      title: 'ビジコン参加',
      icon: '🏆',
      count: 94,
      color: 'from-orange-500 to-amber-500',
    },
  ];

  // 注目の挑戦テーマ（人気）
  const trendingCards: TopicCard[] = [
    {
      id: 't1',
      title: 'Web3/ブロックチェーン',
      icon: '⛓️',
      count: 203,
      color: 'from-indigo-500 to-purple-500',
    },
    {
      id: 't2',
      title: 'D2Cブランド立ち上げ',
      icon: '🛍️',
      count: 178,
      color: 'from-pink-500 to-rose-500',
    },
    {
      id: 't3',
      title: 'SaaS開発',
      icon: '☁️',
      count: 245,
      color: 'from-teal-500 to-cyan-500',
    },
    {
      id: 't4',
      title: 'ソーシャルインパクト',
      icon: '💚',
      count: 112,
      color: 'from-lime-500 to-green-500',
    },
    {
      id: 't5',
      title: 'コミュニティ運営',
      icon: '👥',
      count: 134,
      color: 'from-yellow-500 to-orange-500',
    },
  ];

  // 新着の挑戦・募集
  const newCards: TopicCard[] = [
    {
      id: 'n1',
      title: 'メタバース事業',
      icon: '🥽',
      count: 42,
      color: 'from-fuchsia-500 to-pink-500',
    },
    {
      id: 'n2',
      title: 'ヘルステック',
      icon: '⚕️',
      count: 68,
      color: 'from-red-500 to-orange-500',
    },
    {
      id: 'n3',
      title: 'クリエイターエコノミー',
      icon: '🎨',
      count: 91,
      color: 'from-violet-500 to-purple-500',
    },
    {
      id: 'n4',
      title: 'スタートアップ共同創業',
      icon: '🚀',
      count: 55,
      color: 'from-blue-500 to-indigo-500',
    },
  ];

  const handleCardClick = (cardId: string) => {
    console.log('Clicked card:', cardId);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-gray-900 text-center mb-4">挑戦カード</h1>
          <p className="text-xs text-gray-600 text-center">
            興味のあるテーマを探して、同じ挑戦者と繋がろう
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-2 px-4 py-3 min-w-max">
          {filterCategories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveFilter(category.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeFilter === category.id
                    ? 'bg-gradient-to-r from-teal-600 to-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4">
        {/* AI Recommendations */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h2 className="text-sm text-gray-900">あなたにおすすめ</h2>
            <span className="text-xs text-gray-500">AI推薦</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {recommendedCards.map((card) => (
              <TopicCardComponent key={card.id} card={card} />
            ))}
          </div>
        </section>

        {/* Trending Topics */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <h2 className="text-sm text-gray-900">注目の挑戦テーマ</h2>
            <span className="text-xs text-gray-500">人気急上昇中</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {trendingCards.map((card) => (
              <TopicCardComponent key={card.id} card={card} />
            ))}
          </div>
        </section>

        {/* New Topics */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm text-gray-900">新着テーマ</h2>
            <span className="text-xs text-gray-500">この1週間</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {newCards.map((card) => (
              <TopicCardComponent key={card.id} card={card} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function TopicCardComponent({ card }: { card: TopicCard }) {
  return (
    <button className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm active:shadow-md transition-all active:scale-98">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-2xl mb-2`}>
        {card.icon}
      </div>
      <h3 className="text-sm text-gray-900 mb-1 text-left line-clamp-2">{card.title}</h3>
      <div className="flex items-center gap-1">
        <Target className="w-3 h-3 text-gray-500" />
        <span className="text-xs text-gray-600">{card.count}人が挑戦中</span>
      </div>
    </button>
  );
}