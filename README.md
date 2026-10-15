# TaskManagement

Trello風のカンバン方式タスク管理アプリです。

## 概要
タスクを「カード」にして、「ToDo」「作業中」「完了」の列に並べ、
進み具合に合わせて動かせるアプリです。利用者は1人で、自分のPCの中だけで動かします（インターネットには公開しません）。

## このリポジトリについて
AIエンジニア養成コースの初級課題として、開発するリポジトリです。
フリーランスの「Aさん」（架空の人物）を顧客として想定し、ヒアリングを模擬しながら、要件定義から開発までを進めています。

## 技術
| 部分 | 技術 |
|---|---|
| 画面（`frontend/`） | React 19、TypeScript、Vite、Tailwind CSS（ドラッグ＆ドロップは dnd-kit を使う予定） |
| サーバー（`backend/`） | Java 25、Spring Boot 4.1、Gradle |
| データベース | PostgreSQL 18（Docker で起動） |
| テスト | 画面：Vitest ／ サーバー：JUnit、Testcontainers |

バージョンの決定と理由は、[技術スタック](docs/tech-stack.md) を参照してください。

## フォルダの構成
| フォルダ | 内容 |
|---|---|
| [docs/](docs/) | 要件定義（入口は [requirements.md](docs/requirements.md)） |
| [backend/](backend/) | 本番のサーバー（API） |
| [frontend/](frontend/) | 本番の画面 |
| [prototype/](prototype/) | 要件を動かして確認するための、使い捨ての試作。`prototype/index.html` をChromeで開くと動かせる |
| [notes/](notes/) | 学習ノート（入口は [notes/README.md](notes/README.md)） |

## 動かし方
必要なもの：Docker Desktop、JDK 25、Node.js 24（LTS）、Chrome。

1. リポジトリ直下の `.env.example` を、`.env` という名前でコピーして、パスワードを書き換える（`.env` はコミットされません）
2. DBを起動する：リポジトリ直下で `docker compose up -d`
3. バックエンドを起動する：`backend/` で `.\gradlew.bat bootRun`
4. 画面を起動する：`frontend/` で `npm install`（初回のみ）→ `npm run dev`
5. ブラウザで <http://localhost:5173> を開く

使うポートは、画面 5173、バックエンド 8080、DB 5432 に固定しています（画面からバックエンドへの中継の設定が、この番号を前提にしているため）。
動作確認用のサンプルデータは、[backend/README.md](backend/README.md) の手順で投入できます。詳しい使い方は、[backend/README.md](backend/README.md) と [frontend/README.md](frontend/README.md) を参照してください。

## 開発の状況
| 状況 | 内容 |
|---|---|
| できている | 要件定義、プロトタイプ。バックエンドのAPI（列の一覧、カードの追加・一覧・1件取得・絞り込み検索）。画面でのボード表示（3列、カードの色・期限、キーワード・期限日での検索） |
| これから | カードの追加・更新・削除の画面、ドラッグ＆ドロップ、「期限順」ボタン、バックアップ、背景 |

機能の一覧は、[機能一覧](docs/functional-requirements.md) を参照してください。

## 開発の進め方
Claude Code と一緒に、次の流れで進めています。ルールの詳細は [CLAUDE.md](CLAUDE.md) にあります。

1. Issue を作る（何をするかを、先に書く）
2. Issue と同じ番号のブランチを作って、作業する
3. Pull Request を作って、確認してから `main` に入れる

`main` には、直接コミットできません。

## 画像について
背景の標準画像（`prototype/backgrounds/`）は、画像生成AIで作成したものです。出どころは、[CREDITS.md](prototype/backgrounds/CREDITS.md) を参照してください。

## 学習・開発環境
- Cursor
- Claude Code
- Git / GitHub
