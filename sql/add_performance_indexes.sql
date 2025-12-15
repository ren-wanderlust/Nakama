-- =====================================================
-- パフォーマンス向上のためのインデックス追加
-- =====================================================
-- 
-- このファイルは、アプリケーションの頻繁なクエリパターンを分析し、
-- パフォーマンス向上のために必要なインデックスを定義します。
--
-- 実行方法: Supabase Dashboard > SQL Editor でこのファイルを実行
-- =====================================================

-- =====================================================
-- 1. PROFILES テーブルのインデックス
-- =====================================================

-- プロフィール一覧の取得で使用（created_at降順ソート）
-- 使用箇所: App.tsx:L183 - .order('created_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_profiles_created_at 
ON profiles(created_at DESC);
-- 理由: プロフィール一覧をページネーションで取得する際、
--      created_at降順でソートするため。インデックスがないと
--      全件スキャン後にソートが発生し、ユーザー数増加で劣化。

-- 大学名での絞り込み検索
-- 使用箇所: FilterModal.tsx - 大学での絞り込み
CREATE INDEX IF NOT EXISTS idx_profiles_university 
ON profiles(university);
-- 理由: 同じ大学のユーザーを検索する際に使用。
--      WHERE university = 'xxx' のクエリを高速化。

-- 学年での絞り込み検索
-- 使用箇所: FilterModal.tsx - 学年での絞り込み
CREATE INDEX IF NOT EXISTS idx_profiles_grade 
ON profiles(grade);
-- 理由: 学年フィルターでの検索を高速化。
--      特定の学年のユーザーを効率的に抽出。


-- =====================================================
-- 2. LIKES テーブルのインデックス
-- =====================================================

-- いいね送信者で検索（自分が送ったいいね一覧）
-- 使用箇所: App.tsx:L240-L243, TalkPage.tsx:L100
CREATE INDEX IF NOT EXISTS idx_likes_sender_id 
ON likes(sender_id);
-- 理由: 自分が送ったいいねを取得する際に使用。
--      マッチング判定で頻繁にアクセスされる。

-- いいね受信者で検索（自分が受け取ったいいね一覧）
-- 使用箇所: App.tsx:L245-L248, LikesPage.tsx:L95-L98
CREATE INDEX IF NOT EXISTS idx_likes_receiver_id 
ON likes(receiver_id);
-- 理由: 自分宛のいいねを取得する際に使用。
--      LikesPageで頻繁にアクセスされる。

-- マッチング判定用の複合インデックス
-- 使用箇所: マッチング検知のクエリ全般
CREATE INDEX IF NOT EXISTS idx_likes_match_lookup 
ON likes(sender_id, receiver_id);
-- 理由: 相互いいね（マッチング）の判定を高速化。
--      2つのカラムでの検索が頻繁に発生するため、
--      複合インデックスで大幅な高速化が期待できる。

-- 未読いいねの取得用（既読フラグでの絞り込み）
-- 使用箇所: App.tsx:L504-L523
CREATE INDEX IF NOT EXISTS idx_likes_receiver_unread 
ON likes(receiver_id, is_read) 
WHERE is_read = false;
-- 理由: 未読の「興味あり」を効率的に取得。
--      部分インデックス（WHERE句付き）により、
--      未読のレコードのみインデックス化し、容量を節約。

-- 未読マッチングの取得用
CREATE INDEX IF NOT EXISTS idx_likes_receiver_unread_match 
ON likes(receiver_id, is_read_as_match) 
WHERE is_read_as_match = false;
-- 理由: 未読の「マッチング」を効率的に取得。
--      バッジカウントの計算を高速化。


-- =====================================================
-- 3. MESSAGES テーブルのインデックス
-- =====================================================

-- 送信者IDでの検索（DM履歴取得）
-- 使用箇所: TalkPage.tsx:L108-L112
CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
ON messages(sender_id);
-- 理由: 特定ユーザーから送信されたメッセージを取得。
--      チャット履歴の表示で使用。

-- 受信者IDでの検索（自分宛のメッセージ）
-- 使用箇所: App.tsx:L395-L400, TalkPage.tsx:L151-L155
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id 
ON messages(receiver_id);
-- 理由: 自分宛のメッセージを取得する際に使用。
--      未読メッセージ数のカウントで頻繁にアクセス。

-- チャットルームIDでの検索（グループチャット）
-- 使用箇所: ChatRoom.tsx:L286, TalkPage.tsx:L219-L223
CREATE INDEX IF NOT EXISTS idx_messages_chat_room_id 
ON messages(chat_room_id);
-- 理由: グループチャットのメッセージ履歴を取得。
--      チャットルーム別のメッセージ表示で必須。

-- 時系列ソート用インデックス（降順）
-- 使用箇所: ChatRoom.tsx, TalkPage.tsx - order by created_at
CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON messages(created_at DESC);
-- 理由: メッセージを新しい順に表示する際に使用。
--      ソート処理を高速化。

-- 未読メッセージの取得用（複合インデックス）
-- 使用箇所: App.tsx:L395-L400
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread 
ON messages(receiver_id, is_read, chat_room_id) 
WHERE is_read = false OR is_read IS NULL;
-- 理由: 未読DMのカウント専用の最適化インデックス。
--      receiver_id, is_read, chat_room_idの3つを組み合わせて
--      未読DM（chat_room_id IS NULL）を高速取得。

-- グループチャットの未読メッセージ取得用
-- 使用箇所: App.tsx:L440-L445
CREATE INDEX IF NOT EXISTS idx_messages_room_time 
ON messages(chat_room_id, created_at DESC) 
WHERE chat_room_id IS NOT NULL;
-- 理由: グループチャットの未読メッセージを
--      最終既読時刻以降で絞り込む際に使用。
--      created_at > last_read_at のクエリを高速化。


-- =====================================================
-- 4. PROJECTS テーブルのインデックス
-- =====================================================

-- プロジェクトオーナーでの検索（マイプロジェクト）
-- 使用箇所: App.tsx:L349-L352, LikesPage.tsx:L174-L177
CREATE INDEX IF NOT EXISTS idx_projects_owner_id 
ON projects(owner_id);
-- 理由: 自分が作成したプロジェクト一覧を取得。
--      マイページやプロジェクト管理で頻繁に使用。

-- プロジェクト作成日時でのソート
-- 使用箇所: UserProjectPage.tsx - 新着順ソート
CREATE INDEX IF NOT EXISTS idx_projects_created_at 
ON projects(created_at DESC);
-- 理由: プロジェクト一覧を新着順で表示する際に使用。
--      ソート処理を高速化。

-- 締切日時でのソート
-- 使用箇所: UserProjectPage.tsx - 締切順ソート
CREATE INDEX IF NOT EXISTS idx_projects_deadline 
ON projects(deadline ASC) 
WHERE deadline IS NOT NULL;
-- 理由: 締切が近い順にソートする際に使用。
--      締切がないプロジェクトは除外（部分インデックス）。

-- プロジェクトステータスでの検索
-- 使用箇所: 募集中/終了プロジェクトの絞り込み
CREATE INDEX IF NOT EXISTS idx_projects_status 
ON projects(status);
-- 理由: 募集中のプロジェクトのみ表示する際に使用。
--      ステータスでのフィルタリングを高速化。


-- =====================================================
-- 5. PROJECT_APPLICATIONS テーブルのインデックス
-- =====================================================

-- 応募者IDでの検索（自分の応募一覧）
-- 使用箇所: LikesPage.tsx:L239-L266
CREATE INDEX IF NOT EXISTS idx_project_applications_user_id 
ON project_applications(user_id);
-- 理由: 自分が応募したプロジェクト一覧を取得。
--      「応募」タブでの表示で使用。

-- プロジェクトIDでの検索（応募者一覧）
-- 使用箇所: ProjectDetail.tsx:L93, LikesPage.tsx:L182-L193
CREATE INDEX IF NOT EXISTS idx_project_applications_project_id 
ON project_applications(project_id);
-- 理由: 特定プロジェクトへの応募者一覧を取得。
--      プロジェクト詳細画面で応募者を表示する際に使用。

-- 応募ステータスでの検索
-- 使用箇所: App.tsx:L362-L366
CREATE INDEX IF NOT EXISTS idx_project_applications_status 
ON project_applications(status);
-- 理由: 保留中/承認済みの応募を絞り込む際に使用。
--      応募管理で頻繁にアクセス。

-- 未読応募の取得用（複合インデックス）
-- 使用箇所: App.tsx:L535-L541
CREATE INDEX IF NOT EXISTS idx_project_applications_project_unread 
ON project_applications(project_id, is_read) 
WHERE is_read = false;
-- 理由: プロジェクトごとの未読応募数をカウント。
--      バッジ表示で使用。部分インデックスで容量節約。

-- 承認済み応募の取得用（グループチャット作成）
-- 使用箇所: App.tsx:L409-L413, ProjectDetail.tsx:L264
CREATE INDEX IF NOT EXISTS idx_project_applications_user_approved 
ON project_applications(user_id, status) 
WHERE status = 'approved';
-- 理由: 承認済みの応募を取得してグループチャット
--      のメンバー判定に使用。頻繁にアクセスされる。

-- 作成日時でのソート
CREATE INDEX IF NOT EXISTS idx_project_applications_created_at 
ON project_applications(created_at DESC);
-- 理由: 応募を新しい順に表示する際に使用。


-- =====================================================
-- 6. NOTIFICATIONS テーブルのインデックス
-- =====================================================

-- ユーザーIDでの検索（自分宛の通知一覧）
-- 使用箇所: NotificationsPage.tsx:L41, App.tsx:L591-L595
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON notifications(user_id);
-- 理由: 自分宛の通知一覧を取得。
--      通知ページで頻繁にアクセス。

-- 未読通知の取得用（複合インデックス）
-- 使用箇所: App.tsx:L591-L598
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read) 
WHERE is_read = false;
-- 理由: 未読通知数のカウント専用。
--      バッジ表示で使用。部分インデックスで効率化。

