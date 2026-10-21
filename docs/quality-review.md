# 品質チェックの記録（2026-10-21）

計画した機能がすべてできた時点で、実装の品質を点検した結果を記録する。
点検の観点は、(1) React・Spring Boot の標準的な作り方から外れていないか、(2) 自動チェックは足りているか、(3) 文書が実装とずれていないか。

- 点検の方法：バックエンド（`backend/`）、フロントエンド（`frontend/`）、文書（`docs/` と各 README）を、読んで確かめた。**指摘の多くは、読んで見つけたもの**で、動かして再現したものではない（動かして確かめたものは、そう書く）
- 重大度：高＝すぐ直したい／中＝早めに直したい／低＝余裕があるとき
- 「判断」の欄は、直すかどうかを決めたら、書く（空欄は、まだ決めていない）

## 1. 今回の対応（Issue #78）
| 対応 | 内容 |
|---|---|
| 画面の lint を強化 | oxlint に `jsx-a11y`（アクセシビリティ）を追加。`correctness` 系を error、`react/exhaustive-deps` を有効、`--deny-warnings` で警告も失敗にした。`tsconfig` の `strict` を明示した |
| サーバーの静的解析を導入 | Checkstyle、SpotBugs、JaCoCo を導入し、`.\gradlew.bat check` で実行できるようにした（Java 25 で動くことを確認） |
| 文書を実装に合わせた | 検索機能の追記、「未実装」「未決定」のままの記述の更新、画面の記述の修正など |
| 手順のスキル化 | この品質チェックの手順を、プロジェクト用のスキル `quality-check`（`.claude/skills/quality-check/SKILL.md`）にした。次の点検は、「品質チェックをして」と頼むと、同じ手順で進められる |
| 動かして確かめたこと | `npm run lint`（警告 0）、`npm test`（154 件）、`npm run build`、`.\gradlew.bat check`（成功。命令数のカバレッジは約 99%） |

lint で見つかった違反 13 件（すべて `jsx-a11y`）の扱い：
- 窓の外を押して閉じる処理など、意図のある 4 か所：理由を書いて、その行だけ除外した（`CardModal`、`ConfirmDialog`、`CardComposer`、`Calendar`）
- `no-autofocus`：モーダルや入力欄の最初のフォーカスのために使っているので、規則を外した
- `prefer-tag-over-role`：`role="dialog"` を `<dialog>` に置き換える指摘。置き換えは挙動が変わるので、F1 として別に扱った（F1 は対応済み。この規則は、期限のカレンダーなど、モーダルでない窓にも当たるので、外したままにしている）

SpotBugs の `EI_EXPOSE_REP` / `EI_EXPOSE_REP2`（9 件）：リストを持つ record と、Spring が部品を渡す仕組み（DI）への、定番の誤検知なので、理由を書いて除外した（`backend/config/spotbugs/exclude.xml`）。

## 2. 今回は直さないこと（別 Issue の候補）
この PR は、チェックの追加と文書の修正だけで、**動作を変えるコードの修正は含まない**。次の指摘は、ユーザーが優先度を決めてから、別の Issue で進める。

