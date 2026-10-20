# 学習ノート

AIエンジニア養成コースの学習記録です。Claude Codeと一緒に、タスク管理アプリを作る中で学んだことを、あとから見返せるようにまとめています。

| ノート | 内容 |
|---|---|
| [01-git-and-github.md](01-git-and-github.md) | Git / GitHub のコマンドと、作業の1周の流れ（Issue → ブランチ → PR） |
| [02-requirements-process.md](02-requirements-process.md) | 要件定義の進め方と、現場の考え方 |
| [03-prototype-guide.md](03-prototype-guide.md) | プロトタイプ（HTML / CSS / JavaScript）の仕組み |
| [04-glossary.md](04-glossary.md) | 用語集 |
| [05-backend-guide.md](05-backend-guide.md) | バックエンド（Java + Spring Boot、PostgreSQL、Docker）の仕組みと、動かし方。機能ごとのAPIの作り方 |
| [06-frontend-guide.md](06-frontend-guide.md) | フロントエンド（React + TypeScript + Vite）の仕組みと、画面がデータを表示するまでの流れ。機能ごとの画面の作り方 |
| [07-quality-check.md](07-quality-check.md) | 品質チェック：静的チェック（lint）の道具と考え方。機能が完成したあとの点検の進め方 |

## 読む順番のおすすめ
1. [01](01-git-and-github.md)：作業の進め方（Issue → ブランチ → PR）。これを守って、すべて作った
2. [02](02-requirements-process.md) → [03](03-prototype-guide.md)：何を作るかを決め、試作で確かめた流れ
3. [05](05-backend-guide.md) の1〜11章：バックエンドの土台（API、DB、層、テスト）
4. [06](06-frontend-guide.md) の1〜5章：画面の土台（React、プロキシ、フォルダの構成）
5. 機能ごとの章（下の対応表）。**同じ機能の、バックエンドと画面を、続けて読むと分かりやすい**
6. 機能がそろったあとの点検は、[07](07-quality-check.md)
7. 分からない言葉は、[用語集](04-glossary.md)

## 機能と章の対応表
機能は、「バックエンドのAPI」→「画面」の順に作った。章の番号は、それぞれのノートの章。

| 機能 | バックエンド（05） | 画面（06） |
|---|---|---|
| ボードの表示、検索 | 6章 API と REST、7章 層 | 2・3・4章 |
| カードの追加 | 6・7章 | 6章 |
| カードの編集、説明文 | 12章 更新（PUT） | 7章 編集のモーダル、8章 自作カレンダー |
| カードの削除 | 13章 削除（DELETE、204） | 9章 削除の確認 |
| ドラッグ＆ドロップ（移動・並び替え） | 14章 移動API（連番の振り直し） | 10章 dnd-kit |
| 期限順の並び替え | 15章 期限順 | 11章 「期限順」ボタン |
| バックアップ（保存・読み込み） | 16章 バックアップ | 12章 バックアップ |
| 背景の選択 | 17章 設定API | 13章 背景（選ぶ・表示する） |
| カードの色の調整 | — | 14章 カードの色の調整（青） |
| 自分の画像を背景にする | 18章 画像をDBに保存する | 15章 縮小して送る |
| 品質チェックでの改善 | 18章（画像の大きさの上限、413） | 16章 モーダルを `<dialog>` にする |

## このノートの使い方
- 分からない言葉が出たら、まず [用語集](04-glossary.md) を見る
- 手を動かして覚えたいときは、各章の「やってみよう」を試す
- ノートに書いてあることで、間違いや分かりにくい所があれば、Claude Codeに聞いて、直していく
- アプリの使い方・コマンドは、[ルートの README](../README.md)、[backend/README.md](../backend/README.md)、[frontend/README.md](../frontend/README.md)。仕様は [docs/](../docs/requirements.md)

## 会話の記録について
Claude Codeとの会話は、PCの中に保存されています。

- 保存場所：`C:\Users\<ユーザー名>\.claude\projects\` の中の、`.jsonl` ファイル
- 見返し方：Claude Codeの画面の上にある、**時計のアイコン**から、過去の会話を開く
- 要点のメモ（Claudeが次回のために残す記録）は、同じ場所の `memory` フォルダにある
