# 技術スタック

講座で指示された内容（講義の技術スタック表を含む）に従って確定。講義で「各自の推奨でよい」とされた項目（サーバー側のビルドツールなど）と、講義で触れられていない項目は、指示された技術に合わせて選んだ**案**であり、環境構築の時点で最終確認する。

## 1. 決まっている条件
- 動作環境：Windows、Chromeブラウザ
- 利用者のPC内でのみ動作する（インターネットには公開しない）
- データはデータベースに保存する（課題の要件）
- 利用者は1人、カードは通常100枚・最大500枚程度

詳細は [非機能要件](non-functional-requirements.md) を参照。

## 2. 確定（講座の指示）
| 部分 | 技術 | 備考 |
|---|---|---|
| サーバー側（バックエンド） | **Java ＋ Spring Boot** | Javaでの開発を学ぶことが、この課題の目的の一つ |
| 画面（フロントエンド） | **React** | Next.js は今回は対象外 |
| 画面側の言語 | **TypeScript** | 講義の表に記載 |
| 画面側のビルドツール | **Vite** | 講義の表に記載 |
| ドラッグ＆ドロップ | **dnd-kit**（`@dnd-kit/core` 6.3.1、`@dnd-kit/sortable` 10.0.0、`@dnd-kit/utilities` 3.2.2。2026-10-16 導入） | 講義の表に記載。新しい `@dnd-kit/react` は 0.x（開発中）なので、安定版の組み合わせを使う |
| スタイリング（見た目の指定） | **Tailwind CSS** | 講義の表に記載 |
| 画面側のパッケージ管理 | **npm** | 講義の表に記載 |
| データベース | **PostgreSQL** | |
| バージョン管理 | **Git ＋ GitHub** | |
| API形式 | **REST API** | 講義の表に記載 |

### 2.1 Java・Spring Boot を使う理由
講座の説明：学習のため。AIに任せれば何でも作れてしまうが、受講生がJavaとSpring Bootを学習したことを、転職活動で書けるようにするため。
→ 実装は、受講生が理解しながら進める。Claudeは、仕組みの説明と、コードのレビューにも力を入れる。

## 3. 選定した案（確定の指示なし。環境構築の時点で最終確認）
指示された技術に合わせて、次の構成を案とする。

| 項目 | 案 | 理由 |
|---|---|---|
| Javaのバージョン | **Java 25（LTS）**（確定：2026-10-12、講義で「最新バージョンで」と指示） | 現行の最新の長期サポート版 |
| Spring Bootのバージョン | **4.1.1**（確定：2026-10-12） | 現行の最新安定版。Java 25 に対応 |
| ビルド・依存管理（サーバー側） | Gradle 9.8.1（プロジェクトに同梱の Gradle Wrapper で実行） | 講義の表でも推奨として挙げられており、講義の説明をそのまま参考にできる。講義では「各自の推奨でよい」とされている |
| データベースへの接続 | Spring Data JPA ＋ PostgreSQLドライバ | SQLを直接書かずに、Javaのクラスでデータを扱える |
| 入力の検査（サーバー側） | Spring Boot の validation（Bean Validation） | タイトルの長さや色などを、APIの入口で検査する |
| データベースの構造の管理 | **Flyway**（2026-10-21 導入。`spring-boot-starter-flyway`）。`ddl-auto` は `validate`（確かめるだけ） | テーブルの変更を、SQL ファイル（`backend/src/main/resources/db/migration/`）として記録し、番号順に流す。講義と同じ `ddl-auto: update` から切り替えた（履歴が残る、どこでも同じテーブルになる） |
| Node.js | **24 LTS（24.22.1）**（確定：2026-10-15。2026-10-21 のセキュリティリリースを受けて、24.20.0 から更新） | 画面側の開発に必要。Node 26 は 2026-10-28 に LTS 入り予定だが、今は 24 が現役のLTS |
| 画面側のバージョン | **React 19.3.1、TypeScript 7.0.2、Vite 8.3.4、Tailwind CSS 4.3.3、Vitest 5.0.4**（確定：2026-10-15。すべてその時点の最新版） | `npm create vite` のテンプレートは TypeScript 6.0 だったが、7.0.2 に上げて、ビルド・テストが通ることを確認した |
| 画面側の静的チェック | oxlint（Vite のテンプレートの標準）。アクセシビリティ（jsx-a11y）と、警告を許さない設定（`--deny-warnings`）を追加（2026-10-21） | ESLint ではなく、テンプレートの標準に合わせた |
| 画面側の整形 | Prettier 3.9.10（版を固定）。セミコロンなし・シングルクォート・1行120文字・`endOfLine: auto`（2026-10-25） | 今のコードの書き方に合わせた設定で、変わるのは18ファイル・約114行だけ。`npm run format:check` を CI でも確かめる。文書（`*.md`）と画像などは対象外 |
| CI（自動チェック） | GitHub Actions（`.github/workflows/ci.yml`）。サーバー（`gradlew check`）と画面（lint・整形・test・build）。実行環境は Ubuntu 24.04 に固定（2026-10-25） | PR と main への push で自動で走る。使う部品は、コミットの ID で固定。権限は読み取りだけ |
| サーバー側の静的チェック | Checkstyle（書き方）、SpotBugs（バグになりやすい書き方）、JaCoCo（テストのカバレッジ）。`gradlew check` で実行（2026-10-21） | 規則は `backend/config/` に置く。Java 25 で動くことを確認した。層の依存の向きは、ArchUnit のテスト（`LayerDependencyTests`）で守る（2026-10-25） |
| 画面からAPIへの接続 | 開発中は Vite のプロキシ（`/api` → `localhost:8080`） | CORS の設定が要らず、バックエンドを変えずに済む |
| 開発用のPostgreSQL | **Docker（Docker Desktop）で起動。PostgreSQL 18**（確定：2026-10-13） | Windowsを汚さず、起動・停止・削除が1行でできる |
| テスト | JUnit ＋ Testcontainers（サーバー側）、Vitest（画面側） | テストのときだけ、使い捨てのPostgreSQLをDockerで起動する |