### 2.1 バックエンド
| ID | 重大度 | 場所 | 指摘 | 推奨 | 判断 |
|---|---|---|---|---|---|
| B1 | 高 | `application.yml` の `ddl-auto: update` | スキーマの変更履歴が残らない。列の削除や型の変更はされない | Flyway を導入し、`ddl-auto: validate` にする | 対応済み（Issue #88）。V1 を作り、既存DBは baseline で受け入れた。カード17枚の `md5` が前後で同じことと、`validate` がずれを検出することを、動かして確かめた |
| B2 | 中〜高 | `BackgroundImageController.put`（`@RequestBody byte[]`） | 本文を全部メモリに読んでから 5MB を判定していた。300MB を送ると、全部（314,572,803 バイト）を受け取ってから 400 を返すことを、動かして確かめた。超過時のコードも 400（標準は 413） | `Content-Length` を先に検査し、申告がなくても上限+1 バイトで読むのをやめる。超過は 413 | 対応済み（Issue #83）。直したあと、300MB は約 0.3MB（申告あり）〜5.6MB（申告なし）で 413 |
| B3 | 中 | `backend/src` 全体（`@RestControllerAdvice` が 0 件。`ResponseStatusException` が 15 か所） | Service が web 層の型（`ResponseStatusException`）を投げている。エラー本文の形が、Spring 標準のまま | 業務の例外（例：カードが見つからない）を作り、`@RestControllerAdvice` で `ProblemDetail`（RFC 9457）にそろえる | |
| B4 | 中 | `UserBackgroundImageRepository`（DTO を import）、`BackgroundImageController`・`BackgroundImageService`（Entity を直接扱う） | 層の依存が逆向き。JPQL に DTO のクラス名を文字列で埋め込んでいる | インターフェース射影にする。Service は Entity でなく専用の型を返す。ArchUnit で再発を防ぐ | |
| B5 | 中 | `application.yml`（`open-in-view` の指定なし） | 既定の true で、起動時に警告が出る。DB の接続を長く持つ | `spring.jpa.open-in-view: false` を明示 | |
| B6 | 中 | `SettingService` | 取得（GET）が、なければ作る（書き込み）を兼ねている。同時に初回アクセスがあると衝突するおそれがある | 起動時に作る（`DataInitializer`）だけにして、取得は読み取り専用にする | |
| B7 | 中 | `BoardService.moveCard` | 同時に動かしたときの排他制御がない。列のカード全部を毎回更新する | 楽観ロック（`@Version`）を検討。1 人用なので、優先度は低めでもよい | |
| B8 | 中 | `BackupService`（読み込み） | カードを 1 件ずつ INSERT する（自動採番のため、まとめて INSERT できない）。最大 1 万枚で遅くなる。JSON 本文の大きさの上限もない | 採番をシーケンスに変えて、まとめて INSERT。本文の上限を設ける | |
| B9 | 低 | カードの色の正規表現が 3 か所（`CardCreateRequest`、`CardUpdateRequest`、`BackupCard`） | 重複。色を足すと、直し漏れが起きる | `enum` か共通の定数にする | |
| B10 | 低 | `POST /api/cards` | `Location` ヘッダがない | `ResponseEntity.created(...)` | |
| B11 | 低 | `HealthController` | 自作の動作確認 | `spring-boot-starter-actuator` の `/actuator/health` | |
| B12 | 低 | `application.yml`（`show-sql: true`）、`docker-compose.yml`（5432 を全部に公開） | 常時 SQL を出す。DB のポートが、外にも開く | 開発用の設定に限る。`127.0.0.1:5432:5432` にする | |
| B13 | 低 | `card.column_id` | 外部キーに索引がない（PostgreSQL は自動で作らない） | `@Index` を付ける | Flyway が入ったので、`V2__…sql` で足せる（Issue #88 のあと） |
| B14 | 低 | テスト | テストが同じ DB を共有し、`BackupApiTests` は手で元に戻している。失敗すると、データが残る | `@Transactional` か、`@BeforeEach` で全消去にそろえる | |
| B15 | 前提 | 全体 | 認証と CSRF 対策がない。`POST /api/backup/restore` は全データを入れ替える | 1 人でこの PC だけで使う前提（`non-functional-requirements.md`）を守る。公開する場合は、Spring Security が必要 | |

