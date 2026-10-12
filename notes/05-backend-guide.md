# 05 バックエンドの仕組み

`backend/` の中の、Java + Spring Boot のサーバー。**本番の土台**になる（プロトタイプと違い、使い捨てではない）。
使い方の詳細は [backend/README.md](../backend/README.md)、技術の決定は [docs/tech-stack.md](../docs/tech-stack.md) を参照。

## 1. 全体像：レストランにたとえると

| レストラン | このアプリ | 技術 |
|---|---|---|
| お客さん | 画面 | React（これから作る） |
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
| 400 | お願いの内容がおかしい（タイトルが空、色が不正） |
| 404 | 見つからない（存在しない列） |
| 500 | サーバー側の問題 |

### 今あるAPI
| API | 内容 |
|---|---|
| `GET /api/health` | 動作確認。`{"status":"ok"}` |
| `GET /api/columns` | 列の一覧 |
| `GET /api/cards` | カードの一覧 |
| `POST /api/cards` | カードの追加 |

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
| `ddl-auto` や Flyway を、どちらにするか | 前に決めたことでも、**講義の流れが分かったら、変えてよい**。理由を残しておく |

## 11. やってみよう
1. DBを起動して、`GET /api/columns` を、ブラウザで開く
2. PowerShell で、カードを1枚、追加する（[backend/README.md](../backend/README.md) の例）
3. バックエンドを止めて、もう一度起動し、`GET /api/cards` で、カードが残っているか確かめる
4. `psql` に入って、`SELECT * FROM card;` を実行する
5. DBを止めて（`docker compose stop db`）、バックエンドを起動し、エラーを見る。確かめたら、DBを起動し直す