-- 作成日時でのソート
-- 使用箇所: NotificationsPage.tsx - 通知一覧表示
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);
-- 理由: 通知を新しい順に表示する際に使用。


-- =====================================================
-- 7. CHAT_ROOMS テーブルのインデックス
-- =====================================================

-- チャットルームタイプでの検索
-- 使用箇所: TalkPage.tsx:L199-L213
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type 
ON chat_rooms(type);
-- 理由: グループチャット一覧を取得する際に使用。
--      type = 'group' での絞り込みを高速化。

-- プロジェクトIDでの検索（プロジェクト別チャット）
-- 使用箇所: ProjectDetail.tsx:L274, App.tsx:L422-L426
CREATE INDEX IF NOT EXISTS idx_chat_rooms_project_id 
ON chat_rooms(project_id);
-- 理由: 特定プロジェクトのグループチャットを検索。
--      既存チャットの確認で使用。


-- =====================================================
-- 8. CHAT_ROOM_READ_STATUS テーブルのインデックス
-- =====================================================

-- ユーザーIDとチャットルームIDの複合インデックス
-- 使用箇所: App.tsx:L431-L436, TalkPage.tsx:L240-L245
CREATE INDEX IF NOT EXISTS idx_chat_room_read_status_user_room 
ON chat_room_read_status(user_id, chat_room_id);
-- 理由: 特定ユーザーの特定チャットルームの既読時刻を取得。
--      グループチャットの未読数計算で頻繁にアクセス。
--      この2つのカラムは常にセットで検索されるため複合インデックスが最適。