## 4. 未決定の項目
- 上の「案」の最終確認（バージョンを含む）
- テーブルの作り方：Flyway を導入済み（2026-10-21）
- アイコンの部品：使わないことにした。必要なアイコンは、自前のSVGで描く
- デプロイ先（AWS ＋ Terraform）：認証は、まず講義と同じアクセスキー方式（SSO はあとで試す）。構成は、講義の方針で、**画面とサーバーを同じ EC2 に載せる（無料の範囲）**。Terraform は段階的に作る：段階1（空の EC2）は、作成・SSH の確認・削除まで完了（2026-10-30）。次の段階（RDS、ソフトの導入、アプリのデプロイ）は、講義の続きを見てから決める。候補は [デプロイ先の選択肢](deploy-options.md)。公開するときは、ログインがない点の対策が必要（現状は「利用者のPC内でのみ動作」が前提。段階1は、SSH を自分の IP だけに許可）
- 品質チェックで挙がった改善の優先度（[品質チェックの記録](quality-review.md) を参照）

## 5. 現在の開発環境
- 利用している道具：Cursor、Claude Code、Git / GitHub
- Java 25（Eclipse Temurin、winget でインストール）：導入済み（2026-10-12）
- Gradle：インストール不要（`backend/` の Gradle Wrapper が自動で取得する）
- バックエンド：`backend/` に作成済み。列・カード・移動・期限順・検索・バックアップ・設定・背景画像のAPIが、すべて実装済み（使い方は [backend/README.md](../backend/README.md)）
- PostgreSQL 18：Docker で起動できる状態（`docker-compose.yml`）。SQLの確認（INSERT / SELECT / DELETE）と、バックエンドからの接続は確認済み（2026-10-13）
- Docker Desktop：導入済み
- Node.js 24 LTS（winget でインストール）：導入済み（2026-10-15）。24.22.1 に更新済み（2026-10-26。手順は [notes/07-quality-check.md](../notes/07-quality-check.md)）
- AWS CLI 2.39.0、Terraform 1.16.6（winget でインストール）：導入済み（2026-10-28）。認証は専用の IAM ユーザー（アクセスキー）。コードは `terraform/`（AWS provider 6.x）。AWS 上には、今は何も作っていない（段階1を、2026-10-30 に削除済み）。手順は [notes/08-aws-terraform-guide.md](../notes/08-aws-terraform-guide.md)
- フロントエンド：`frontend/` に環境を作成済み（Vite + React + TypeScript + Tailwind CSS + Vitest。使い方は [frontend/README.md](../frontend/README.md)）。計画した画面の機能（カードの追加・編集・削除、ドラッグ＆ドロップ、期限順、検索、バックアップ、背景）は、すべて実装済み。開発環境の構築手順は、[README.md](../README.md) にある
