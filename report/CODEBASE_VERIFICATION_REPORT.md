# コードベース / SQL / Supabase設定 確認結果

## 1. データベースインデックス

### 結論: **未確認**

**根拠**:
- `sql/add_performance_indexes.sql` に31個のインデックス定義が存在（L1-359）
- インデックス定義は以下のテーブルに存在:
  - profiles (3個)
  - likes (5個)
  - messages (6個)
  - projects (4個)
  - project_applications (5個)
  - notifications (3個)
  - chat_rooms (2個)
  - chat_room_read_status (1個)
  - push_tokens (1個)
  - blocks (1個)
  - reports (2個)
- Supabase本番DBへの適用状況は確認不可（DBへの直接アクセス不可）

---

## 2. Row Level Security (RLS)

### 2.1 profiles テーブル

**結論: 未確認**

**根拠**:
- `sql/` ディレクトリ内で `profiles` テーブルの RLS 有効化文（`ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY`）が見つからない
- `sql/setup_likes.sql` では `profiles(id)` を参照しているが、RLS設定は見当たらない

---

### 2.2 projects テーブル

**結論: 事実**

**根拠**:
- `sql/setup_projects.sql` L13: `alter table public.projects enable row level security;`
- ポリシー定義:
  - SELECT: L16-18 `"Projects are viewable by everyone"` (全員閲覧可能)
  - INSERT: L20-22 `"Users can insert their own projects"` (owner_id = auth.uid())
  - UPDATE: L24-26 `"Users can update their own projects"` (owner_id = auth.uid())
  - DELETE: L28-30 `"Users can delete their own projects"` (owner_id = auth.uid())

---

### 2.3 project_applications テーブル

**結論: 事実**

**根拠**:
- `sql/update_projects_schema.sql` L15: `alter table public.project_applications enable row level security;`
- ポリシー定義:
  - SELECT: L18-20 `"Applications are viewable by everyone"` (全員閲覧可能)
  - INSERT: L22-24 `"Users can create applications"` (user_id = auth.uid())
  - UPDATE: L26-32 `"Project owners can update applications"` (project.owner_id = auth.uid())
  - DELETE: L34-36 `"Users can delete their own applications"` (user_id = auth.uid())

---

### 2.4 messages テーブル

**結論: 事実**

**根拠**:
- `sql/setup_messages.sql` L14: `alter table public.messages enable row level security;`
- ポリシー定義:
  - SELECT: L17-21 `"Users can view their own messages"` (sender_id = auth.uid() OR receiver_id = auth.uid())
  - INSERT: L24-28 `"Users can insert their own messages"` (sender_id = auth.uid())
  - UPDATE: 未定義（SQLファイル内に存在しない）
  - DELETE: 未定義（SQLファイル内に存在しない）
- 補足: `sql/setup_team_chat.sql` L49-72 でグループチャット用の追加SELECTポリシーが定義されている

---

### 2.5 chat_rooms テーブル

**結論: 事実**

**根拠**:
- `sql/setup_team_chat.sql` L11: `alter table public.chat_rooms enable row level security;`
- ポリシー定義:
  - SELECT: L15-30 `"Users can view their project chat rooms"` (プロジェクトオーナーまたは承認済みメンバー)
  - INSERT: L33-41 `"Project owners can create chat rooms"` (project.owner_id = auth.uid())
  - UPDATE: 未定義（SQLファイル内に存在しない）
  - DELETE: 未定義（SQLファイル内に存在しない）

---

## 3. ローカルキャッシュ（React Query + AsyncStorage）

### 3.1 プロジェクト一覧

**結論: 事実（React Query適用済み）**

**根拠**:
- `components/UserProjectPage.tsx` L223: `useProjectsList(sortOrder)` を使用
- `data/hooks/useProjectsList.ts` で定義
- 直接 `supabase.from(...)` 呼び出しなし（`UserProjectPage.tsx` で確認）

---

### 3.2 マイプロジェクト

**結論: 事実（React Query適用済み）**

**根拠**:
- `components/MyPage.tsx` L229: `useMyProjects(profile.id)` を使用
- `data/hooks/useMyProjects.ts` で定義
- 直接 `supabase.from(...)` 呼び出しなし（`MyPage.tsx` で確認）

---

### 3.3 いいね / マッチ

**結論: 事実（React Query適用済み）**

**根拠**:
- `components/LikesPage.tsx` L55: `useReceivedLikes(session?.user?.id)` を使用
- `App.tsx` L137: `useMatches(session?.user?.id)` を使用
- `data/hooks/useReceivedLikes.ts`, `data/hooks/useMatches.ts` で定義
- 直接 `supabase.from(...)` 呼び出しなし（`LikesPage.tsx`, `App.tsx` で確認）

---

### 3.4 応募管理

