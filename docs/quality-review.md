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
| B2 | 中〜高 | `BackgroundImageController.put`（`@RequestBody byte[]`） | 本文を全部メモリに読んでから 5MB を判定していた。300MB を送ると、全部（314,572,803 バイト）を受け取ってから 400 を返すことを、動かして確かめた。超過時のコードも 400（標準は 413） | `Content-Length` を先に検査し、申告がなくても上限+1 バイトで読むのをやめる。超過は 413 | 対応済み（Issue #83）。直したあと、300MB は約 0.3MB（申告あり）〜5.6MB（申告なし）で 413。画面の文言も、Issue #84 で対応済み |
| B3 | 中 | `backend/src` 全体（`@RestControllerAdvice` が 0 件。`ResponseStatusException` が 15 か所） | Service が web 層の型（`ResponseStatusException`）を投げている。エラー本文の形が、Spring 標準のまま | 業務の例外（例：カードが見つからない）を作り、`@RestControllerAdvice` で `ProblemDetail`（RFC 9457）にそろえる | 対応済み（Issue #114）。業務の例外3つ（`NotFoundException`・`InvalidRequestException`・`PayloadTooLargeException`）を作り、Service 13か所と Controller 1か所を置き換えた。`ApiExceptionHandler`（`@RestControllerAdvice`）が、`ProblemDetail`（`application/problem+json`）にそろえる。検査の失敗には `errors` を足し、想定外の 500 はログに残して一般的な文言を返す。状態コードは変えていない。ArchUnit に「Service は web・http の型に依存しない」規則を足した。起動して、404・400・405・413 と、DBを止めた本物の 500 の本文を確かめた。Spring 標準の例外の `detail`（壊れたJSON、存在しないパス、405 など）が英語のまま残っていたのは、Issue #116 で日本語にした（`messages.properties`） |
| B4 | 中 | `UserBackgroundImageRepository`（DTO を import）、`BackgroundImageController`・`BackgroundImageService`（Entity を直接扱う） | 層の依存が逆向き。JPQL に DTO のクラス名を文字列で埋め込んでいる | インターフェース射影にする。Service は Entity でなく専用の型を返す。ArchUnit で再発を防ぐ | 対応済み（Issue #112）。Repository は射影 `Summary` で受け取り、JPQL の文字列を消した。Service は `BackgroundImageData` を返し、Controller は Entity を import しない。ArchUnit のテスト（`LayerDependencyTests`）で、直す前は2つの規則が失敗し、直したあと通ることを確かめた。一覧の SQL が画像のデータ（`image` 列）を読まないことも確かめた。**DTO が Entity を import している所（`from(Entity)` と、色・背景の定数）は、一般的な書き方なので、意識して残す**（ArchUnit のテストでも認めている） |
| B5 | 中 | `application.yml`（`open-in-view` の指定なし） | 既定の true で、起動時に警告が出る。DB の接続を長く持つ | `spring.jpa.open-in-view: false` を明示 | 対応済み（Issue #100）。設定を足し、遅延読み込みの失敗が出ないこと（既存のAPIテスト全部）を確かめた |
| B6 | 中 | `SettingService` | 取得（GET）が、なければ作る（書き込み）を兼ねている。同時に初回アクセスがあると衝突するおそれがある | 起動時に作る（`DataInitializer`）だけにして、取得は読み取り専用にする | 対応済み（Issue #118）。`find()` を読み取り専用（`readOnly = true`）にし、行が無いときは青空を返すだけで書き込まない。`update()` は、あれば更新・なければ作る。行を作るのは、起動時（`DataInitializer`）と PUT だけ。**再現した**：行が無い状態で、取得を8本同時に10回繰り返すと、直す前は3回とも500（主キーの重複）になった。直したあとは、3回とも全部200。起動して、あなたのDBの設定の行を消した状態で取得しても、行が作られない（行数0のまま。6本同時も全部200）ことを確かめ、最後に元の値に戻した。**残り**：行が無い状態の PUT が同時に来る衝突は残りうるが、起動時に作るので、実運用では起きない |
| B7 | 中 | `BoardService.moveCard` | 同時に動かしたときの排他制御がない。列のカード全部を毎回更新する | 楽観ロック（`@Version`）を検討。1 人用なので、優先度は低めでもよい | 対応済み（Issue #122）。**悲観ロック**にした：並べ直す前に、全部の列の行を `FOR UPDATE`（実際は `for no key update`）でロックし、`createCard`・`moveCard`・`sortColumnByDue` を1つずつ順番に処理する（`BoardColumnRepository.findAllForUpdate()`、`BoardService.lockBoard()`）。楽観ロック（`@Version`）は、Flyway の移行・409・画面の対応が要り、カード追加との競合も防げないため、採らなかった。**問題を再現した**：8本の同時アクセスのテスト（`CardMoveConcurrencyTests`、4件）を直す前に3回実行し、**3回とも全件失敗**した（移動・並べ替えは、8本のうち6〜7本が、デッドロックで500。追加は、position が重複）。直したあとは、3回とも全件成功。ユーザーのDBで、一時カード6枚を同時に動かし、全部200・列が連番・重複0・ロックのSQLが出ることを確かめ、一時カードを消して元の position に戻し、カードの `md5` が元と一致することを確認した。**残り**：バックアップの復元との競合は、範囲外（復元は全部入れ替える別の操作）。画面は、移動の保存中でも次のドラッグを止めない（F4 の範囲）。列が大幅に増えるなら、関係する列だけをロックする形に見直す |
| B8 | 中 | `BackupService`（読み込み） | カードを 1 件ずつ INSERT する（自動採番のため、まとめて INSERT できない）。最大 1 万枚で遅くなる。JSON 本文の大きさの上限もない | 採番をシーケンスに変えて、まとめて INSERT。本文の上限を設ける | |
| B9 | 低 | カードの色の正規表現が 3 か所（`CardCreateRequest`、`CardUpdateRequest`、`BackupCard`） | 重複。色を足すと、直し漏れが起きる | `enum` か共通の定数にする | 対応済み（Issue #106）。`Card.COLOR_PATTERN` と `Card.COLOR_MESSAGE` の定数にして、3つの DTO から使う（背景の `BoardSetting.BACKGROUND_PATTERN` と同じ形）。整理の前後で、同じテスト（6色を受け付ける、それ以外は断る）が通ることを確かめた |
| B10 | 低 | `POST /api/cards` | `Location` ヘッダがない | `ResponseEntity.created(...)` | 対応済み（Issue #108）。`Location` ヘッダに `/api/cards/{id}` が付き、その住所で作ったカードが取れることを、テストで確かめた |
| B11 | 低 | `HealthController` | 自作の動作確認 | `spring-boot-starter-actuator` の `/actuator/health` | 対応済み（Issue #110）。公開は `health` だけ。起動して確かめた：DBが動いていれば `UP`（200）、DBを止めると `DOWN`（503。返事まで約30秒かかる）、再起動すると `UP` に戻る。自作は、DBが落ちていても `ok` を返していた |
| B12 | 低 | `application.yml`（`show-sql: true`）、`docker-compose.yml`（5432 を全部に公開） | 常時 SQL を出す。DB のポートが、外にも開く | 開発用の設定に限る。`127.0.0.1:5432:5432` にする | DBのポートは対応済み（Issue #102）。直す前は `0.0.0.0` と `[::]` の全入口で待ち受けていたのを、動かして確かめた。直したあとは `127.0.0.1` だけ。カード20枚の `md5` は前後で同じ、バックエンドも今までどおりつながった。`show-sql` も対応済み（Issue #104）。既定はオフにして、`.env` の `SHOW_SQL=true` でオンにできる。既定ではSQLが出ず、オンにすると出ることを、起動して確かめた |
| B13 | 低 | `card.column_id` | 外部キーに索引がない（PostgreSQL は自動で作らない） | `(column_id, position)` の索引を、Flyway の V2 で足す | 対応済み（Issue #92）。カード30万枚の使い捨て DB で測った：「列の最小位置」は約25ms → 約0.07ms。一方、「列の全部を取り出す」はほぼ同じ（約48ms → 約47ms）、10万枚の position の書き換えは約0.5秒 → 約0.9秒（1回ずつの測定）。このアプリ（最大1万枚）では、効果は小さい |
| B14 | 低 | テスト | テストが同じ DB を共有し、`BackupApiTests` は手で元に戻している。失敗すると、データが残る | `@Transactional` か、`@BeforeEach` で全消去にそろえる | **対応しない**（Issue #120）。理由：①`@Transactional` にすると、全体が1つのトランザクションで巻き戻るため、「コミットしたときに初めて起きる失敗」（例：B6 の主キーの重複）が、テストで見えなくなる。テストの本物らしさが下がる ②別スレッドで動く、同時実行のテスト（`SettingApiTests`）は、`@Transactional` にできない ③DB は Testcontainers の使い捨て（毎回新しく作る）で、後始末は `@AfterEach` ですでに動くため、得られるものが小さい。テストは、タイトルの接頭辞で互いに区別する作りで、順番に依存しないように書かれている（読んで判断したもので、順番を変えて実行して確かめてはいない）。見直す条件：後始末の失敗でテストが不安定になったとき |
| B15 | 前提 | 全体 | 認証と CSRF 対策がない。`POST /api/backup/restore` は全データを入れ替える | 1 人でこの PC だけで使う前提（`non-functional-requirements.md`）を守る。公開する場合は、Spring Security が必要 | **認証・CSRF 対策は、対応しない**（Issue #124）。理由：要件が「ログインは不要」「外部に公開しない」で、1人でこの PC だけで使う前提のため。Spring Security を入れると、ログインの画面・トークン・テスト・文書の変更が大きく、この用途には過剰。**ただし、前提を設定で守る対応は行った**：バックエンドが全部の入口（`::`）で待ち受けていて、この PC の Wi-Fi のアドレス経由でも `GET /api/backup`（全データの書き出し）が 200 で返ることを、起動して確かめた（別の PC から届くかは未確認）。`server.address: 127.0.0.1` を足し、`127.0.0.1` だけで待ち受けること、`http://localhost:5173` 経由の画面の通信が今までどおり200で動くこと、Wi-Fi のアドレス経由では接続できなくなることを確かめた（DB のポートは B12 で対応済み）。見直す条件：この PC の外（他の PC・スマホ・インターネット）から使う場合は、Spring Security による認証と CSRF 対策が必要 |

