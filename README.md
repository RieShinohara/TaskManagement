# TaskManagement

Trello風のカンバン方式タスク管理アプリです。

## 概要
タスクを「カード」にして、「ToDo」「作業中」「完了」の列に並べ、
進み具合に合わせて動かせるアプリです。利用者は1人で、自分のPCの中だけで動かします（インターネットには公開しません）。

## できること
| 機能 | 内容 |
|---|---|
| カードの追加 | 列の「＋」から、タイトルを入力して追加する。新しいカードは、列の一番上に入る |
| カードの編集 | カードを押すと開くモーダルで、タイトル・説明文・色（6色）・期限日（自作のカレンダー）を変える |
| カードの削除 | モーダルの「削除」。確認メッセージが出る |
| 移動・並び替え | ドラッグ＆ドロップで、別の列へも、同じ列の中でも動かせる（キーボードでも可）。位置は保存される |
| 期限順 | 各列の「期限順」ボタンで、期限の早い順に並び直す（期限なしは末尾） |
| 検索 | キーワード、期限日（この日まで）で絞り込む |
| 背景 | 無地・青空・夕焼け・星空・自動（時間帯）から選ぶ。青空・夕焼け・星空には、自分の画像も登録できる |
| バックアップ | 全データをファイルに保存し、読み込んで元に戻す（背景の設定を含む。自分の画像は含まない） |

機能の詳しい仕様は、[機能一覧](docs/functional-requirements.md) と [ユースケース](docs/use-cases.md) を参照してください。

## このリポジトリについて
AIエンジニア養成コースの初級課題として、開発するリポジトリです。
フリーランスの「Aさん」（架空の人物）を顧客として想定し、ヒアリングを模擬しながら、要件定義から開発までを進めました。

## 技術
| 部分 | 技術 |
|---|---|
| 画面（`frontend/`） | React 19、TypeScript、Vite、Tailwind CSS、ドラッグ＆ドロップは dnd-kit |
| サーバー（`backend/`） | Java 25、Spring Boot 4.1、Gradle |
| データベース | PostgreSQL 18（Docker で起動） |
| テスト | 画面：Vitest ／ サーバー：JUnit、Testcontainers |

バージョンの決定と理由は、[技術スタック](docs/tech-stack.md) を参照してください。

## フォルダの構成
| フォルダ | 内容 |
|---|---|
| [docs/](docs/) | 要件定義（入口は [requirements.md](docs/requirements.md)）と、[品質チェックの記録](docs/quality-review.md) |
| [backend/](backend/) | 本番のサーバー（API）。使い方は [backend/README.md](backend/README.md) |
| [frontend/](frontend/) | 本番の画面。使い方は [frontend/README.md](frontend/README.md) |
| [prototype/](prototype/) | 要件を動かして確認するための、使い捨ての試作。`prototype/index.html` をChromeで開くと動かせる |
| [notes/](notes/) | 学習ノート（入口は [notes/README.md](notes/README.md)） |

## 動かし方
必要なもの：Docker Desktop、JDK 25、Node.js 24（LTS）、Chrome。

1. リポジトリ直下の `.env.example` を、`.env` という名前でコピーして、パスワードを書き換える（`.env` はコミットされません）
2. DBを起動する：リポジトリ直下で `docker compose up -d`
3. バックエンドを起動する：`backend/` で `.\gradlew.bat bootRun`
4. 画面を起動する：`frontend/` で `npm install`（初回のみ）→ `npm run dev`
5. ブラウザで <http://localhost:5173> を開く
6. 終わるときは、バックエンドと画面を `Ctrl + C` で止め、リポジトリ直下で `docker compose down`（データは残ります）

使うポートは、画面 5173、バックエンド 8080、DB 5432 に固定しています（画面からバックエンドへの中継の設定が、この番号を前提にしているため）。
動作確認用のサンプルデータは、[backend/README.md](backend/README.md) の手順で投入できます。

### テストの実行
| 対象 | コマンド | 場所 |
|---|---|---|
| サーバー（テスト） | `.\gradlew.bat test`（Docker Desktop の起動が必要） | `backend/` |
| サーバー（テスト＋静的チェック） | `.\gradlew.bat check`（テスト、Checkstyle、SpotBugs、カバレッジの計測） | `backend/` |
| 画面 | `npm test` | `frontend/` |
| 画面の静的チェック／ビルド | `npm run lint` ／ `npm run format:check`（整形の確認。直すときは `npm run format`） ／ `npm run build` | `frontend/` |

**CI（自動チェック）**：PR を作ると（と、main に入ったあとにも）、GitHub が、上のテストと静的チェックを自動で走らせる（`.github/workflows/ci.yml`）。PR の画面に ✓（成功）か ✗（失敗）が出る。✗ のときは、「Details」から原因が見られる（サーバー側は、失敗したときのレポートも、7日間残る）。手元で確認する手間は、減らない（見た目の確認など、CI にできないことがある）が、確認の抜けに気づける。

## 開発の状況
計画した機能は、すべてできています（追加・編集・削除、移動、期限順、検索、バックアップ、背景）。

将来追加する機能の候補（まだ決まっていません）：自分の画像に重ねる暗幕の濃さの調整、カードのコピー、「確認待ち」列、スマホ対応、完了列のカードの整理（アーカイブなど）。
作らないもの（複数のボード、ログイン、自動バックアップ、背景画像のスライドショーなど）は、[機能一覧](docs/functional-requirements.md) の「対象外」を参照してください。

## 開発の進め方
Claude Code と一緒に、次の流れで進めています。ルールの詳細は [CLAUDE.md](CLAUDE.md) にあります。

1. Issue を作る（何をするかを、先に書く）
2. Issue と同じ番号のブランチを作って、作業する
3. Pull Request を作って、確認してから `main` に入れる

`main` には、直接コミットできません。作りながら学んだことは、[学習ノート](notes/README.md) に残しています。

## 個人のデータについて
このリポジトリは公開されています。次のものは、コミットしません。

- `.env`（DBのパスワード）
- バックアップのファイル（`taskboard-backup-*.json`。個人の予定が入るため。`.gitignore` で除外しています）
- 自分で登録した背景画像（アプリのデータベースに保存され、リポジトリには入りません）

## 画像について
背景の標準画像（青空・夕焼け・星空）は、画像生成AIで作成したものです。
アプリが使うのは [frontend/public/backgrounds/](frontend/public/backgrounds/)（出どころは [CREDITS.md](frontend/public/backgrounds/CREDITS.md)）で、試作用の同じ画像が [prototype/backgrounds/](prototype/backgrounds/)（[CREDITS.md](prototype/backgrounds/CREDITS.md)）にもあります。

## 学習・開発環境
- Cursor
- Claude Code
- Git / GitHub
