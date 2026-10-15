# frontend（画面）

React + TypeScript + Vite + Tailwind CSS で作る、ボード画面。

## 使い方
`frontend/` で実行する。

| やりたいこと | コマンド |
|---|---|
| 開発サーバーを起動（http://localhost:5173） | `npm run dev` |
| テスト（Vitest） | `npm test` |
| 静的チェック（oxlint） | `npm run lint` |
| 本番用にビルド | `npm run build` |

- 初めて使うときは、先に `npm install`
- 画面から `/api/...` にお願いすると、Vite が `http://localhost:8080`（バックエンド）に中継する（`vite.config.ts` の `proxy`）。そのため、**データを見るには、DBとバックエンドも起動しておく**（[backend/README.md](../backend/README.md)）
- 新しいシェルで `node` が見つからないときは、シェルを開き直す（Node.js は winget で導入）
