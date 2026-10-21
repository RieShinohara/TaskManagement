# バックエンド（Java ＋ Spring Boot）

タスク管理アプリのサーバー側。カード・列・設定（背景）・自分の背景画像・バックアップのAPIを持ち、データはPostgreSQLに保存する。
仕組みと、作りながら学んだことは、[学習ノート 05](../notes/05-backend-guide.md) にまとめてある。

| 項目 | 内容 |
|---|---|
| 言語 | Java 25（LTS） |
| フレームワーク | Spring Boot 4.1.1（Spring Web） |
| ビルドツール | Gradle 9.8.1（`gradlew` が自動で取得する） |
| データベース接続 | Spring Data JPA ＋ PostgreSQL（Docker で起動） |
| テスト | JUnit ＋ MockMvc ＋ Testcontainers（使い捨ての PostgreSQL） |
| 静的チェック | Checkstyle（書き方）、SpotBugs（バグになりやすい書き方）、JaCoCo（カバレッジ）。規則は `config/` |

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
| テストと静的チェックをまとめて実行する | `.\gradlew.bat check`（テスト、Checkstyle、SpotBugs。カバレッジの結果は `build/reports/jacoco/test/html/index.html`） |
| 止める | 起動したターミナルで `Ctrl + C` |

起動後、ブラウザで <http://localhost:8080/api/health> を開き、`{"status":"ok"}` と表示されれば成功。

## API
サーバー起動中に、ブラウザやコマンドで試せる。

**動作確認**

| 窓口 | 内容 |
|---|---|
| `GET /api/health` | 動作確認。`{"status":"ok"}` が返る |

**列とカード**

| 窓口 | 内容 |
|---|---|
| `GET /api/columns` | 列（ToDo / 作業中 / 完了）の一覧。表示順 |
| `GET /api/cards` | カードの一覧。列の順、列の中の並び順。絞り込みができる（下記） |
| `GET /api/cards/{id}` | カードを1件取得する。ないIDは `404` |
| `POST /api/cards` | カードを追加する（下記） |
| `PUT /api/cards/{id}` | カードの内容（タイトル・説明文・色・期限日）を更新する（下記） |
| `DELETE /api/cards/{id}` | カードを削除する。成功は `204`（中身なし）、存在しなければ `404` |
| `PUT /api/cards/{id}/move` | カードを動かす。別の列へも、同じ列の中でも（下記） |
| `POST /api/columns/{id}/sort-by-due` | その列のカードを、期限の早い順に並べ直して保存する（下記） |

**バックアップ**

| 窓口 | 内容 |
|---|---|
| `GET /api/backup` | 全データ（列とカードと背景の設定）を、バックアップファイルの形で返す（下記） |
| `POST /api/backup/restore` | バックアップファイルの内容で、今のデータを**全部入れ替える**（下記） |

**背景**

| 窓口 | 内容 |
|---|---|
| `GET /api/settings` | 設定（選んだ背景）を取得する。初めては青空（`sky`）（下記） |
| `PUT /api/settings` | 設定（選んだ背景）を更新する（下記） |
| `GET /api/background-images` | 登録した自分の背景画像の一覧（下記） |
| `GET /api/background-images/{slot}` | 画像そのもの（JPEG）。登録がなければ `404` |
| `PUT /api/background-images/{slot}` | 画像を登録（置き換え）する（下記） |
| `DELETE /api/background-images/{slot}` | 登録した画像を消す（標準の画像に戻る）。成功は `204` |

返事の番号は、成功が `200`（作ったときは `201`、中身のないときは `204`）、お願いの内容がおかしいと `400`、見つからないと `404`。
エラーの本文の形は、Spring Boot の標準のまま（このアプリ独自の形は決めていない）。画面は、本文を読まず、番号で表示する文言を決めている。

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
- タイトルが空・255文字を超える、`columnId` がない、色が不正、`dueDate` の形が不正（`YYYY-MM-DD` でない）、JSON がおかしい、なら `400`。存在しない列なら `404`

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

カードの削除（PowerShell の例）:
```powershell
Invoke-RestMethod http://localhost:8080/api/cards/1 -Method Delete
```
- 成功すると `204`（中身なし）。存在しないカードは `404`。**削除したカードは、元に戻せない**（ゴミ箱はない）。画面は、削除の前に確認を出す

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

設定（選んだ背景）:
```powershell
Invoke-RestMethod http://localhost:8080/api/settings
Invoke-RestMethod http://localhost:8080/api/settings -Method Put -ContentType "application/json" -Body '{"background":"night"}'
```
- `background`：`plain`（無地）／`sky`（青空）／`sunset`（夕焼け）／`night`（星空）／`auto`（自動：時間帯）。違う値・空・無しは `400`
- 設定は1件だけ。初めて取得したときは、青空（`sky`）。バックアップには、この設定が `settings` として入り、読み込むと戻る（`settings` がない古いファイルは、青空になる）

