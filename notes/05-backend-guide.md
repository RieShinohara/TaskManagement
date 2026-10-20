# 05 バックエンドの仕組み

`backend/` の中の、Java + Spring Boot のサーバー。**本番の土台**になる（プロトタイプと違い、使い捨てではない）。
使い方の詳細は [backend/README.md](../backend/README.md)、技術の決定は [docs/tech-stack.md](../docs/tech-stack.md) を参照。

## 章の一覧
| 章 | 内容 |
|---|---|
| 1〜11 | 土台：全体像、動かし方、技術の選び方、Docker と PostgreSQL、SQL、API と REST、ソースの層、テーブルの作り方、テスト、つまずき、やってみよう |
| 12 | カードの更新（PUT）と、説明文の追加 |
| 13 | カードの削除（DELETE、204） |
| 14 | カードの移動（連番の振り直し） |
| 15 | 期限順の並び替え |
| 16 | バックアップ（書き出しと読み込み、トランザクション） |
| 17 | 設定（選んだ背景）と、バックアップへの組み込み |
| 18 | 自分の背景画像（画像をDBに保存する） |

12章以降は、機能ごとに、「APIの作り方 → 学んだポイント → テスト → やってみよう」の順に書いている。対応する画面の章は、[学習ノートの入口](README.md) の対応表を参照。

## 1. 全体像：レストランにたとえると

| レストラン | このアプリ | 技術 |
|---|---|---|
| お客さん | 画面 | React（[06](06-frontend-guide.md) で作った） |
| 店員さん（注文の窓口） | **API** | Spring Boot（Controller） |
| 厨房 | バックエンド | Spring Boot（Service など） |
| 倉庫 | データベース | PostgreSQL（Docker） |

お客さん（画面）は、厨房や倉庫に直接入らない。店員さん（API）に注文する。
プロトタイプでは、データをブラウザの中（localStorage）に保存していた。本番では、**API を通して、DB に保存する**。

## 2. 動かし方（順番が大事）
```
1. Docker Desktop を起動する
2. リポジトリ直下で   docker compose up -d     （DBを起動）
3. backend/ で        .\gradlew.bat bootRun    （バックエンドを起動）
4. ブラウザで         http://localhost:8080/api/columns を開く
```
**DBが先。** DBが動いていないと、バックエンドは起動に失敗する（`Connection refused`）。

### なぜ、DBが先に必要なのか
- 雛型の段階では、DBに接続する部品（JPA）を入れていなかった → DBがなくても起動できた
- JPA と PostgreSQL ドライバを入れると、**起動のときに、DBへ接続しにいく** → DBがないと失敗する
- 実際に、DBを止めてから起動して、確かめた

## 3. 技術と、選んだ理由

| 項目 | 選んだもの | 理由・メモ |
|---|---|---|
| Java | 25（LTS） | 講義で「最新バージョンで」と指示。**LTS** は、長期サポート版 |
| Spring Boot | 4.1.1 | 現行の最新安定版 |
| ビルドツール | Gradle 9.8.1 | 講義の表で推奨。各自の推奨でよいとされた |
| DB | PostgreSQL 18 | 講義の指示。Docker で起動 |

バージョンは、「サポート期限」を見て選ぶ。たとえば、Spring Boot 3.5 は、無料のサポートが2026年6月に終わっている。

### Gradle Wrapper（`gradlew`）
プロジェクトに同梱された、Gradle の起動役。**Gradle を別にインストールしなくても**、`gradlew` が必要な版を自動で取ってくる。誰のPCでも、同じ版で動く。

## 4. Docker と PostgreSQL

| 用語 | 意味 |
|---|---|
| Docker | アプリを、**コンテナ**（隔離された入れ物）の中で動かす道具。PCを汚さず、起動・削除が簡単 |
| イメージ | コンテナの元になる、ひな形（`postgres:18`） |
| ボリューム | コンテナの外に、データを保存する場所。**コンテナを消しても、データが残る** |
| docker-compose.yml | コンテナの設定を書いたファイル。1行（`docker compose up -d`）で起動できる |

| やりたいこと | コマンド（リポジトリ直下） |
|---|---|
| DBを起動 | `docker compose up -d` |
| DBを停止（データは残る） | `docker compose down` |
| データも消す | `docker compose down -v` |
| SQLを直接実行 | `docker compose exec db psql -U taskmanagement -d taskmanagement` |

### パスワードの扱い（`.env`）
このリポジトリは**公開**されている。パスワードを、そのままコミットしてはいけない。

- `.env`：本物のパスワードを書く。`.gitignore` に入れて、**コミットしない**
- `.env.example`：見本。パスワードは `change-me` のまま、コミットする
- バックエンドは、`application.yml` の `spring.config.import` で、`.env` を読み込む

## 5. SQL：DBに直接する命令