-- =====================================================
-- 9. PUSH_TOKENS テーブルのインデックス
-- =====================================================

-- ユーザーIDでの検索（プッシュ通知送信時）
-- 使用箇所: lib/notifications.ts:L187-L190
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id 
ON push_tokens(user_id);
-- 理由: 特定ユーザーのプッシュトークンを取得して通知送信。
--      いいね、マッチング、応募の度にアクセスされる。


-- =====================================================
-- 10. BLOCKS テーブルのインデックス
-- =====================================================

-- ブロックした人での検索
-- 使用箇所: App.tsx:L496-L501
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id 
ON blocks(blocker_id);
-- 理由: 自分がブロックしたユーザー一覧を取得。
--      いいね一覧の表示前にブロック済みユーザーを除外。


-- =====================================================
-- 11. REPORTS テーブルのインデックス
-- =====================================================

-- 通報者での検索（重複通報チェック用）
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id 
ON reports(reporter_id);
-- 理由: 同一ユーザーが重複して通報していないかチェック。

-- 通報対象ユーザーでの検索（管理用）
CREATE INDEX IF NOT EXISTS idx_reports_reported_id 
ON reports(reported_id);
-- 理由: 管理画面で特定ユーザーへの通報件数を確認。


-- =====================================================
-- インデックス作成完了
-- =====================================================

-- 作成されたインデックスの確認
-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- インデックスの使用状況の確認（パフォーマンス分析）
-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan as index_scans,
--     idx_tup_read as tuples_read,
--     idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- =====================================================
-- 注意事項
-- =====================================================
--
-- 1. インデックスはストレージ容量を消費します
--    - 各インデックスは元のテーブルの一部をコピーするため、
--      データ量に応じてストレージが増加します
--
-- 2. INSERTやUPDATEのパフォーマンスに影響します
--    - インデックスが多いとデータ挿入時に全てのインデックスを
--      更新する必要があるため、若干遅くなります
--    - しかし、このアプリは読み取り（SELECT）が圧倒的に多いため、
--      インデックスの恩恵の方が大きいです
--
-- 3. 定期的なメンテナンスが推奨されます
--    - VACUUM ANALYZE を定期実行してインデックスを最適化
--    - Supabaseは自動的に実行しますが、手動実行も可能
--
-- 4. 部分インデックス（WHERE句付き）は特に効果的です
--    - 未読データのみインデックス化することで、
--      容量を節約しながら高速化を実現
--
-- =====================================================