**結論: 事実（React Query適用済み）**

**根拠**:
- `components/LikesPage.tsx` L56: `useProjectApplications(session?.user?.id)` を使用
- `data/hooks/useProjectApplications.ts` で定義
- 直接 `supabase.from(...)` 呼び出しなし（`LikesPage.tsx` で確認）

---

### 3.5 通知一覧

**結論: 不事実（React Query未適用）**

**根拠**:
- `components/NotificationsPage.tsx` L58-99: `fetchNotifications` 関数内で直接 `supabase.from('notifications')` を呼び出し（L62-73）
- React Query hook が存在しない（`data/hooks/` 内に `useNotifications.ts` なし）
- `queryKeys.ts` に通知関連のキーが定義されていない

---

## 4. エラーハンドリング

### 4.1 共通関数の存在

**結論: 事実**

**根拠**:
- `utils/errorHandling.ts` に以下が定義:
  - `checkNetworkConnection()` (L9-12)
  - `fetchWithRetry()` (L15-41)
  - `handleError()` (L44-59)

---

### 4.2 共通関数の使用状況

**結論: 不事実（共通関数が使用されていない）**

**根拠**:
- `grep` 結果: `handleError`, `fetchWithRetry`, `errorHandling` が使用されているファイルは4件のみ:
  - `utils/errorHandling.ts` (定義ファイル)
  - `IMPROVEMENT_REPORT.md` (ドキュメント)
  - `APP_STORE_CHECKLIST.md` (ドキュメント)
  - `src/components/figma/ImageWithFallback.tsx` (1箇所のみ)
- 主要コンポーネント（`App.tsx`, `LikesPage.tsx`, `MyPage.tsx`, `UserProjectPage.tsx`, `NotificationsPage.tsx` など）では使用されていない

---

### 4.3 try-catch の散在状況

**結論: 事実（try-catchが散在している）**

**根拠**:
- `grep` 結果: `try`, `catch` が136箇所で使用されている（20ファイル）
- 主要ファイルでの使用例:
  - `components/MyPage.tsx`: 8箇所
  - `components/LikesPage.tsx`: 10箇所
  - `components/ChatRoom.tsx`: 12箇所
  - `components/NotificationsPage.tsx`: 4箇所
  - `components/SignupFlow.tsx`: 130箇所
  - `App.tsx`: 30箇所

---

### 4.4 ユーザー向けエラーメッセージ表示

**結論: 事実（Alert.alertで表示されている）**

**根拠**:
- `grep` 結果: `Alert.alert` でエラーメッセージを表示している箇所が53箇所（16ファイル）
- 主要ファイルでの使用例:
  - `components/SignupFlow.tsx`: 12箇所
  - `components/SettingsPage.tsx`: 6箇所
  - `components/ChatRoom.tsx`: 6箇所
  - `components/ProjectDetail.tsx`: 5箇所
  - `components/ProfileDetail.tsx`: 5箇所
  - `components/LoginScreen.tsx`: 4箇所
  - `components/NotificationsPage.tsx`: 1箇所（L95: `Alert.alert('エラー', 'お知らせの取得に失敗しました')`）

---

## まとめ

| 項目 | 結論 | 備考 |
|------|------|------|
| 1. データベースインデックス | 未確認 | SQLファイルに定義は存在するが、本番DB適用状況は確認不可 |
| 2.1 profiles RLS | 未確認 | SQLファイル内にRLS設定が見つからない |
| 2.2 projects RLS | 事実 | RLS有効、SELECT/INSERT/UPDATE/DELETEポリシーあり |
| 2.3 project_applications RLS | 事実 | RLS有効、SELECT/INSERT/UPDATE/DELETEポリシーあり |
| 2.4 messages RLS | 事実 | RLS有効、SELECT/INSERTポリシーあり（UPDATE/DELETEは未定義） |
| 2.5 chat_rooms RLS | 事実 | RLS有効、SELECT/INSERTポリシーあり（UPDATE/DELETEは未定義） |
| 3.1 プロジェクト一覧 | 事実 | React Query適用済み |
| 3.2 マイプロジェクト | 事実 | React Query適用済み |
| 3.3 いいね/マッチ | 事実 | React Query適用済み |
| 3.4 応募管理 | 事実 | React Query適用済み |
| 3.5 通知一覧 | 不事実 | React Query未適用、直接supabase.from呼び出し |
| 4.1 共通関数の存在 | 事実 | `utils/errorHandling.ts` に定義あり |
| 4.2 共通関数の使用 | 不事実 | 主要コンポーネントで使用されていない |
| 4.3 try-catch散在 | 事実 | 136箇所で使用（20ファイル） |
| 4.4 エラーメッセージ表示 | 事実 | Alert.alertで53箇所（16ファイル） |