| やりたいこと | SQL | 意味 |
|---|---|---|
| 登録 | `INSERT` | データを1件追加する |
| セレクト | `SELECT` | データを一覧で見る |
| 検索 | `SELECT … WHERE` | 条件に合うデータだけ見る |
| 削除 | `DELETE` | データを消す |

```sql
INSERT INTO sql_check (title, due_date) VALUES ('買い物', '2026-10-20');
SELECT * FROM sql_check;
SELECT * FROM sql_check WHERE due_date < '2026-10-16';
DELETE FROM sql_check WHERE title = '掃除';
```
- **SQL**：DBに出す命令の言葉。バックエンド（または人）が、DBと話すときに使う
- **API**：画面がバックエンドに頼むための窓口。SQLとは別のもの

## 6. API と REST

### 基本の形
```
GET http://localhost:8080/api/columns
 ↑種類            ↑住所（URL）
```
返事は **JSON**（プログラム同士が読みやすい、データの書き方）。

| 種類 | やりたいこと | 例 |
|---|---|---|
| `GET` | 見る | カードの一覧 |
| `POST` | 作る | カードを追加 |
| `PUT` | 直す | タイトルを変える |
| `DELETE` | 消す | カードを消す |

この決まりに沿ったAPIを、**REST API** という。

### ステータスコード（返事の番号）
| 番号 | 意味 |
|---|---|
| 200 | 成功 |
| 201 | 作った |
| 204 | 成功したが、返す中身はない（削除のあと） |
| 400 | お願いの内容がおかしい（タイトルが空、色が不正、説明文が長すぎる） |
| 404 | 見つからない（存在しない列、存在しないカード） |
| 500 | サーバー側の問題 |

### 今あるAPI
| API | 内容 |
|---|---|
| `GET /api/health` | 動作確認。`{"status":"ok"}` |
| `GET /api/columns` | 列の一覧 |
| `GET /api/cards` | カードの一覧。絞り込みができる |
| `GET /api/cards/{id}` | カードを1件取得 |
| `POST /api/cards` | カードの追加 |
| `PUT /api/cards/{id}` | カードの更新（タイトル・説明文・色・期限日） |
| `DELETE /api/cards/{id}` | カードの削除。成功は `204`、存在しなければ `404` |
| `PUT /api/cards/{id}/move` | カードの移動（別の列へ、同じ列の中で） |
| `POST /api/columns/{id}/sort-by-due` | 列のカードを期限順に並べ直して保存 |
| `GET /api/backup` | 全データの書き出し（バックアップ） |
| `POST /api/backup/restore` | バックアップの読み込み（全部入れ替え） |
| `GET /api/settings` | 設定（選んだ背景）の取得 |
| `PUT /api/settings` | 設定（選んだ背景）の更新 |
| `GET /api/background-images` | 自分の背景画像の一覧 |
| `GET /api/background-images/{slot}` | 自分の背景画像の取得（JPEG） |
| `PUT /api/background-images/{slot}` | 自分の背景画像の登録・置き換え |
| `DELETE /api/background-images/{slot}` | 自分の背景画像を消す（元に戻す） |

### 絞り込み検索：クエリパラメータ
URLの `?` のあとに、条件を付ける。`&` で、つなげる。

```
GET /api/cards?columnId=1&keyword=買&dueBefore=2026-10-15
                ↑列で         ↑タイトルに含む  ↑期限日がこの日以前
```
- どの条件も、省略できる。省略した条件は、無視される（全部省略すれば、全件）
- **SQLの `WHERE` と同じ考え方**。APIの結果と、SQLの結果が、一致することを確かめた

| APIの条件 | SQLで書くと |
|---|---|
| `dueBefore=2026-10-15` | `WHERE due_date <= '2026-10-15'` |
| `keyword=買` | `WHERE title LIKE '%買%'` |
| `columnId=2` | `WHERE column_id = 2` |

### サンプルデータの投入
`backend/sql/sample-data.sql` に、カード10件の `INSERT` を書いて、`psql` で流し込む。
**先に `TRUNCATE`（全部消す）をする**ので、何度流しても、同じ状態になる。流し込む手順は、[backend/README.md](../backend/README.md) を参照。

## 7. ソースの層（役割分担）
カードを追加する、お願いの流れ。

```
画面                 POST /api/cards  {"title":"買い物","columnId":1}
  ↓
Controller           お願いを受け取り、入力をチェックする（@Valid）
  ↓
Service              業務の処理：新しいカードを、その列の一番上に入れる
  ↓
Repository           DBに保存する（SQLは、Spring が自動で作る）
  ↓
PostgreSQL           card テーブルに、1行追加される
```

| 層 | フォルダ | 役割 |
|---|---|---|
| Controller | `controller/` | APIの窓口。お願いを受け取り、結果をJSONで返す |
| Service | `service/` | 業務の処理 |
| Repository | `repository/` | DBの読み書き。`JpaRepository` を継承するだけで使える |
| Entity | `entity/` | テーブルに対応するクラス |
| DTO | `dto/` | APIでやりとりする、JSONの形 |

