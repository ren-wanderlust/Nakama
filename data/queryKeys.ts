/**
 * React Query の queryKey を一元管理
 * 将来のLocal DB移行時も、このキー構造を維持することで置換が容易になる
 */

export const queryKeys = {
  // プロフィール一覧（ページネーション対応）
  profiles: {
    all: ['profiles'] as const,
    lists: () => [...queryKeys.profiles.all, 'list'] as const,
    list: (pageSize: number, sort: 'newest' | 'recommended' | 'deadline') =>
      [...queryKeys.profiles.lists(), { pageSize, sort }] as const,
  },

  // チャット一覧（ユーザー単位）
  chatRooms: {
    all: ['chatRooms'] as const,
    lists: () => [...queryKeys.chatRooms.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.chatRooms.lists(), userId] as const,
  },

  // 未読メッセージ数（ユーザー単位）
  unreadCount: {
    all: ['unreadCount'] as const,
    detail: (userId: string) => [...queryKeys.unreadCount.all, userId] as const,
  },
};
