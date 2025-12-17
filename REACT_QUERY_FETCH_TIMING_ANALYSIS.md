# React Query + AsyncStorage キャッシュ実装 - Fetchタイミング調査

## 調査結果サマリー

現在の実装では、**基本的にAsyncStorageのキャッシュを参照**しており、以下のタイミングでのみfetchが実行されます。

---

## 1. Fetchが実行されるタイミング

### A. 初回マウント時（キャッシュがない場合）

**条件**: キャッシュが存在しない、または`gcTime`（30分）を超えてガベージコレクションされた場合

**実行タイミング**:
- アプリ初回起動時
- キャッシュがクリアされた後
- `gcTime`（30分）経過後、初回マウント時

**設定**: `refetchOnMount: false` により、キャッシュがあれば再取得しない

---

### B. staleTime経過後の自動再取得

**条件**: `staleTime`経過後、かつコンポーネントがマウントされている時

**各データのstaleTime**:
- **プロフィール一覧**: 5分
- **チャット一覧**: 2分
- **未読数**: 1分
- **プロジェクト一覧**: 5分
- **マイプロジェクト / 参加中**: 2分
- **受信いいね**: 2分
- **プロジェクト応募一覧**: 2分
- **マッチ一覧**: 2分

**注意**: `refetchOnMount: false`により、キャッシュがあれば`staleTime`経過後でも自動再取得は**実行されない**

**実際の動作**:
- キャッシュが`stale`（古い）状態でも、マウント時には再取得しない
- バックグラウンドで自動再取得は**実行されない**

---

### C. ネットワーク再接続時

**条件**: ネットワークが切断→接続に戻った時

**設定**: `refetchOnReconnect: true`

**実行タイミング**:
- オフライン→オンライン復帰時
- すべての`stale`なクエリが自動的に再取得される

---

### D. 手動refetch

**実行箇所**:
1. **App.tsx** - `onRefresh`時:
   ```typescript
   await Promise.all([
     profilesQuery.refetch(),
     unreadCountQuery.refetch(),
     matchesQuery.refetch(),
   ]);
   ```

2. **TalkPage.tsx** - `onRefresh`時:
   ```typescript
   await chatRoomsQuery.refetch();
   ```

3. **UserProjectPage.tsx** - `onRefresh`時:
   ```typescript
   await projectsQuery.refetch();
   ```

---

### E. invalidateQueries実行時（最重要）

**実行タイミング**: Realtimeイベントやユーザー操作時に`invalidateQueries`が呼ばれた時

**実装箇所**:

#### App.tsx
- **messagesテーブル変更時**:
  - `INSERT` / `UPDATE` → `unreadCount`をinvalidate
- **likesテーブル変更時**:
  - `INSERT` / `UPDATE` / `DELETE` → `matches`と`receivedLikes`をinvalidate
- **project_applicationsテーブル変更時**:
  - `INSERT` / `UPDATE` → `projectApplications`（recruiting/applied）と`myProjects`をinvalidate
- **いいね送信時**:
  - `likes`テーブルに`INSERT`後 → `matches`をinvalidate
- **いいね取り消し時**:
  - `likes`テーブルから`DELETE`後 → `matches`をinvalidate
- **ブロック時**:
  - プロフィール削除後 → `matches`をinvalidate

#### TalkPage.tsx
- **messagesテーブル変更時**:
  - `INSERT` / `UPDATE` → `chatRooms`をinvalidate
- **likesテーブル変更時**:
  - `INSERT` / `DELETE` → `chatRooms`をinvalidate

#### UserProjectPage.tsx
- **projectsテーブル変更時**:
  - `INSERT` / `UPDATE` / `DELETE` → `projects`をinvalidate
- **プロジェクト作成時**:
  - `onCreated`コールバック → `projects`をinvalidate
- **プロジェクト更新時**:
  - `onProjectUpdated`コールバック → `projects`をinvalidate

#### MyPage.tsx
- **projectsテーブル変更時**（owner_idフィルタ）:
  - `*` → `myProjects`をinvalidate
- **project_applicationsテーブル変更時**:
  - `*` → `myProjects`と`participatingProjects`をinvalidate
- **プロジェクト更新時**:
  - `onProjectUpdated`コールバック → `myProjects`をinvalidate

#### LikesPage.tsx
- **likesテーブル変更時**（receiver_idフィルタ）:
  - `*` → `receivedLikes`をinvalidate
- **project_applicationsテーブル変更時**:
  - `*` → `projectApplications`（recruiting/applied）をinvalidate
- **いいね既読時**:
  - `markInterestAsRead` / `markMatchAsRead` → `receivedLikes`をinvalidate
- **応募既読時**:
  - `markRecruitingAsRead` → `projectApplications.recruiting`をinvalidate
- **応募ステータス更新時**:
  - `updateApplicantStatus` → `projectApplications`（recruiting/applied）、`myProjects`、`participatingProjects`をinvalidate

---

## 2. 情報更新が確実に受け取れる仕組み

### ✅ 実装済みの更新検知

#### A. Realtime購読による自動検知

**実装状況**: ✅ すべての主要データ取得に対してRealtime購読を実装