層に分ける理由：**役割ごとに分けておくと、変更や、間違い探しが楽になる**。

### Entity（テーブルに対応するクラス）
```java
@Entity
@Table(name = "card")
public class Card {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;            // 主キー。DBが自動で番号を付ける
    private String title;       // → title 列
    @ManyToOne
    @JoinColumn(name = "column_id")
    private BoardColumn column; // → column_id 列（board_column への外部キー）
}
```
**Javaのクラスを書くと、テーブルができる。** これが JPA の中心の仕組み。

| 用語 | 意味 |
|---|---|
| JPA | Javaのクラスで、DBのデータを扱う決まり |
| Hibernate | JPA を実際に動かす部品（Spring Data JPA が中で使う） |
| 主キー（PK） | 1行を特定する番号（`id`） |
| 外部キー（FK） | 別のテーブルの行を指す番号（`column_id` → `board_column.id`） |

## 8. テーブルの作り方：`ddl-auto`
`application.yml` の `ddl-auto: update` は、**起動のときに、Entity に合わせて、テーブルを自動で作る・足りない列を足す**。講義と同じ方式。

| 方式 | 特徴 |
|---|---|
| `ddl-auto: update`（今） | 手軽。Entityを書くだけで、テーブルができる |
| Flyway（将来の候補） | テーブルの定義を、SQLファイルとして記録に残す。実際の開発で標準 |

列の最初の3件（ToDo / 作業中 / 完了）は、`DataInitializer` が、起動のときに、1つもなければ入れる。

## 9. テスト：Testcontainers
`gradlew test` のとき、**使い捨ての PostgreSQL を、Docker で自動的に起動**して、テストする。

- 開発用のDB（`docker compose`）には、触らない
- 本番と同じ PostgreSQL でテストできる
- テストには、Docker Desktop の起動が必要

## 10. 今回のつまずきと学び

| できごと | 学び |
|---|---|
| 雛型を自動で作るサービス（Spring Initializr）が、500エラーだった | サービス側の不調。**同じ内容を手で作れた**ので、仕組みが分かっていれば、止まらない。エラーは、サーバー側（500）か、こちら側（400番台）かを見る |
| テストの名前に「、」を使って、コンパイルエラー | Javaの名前に使えない文字がある。日本語は使えても、句読点は不可 |
| 講義の画面と、書き方が違う（`.yml` と `.properties`、Gradle の設定の書き方） | 書き方が違うだけで、役割は同じ。講義と見比べて、迷ったら聞く |
| 絞り込みの条件が空（null）のとき、PostgreSQLが「型が分からない」とエラー（`could not determine data type of parameter`）。テストが失敗して気づいた | DBは、値が空だと、型を判断できないことがある。`cast(:条件 as 型)` で、型をはっきり指定して直した。**テストがあったから、見つけられた** |
| `ddl-auto` や Flyway を、どちらにするか | 前に決めたことでも、**講義の流れが分かったら、変えてよい**。理由を残しておく |

12章以降の機能づくりで、**何度か同じ種類のつまずきを繰り返した**。まとめておく。

| できごと | 学び |
|---|---|
| テストのメソッド名で、何度もコンパイルエラー（`、` `空白` `数字で始まる名前`） | Javaの名前に使えないのは、**句読点・空白・先頭の数字**。日本語は使えるが、`_` でつなぐ。例：`3つの…` → `割り当て先ごとに…` |
| 自分で作ったテストの道具（`put`）が、同じ名前の静的インポートを隠して、コンパイルエラー | クラスの中のメソッドは、同じ名前のインポートより**優先される**。道具の名前は、別のもの（`register`）にする |
| 読み取り専用（`readOnly = true`）の処理の中で、設定を作る処理（INSERT）が入る | 読み取り専用の中で書くと、エラーになる。書く可能性がある処理は、読み取り専用にしない |
| 画像の登録日時が、登録直後の返事と、DBから読んだ値で、少しずれた（ナノ秒とマイクロ秒） | 保存して読み出しても同じ値になるよう、**精度をそろえてから**保存する（ミリ秒まで） |
| 共有のDBで、テスト同士が影響し合う | テストごとに、自分のデータを作り、**前後で元に戻す**。「自分のものだけ」を確かめる |
| 画面の予想と、サーバーの結果がずれる | 計算の考え方を、画面とサーバーで**そろえる**（移動の連番の振り直し）。計算は、画面を使わない関数に切り出して、テストする |
| 仕様どおりのつもりで作ったが、実際に動かすと違った（列の外で離したときの動き） | テストは、再現できる操作しか確かめられない。**実際に動かして、見て、仕様を直す**ことも大事 |