### 2.2 フロントエンド
| ID | 重大度 | 場所 | 指摘 | 推奨 | 判断 |
|---|---|---|---|---|---|
| F1 | 高〜中 | `CardModal.tsx`、`ConfirmDialog.tsx` | `aria-modal="true"` だが、フォーカスが窓の中に閉じ込められておらず、閉じたあとにフォーカスが元に戻らなかった。閉じたあと Tab を押すと、ブラウザの部品（タブ検索）に飛ぶことを、動かして確かめた | ネイティブの `<dialog>` と `showModal()` に置き換える | 対応済み（Issue #86）。共通部品 `ModalDialog` を作り、ブラウザで、閉じ込めと復帰を確かめた |
| F2 | （再現せず） | `CardComposer.tsx`（`handleBlur`） | 「キーボードで期限のカレンダーに Tab で移ると、誤って確定する」という指摘だったが、**再現しなかった**（Issue #81）。カレンダーは画面の末尾に描かれるので、Tab で進むと、カレンダーではなく、欄の外の部品に移る。欄の外に出たので、確定するのは、設計どおり。マウスで日付を選ぶ操作も、確定しない | 動きを固定するテストを追加した（`CardComposer.test.tsx`）。本当の問題は、カレンダーにキーボードで入れないこと（F6） | 対応済み（調査のみ） |
| F3 | 中 | `api/client.ts` | 通信を中断できない（`AbortSignal` なし）。404 と 400 の文言が、どの操作でも同じ（例：期限順の 404 でも「カードが見つかりません」）。サーバーが HTML を 200 で返したときの、JSON の読み取りの失敗を処理していない。画面全体の ErrorBoundary もない | `AbortController`、操作ごとの文言、JSON の失敗の処理、ErrorBoundary | |
| F4 | 中 | `useSettings.ts`、`Board.tsx` | 素早い連続操作（背景を続けて選ぶ、連続でドラッグ）で、失敗したときの「元に戻す」が、あとの操作の結果を消すことがある | 保存中は次の操作を待たせる、または順番に処理する | **背景は対応済み**(Issue #148)。**再現した**：無地から、夕焼け→星空と続けて選び、夕焼けの保存だけを失敗させると、星空の保存が成功しても、画面は無地に戻った(サーバーは星空。画面とずれる)。また、2つの保存が同時に送られていた。直し方：保存を、選んだ順に、1つずつ送る(前のが終わってから)。失敗したときは、あとにも選択があれば何もせず、最新の選択が失敗したときだけ、最後に保存できた値に戻す。**残り**：カードのドラッグ(次の Issue) |
| F5 | 中 | `lib/image.ts`、`lib/backup.ts` | 画像：ファイルの大きさ（20MB）しか見ない。展開後の画素数に上限がない。バックアップ：読む前の大きさの上限と、`version` の検査がない | 画素数の上限、ファイルの大きさの上限、`version` の確認 | **画像は対応済み**(Issue #142)。画像を開く前に、ファイルの先頭(最大1MB)から縦横の大きさを読み(PNG・JPEG・WebP)、**5000万画素**を超えるもの、縦横が読めないものを弾く(`readImageSize`、`isTooManyPixels`)。**確かめた**：107KBの PNG(3万×3万＝9億画素。開くと約3.6GB)を作り、弾かれること。本物の JPEG(標準の背景3枚)で、1920×1080 と読めること。PNG・WebP の読み方は、作ったバイト列のテストで確かめた(本物の PNG・WebP での確認は、ユーザーの画像で)。**バックアップも対応済み**(Issue #144)。選んだファイルが20MBを超えるときは、`text()` で読む前に断る(読んでいないことをテストで確認)。`version` が1以外(ない・文字も含む)のときは、「対応していないバージョンです。」を出し、確認は出さない(サーバーの `BackupFile.VERSION` と同じ)。サーバー側の本文の大きさの上限は、B8 で扱う。**F5 は、これで完了** |
| F6 | 中 | `DuePicker.tsx`、`Calendar.tsx`、`BackgroundPicker.tsx` | 小さな窓を開いても、フォーカスが移らない。矢印キーで日付や背景を選べない（ARIA の `radiogroup` なのに） | フォーカスの移動、矢印キーの操作 | **対応済み**（期限のカレンダー：Issue #94、背景の選択窓：Issue #95）。開くとフォーカスが窓の中に移る、矢印キーで動かす、Enter / Space で選ぶ、Tab は窓の中を回る、閉じるとボタンに戻る。ユーザーが、キーボードとマウスで確認済み。背景の窓は、矢印キーで「動かす」だけで、「選ぶ」のは Enter / Space（選ぶとすぐ切り替わって閉じるため。標準のラジオボタンとの違い） |
| F7 | 中 | テスト | アクセシビリティの自動検査（例：`jest-axe`）、フォーカス、連続操作のテストがない。カバレッジの設定もない | 追加を検討 | **一部対応済み**。**アクセシビリティの自動検査**：Issue #138。`axe-core 4.14.0`（版を固定）を直接使い、`src/test-utils/axe.ts` の `expectNoA11yViolations` で、主な7画面（ボード、カード追加、編集のモーダル、期限のカレンダー、削除の確認、背景の選択、読み込みの確認とお知らせ）を検査する。**測ったら、違反は0件**だった。検査が働くことは、わざと違反（名前のないボタン、dialog の中の名前のない入力欄）を入れて、赤になることで確かめた（`src/test-utils/axe.test.tsx`）。色のコントラストは、jsdom では計算できないので、検査していない（実際のブラウザで確かめる）。**フォーカスのテスト**は、すでに主な部品にある（Background・DuePicker・CardComposer・CardModal）ので、足していない。**カバレッジ**：Issue #140。`@vitest/coverage-v8 5.0.4`（vitest と同じ版）。`npm run test:coverage`。測ると、行95.8%・文94.5%・関数96.7%・分岐89.2%。低いのは、`image.ts`（42%。画像の縮小は、本物のブラウザの canvas が要り、jsdom では動かせない）と `main.tsx`（0%。起動の入口。測定から外した）。**しきい値**：行・文・関数90%、分岐80%（測った数字より少し下。ユーザーと決定）。CI の `npm test` を、`npm run test:coverage` に置き換えた（テストは1回だけ）。**F7 は、これで完了。連続操作の競合のテストは、F4 で扱う** |
| F8 | 低 | `Board.tsx`、`BoardColumn.tsx` ほか | `'完了'` と `255` の重複、`useCallback` の不足、`as` によるキャストの多用、期限切れの判定が 2 か所、`BackupControls` の完了表示に `aria-live` がない | 定数・関数にまとめる。型ガードにする | 一部対応済み(Issue #132)。`'完了'`・文字数の上限は `lib/cardRules.ts` に、期限切れの判定は `isCardOverdue` にまとめた。`as` は、バックアップの検査（型ガード `isBackupFile`）と背景画像の割り当て先（`USER_IMAGE_SLOTS`）で外した（`client.ts` の `as T` は、通信の返事の形を決める所なので残した）。**`useCallback` は対応しない**：`memo`・`useMemo` を使っていないので、関数を固定しても、再描画は減らない。`BackupControls` の完了表示は、常にある `role="status"` の入れ物に入れた(Issue #134)。これで F8 は全部対応済み |
| F9 | 低 | 設定 | Prettier（整形の自動化）と CI（PR での自動チェック）がない。TypeScript の `noUncheckedIndexedAccess` などは未設定 | 導入を検討（整形は差分が大きいので、単独の PR で） | **CI と Prettier は、対応済み**。CI：Issue #126（`.github/workflows/ci.yml`）。PR と main への push で、サーバー（`gradlew check`）と画面（lint・整形・test・build）を自動で走らせる。初回で成功し、ログで、テストが実際に走ったことを確認した。実行環境は、確かめて成功した Ubuntu 24.04 に固定した（`ubuntu-latest` が Ubuntu 26 へ切り替わっていくという注釈に、ユーザーが気づいた）。Prettier：Issue #128。測ってから決めた（120文字幅なら18ファイル・約114行、100文字幅なら35ファイル）。整形の前後で、テスト197件・lint・build が同じ結果。CI でも `format:check` を確かめる。①「CI が通らないとマージできない」設定（必須チェック）は、Issue #130 で追加（ユーザーの同意済み。`CLAUDE.md` の 3.7）。②`noUncheckedIndexedAccess` は**対応しないと決定**（Issue #136、2026-10-26）。有効にして測ると、22件のエラー（本番のコード8件＝`BackgroundPicker.tsx`・`calendar.ts`・`focusTrap.ts`、テスト14件）。直すには、日付やキーボード操作の部品の動きを、テストで守ってから直す必要があり、作業が中くらい。一方、このアプリは、モーダルにボタンが必ずあるなど、「空だったとき」に落ちる場面がほとんどなく、実害が起きる可能性が低い。作業に見合わないので、B14 と同じ考え方で、対応しない。**F9 は、これで完了**
| F10 | 低 | `CardItem.tsx` | カード全体が「押すボタン」と「ドラッグのつかみ口」を兼ねる。短い押下とドラッグを、100ms の待ち（`justDraggedRef`）で区別している | ドラッグ用のつかみ口を分ける | **対応しないと決定**(Issue #146、ユーザーと相談)。理由：①仕様(`docs/screen-design.md` 3.3「カードは、マウスでつかんで動かせる」)が変わる。つかめる場所が、カード全体からつかみ口だけになり、Trello と同じ「どこでもつかめる」感覚が失われる ②今の作りは、5px 動くまでは「押した」扱い(`PointerSensor`)と、ドラッグ直後の100msだけ「押した」を無視する工夫で両立しており、実際のブラウザでの確認でも、不具合は出ていない ③つかみ口を分けると、Tab で止まる場所が、カードあたり2つに増え、キーボードの人の手間が増える ④兼用の弱点(読み上げソフトで、「ボタン」と「並び替え可能」の役割が混ざる)は、dnd-kit の `aria-roledescription` と読み上げ文で補っており、テスト(`CardDnd.test.tsx`)と、axe の検査(F7。違反0件)で確かめている。得られるもの(コードの見通し)に対して、代償が大きい。**見直す条件**：タッチ操作(スマホ)に対応するとき、または、押したつもりが、つかんだことになる不具合が出たとき |

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