### 2.2 フロントエンド
| ID | 重大度 | 場所 | 指摘 | 推奨 | 判断 |
|---|---|---|---|---|---|
| F1 | 高〜中 | `CardModal.tsx`、`ConfirmDialog.tsx` | `aria-modal="true"` だが、フォーカスが窓の中に閉じ込められておらず、閉じたあとにフォーカスが元に戻らなかった。閉じたあと Tab を押すと、ブラウザの部品（タブ検索）に飛ぶことを、動かして確かめた | ネイティブの `<dialog>` と `showModal()` に置き換える | 対応済み（Issue #86）。共通部品 `ModalDialog` を作り、ブラウザで、閉じ込めと復帰を確かめた |
| F2 | （再現せず） | `CardComposer.tsx`（`handleBlur`） | 「キーボードで期限のカレンダーに Tab で移ると、誤って確定する」という指摘だったが、**再現しなかった**（Issue #81）。カレンダーは画面の末尾に描かれるので、Tab で進むと、カレンダーではなく、欄の外の部品に移る。欄の外に出たので、確定するのは、設計どおり。マウスで日付を選ぶ操作も、確定しない | 動きを固定するテストを追加した（`CardComposer.test.tsx`）。本当の問題は、カレンダーにキーボードで入れないこと（F6） | 対応済み（調査のみ） |
| F3 | 中 | `api/client.ts` | 通信を中断できない（`AbortSignal` なし）。404 と 400 の文言が、どの操作でも同じ（例：期限順の 404 でも「カードが見つかりません」）。サーバーが HTML を 200 で返したときの、JSON の読み取りの失敗を処理していない。画面全体の ErrorBoundary もない | `AbortController`、操作ごとの文言、JSON の失敗の処理、ErrorBoundary | |
| F4 | 中 | `useSettings.ts`、`Board.tsx` | 素早い連続操作（背景を続けて選ぶ、連続でドラッグ）で、失敗したときの「元に戻す」が、あとの操作の結果を消すことがある | 保存中は次の操作を待たせる、または順番に処理する | |
| F5 | 中 | `lib/image.ts`、`lib/backup.ts` | 画像：ファイルの大きさ（20MB）しか見ない。展開後の画素数に上限がない。バックアップ：読む前の大きさの上限と、`version` の検査がない | 画素数の上限、ファイルの大きさの上限、`version` の確認 | |
| F6 | 中 | `DuePicker.tsx`、`Calendar.tsx`、`BackgroundPicker.tsx` | 小さな窓を開いても、フォーカスが移らない。矢印キーで日付や背景を選べない（ARIA の `radiogroup` なのに） | フォーカスの移動、矢印キーの操作 | |
| F7 | 中 | テスト | アクセシビリティの自動検査（例：`jest-axe`）、フォーカス、連続操作のテストがない。カバレッジの設定もない | 追加を検討 | |
| F8 | 低 | `Board.tsx`、`BoardColumn.tsx` ほか | `'完了'` と `255` の重複、`useCallback` の不足、`as` によるキャストの多用、期限切れの判定が 2 か所、`BackupControls` の完了表示に `aria-live` がない | 定数・関数にまとめる。型ガードにする | |
| F9 | 低 | 設定 | Prettier（整形の自動化）と CI（PR での自動チェック）がない。TypeScript の `noUncheckedIndexedAccess` などは未設定 | 導入を検討（整形は差分が大きいので、単独の PR で） | |
| F10 | 低 | `CardItem.tsx` | カード全体が「押すボタン」と「ドラッグのつかみ口」を兼ねる。短い押下とドラッグを、100ms の待ち（`justDraggedRef`）で区別している | ドラッグ用のつかみ口を分ける | |

### 2.3 実装を設計書に合わせる事項
| ID | 内容 | 状況 |
|---|---|---|
| D1 | ドロップ先を青い線で示す（`screen-design.md` 8章）。実装は、他のカードが動いて空きができるだけで、青い線がなかった | **設計書が正**（ユーザーの指示）。実装を設計書に合わせた | 対応済み（Issue #79）。落とす場所のすぐ上に、青い線（3px）を出す。ユーザーが、マウスとキーボードで、見た目を確認済み |

## 3. 良かった点
- バックエンド：コンストラクタ注入、record の DTO と Entity の分離、`@Transactional(readOnly = true)`、入力の検査（`@Valid`）、適切な HTTP ステータス（404・400・204・304）、画像の保存先をファイルでなく DB にしたことで、パスの問題がないこと、テストが厚いこと（Testcontainers で本物の PostgreSQL を使う）
- フロントエンド：`any`・`@ts-ignore`・`dangerouslySetInnerHTML` が 1 つもない。二重送信の防止、日本語入力の変換中の Enter の除外、キーボードで動かせる dnd-kit の設定と日本語の読み上げ、楽観的更新と失敗時の巻き戻し、通信を差し替えたテスト
- 秘密情報（DB のパスワード）は、`.env` に分けてあり、コミットされない

## 4. 文書と実装のずれ（今回直したもの）
| 文書 | 直した内容 |
|---|---|
| `screen-design.md` | 検索の追加（2.1）、キーボード操作、削除の確認がモーダルの中に出ること、確認のボタンの順、カード追加時の表示（色の丸と期限ボタン）、画面下の注意書きの削除、星空の透け方、ホバーの見た目、アイコンの部品の決定 |
| `functional-requirements.md`、`requirements.md`、`use-cases.md` | 検索（機能 1.7、UC-13）、キーボード操作、5MB の注記、細かい操作の追記 |
| `data-design.md` | `board_setting`・`user_background_image` のテーブルの追加、未決定だった画像の保存方法の削除、完了列の考え方 |
| `tech-stack.md` | 現在の状況、入力の検査、静的チェックの追加、未決定の更新 |
| `non-functional-requirements.md`、`CREDITS.md` | 画像の出どころの場所、5MB の注記、登録機能の現在形 |
| `backend/README.md`、`frontend/README.md`、`README.md`、`CLAUDE.md` | `gradlew check`、`400` の理由、エラー本文の形、フォルダの構成 |

直していない、既知のずれ：
- バックアップ復元のあと、背景画像の一覧を取り直していない可能性（バックアップに画像は入らないので、影響は小さいと見ている。未確認）