## 11. やってみよう
1. DBを起動して、`GET /api/columns` を、ブラウザで開く
2. PowerShell で、カードを1枚、追加する（[backend/README.md](../backend/README.md) の例）
3. バックエンドを止めて、もう一度起動し、`GET /api/cards` で、カードが残っているか確かめる
4. `psql` に入って、`SELECT * FROM card;` を実行する
5. DBを止めて（`docker compose stop db`）、バックエンドを起動し、エラーを見る。確かめたら、DBを起動し直す

## 12. カードの更新（PUT）と、説明文の追加
`PUT /api/cards/{id}` で、**タイトル・説明文・色・期限日**を、まとめて置き換える。流れは、追加（POST）と同じ層を通る。

```
画面  PUT /api/cards/5  {"title":"…","description":"…","color":"red","dueDate":"2026-11-01"}
  ↓
Controller   @PutMapping。入力をチェックする（CardUpdateRequest の @Valid）
  ↓
Service      updateCard：カードを探す（なければ404）→ 4項目を置き換える
  ↓
Entity       Card.update(…) が値を入れ替える → 保存（@Transactional）
```

- **PUT と PATCH**：PUT は「項目をまとめて置き換える」、PATCH は「送った項目だけ変える」。今回は、画面のモーダルが**いつも4項目を全部送る**ので、PUT にした。PATCH だと、「送っていない（変えない）」と「null を送った（消す）」を区別する必要があり、むずかしくなる
- **空の値は「消す」**：`description` や `dueDate` を `null` で送ると、その項目がなくなる。空白だけの説明文も、`null`（なし）として保存する
- **列と並び順は変えない**：`Card.update` は4項目だけを入れ替える。カードを動かすのは、ドラッグ＆ドロップの回で、別のAPIとして作る
- **`@Transactional` だけで保存される**：Service の中でEntityの値を変えると、メソッドが終わるときに、JPA が自動で `UPDATE` を実行する（`save` を呼ばなくてよい）
- **列の追加は、自動**：Entity に `description` を足すと、`ddl-auto: update` が、起動のときに card テーブルへ列を足す。既存のカードは、説明文が `null` のまま残る
- **追加と更新で、チェックを分けた**：`CardCreateRequest`（列IDが要る、色は省略可）と `CardUpdateRequest`（列IDは要らない、色は必須）。同じに見えても、お願いの意味が違うので、別のクラスにした
- テスト `CardUpdateApiTests`：更新できる／消せる／列と並び順が変わらない／2000文字の境界／400と404／検査に失敗したら内容が変わらない

### やってみよう
1. DBとバックエンドを起動して、カードを1枚追加する
2. [backend/README.md](../backend/README.md) の例で、そのカードを `PUT` で更新する
3. `SELECT id, title, description, color, due_date FROM card;` で、DBの中身が変わったか確かめる
4. 空のタイトルで `PUT` して、`400` になるか、DBが変わらないか確かめる

## 13. カードの削除（DELETE）
`DELETE /api/cards/{id}` で、カードを1枚消す。更新（PUT）と同じ層を通る。

```
画面  DELETE /api/cards/5
  ↓
Controller   @DeleteMapping。成功したら 204 No Content を返す
  ↓
Service      deleteCard：カードを探す（なければ404）→ 削除する（@Transactional）
  ↓
Repository   delete(card) が DELETE 文を実行する
```

- **204 No Content**：「成功した。でも、返す中身はない」という意味。消したカードの情報を返しても使い道がないので、本文は空にする。`@ResponseStatus(HttpStatus.NO_CONTENT)` で指定し、メソッドの戻り値は `void`
- **先に探してから消す**：いきなり `deleteById` を呼ばず、`findById` で探して、なければ404にする。「存在しないものを消そうとした」ことを、画面に伝えるため。2回続けて削除すると、2回目は404になる
- **消したものは戻せない**：ゴミ箱は作らない（要件）。そのため、確認メッセージは、画面側（次のIssue）で出す
- テスト `CardDeleteApiTests`：204が返る／消えたあとは404／一覧に出ない／ほかのカードは残る／存在しないカードは404／2回目は404

### やってみよう
1. カードを1枚追加して、IDを控える
2. `DELETE` で消して、`204` が返るか確かめる（`curl -i -X DELETE http://localhost:8080/api/cards/ID`）
3. もう一度同じ `DELETE` をして、`404` になるか確かめる
4. `SELECT id, title FROM card;` で、DBから消えたか確かめる

## 14. カードの移動（`PUT /api/cards/{id}/move`）
ドラッグ＆ドロップで、カードを別の列へ、または同じ列の中で動かすためのAPI。送る内容は、**動かした先の列（`columnId`）と、その列の中での位置（`index`、0が一番上）**だけ。

```
画面  PUT /api/cards/5/move  {"columnId":2,"index":0}
  ↓
Controller   @PutMapping("/cards/{id}/move")。入力をチェックする（CardMoveRequest の @Valid）
  ↓
Service      moveCard：カードと列を探す（なければ404）→ 並びを作り直す → 連番を振る
  ↓
Entity       Card.moveTo(列, 位置) が、列と position を入れ替える（@Transactional で保存）
```

