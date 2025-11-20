import { 
  ChevronRight, 
  CreditCard, 
  Bell, 
  Star, 
  Eye, 
  Settings, 
  HelpCircle,
  Edit,
  LogOut
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface MenuItem {
  id: string;
  icon: any;
  label: string;
  badge?: number;
}

export function MyPage({ onLogout, onEditProfile }: { onLogout?: () => void; onEditProfile?: () => void }) {
  const menuItems: MenuItem[] = [
    { id: 'billing', icon: CreditCard, label: '課金・プラン管理' },
    { id: 'notifications', icon: Bell, label: 'お知らせ', badge: 3 },
    { id: 'favorites', icon: Star, label: 'お気に入り' },
    { id: 'visitors', icon: Eye, label: '訪問者履歴', badge: 5 },
    { id: 'settings', icon: Settings, label: '各種設定' },
    { id: 'help', icon: HelpCircle, label: 'ヘルプ・ガイドライン' },
  ];

  // Mock user data
  const user = {
    name: 'ユウキ',
    age: 22,
    university: '東京工業大学',
    image: 'https://images.unsplash.com/photo-1543132220-e7fef0b974e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMGVudHJlcHJlbmV1ciUyMHBvcnRyYWl0fGVufDF8fHx8MTc2MzQ4NTI0MXww&ixlib=rb-4.1.0&q=80&w=1080',
    nextBillingDate: '2025年12月19日',
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-blue-700 px-4 pt-6 pb-8">
        <h1 className="text-white text-center mb-4">マイページ</h1>
      </div>

      {/* Profile Card */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Profile Info */}
          <div className="p-4 flex items-center gap-4">
            <div className="relative">
              <ImageWithFallback
                src={user.image}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-teal-500"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center border-2 border-white">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-gray-900 mb-1">{user.name}</h2>
              <p className="text-sm text-gray-600">{user.age}歳 · {user.university}</p>
            </div>
          </div>

          {/* Edit Profile Button */}
          <div className="px-4 pb-4">
            <button
              onClick={onEditProfile}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl active:scale-98 transition-transform"
            >
              <Edit className="w-5 h-5" />
              <span>🔥 プロフィール編集・確認</span>
            </button>
          </div>

          {/* Status Banner */}
          <div className="bg-gradient-to-r from-teal-600 to-blue-600 px-4 py-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">✅ 月額 ¥500 参加中</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-teal-100">
              次月更新日：{user.nextBillingDate}
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === menuItems.length - 1;

            return (
              <button
                key={item.id}
                className={`w-full flex items-center gap-4 px-4 py-4 active:bg-gray-50 transition-colors ${
                  !isLast ? 'border-b border-gray-200' : ''
                }`}
              >
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm text-gray-900">{item.label}</span>
                </div>
                {item.badge && (
                  <div className="w-6 h-6 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                    {item.badge}
                  </div>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-4 mt-4">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl active:bg-gray-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>ログアウト</span>
        </button>
      </div>

      {/* App Version */}
      <div className="px-4 mt-8 pb-4 text-center">
        <p className="text-xs text-gray-500">BizYou v1.0.0</p>
        <p className="text-xs text-gray-400 mt-1">© 2025 BizYou. All rights reserved.</p>
      </div>
    </div>
  );
}