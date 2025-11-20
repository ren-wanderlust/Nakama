import { CheckCheck, ChevronRight, Briefcase } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ChatRoom {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAge: number;
  partnerLocation: string;
  partnerImage: string;
  lastMessage: string;
  unreadCount: number;
  timestamp: string;
  isOnline?: boolean;
}

interface TalkPageProps {
  onOpenChat?: (room: ChatRoom) => void;
}

export function TalkPage({ onOpenChat }: TalkPageProps) {
  const chatRooms: ChatRoom[] = [
    {
      id: 'c1',
      partnerId: 'p1',
      partnerName: 'アヤカ',
      partnerAge: 21,
      partnerLocation: '大阪',
      partnerImage: 'https://images.unsplash.com/photo-1553484771-6e117b648d45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFydHVwJTIwZm91bmRlciUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NjM0NTI1MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      lastMessage: 'ブランドのコンセプトについて、もう少し詳しくお話できますか？',
      unreadCount: 2,
      timestamp: '15分前',
      isOnline: true,
    },
    {
      id: 'c2',
      partnerId: 'p2',
      partnerName: 'サクラ',
      partnerAge: 22,
      partnerLocation: '東京',
      partnerImage: 'https://images.unsplash.com/photo-1709803312782-0c3b175875ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNpZ25lciUyMGNyZWF0aXZlJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2MzUyMDMzNXww&ixlib=rb-4.1.0&q=80&w=1080',
      lastMessage: 'ポートフォリオサイトのUI、一緒に考えませんか？',
      unreadCount: 1,
      timestamp: '1時間前',
      isOnline: true,
    },
    {
      id: 'c3',
      partnerId: 'p3',
      partnerName: 'リョウ',
      partnerAge: 23,
      partnerLocation: '神奈川',
      partnerImage: 'https://images.unsplash.com/photo-1762341116674-784c5dbedeb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNoJTIwZW50cmVwcmVuZXVyJTIweW91bmd8ZW58MXx8fHwxNzYzNTIwMzM1fDA&ixlib=rb-4.1.0&q=80&w=1080',
      lastMessage: 'Web3のイベント、一緒に行きませんか？',
      unreadCount: 0,
      timestamp: '2日前',
      isOnline: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-gray-900 text-center">トーク</h1>
        </div>
      </div>

      {/* Chat Rooms */}
      <div className="divide-y divide-gray-200">
        {chatRooms.map((room) => (
          <button
            key={room.id}
            className="w-full flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors bg-white"
            onClick={() => onOpenChat?.(room)}
          >
            {/* Avatar with online status */}
            <div className="relative flex-shrink-0">
              <ImageWithFallback
                src={room.partnerImage}
                alt={room.partnerName}
                className="w-14 h-14 rounded-full object-cover"
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Top row */}
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm text-gray-900">{room.partnerName}</span>
                <span className="text-xs text-gray-500">
                  {room.partnerAge}歳 · {room.partnerLocation}
                </span>
              </div>

              {/* Last message */}
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600 line-clamp-1 flex-1">
                  {room.lastMessage}
                </p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className="text-xs text-gray-500">{room.timestamp}</span>
              {room.unreadCount > 0 ? (
                <div className="w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                  {room.unreadCount}
                </div>
              ) : (
                <CheckCheck className="w-4 h-4 text-teal-500" />
              )}
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Empty state hint */}
      {chatRooms.length === 0 && (
        <div className="text-center py-12 px-4">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">まだトークがありません</p>
          <p className="text-sm text-gray-400 mt-1">
            マッチングした相手とメッセージを始めましょう！
          </p>
        </div>
      )}
    </div>
  );
}