- **なぜ、更新（PUT）とは別のAPIか**：更新の `PUT /api/cards/{id}` は、「列と並び順は変えない」と決めて作った。目的が違う（中身を直す／場所を動かす）ので、窓口を分けた。URLの `/move` は、「動かす」という操作の名前
- **position の持ち方：サーバーが、連番に振り直す**。画面が「position を何にするか」を計算すると、間違えやすい（前後のカードの値の間に入れる、など）。そこで、画面は「どの列の何番目か」だけを送り、サーバーが `0,1,2,…` に振り直す。これで、新しいカードの `-1, -2` のような負の値も、動かした列では消える
- **同じ列の中の移動と、別の列への移動は、同じ処理**：①動かす前の列の一覧から、動かすカードを抜く ②動かした先の列の一覧の `index` 番目に、差し込む ③それぞれ、上から `0,1,2,…` を振る。同じ列のときは、①と②が同じ一覧になる
- **`index` が大きすぎるとき**は、エラーにせず、一番下に入れる（`Math.min(index, 件数)`）。画面と通信している間に、列のカード数が変わっても、動くようにするため
- **`@Transactional` の中で、Entity の値を変えるだけで保存される**（更新と同じ）。複数のカードの `position` を変えても、全部まとめて成功か、全部取り消しになる。途中で失敗して、並びが半端になることはない
- **並びが同じ値のとき**：`findByColumnIdOrderByPositionAscIdAsc` は、position が同じカードを、id の順に並べる。古いデータで position が重なっていても、毎回同じ順番になる
- テスト `CardMoveApiTests`：別の列の先頭／末尾（範囲外の位置）／途中／同じ列の下へ・上へ／ほかのカードの順番が変わらない／タイトルなどが変わらない／取り直しても同じ／負の position が連番に直る／カード・列がなければ404（カードは動かない）／位置が負・列IDなしは400
  - DBは、ほかのテストと共有しているので、「自分のカードが、期待の位置にいるか」と「列の position が連番か」を調べる

### やってみよう
1. カードを2枚追加して、IDを控える
2. 片方を、別の列の先頭へ動かす（`columnId` を変えて `index` を 0 にする）
3. `SELECT id, column_id, position FROM card ORDER BY column_id, position;` で、動かした列と、動かす前の列の `position` が、0から始まる連番になったか確かめる
4. `index` に 9999 を送って、一番下に入るか確かめる。`-1` を送って、`400` になるか確かめる

## 15. 期限順の並び替え（`POST /api/columns/{id}/sort-by-due`）
列のカードを、期限の早い順に並べ直して、その結果を `position` として保存する。

```
画面  POST /api/columns/1/sort-by-due
  ↓
Controller   @PostMapping("/columns/{id}/sort-by-due")。並び直したカードの一覧を返す
  ↓
Service      sortColumnByDue：列を探す（なければ404）→ 列のカードを上から順に取る → 期限順に並べ替える → 0,1,2,… を振る
```

- **なぜ POST か**：GET は「見る」、PUT は「中身を置き換える」。「並べ直して、保存せよ」という**操作の指示**なので、POST にした。URLの `sort-by-due` は、その操作の名前（移動の `/move` と同じ考え方）
- **並べ替えは、サーバーでやる**。画面だけで並べ替えて見せても、画面を開き直したら元に戻る。「並べた順が保存される」という要件を守るため、サーバーが `position` を書き換える。画面は、結果を受け取って、表示するだけ
- **期限なしは末尾**：`Comparator.comparing(Card::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))`。`nullsLast` が「`null`（期限なし）を最後に回す」という指定。`naturalOrder` は、日付の自然な順（早いほうが先）
- **同じ期限は、今の順番のまま**：Java の `List.sort` は**安定な並べ替え**（同じ値の順番を変えない）。並べ替える前に、`position` 順（同じなら id 順）で取っておくので、同じ期限のカードは、今の並びのまま残る。2回押しても、結果が変わらない
- **移動API（14章）と同じ「連番の振り直し」**：並べ替えたあとに、`moveTo(列, i)` で `0,1,2,…` を振る。これで、負の `position` も、連番に直る。並び直した後でも、カードを手で動かせる（手動が優先）。新しいカードは「最小値−1」で入るので、一番上に来る
- **ほかの列には、触らない**：対象は、URLで指定した列だけ
- テスト `CardSortApiTests`：期限順で、期限なしが末尾／保存されて連番／同じ期限は今の順番のまま／2回押しても同じ／ほかの列は変わらない／並び直したあとに追加したカードは一番上／存在しない列は404
  - DBは共有なので、「列全体が、期限順になっているか」を調べる

