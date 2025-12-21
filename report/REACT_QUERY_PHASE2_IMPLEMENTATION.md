# React Query + AsyncStorage 永続キャッシュ実装 - Phase 2

## 実装完了サマリー

以下の3つの画面をReact Query + AsyncStorage永続キャッシュ対応にしました：

1. ✅ **プロジェクト一覧**（UserProjectPage.tsx）
2. ✅ **マイプロジェクト / 参加中プロジェクト**（MyPage.tsx）
3. ✅ **受信いいね・マッチ一覧**（LikesPage.tsx）

---

## 1. 追加したqueryKeys

### `data/queryKeys.ts` に追加

```typescript
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
```

---

## 2. 新設したAPI層

### `data/api/projects.ts`
- `fetchProjects({ sort })`: プロジェクト一覧取得

### `data/api/myProjects.ts`
- `fetchMyProjects(userId)`: マイプロジェクト取得（pendingCount付き）
- `fetchParticipatingProjects(userId)`: 参加中プロジェクト取得

### `data/api/likes.ts`
- `fetchReceivedLikes(userId)`: 受信いいね取得（未読IDセット付き）

### `data/api/applications.ts`
- `fetchProjectApplications(userId)`: プロジェクト応募一覧取得（募集・応募の両方）

---

## 3. 新設したHooks層

### `data/hooks/useProjectsList.ts`
- `useProjectsList(sort)`: プロジェクト一覧用hook（useQuery）

### `data/hooks/useMyProjects.ts`
- `useMyProjects(userId)`: マイプロジェクト用hook（useQuery）
- `useParticipatingProjects(userId)`: 参加中プロジェクト用hook（useQuery）

### `data/hooks/useReceivedLikes.ts`
- `useReceivedLikes(userId)`: 受信いいね用hook（useQuery）

### `data/hooks/useProjectApplications.ts`
- `useProjectApplications(userId)`: プロジェクト応募一覧用hook（useQuery）

---

## 4. コンポーネントの変更

### UserProjectPage.tsx

**変更前**:
- `fetchProjects`関数で手動取得
- `projects` stateで管理
- `onRefresh`で`fetchProjects()`を再実行

**変更後**:
- `useProjectsList(sortOrder)` hookを使用
- `projects`は`projectsQuery.data || []`から取得
- `onRefresh`は`projectsQuery.refetch()`に置換
- `onCreated`/`onProjectUpdated`で`invalidateQueries`を使用

### MyPage.tsx

**変更前**:
- `fetchMyProjects`と`fetchParticipatingProjects`関数で手動取得
- `projects`と`participatingProjects` stateで管理

**変更後**:
- `useMyProjects(profile.id)`と`useParticipatingProjects(profile.id)` hookを使用
- `projects`は`myProjectsQuery.data || []`から取得
- `participatingProjects`は`participatingProjectsQuery.data || []`から取得
- `onProjectUpdated`で`invalidateQueries`を使用
- `onBadgeUpdate`は`useEffect`で自動更新

### LikesPage.tsx

**変更前**:
- `fetchReceivedLikes`と`fetchProjectApplications`関数で手動取得
- 複数のstateで管理（receivedLikes, unreadInterestIds, unreadMatchIds, recruitingApplications, appliedApplications, unreadRecruitingIds）

**変更後**:
- `useReceivedLikes(session?.user?.id)`と`useProjectApplications(session?.user?.id)` hookを使用
- データはReact Queryから取得
- `markInterestAsRead`/`markMatchAsRead`/`markRecruitingAsRead`で`invalidateQueries`を使用
- `updateApplicantStatus`で複数のqueryKeyを`invalidateQueries`（recruiting, applied, myProjects, participatingProjects）

---

## 5. 実装方針の遵守確認

✅ **supabase.from(...) の直接呼び出しを全廃**: すべて`data/api`層に移動  
✅ **data/api + data/hooks に処理を移動**: 完了  
✅ **React Query + AsyncStorage 永続キャッシュを使用**: 既存の設定を継承  
✅ **queryKeys.ts にキーを追加**: 完了  
✅ **useQuery / useInfiniteQuery を使用**: すべて`useQuery`を使用（ページネーション不要のため）  
✅ **Realtime 変更時は invalidateQueries のみ**: 直接fetchは削除  
✅ **setInterval / ポーリングは禁止**: 既存コードにもポーリングなし  
✅ **既存UI・型・挙動は変えない**: 維持  

---

## 6. キャッシュ設定

すべてのhookで以下の設定を使用：

- **プロジェクト一覧**: `staleTime: 5分`, `gcTime: 30分`
- **マイプロジェクト / 参加中**: `staleTime: 2分`, `gcTime: 10分`
- **受信いいね**: `staleTime: 2分`, `gcTime: 10分`
- **プロジェクト応募一覧**: `staleTime: 2分`, `gcTime: 10分`

---

## 7. 次のステップ（オプション）

- [ ] Realtimeイベントの追加（projects, project_applications, likesテーブルの変更を購読）
- [ ] エラーハンドリングの強化
- [ ] オフライン時の挙動確認
- [ ] キャッシュサイズの監視