自分の背景画像:
```powershell
# 登録（本文は、JPEGのファイルそのもの）。{slot} は sky（青空）/ sunset（夕焼け）/ night（星空）
Invoke-RestMethod http://localhost:8080/api/background-images/sky -Method Put -ContentType "image/jpeg" -InFile my.jpg
# 取得（ファイルに保存）／削除（元に戻す）
Invoke-WebRequest http://localhost:8080/api/background-images/sky -OutFile got.jpg
Invoke-RestMethod http://localhost:8080/api/background-images/sky -Method Delete
```
- 割り当て先（`{slot}`）ごとに、最大1枚。登録済みの割り当て先に登録すると、置き換わる。`sky` / `sunset` / `night` 以外は `404`
- 登録できるのは、**JPEG（先頭が FF D8 FF）で、5MB以下**。違うもの・空は `400`、5MBを超えるものは `413`（どちらも登録されず、すでにある画像も変わらない）。画面が、横1920pxのJPEGに縮小してから送る
- **大きすぎる本文は、全部を読み込む前に断る**：送られてくる大きさ（`Content-Length`）が5MBを超えていれば、本文を読まずに `413`。大きさを申告しない送り方でも、5MBより1バイト多く読んだところで、読むのをやめて `413`（巨大な本文で、サーバーのメモリを使い切らないため）
- 画像は、DBに入る（bytea）。登録（置き換え）の日時（`updatedAt`）が、画像の ETag になり、変わっていなければ `304`（送り直さない）
- 一覧（`GET /api/background-images`）は、`[{"slot":"sky","updatedAt":"…"}]` の形で、画像のデータは入らない
- **バックアップには入らない**。バックアップを読み込んでも、登録済みの画像はそのまま残る
- 画像のファイルは、リポジトリに入れない（個人の画像のおそれがある）

バックアップ（書き出しと読み込み）:
```powershell
# 書き出し：ファイルに保存する
Invoke-WebRequest http://localhost:8080/api/backup -OutFile backup.json
# 読み込み：今のデータは、全部入れ替わる（戻せない）
Invoke-RestMethod http://localhost:8080/api/backup/restore -Method Post -ContentType "application/json; charset=utf-8" -InFile backup.json
```
- ファイルの形式は、[docs/data-design.md](../docs/data-design.md) の「バックアップファイルの形式」。列は左から順、カードは上から順に、入れ子で持つ（IDと `position` は入れない）
- 読み込むと、今ある**カードと列は全部消えて**、ファイルの内容になる。IDは振り直され、`position` は 0 からの連番になる。**途中で失敗したら、全部取り消され、今のデータは変わらない**
- 不正なファイル（`app` が `taskboard` でない、`version` が 1 でない、列がない・51列以上、列の名前が空・255文字を超える、タイトルが空、説明文が2000文字を超える、色が不正、期限日が不正、カードが1万枚を超える、JSONでない、など）は `400`。成功は `204`（中身なし）
- 背景の設定（`settings.background`）も入る。ファイルに `settings` がなければ（古いバックアップ）、背景は青空になる。自分の背景画像は、入らない
- 知らない項目は、無視して読める
- バックアップのファイルは、リポジトリに入れない（公開リポジトリなので、個人の予定が入るおそれがある）

テーブルは、**Flyway** が、`src/main/resources/db/migration/` の SQL（`V1__create_tables.sql` など）を、番号順に流して作る。流した記録は、DBの `flyway_schema_history` 表に残る。
`ddl-auto` は `validate`：テーブルを作らず、起動のときに、Entity とテーブルが合っているかを確かめるだけ（ずれていたら、起動に失敗する）。
列の最初の3件（ToDo / 作業中 / 完了）は、起動時に、`DataInitializer` が入れる。

テーブルを変えるとき（列を足す、索引を付ける、など）：
1. `V2__…sql` のように、**新しい番号の SQL ファイルを足す**（すでに流した `V1` は、**書き換えない**）
2. 必要なら、Entity も直す
3. `.gradlew.bat check` を実行する（空の DB に、V1 → V2 の順で作り、Entity と合っているかを確かめる）

Flyway を入れる前から使っていた DB（すでにテーブルがある DB）は、`baseline-on-migrate: true` の設定で、「V1 は実行済み」として受け入れる（データには触れない）。

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
| Service | `service/` | 業務の処理（新しいカードを一番上に入れる、並び替え、バックアップの読み込み、など） |
| Repository | `repository/` | DBの読み書き（Spring が自動で用意する） |
| Entity | `entity/` | テーブルに対応するクラス |
| DTO | `dto/` | APIでやりとりするJSONの形 |

## フォルダ構成
```
backend/
├── build.gradle        ビルドの設定（使う部品、Javaのバージョンなど）
├── settings.gradle     プロジェクト名
├── config/             静的チェックの規則（checkstyle / spotbugs）
├── sql/                サンプルデータのSQL
├── gradlew.bat など    Gradle Wrapper（Gradleを自動で用意する仕組み）
└── src/
    ├── main/java/…     プログラム本体（起動時に列を用意する DataInitializer、動作確認の HealthController、controller/ service/ など）
    ├── main/resources/ 設定ファイル（application.yml）
    └── test/java/…     テスト
```
