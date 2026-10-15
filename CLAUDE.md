# CLAUDE.md

このプロジェクトで、Claude Code が**必ず守る**ルール。ここに書いてあることは、毎回の会話で読み込まれる。
ルールを変えたいときは、ユーザーと相談して、このファイルを更新する（それも、Issue → ブランチ → PR の流れで行う）。

## 1. プロジェクトの概要
- Trello風のタスク管理アプリ（AIエンジニア養成コースの課題）。顧客は架空のフリーランス「Aさん」
- リポジトリ：`RieShinohara/TaskManagement`（**公開リポジトリ**）
- 技術：バックエンドは Java 25 + Spring Boot 4.1.1 + Gradle、DBは PostgreSQL 18（Docker）、画面は React（TypeScript、Vite、Tailwind CSS、dnd-kit。`frontend/` に環境を作成済み）。詳細は [docs/tech-stack.md](docs/tech-stack.md)
- 構成：`docs/`（要件定義）、`backend/`（本番のサーバー）、`frontend/`（本番の画面）、`prototype/`（使い捨ての試作）、`notes/`（学習ノート）

## 2. ユーザーへの接し方
- ユーザーは、IT未経験の初学者。**日本語**で、専門用語は、かみ砕いて説明する
- Claude Code が作業を進め、ユーザーが確認する。仕組みや理由を、作りながら説明する
- ユーザーの学習が目的。学習ノート（`notes/`）に、学びを残す

## 3. GitHubの運用ルール（厳守）

### 3.1 作業の流れ（例外なし）
どんなに小さな作業（誤字の修正、文書の1行の追加）でも、次の順番で行う。

```
1. Issue を作る          何をするかを、先に書く（作業を始める前に）
2. ブランチを作る        Issueと連動させる（番号が同じ）
3. 作業して、コミットする
4. push して、PR を作る   PRの本文に「Closes #番号」と書く
5. ユーザーが確認して、マージする（ブランチも、ユーザーが削除する）
6. Claude Code が、手元の main を更新して、ブランチを整理する
```

### 3.2 Issue
- **作業を始める前に、必ず Issue を作る。** Issue がない作業は、始めない
- **1つの Issue ＝ 1つの目的 ＝ 1つのブランチ ＝ 1つの PR。** 複数の目的を、混ぜない
- 作成は `gh issue create` で行う。番号は、GitHubが自動で振る
- タイトルは日本語。何をするかが分かるように書く
- 本文は、次の3つの見出しで書く：`## 背景`、`## やること`（チェックリスト）、`## 完了条件`
- ラベル：文書は `documentation`、機能追加は `enhancement`、不具合は `bug`

### 3.3 ブランチ
- **main の上で、作業しない。** `main` に、直接コミットも、pushもしない
- 名前の形式：`種類/Issue番号-英語の短い説明`（英小文字、数字、ハイフンのみ）

| 種類 | 使うとき | 例 |
|---|---|---|
| `feature` | 機能を追加する | `feature/23-card-update-api` |
| `fix` | 不具合を直す | `fix/31-card-position-bug` |
| `docs` | 文書だけを変える（要件定義、学習ノート、README） | `docs/22-github-workflow-rules` |
| `refactor` | 動きを変えずに、中身を整理する | `refactor/40-split-service` |
| `chore` | 設定や環境を整える（Docker、ビルドの設定） | `chore/45-update-gradle` |

- 作り方：`main` を最新にして、**`gh issue develop 番号 --name ブランチ名 --base main --checkout`**。GitHub上でも、Issueとブランチが結びつく
- **Issue番号と、ブランチの番号は、同じにする。** PRの番号は、Issueと同じ連番（共通）なので、別の番号になる

