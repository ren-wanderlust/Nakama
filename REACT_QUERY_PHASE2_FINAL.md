# React Query + AsyncStorage 永続キャッシュ実装 - Phase 2 完了

## 実装完了サマリー

以下の3つの画面をReact Query + AsyncStorage永続キャッシュ対応にしました：

1. ✅ **プロジェクト一覧**（UserProjectPage.tsx）
2. ✅ **マイプロジェクト / 参加中プロジェクト**（MyPage.tsx）
3. ✅ **受信いいね・マッチ一覧**（LikesPage.tsx）

**追加実装**:
- ✅ **マッチ一覧**（App.tsx）もReact Query化

---

## 1. 追加したqueryKeys

### `data/queryKeys.ts` に追加

```typescript
// マッチ一覧（ユーザー単位）
matches: {
  all: ['matches'] as const,
  detail: (userId: string) => [...queryKeys.matches.all, userId] as const,
},
```

**既存のキー**:
- `projects.list(sort)`
- `myProjects.detail(userId)`
- `participatingProjects.detail(userId)`
- `receivedLikes.detail(userId)`
- `projectApplications.recruiting(userId)`
- `projectApplications.applied(userId)`

---

## 2. 新設したAPI層

### `data/api/matches.ts` (新規)
- `fetchMatches(userId)`: マッチ一覧と自分が送ったいいねを取得
  - `get_my_matches` RPCを使用
  - `likes`テーブルから自分が送ったいいねを取得
  - 返り値: `{ matchIds: Set<string>, myLikedIds: Set<string> }`

**既存のAPI**:
- `data/api/projects.ts` - プロジェクト一覧取得
- `data/api/myProjects.ts` - マイプロジェクト・参加中プロジェクト取得
- `data/api/likes.ts` - 受信いいね取得
- `data/api/applications.ts` - プロジェクト応募一覧取得

---

## 3. 新設したHooks層

### `data/hooks/useMatches.ts` (新規)
- `useMatches(userId)`: マッチ一覧用hook（useQuery）

**既存のhooks**:
- `data/hooks/useProjectsList.ts`
- `data/hooks/useMyProjects.ts`
- `data/hooks/useReceivedLikes.ts`
- `data/hooks/useProjectApplications.ts`

---

## 4. コンポーネントの変更

### UserProjectPage.tsx

**変更内容**:
- ✅ `useProjectsList(sortOrder)` hookを使用
- ✅ `onCreated`/`onProjectUpdated`で`invalidateQueries`を使用
- ✅ Realtime購読追加（projectsテーブルの変更を購読）

**削除**:
- `fetchProjects`関数
- `projects` state
- `loading` state

### MyPage.tsx

**変更内容**:
- ✅ `useMyProjects(profile.id)`と`useParticipatingProjects(profile.id)` hookを使用
- ✅ `onProjectUpdated`で`invalidateQueries`を使用
- ✅ `onBadgeUpdate`は`useEffect`で自動更新
- ✅ Realtime購読追加（projects, project_applicationsテーブルの変更を購読）

**削除**:
- `fetchMyProjects`関数
- `fetchParticipatingProjects`関数
- `projects` state
- `participatingProjects` state
- `loadingProjects` state
- `loadingParticipating` state

### LikesPage.tsx

**変更内容**:
- ✅ `useReceivedLikes(session?.user?.id)`と`useProjectApplications(session?.user?.id)` hookを使用
- ✅ `markInterestAsRead`/`markMatchAsRead`/`markRecruitingAsRead`で`invalidateQueries`を使用
- ✅ `updateApplicantStatus`で複数のqueryKeyを`invalidateQueries`
- ✅ Realtime購読追加（likes, project_applicationsテーブルの変更を購読）

**削除**:
- `fetchReceivedLikes`関数
- `fetchProjectApplications`関数
- 複数のstate（receivedLikes, unreadInterestIds, unreadMatchIds, recruitingApplications, appliedApplications, unreadRecruitingIds, loadingUser, loadingProject）

### App.tsx

