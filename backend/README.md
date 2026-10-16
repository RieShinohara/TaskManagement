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
| `PUT /api/cards/{id}` | カードの内容（タイトル・説明文・色・期限日）を更新する（下記） |
| `PUT /api/cards/{id}/move` | カードを動かす。別の列へも、同じ列の中でも（下記） |
| `POST /api/columns/{id}/sort-by-due` | その列のカードを、期限の早い順に並べ直して保存する（下記） |
| `GET /api/backup` | 全データ（列とカード）を、バックアップファイルの形で返す（下記） |
| `POST /api/backup/restore` | バックアップファイルの内容で、今のデータを**全部入れ替える**（下記） |
| `DELETE /api/cards/{id}` | カードを削除する。成功は `204`（中身なし）、存在しなければ `404` |

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

カードの更新（PowerShell の例。日本語を送るときは、上の追加と同じく UTF-8 のバイト列にする）:
```powershell
Invoke-RestMethod http://localhost:8080/api/cards/1 -Method Put -ContentType "application/json; charset=utf-8" `
  -Body ([Text.Encoding]::UTF8.GetBytes('{"title":"牛乳と卵を買う","description":"スーパーで","color":"blue","dueDate":"2026-10-20"}'))
```
- 編集できる4項目を、**いつもまとめて**送る：`title`（必須、255文字まで）、`description`（任意、2000文字まで）、`color`（必須。none / red / blue / green / yellow / gray）、`dueDate`（任意）
- `description` と `dueDate` を空（`null`）にして送ると、その項目は「なくなる」。空白だけの説明文も、なくなる
- カードの列と並び順（`columnId`、`position`）は、変わらない。動かすのは、次の「カードの移動」のAPI
- タイトルが空・長すぎる、説明文が長すぎる、色が不正・無いなら `400`。存在しないカードなら `404`。成功すると、更新後のカードが返る
- カードの応答（`GET`・`POST`・`PUT` 共通）には、`description` が含まれる（未設定は `null`）

カードの移動（PowerShell の例）:
```powershell
Invoke-RestMethod http://localhost:8080/api/cards/1/move -Method Put -ContentType "application/json" `
  -Body '{"columnId":2,"index":0}'
```
- `columnId`（必須）：動かした先の列。今と同じ列なら、同じ列の中での並び替え
- `index`（必須、0以上）：その列の中での位置。0が一番上。カード数より大きい数は、一番下になる
- サーバーが、動かす前の列と動かした先の列の `position` を、**0,1,2,… の連番に振り直す**。画面は、`position` の数値を計算しない
- 位置が負・`columnId` や `index` が無いなら `400`。存在しないカード・列なら `404`。成功すると、動かした後のカードが返る

期限順の並び替え（PowerShell の例）:
```powershell
Invoke-RestMethod http://localhost:8080/api/columns/1/sort-by-due -Method Post
```
- 本文はなし。URLの `{id}` が、並び替える列
- 期限の早い順に並び、**期限のないカードは末尾**。**同じ期限のカードは、今の順番のまま**
- 結果は `position` の 0,1,2,… の連番として保存され、並び直したあとの、その列のカードが、上から順に返る
- 並び直したあとも、カードを動かせる（移動API）。新しく追加したカードは、列の一番上に入る
- 存在しない列なら `404`

バックアップ（書き出しと読み込み）:
```powershell
# 書き出し：ファイルに保存する
Invoke-WebRequest http://localhost:8080/api/backup -OutFile backup.json
# 読み込み：今のデータは、全部入れ替わる（戻せない）
Invoke-RestMethod http://localhost:8080/api/backup/restore -Method Post -ContentType "application/json; charset=utf-8" -InFile backup.json
```
- ファイルの形式は、[docs/data-design.md](../docs/data-design.md) の「バックアップファイルの形式」。列は左から順、カードは上から順に、入れ子で持つ（IDと `position` は入れない）
- 読み込むと、今ある**カードと列は全部消えて**、ファイルの内容になる。IDは振り直され、`position` は 0 からの連番になる。**途中で失敗したら、全部取り消され、今のデータは変わらない**
- 不正なファイル（`app` が `taskboard` でない、`version` が 1 でない、列がない、タイトルが空、色が不正、期限日が不正、カードが1万枚を超える、JSONでない、など）は `400`。成功は `204`（中身なし）
- 知らない項目（たとえば、将来の背景の設定）は、無視して読める
- バックアップのファイルは、リポジトリに入れない（公開リポジトリなので、個人の予定が入るおそれがある）

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