1. **messagesテーブル**:
   - App.tsx: 未読数更新検知
   - TalkPage.tsx: チャット一覧更新検知

2. **likesテーブル**:
   - App.tsx: マッチ・受信いいね更新検知
   - TalkPage.tsx: チャット一覧更新検知（マッチング検知）
   - LikesPage.tsx: 受信いいね更新検知

3. **projectsテーブル**:
   - UserProjectPage.tsx: プロジェクト一覧更新検知
   - MyPage.tsx: マイプロジェクト更新検知（owner_idフィルタ）

4. **project_applicationsテーブル**:
   - App.tsx: 応募一覧・マイプロジェクト更新検知
   - MyPage.tsx: マイプロジェクト・参加中プロジェクト更新検知
   - LikesPage.tsx: 応募一覧更新検知

**動作**: Realtimeイベント発火 → `invalidateQueries` → React Queryが自動的に再取得 → UI更新

---

#### B. ユーザー操作による更新検知

**実装状況**: ✅ すべての書き込み操作後に`invalidateQueries`を実行

1. **いいね送信**:
   - `likes`テーブルに`INSERT` → `matches`をinvalidate

2. **いいね取り消し**:
   - `likes`テーブルから`DELETE` → `matches`をinvalidate

3. **プロジェクト作成**:
   - `projects`テーブルに`INSERT` → `projects`をinvalidate

4. **プロジェクト更新**:
   - `projects`テーブルを`UPDATE` → `projects` / `myProjects`をinvalidate

5. **応募ステータス更新**:
   - `project_applications`テーブルを`UPDATE` → 関連するすべてのqueryKeyをinvalidate

6. **既読マーク**:
   - `likes` / `project_applications`テーブルを`UPDATE` → 該当queryKeyをinvalidate

---

### ⚠️ 潜在的な問題点

#### 1. staleTime経過後の自動再取得が実行されない

**問題**:
- `refetchOnMount: false`により、`staleTime`経過後でもマウント時には再取得しない
- バックグラウンドでの自動再取得も設定されていない

**影響**:
- ユーザーが長時間アプリを開き続けた場合、`staleTime`（1-5分）経過後も古いデータが表示され続ける可能性
- Realtimeイベントが届かない場合（ネットワーク切断、Supabase Realtimeの不具合等）、更新が反映されない

**現在の対策**:
- ✅ Realtime購読により、データ変更時は即座に検知
- ✅ `refetchOnReconnect: true`により、ネットワーク復帰時に再取得

**改善案（未実装）**:
- `refetchInterval`を設定して定期的に再取得（ただし、ポーリング禁止の方針に反する）
- `refetchIntervalInBackground: true`を設定（ただし、バッテリー消費が増える）

---

#### 2. 他のユーザーによる変更の検知

**現在の実装**:
- ✅ Realtime購読により、他のユーザーによる変更も検知可能
- ✅ フィルタリングにより、自分に関連する変更のみを購読

**例**:
- `likes`テーブル: `receiver_id=eq.${session.user.id}` フィルタ
- `projects`テーブル: `owner_id=eq.${profile.id}` フィルタ（MyPage.tsx）

**問題なし**: ✅ 適切に実装されている

---

#### 3. オフライン時の挙動

**現在の実装**:
- ✅ AsyncStorageキャッシュにより、オフライン時もキャッシュを表示可能
- ✅ `refetchOnReconnect: true`により、オンライン復帰時に自動再取得

**動作**:
1. オフライン時: キャッシュを表示（最新でない可能性あり）
2. オンライン復帰時: すべての`stale`なクエリが自動再取得される

**問題なし**: ✅ 適切に実装されている

---

## 3. まとめ

### Fetchが実行されるタイミング

1. ✅ **初回マウント時**（キャッシュがない場合）
2. ✅ **ネットワーク再接続時**（`refetchOnReconnect: true`）
3. ✅ **手動refetch時**（`onRefresh`等）
4. ✅ **invalidateQueries実行時**（Realtimeイベント、ユーザー操作後）

### 情報更新が確実に受け取れる仕組み

✅ **実装済み**:
- Realtime購読により、データ変更時は即座に検知
- すべての書き込み操作後に`invalidateQueries`を実行
- ネットワーク復帰時に自動再取得

⚠️ **注意点**:
- `staleTime`経過後でも、マウント時には自動再取得されない（`refetchOnMount: false`のため）
- Realtimeイベントが届かない場合、更新が反映されない可能性がある
- ただし、`refetchOnReconnect: true`により、ネットワーク復帰時には自動再取得される

### 結論

**基本的にAsyncStorageキャッシュを参照**しており、以下の場合にのみfetchが実行されます：

1. **初回マウント時**（キャッシュがない場合）
2. **ネットワーク再接続時**（自動）
3. **手動refetch時**（ユーザー操作）
4. **invalidateQueries実行時**（Realtimeイベント、ユーザー操作後）

**情報更新の検知**:
- ✅ Realtime購読により、データ変更時は即座に検知
- ✅ すべての書き込み操作後に`invalidateQueries`を実行
- ✅ ネットワーク復帰時に自動再取得

**潜在的な問題**:
- `staleTime`経過後でも、マウント時には自動再取得されない（ただし、Realtime購読により実質的に問題なし）
