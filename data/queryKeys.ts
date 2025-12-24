/**
 * React Query の queryKey を一元管理
 * 将来のLocal DB移行時も、このキー構造を維持することで置換が容易になる
 */

export const queryKeys = {
  // プロフィール一覧（ページネーション対応）
  profiles: {
    all: ['profiles'] as const,
    lists: () => [...queryKeys.profiles.all, 'list'] as const,
    list: (pageSize: number, sort: 'newest' | 'recommended' | 'deadline', userId?: string) =>
      [...queryKeys.profiles.lists(), { pageSize, sort, userId }] as const,
  },

  // チャット一覧（ユーザー単位）
  chatRooms: {
    all: ['chatRooms'] as const,
    lists: () => [...queryKeys.chatRooms.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.chatRooms.lists(), userId] as const,
  },

  // メッセージ一覧（ルーム単位）
  messages: {
    all: ['messages'] as const,
    lists: () => [...queryKeys.messages.all, 'list'] as const,
    list: (roomId: string) => [...queryKeys.messages.lists(), roomId] as const,
  },

  // 未読メッセージ数（ユーザー単位）
  unreadCount: {
    all: ['unreadCount'] as const,
    detail: (userId: string) => [...queryKeys.unreadCount.all, userId] as const,
  },

  // プロジェクト一覧（ソート順対応、ブロックフィルタ用userId含む）
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (sort: 'recommended' | 'newest' | 'deadline', userId?: string) =>
      [...queryKeys.projects.lists(), { sort, userId }] as const,
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
    /**
     * NOTE:
     * 現状の fetchProjectApplications は「募集(recruiting) + 応募(applied)」を1回の取得で返すため、
     * recruiting/applied を別キーにすると invalidate が片方しか効かない問題が起きやすい。
     * そこで userId 単位の単一キーに統一し、recruiting/applied は互換のため同一キーを返す。
     */
    detail: (userId: string) => [...queryKeys.projectApplications.all, userId] as const,
    recruiting: (userId: string) => queryKeys.projectApplications.detail(userId),
    applied: (userId: string) => queryKeys.projectApplications.detail(userId),
  },

  // マッチ一覧（ユーザー単位）
  matches: {
    all: ['matches'] as const,
    detail: (userId: string) => [...queryKeys.matches.all, userId] as const,
  },

  // 通知一覧（ユーザー単位）
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.notifications.lists(), userId] as const,
  },
};
