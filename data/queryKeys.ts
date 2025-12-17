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

  // プロジェクト一覧（ソート順対応）
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (sort: 'recommended' | 'newest' | 'deadline') =>
      [...queryKeys.projects.lists(), { sort }] as const,
  },

  // マイプロジェクト（ユーザー単位）
  myProjects: {
    all: ['myProjects'] as const,
    detail: (userId: string) => [...queryKeys.myProjects.all, userId] as const,
  },

  // 参加中プロジェクト（ユーザー単位）
  participatingProjects: {
    all: ['participatingProjects'] as const,
    detail: (userId: string) => [...queryKeys.participatingProjects.all, userId] as const,
  },

  // 受信いいね（ユーザー単位）
  receivedLikes: {
    all: ['receivedLikes'] as const,
    detail: (userId: string) => [...queryKeys.receivedLikes.all, userId] as const,
  },

  // プロジェクト応募一覧（ユーザー単位）
  projectApplications: {
    all: ['projectApplications'] as const,
    recruiting: (userId: string) => [...queryKeys.projectApplications.all, 'recruiting', userId] as const,
    applied: (userId: string) => [...queryKeys.projectApplications.all, 'applied', userId] as const,
  },

  // マッチ一覧（ユーザー単位）
  matches: {
    all: ['matches'] as const,
    detail: (userId: string) => [...queryKeys.matches.all, userId] as const,
  },
};
