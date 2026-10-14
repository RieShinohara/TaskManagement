# バックエンド（Java ＋ Spring Boot）

タスク管理アプリのサーバー側。現在は雛型の段階で、動作確認用のAPIが1つあるだけ。

| 項目 | 内容 |
|---|---|
| 言語 | Java 25（LTS） |
| フレームワーク | Spring Boot 4.1.1（Spring Web） |
| ビルドツール | Gradle 9.8.1（`gradlew` が自動で取得する） |

| データベース接続 | Spring Data JPA ＋ PostgreSQL（Docker で起動） |

## 必要なもの
- JDK 25（Gradle は別にインストールしなくてよい）
- Docker Desktop（PostgreSQL の起動と、テストに使う）
- リポジトリ直下の `.env`（`.env.example` をコピーして作る。DBのパスワードなどを書く。コミットされない）

## 使い方
### 1. データベースを起動する（リポジトリ直下で実行）
| やりたいこと | コマンド |
|---|---|
| 起動する | `docker compose up -d` |
| 停止する（データは残る） | `docker compose down` |
| データも含めて消す | `docker compose down -v` |
| SQLを直接実行する | `docker compose exec db psql -U taskmanagement -d taskmanagement` |

**バックエンドは、DBが起動していないと起動に失敗する**（`Connection refused`）。先にDBを起動する。

### 2. バックエンドを動かす（このフォルダ `backend/` で実行）
| やりたいこと | コマンド |
|---|---|
| サーバーを起動する | `.\gradlew.bat bootRun` |
| テストを実行する | `.\gradlew.bat test`（Docker Desktop の起動が必要） |
| 止める | 起動したターミナルで `Ctrl + C` |

起動後、ブラウザで <http://localhost:8080/api/health> を開き、`{"status":"ok"}` と表示されれば成功。

## API
サーバー起動中に、ブラウザやコマンドで試せる。

| 窓口 | 内容 |
|---|---|
| `GET /api/health` | 動作確認。`{"status":"ok"}` が返る |
| `GET /api/columns` | 列（ToDo / 作業中 / 完了）の一覧。表示順 |
| `GET /api/cards` | カードの一覧。列の順、列の中の並び順。絞り込みができる（下記） |
| `GET /api/cards/{id}` | カードを1件取得する。ないIDは `404` |
| `POST /api/cards` | カードを追加する（下記） |

絞り込み（どれも省略できる。組み合わせられる）:

| 条件 | 意味 | 例 |
|---|---|---|
| `columnId` | その列のカードだけ | `/api/cards?columnId=2` |
| `keyword` | タイトルに、その文字を含む（大文字小文字は区別しない） | `/api/cards?keyword=買` |
| `dueBefore` | 期限日が、その日以前（期限なしのカードは含まない） | `/api/cards?dueBefore=2026-10-15` |

組み合わせの例：`/api/cards?columnId=1&dueBefore=2026-10-16`。日付の形が不正なら `400`。

カードの追加（PowerShell の例）:
```powershell
Invoke-RestMethod http://localhost:8080/api/cards -Method Post -ContentType "application/json; charset=utf-8" `
  -Body ([Text.Encoding]::UTF8.GetBytes('{"title":"買い物","columnId":1,"dueDate":"2026-10-20"}'))
```
- `title`（必須、255文字まで）、`columnId`（必須）、`color`（任意。none / red / blue / green / yellow / gray。省略すると none）、`dueDate`（任意）
- 新しいカードは、その列の一番上に入る
- タイトルが空・色が不正なら `400`、存在しない列なら `404`

テーブルは、バックエンドの起動時に Entity（Javaのクラス）から自動で作られる（`ddl-auto: update`）。列の最初の3件も、起動時に入る。

## サンプルデータの投入
動作確認用に、カード10件のサンプルデータを、SQLで投入できる（[backend/sql/sample-data.sql](sql/sample-data.sql)）。
**先に、カードを全部消してから入れる**ので、今あるカードは、入れ替わる。何度流しても、同じ状態になる。

リポジトリ直下で、DBとバックエンドを一度起動したあと（列ができたあと）に、実行する。

```
docker compose cp backend/sql/sample-data.sql db:/tmp/sample-data.sql
docker compose exec db psql -U taskmanagement -d taskmanagement -f /tmp/sample-data.sql
```

## ソースの層
| 層 | フォルダ | 役割 |
|---|---|---|
| Controller | `controller/` | APIの窓口。お願いを受け取り、結果をJSONで返す |
| Service | `service/` | 業務の処理（新しいカードを一番上に入れる、など） |
| Repository | `repository/` | DBの読み書き（Spring が自動で用意する） |
| Entity | `entity/` | テーブルに対応するクラス |
| DTO | `dto/` | APIでやりとりするJSONの形 |

## フォルダ構成
```
backend/
├── build.gradle        ビルドの設定（使う部品、Javaのバージョンなど）
├── settings.gradle     プロジェクト名
├── sql/                サンプルデータのSQL
├── gradlew.bat など    Gradle Wrapper（Gradleを自動で用意する仕組み）
└── src/
    ├── main/java/…     プログラム本体
    ├── main/resources/ 設定ファイル（application.yml）
    └── test/java/…     テスト
```