### やってみよう
1. 期限の違うカードと、期限のないカードを、数枚追加する
2. `Invoke-RestMethod http://localhost:8080/api/columns/1/sort-by-due -Method Post` を実行して、返ってきた順番を見る
3. `SELECT id, title, due_date, position FROM card WHERE column_id = 1 ORDER BY position;` で、DBの並びも変わったか確かめる
4. 同じ期限のカードを2枚作り、並び直しても、2枚の順番が変わらないか確かめる

## 16. バックアップ（`GET /api/backup`、`POST /api/backup/restore`）
全部のデータ（列とカード）を、1つのJSONファイルとして書き出し、そのファイルから元の状態に戻せるようにする。データはDBに自動で保存されているので、これは「別の場所にファイルとして残す」ための機能。

```
書き出し  GET  /api/backup          → Service：列とカードを、入れ子の形にして返す
読み込み  POST /api/backup/restore  → Controller：@Valid で検査 → Service：全部消して、入れ直す（@Transactional）
```

| ファイル | 役割 |
|---|---|
| `dto/BackupFile` / `BackupColumn` / `BackupCard` | ファイルの形（record）。検査の決まり（`@NotBlank`、`@Pattern` など）も、ここに書く |
| `service/BackupService` | `export()`（書き出し）と `restore(file)`（読み込み） |
| `controller/BackupController` | 窓口。書き出しは GET、読み込みは POST（成功は 204） |

- **ファイルの形：入れ子にして、IDと position は入れない**。列の中にカードを入れて、並び順は**配列の順**で表す。IDや `position` の数値をファイルに入れると、「存在しない列を指すカード」のような食い違いが作れてしまう。入れ子なら、それが起きない。読み込むと、IDは新しく振られ、`position` は 0,1,2,… の連番になる（移動API、14章と同じ考え方）
- **`app` と `version` は、見分けの目印**。`app` が `taskboard` でないファイルは、別のアプリのファイルなので、読み込まない。`version` は、将来、形式を変えたときに、古いファイルを見分けるため（今は 1 だけ）
- **読み込みは、全部入れ替え。1つのトランザクションで**。①カードを全部消す ②列を全部消す ③ファイルの列とカードを入れる、を `@Transactional` の中で行う。**途中で失敗したら、全部取り消される**ので、「半分だけ消えた」状態にならない。カードが列を指している（外部キー）ので、**カードから先に消す**
- **検査は、DBに触る前に終わらせる**。`@Valid` の検査（色が6つのどれか、タイトルが空でない、日付の形など）に通らなければ、Service に入る前に **400** で返る。だから、不正なファイルでは、今のデータは何も変わらない。カードの数の上限（1万枚）だけは、Service の中で調べる（それでも、消す前に調べている）
- **知らない項目は、無視する**（Spring Boot の標準の動き）。将来、背景の設定を足しても、今のファイルが、そのまま読める
- **`deleteAllInBatch()`**：1件ずつ消さず、`DELETE FROM card` を1回で実行する。500枚あっても速い
- テスト `BackupApiTests`：書き出しの形／**書き出して → 壊して → 読み込むと、同じ内容に戻る（往復）**／今のカードが全部なくなる／並び順が配列の順で、position が連番、列の順が 1,2,3／負の position が連番に直る／説明文・色・期限日が戻り、空白だけの説明文はなくなる／背景などの知らない項目があっても読める／**不正なファイル19種類は 400 で、データが変わらない**／1万枚を超えると 400
  - 読み込みは、DBの中身を全部入れ替える。DBは、ほかのテストと共有なので、**各テストの前に今の状態を書き出し、終わったら読み込んで、元に戻す**（`@BeforeEach` / `@AfterEach`）
  - 注意：Javaのメソッド名には、空白が使えない。日本語のテスト名でも、`_` でつなぐ

### やってみよう
1. `Invoke-WebRequest http://localhost:8080/api/backup -OutFile backup.json` で、ファイルに保存して、中身を開く（列とカードが、入れ子になっている）
2. 画面で、カードを何枚か消す
3. `Invoke-RestMethod http://localhost:8080/api/backup/restore -Method Post -ContentType "application/json; charset=utf-8" -InFile backup.json` で読み込む。画面に、消したカードが戻る
4. `backup.json` の `"app"` を `"other"` に変えて読み込み、`400` になるか、データが変わらないかを確かめる
5. （注意）`backup.json` は、個人の予定が入るので、リポジトリに入れない

## 17. 設定（選んだ背景）と、バックアップへの組み込み
背景機能の最初の段階。選んだ背景（無地・青空・夕焼け・星空・自動）をDBに保存し、画面を開き直しても残るようにする。画面は、次のPRで作る。

| ファイル | 役割 |
|---|---|
| `entity/BoardSetting` | 設定のEntity（表 `board_setting`）。**1件だけ**持つので、`id` はいつも 1 |
| `repository/BoardSettingRepository` | 保存・検索（`JpaRepository` を継承するだけ） |
| `service/SettingService` | `find()`（なければ作る）と `update(背景)` |
| `controller/SettingController` | `GET /api/settings`、`PUT /api/settings` |
| `dto/SettingResponse` / `SettingUpdateRequest` | 返す形／受け取る形（値の検査つき） |