### 3.4 コミット
- **日本語**で書く。1つのコミット＝1つの目的
- 1行目：何をしたかを、短く（目安：50文字以内、句点は付けない）
- 空行のあと、本文：なぜ、そうしたか、どうしたか（必要なときだけ）
- 最後に、`Refs #Issue番号` を書く
- 末尾に、システムから指示された `Co-Authored-By` の行を付ける
- `git add` は、ファイルを1つずつ指定する。**`.claude/`、`.env` は、コミットしない**（ただし、`.claude/skills/` だけは例外。プロジェクト用のスキルとして、コミットする。`.claude/settings*.json` は、コミットしない）
- コミットの前に、`git status` で、対象を確認する

```
カードの更新APIを追加

タイトル・色・期限日を変更できるようにした。入力のチェックは、追加のAPIと同じ。

Refs #23
```

### 3.5 Pull Request
- **変更は、必ず PR で、main に入れる。** PR は、`gh pr create` で作る
- タイトル：日本語。何をしたかが分かるように書く
- 本文に、次を書く：`## 内容`、`## 確認したこと`（実行したテストや、動作確認の結果）、**`Closes #Issue番号`**
- 本文の最後に、システムから指示された `Generated with Claude Code` の行を付ける
- **PRのマージと、ブランチの削除は、ユーザーが行う。** Claude Code は、マージしない
- マージのあと、ユーザーから連絡があったら：`main` に移動 → `git pull` → `git branch -d` → `git fetch --prune`

### 3.6 禁止事項
- `main` への、直接のコミットとpush（GitHubの設定でも、禁止している）
- `git push --force`（強制push）、`git reset --hard`、`--no-verify`（確認の省略）。ユーザーに頼まれても、まず、理由を確認する
- Issue なしで、作業を始めること
- ユーザーの確認なしに、PRをマージすること、ブランチを削除すること

### 3.7 GitHub側の設定（2026-10-13 設定）
`main` ブランチは、ghコマンドで、次のように保護している。

- 直接pushの禁止（PRが必須。管理者のユーザーにも適用）
- 強制push、ブランチの削除を禁止
- PRの承認は、0人でよい（1人で開発しているため）

## 4. 公開リポジトリとしての注意
- **パスワード、キー、個人情報を、コミットしない。** DBのパスワードは `.env`（コミットしない）に書く。見本は `.env.example`
- 権利が不明な画像や文章を、入れない（画像は、出典とライセンスを、`CREDITS.md` に書く）

## 5. 開発のコマンド
| やりたいこと | コマンド | 場所 |
|---|---|---|
| DBを起動 | `docker compose up -d` | リポジトリ直下（先に Docker Desktop を起動） |
| DBを停止（データは残る） | `docker compose down` | リポジトリ直下 |
| バックエンドを起動 | `.\gradlew.bat bootRun` | `backend/` |
| テスト | `.\gradlew.bat test` | `backend/`（Docker Desktop が必要） |
| 画面を起動（http://localhost:5173） | `npm run dev` | `frontend/`（データを見るには、DBとバックエンドも起動） |
| 画面のテスト／静的チェック／ビルド | `npm test` ／ `npm run lint` ／ `npm run build` | `frontend/` |

- バックエンドは、**DBが起動していないと、起動に失敗する**
- 新しいシェルで `java` が見つからないときは、`JAVA_HOME` を `C:\Program Files\Eclipse Adoptium\jdk-25*` にする
- **ポートは固定**：バックエンド 8080、画面 5173、DB 5432。サーバーを起動するときは、先に使用中でないか確認し、競合したら、スキル `dev-port-conflict`（`.claude/skills/dev-port-conflict/`）の手順に従う。別のポートで起動しない。無関係なプロセス（特にDocker）は、ユーザーの確認なしに止めない
- 新しいシェルで `node` が見つからないときは、シェルを開き直す（Node.js 24 LTS は導入済み）
- 詳しくは、[backend/README.md](backend/README.md)、[frontend/README.md](frontend/README.md)

## 6. 文書の置き場所
- 要件定義：`docs/`（入口は `docs/requirements.md`）
- 学習ノート：`notes/`（入口は `notes/README.md`）。新しく学んだことは、ここに追記する
- 技術の決定：`docs/tech-stack.md`。技術や、バージョンを変えたら、更新する
