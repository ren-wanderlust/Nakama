import { Home, Heart, MessageSquare, Tag, UserCircle } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'search', icon: Home, label: 'さがす' },
    { id: 'likes', icon: Heart, label: 'いいね' },
    { id: 'talk', icon: MessageSquare, label: 'トーク' },
    { id: 'tags', icon: Tag, label: '挑戦カード' },
    { id: 'profile', icon: UserCircle, label: 'マイページ' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 max-w-md mx-auto">
      <div className="px-1">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center gap-0.5 py-2 px-2 transition-colors active:bg-gray-50 flex-1 ${
                  isActive ? 'text-teal-600' : 'text-gray-500'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? 'fill-teal-100 stroke-2' : ''}`}
                />
                <span className="text-xs whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}