- **1件だけの設定の持ち方**：カードのように増えるものではないので、`id` を自動採番にせず、**固定の 1**にした（`@GeneratedValue` を付けない）。「ある（1件）か、ない（初めて）か」だけを考えればよい。取得のとき、なければ初期値（青空）で作る
- **初期値は、2か所で用意する**：①起動したときに `DataInitializer` が、なければ作る（列と同じ）。②万一なくても、取得のときに作る（`SettingService.load()` の `orElseGet`）。どちらかが抜けても、動く
- **値の検査は、正規表現（`@Pattern`）**：`plain|sky|sunset|night|auto`。決まった選択肢なので、列挙（enum）にもできるが、DBには文字列で入れ、検査だけをAPIの入口で行った（色 `color` と同じ作り）。同じ正規表現を、`SettingUpdateRequest` と `BackupSettings` の両方で使うので、`BoardSetting.BACKGROUND_PATTERN` という**定数**にまとめた（アノテーションの値には、定数しか書けない）
- **バックアップへの組み込み**：`BackupFile` に、省略できる項目 `settings` を足した。**形式の version は 1 のまま**：項目を「足した」だけで、古いファイルも、そのまま読めるため（`settings` がなければ青空）。形式を壊す変更（項目の削除や意味の変更）のときに、version を上げる
  - 書き出し：現在の背景を `settings.background` に入れる
  - 読み込み：`settings` があればその背景に、なければ青空にする。同じトランザクションの中なので、列・カード・背景が、まとめて成功か、まとめて取り消し。`settings` の値が不正なら、`@Valid` で400になり、何も変わらない
- **`export()` から `@Transactional(readOnly = true)` を外した**：書き出しの中で `SettingService.find()` を呼ぶと、設定がまだないとき、INSERT が必要になる。**読み取り専用の中で書くとエラー**になるので、外した（ふだんは、起動時に作られるので書かない）
- **自分の背景画像には、触らない**：読み込みで消すのは、カードと列だけ。画像は別の表（このあと③で作る）なので、そのまま残る
- テスト：`SettingApiTests`（行を消した状態で取得すると青空で作られる／全ての背景に更新できて、取り直しても残る／不正な値・空・無しは400で変わらない）、`BackupApiTests` に追加（書き出しに背景が入る／往復で背景が戻る／設定がない古いファイルは青空／設定が不正なら400で、データも背景も変わらない）
  - 設定は、DB全体で1つだけ。ほかのテストと共有なので、**前の値を覚えておき、終わったら戻す**

### やってみよう
1. `Invoke-RestMethod http://localhost:8080/api/settings` で、背景を取得する（初めては `sky`）
2. `-Method Put -Body '{"background":"night"}'` で更新して、もう一度取得する。バックエンドを再起動しても、`night` のまま
3. `{"background":"rainbow"}` を送って、`400` になるか確かめる
4. `SELECT * FROM board_setting;` で、1件だけあることを確かめる
5. `GET /api/backup` に、`"settings":{"background":"night"}` が入っていることを確かめる

## 18. 自分の背景画像（画像をDBに保存する）
青空・夕焼け・星空に、自分の画像を割り当てられるようにする。画像を**DBに保存**し、登録・取得・削除するAPIを作る。画面は、このあとのPRで作る。

| ファイル | 役割 |
|---|---|
| `entity/UserBackgroundImage` | 画像のEntity（表 `user_background_image`）。`slot` が主キー、画像のバイト列、更新日時 |
| `repository/UserBackgroundImageRepository` | 保存・検索。一覧用に、画像を読まない検索を足した |
| `service/BackgroundImageService` | 登録・取得・削除と、検査（割り当て先、JPEG、大きさ） |
| `controller/BackgroundImageController` | `GET`（一覧・画像）、`PUT`、`DELETE` |
| `dto/BackgroundImageResponse` | 一覧と登録の返事（`slot` と `updatedAt`） |