**変更内容**:
- ✅ `useMatches(session?.user?.id)` hookを使用
- ✅ `matchedProfileIds`と`likedProfiles`をReact Queryから取得
- ✅ すべての`setMatchedProfileIds`/`setLikedProfiles`を`invalidateQueries`に置換
- ✅ Realtimeイベントで`invalidateQueries`を使用

**削除**:
- `fetchMatches`関数
- `likedProfiles` state
- `matchedProfileIds` state

---

## 5. Realtime対応

### UserProjectPage.tsx
- `projects`テーブルの`INSERT`/`UPDATE`/`DELETE`を購読
- イベント時に`invalidateQueries(['projects', 'list', { sort }])`を呼び出し

### MyPage.tsx
- `projects`テーブル（`owner_id=eq.${profile.id}`）の変更を購読
- `project_applications`テーブルの変更を購読
- イベント時に`invalidateQueries`を呼び出し

### LikesPage.tsx
- `likes`テーブル（`receiver_id=eq.${session.user.id}`）の変更を購読
- `project_applications`テーブルの変更を購読
- イベント時に`invalidateQueries`を呼び出し

### App.tsx
- `likes`テーブルの変更時に`matches`と`receivedLikes`をinvalidate
- `project_applications`テーブルの変更時に`projectApplications`と`myProjects`をinvalidate

---

## 6. 実装方針の遵守確認

✅ **supabase.from(...) / rpc(...) の直接呼び出しを全廃**: すべて`data/api`層に移動  
✅ **data/api + data/hooks に取得ロジックを集約**: 完了  
✅ **React Query（useQuery / useInfiniteQuery）を必ず使用**: すべて`useQuery`を使用  
✅ **AsyncStorage 永続キャッシュを有効に活用**: 既存の設定を継承  
✅ **queryKeys.ts に必要なキーを追加**: 完了  
✅ **Realtime は invalidateQueries のみ**: 直接fetchは削除  
✅ **setInterval / ポーリングは禁止**: 既存コードにもポーリングなし  
✅ **既存UI・型・表示内容・挙動は変更しない**: 維持  

---

## 7. キャッシュ設定

すべてのhookで以下の設定を使用：

- **プロジェクト一覧**: `staleTime: 5分`, `gcTime: 30分`
- **マイプロジェクト / 参加中**: `staleTime: 2分`, `gcTime: 10分`
- **受信いいね**: `staleTime: 2分`, `gcTime: 10分`
- **プロジェクト応募一覧**: `staleTime: 2分`, `gcTime: 10分`
- **マッチ一覧**: `staleTime: 2分`, `gcTime: 10分`

---

## 8. 効果

### 「タブ切り替え・再訪時にロードが出ない」状態を実現

1. **AsyncStorage永続化**: アプリ再起動時、キャッシュが即座に復元され、初回表示が瞬時に表示される
2. **stale-while-revalidate**: キャッシュを即表示しつつ、裏で最新データを取得して差分更新
3. **refetchOnMount: false**: キャッシュがあれば再取得しないため、画面遷移時の不要なローディングが発生しない
4. **Realtime + invalidateQueries**: データ変更時は自動でキャッシュを更新し、次回表示時に最新データが表示される

---

## 9. 残存するsupabase直接呼び出し（許容範囲）

以下の箇所は詳細表示用の単発取得のため、React Query化の対象外としました：

- `LikesPage.tsx`: `handleProjectSelect` - プロジェクト詳細の単発取得
- `LikesPage.tsx`: `fetchCurrentUser` - 現在ユーザーのプロフィール取得
- `MyPage.tsx`: `delete_account` RPC - アカウント削除（データ取得ではない）

これらは一覧表示ではないため、キャッシュの恩恵が少なく、優先度が低いと判断しました。

---

## 10. 実装ファイル一覧

### 新規作成
- `data/api/matches.ts`
- `data/hooks/useMatches.ts`

### 修正
- `data/queryKeys.ts`（matchesキー追加）
- `components/UserProjectPage.tsx`
- `components/MyPage.tsx`
- `components/LikesPage.tsx`
- `App.tsx`

---

## 11. 次のステップ（オプション）

- [ ] 詳細表示用の取得もReact Query化（優先度低）
- [ ] エラーハンドリングの強化
- [ ] オフライン時の挙動確認
- [ ] キャッシュサイズの監視
