-- 動作確認用のサンプルデータ（カード10件）を、PostgreSQLに投入する。
-- 先に card テーブルを空にしてから入れるので、何度流しても、同じ状態になる。
-- （列 board_column は、バックエンドの起動時に作られている必要がある）
--
-- 流し込み方（リポジトリ直下で実行）：
--   docker compose cp backend/sql/sample-data.sql db:/tmp/sample-data.sql
--   docker compose exec db psql -U taskmanagement -d taskmanagement -f /tmp/sample-data.sql

BEGIN;

TRUNCATE TABLE card RESTART IDENTITY;

-- 番号（カードのIDが、この順に付く）, title, color, due_date, 列の名前, position（小さいほど上）
INSERT INTO card (title, color, due_date, column_id, position)
SELECT v.title, v.color, v.due_date::date, c.id, v.position
FROM (VALUES
    -- ToDo
    ( 1, '牛乳と卵を買う',             'none',   '2026-10-12', 'ToDo',   0),  -- 期限切れ
    ( 2, '歯医者の予約をする',         'blue',   '2026-10-16', 'ToDo',   1),
    ( 3, '部屋の掃除',                 'none',   NULL,         'ToDo',   2),  -- 期限なし
    ( 4, '年賀状のデザインを考える',   'yellow', '2026-12-01', 'ToDo',   3),
    ( 5, '買い物リストを作る',         'gray',   '2026-10-18', 'ToDo',   4),
    -- 作業中
    ( 6, '請求書を作成する',           'red',    '2026-10-15', '作業中', 0),
    ( 7, 'ブログ記事を書く',           'green',  '2026-10-20', '作業中', 1),
    ( 8, '確定申告の資料を整理する',   'blue',   '2026-10-31', '作業中', 2),
    -- 完了
    ( 9, '銀行で記帳する',             'gray',   '2026-10-10', '完了',   0),
    (10, '本を図書館に返す',           'green',  '2026-10-13', '完了',   1)
) AS v(n, title, color, due_date, column_name, position)
JOIN board_column c ON c.name = v.column_name
ORDER BY v.n;

COMMIT;

-- 確認
SELECT c.id, c.title, c.color, c.due_date, b.name AS column_name, c.position
FROM card c JOIN board_column b ON b.id = c.column_id
ORDER BY c.id;