- **画像を、DBに入れる（bytea）**：画像のファイルは、バイト列（`byte[]`）として、1つの列に入れる。PostgreSQL では `bytea` 型。Hibernate に `@JdbcTypeCode(SqlTypes.VARBINARY)` と書くと、`oid`（別の場所に置く「ラージオブジェクト」）ではなく、**ふつうの `bytea` の列**になる。実際のDBで `pg_typeof(image)` を調べて、`bytea` を確かめた
- **ファイルではなく、DBに入れた理由**：①ブラウザを変えても、PCを再起動しても残る ②DBと同じ場所にあるので、置き場所・権限・削除の同期を考えなくてよい ③縮小済みのJPEGで数百KBなので、3枚でも軽い。大きな画像を何百枚も扱うなら、ファイルに置くほうがよい
- **割り当て先（slot）を、主キーにした**：「1つの割り当て先に、最大1枚」という決まりを、データの形で守る。登録すると、同じ `slot` の行を置き換える（なければ作る）。無地（plain）と自動（auto）には、割り当てない
- **JPEGかどうかは、先頭の3バイトで見分ける**：JPEGのファイルは、必ず `FF D8 FF` で始まる（マジックナンバー）。ファイルの名前や、送られてきた `Content-Type` は、いくらでも偽れるので、**中身で調べる**。PNGや文字は、先頭が違うので、400になる
- **大きさの上限は5MB**：画面が、横1920pxに縮小してから送るので、ふつうは数百KB。上限は、「画面を通さずに、巨大なデータを送られても、DBが膨らまない」ための安全弁。**ちょうど5MBは通り、1バイトでも超えると413**（Content Too Large、「大きすぎる」を表す標準の番号）になることを、境目のテストで確かめた
- **本文は、JPEGのバイト列そのもの**。JSONに包んだり、`multipart`（ファイルの送信の形式）にしたりしないので、サーバー側が簡単。空の本文は、JPEGの検査で400になる
- **大きさは、「読む前」に調べる**：最初は `@RequestBody byte[] image` と書いていた。これは「本文を**全部**読み込んで、`byte[]` にして渡す」ので、5MBの検査をする前に、巨大な本文（300MBで試した）が、全部メモリに載ってしまった（品質チェックの B2）。そこで、`HttpServletRequest` を受け取り、①送られてくる大きさの申告（`Content-Length`）が5MBを超えていれば、本文に触れずに413 ②申告がない送り方や、申告が嘘のときのために、`readNBytes(5MB + 1)` で、上限より1バイト多くまで読んで、やめる、の2段構えにした。直したあと、300MBを送ると、受け取るのは約0.3MB（申告あり）〜5.6MB（申告なし）で、すぐ413が返る（直す前は、314,572,803バイトを全部受け取ってから400）
- **「読んだ量」を数えるテスト**：巨大な本文を本当に送らずに、読んだバイト数を数える偽のリクエスト（`MockHttpServletRequest` を継いだもの）で、「申告が大きいときは0バイトしか読まない」「申告がなくても、上限+1バイトで読むのをやめる」を確かめた。Springを起動しない、ふつうの単体テスト（速い）
- **一覧では、画像を読まない**：`select new …(i.slot, i.updatedAt)` という検索で、画像の列を読まずに、`slot` と日時だけを取る。画像は大きいので、一覧のたびに読むのは無駄
- **ETag で、送り直しを減らす**：画像を返すとき、登録（置き換え）の日時から作った `ETag` を付ける。ブラウザは、2回目から `If-None-Match` を付けて聞き、変わっていなければ **304**（本文なし）が返る。`Cache-Control: no-cache` は「使う前に、必ず聞く」という意味（保存しないという意味ではない）
- **日時は、ミリ秒にそろえる**：`Instant.now()` はナノ秒まであるが、DBは精度が違う（マイクロ秒）。登録直後の返事と、DBから読んだ値が、少しずれてしまう。画面は日時を目印に使うので、`truncatedTo(ChronoUnit.MILLIS)` で、ミリ秒までにそろえた（テストで、同じ値になることを確かめた）
- **バックアップには入れない**：仕様どおり。バックアップを書き出しても画像は入らず、読み込みで消えるのはカードと列だけ（画像は別の表）。テストで確かめた
- テスト `BackgroundImageControllerTests`（2件。読む量の上限）と、`BackgroundImageApiTests`（12件）：登録・一覧・取得（同じバイト列）／ETag の304と置き換え／登録し直すと1枚のまま／割り当て先ごとに別の画像／削除して404／なければ404／割り当て先が違えば404／JPEGでない・空・短すぎるは400／失敗しても元の画像は変わらない／5MBの境目／バックアップに入らず、読み込みでも残る
  - 本物のJPEGは、テストの中で `ImageIO` を使って作る（個人の画像は使わない）
  - 自分で作ったヘルパーの名前（`put`）が、静的インポートした `put` を**隠して**しまい、コンパイルエラーになった。ヘルパーは `register` にした

### やってみよう
1. `Invoke-RestMethod http://localhost:8080/api/background-images/sky -Method Put -ContentType "image/jpeg" -InFile my.jpg` で、JPEGを登録する
2. `GET /api/background-images` で、一覧を見る（画像のデータは入っていない）
3. `Invoke-WebRequest http://localhost:8080/api/background-images/sky -OutFile got.jpg` で取り出し、元の画像と同じか、開いて確かめる
4. PNG（や、テキストファイル）を送って、`400` になるか確かめる。`/api/background-images/auto` に送って、`404` になるか確かめる
5. `SELECT slot, pg_typeof(image), length(image) FROM user_background_image;` で、`bytea` で入っていることを確かめる
6. `-Method Delete` で消して、`GET` が `404` になるか確かめる
