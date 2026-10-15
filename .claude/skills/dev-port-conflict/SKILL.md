---
name: dev-port-conflict
description: バックエンド(8080)・フロントエンド(5173)・DB(5432)を起動するときの、ポート競合への対応手順。bootRun、npm run dev、docker compose up の起動に失敗したとき、「Port already in use」「address already in use」「EADDRINUSE」「Port 8080 was already in use」などのエラーが出たとき、または動作確認のためにサーバーを起動するときは、必ずこのスキルを使うこと。ユーザーが「ポートが競合した」「ポートを空けて」と言った場合も対象。別のポートで起動して回避するのは禁止で、決められたポートで動かすための手順を示す。
---

# 開発サーバーのポート競合への対応

## なぜこのルールがあるか
このアプリは、画面（5173）が `/api` をバックエンド（8080）に中継し、バックエンドがDB（5432）につなぐ。どれかが別のポートで起動すると、つながらなくなり、動作確認が失敗する。だから、**決められたポートで動かす**ことが前提になる。
一方で、ポートを使っているのが、無関係なアプリ（特にDocker上のDB）だった場合、勝手に止めると、ユーザーのデータや作業を壊すおそれがある。そのため、「確認してから止める」順番を守る。

| 役割 | ポート | 起動コマンド |
|---|---|---|
| バックエンド | 8080 | `backend/` で `.\gradlew.bat bootRun` |
| フロントエンド | 5173 | `frontend/` で `npm run dev` |
| DB（PostgreSQL） | 5432 | リポジトリ直下で `docker compose up -d` |

## 手順

### 1. 起動の前に、使用中か確認する（PowerShell）
```powershell
Get-NetTCPConnection -State Listen -LocalPort 8080,5173,5432 -ErrorAction SilentlyContinue |
  ForEach-Object {
    $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    [pscustomobject]@{ Port = $_.LocalPort; PID = $_.OwningProcess; Name = $p.ProcessName; Path = $p.Path }
  }
```
何も表示されなければ、3つとも空いている。そのまま起動してよい。
（`netstat -ano | findstr LISTENING | findstr ":8080"` でも確認できる）

### 2. 使っているプロセスの正体を見極める
プロセス名とパスから、用途を判断する。

| 見つかったもの | 判断 | 対応 |
|---|---|---|
| `java`（このアプリの bootRun、パスが Temurin など）、`node`（このアプリの Vite） | 前回起動した、このアプリの開発サーバーの可能性が高い | 手順3へ（ユーザーに確認してから停止） |
| `com.docker.backend`、`docker-proxy`、`wslrelay`、`vmmem` など Docker 関係 | DBのコンテナが使っている。**止めると、DBが落ちる** | 5432 がすでに我々のDBなら、起動済みなので何もしない。別のコンテナなら、必ずユーザーに確認 |
| 上記以外（ブラウザ、他のアプリ、不明なプロセス） | 無関係の可能性が高い | **止めない。** 名前・PID・ポートを伝えて、ユーザーに判断してもらう |

DBについては、`docker ps` でコンテナ名とポートを確認すると、自分のDBかどうかが分かる。

### 3. 止める前に、ユーザーに確認する
次の3点を説明して、同意を得てから止める（同意なしに `Stop-Process` や `taskkill` を実行しない）。
- 何が（プロセス名、PID、コマンドやパス）
- どのポートを使っていて
- 止めると何が起きるか（例：「前回の bootRun が残っているだけで、止めても影響はありません」「これはDBのコンテナで、止めるとデータの読み書きができなくなります」）

同意を得たら、PID を指定して止める（名前での一括停止は、巻き込むので使わない）。
```powershell
Stop-Process -Id <PID>
```
`bootRun` の子プロセスが残ることがあるので、止めたあとにもう一度、手順1で空いたことを確認する。

### 4. 指定のポートで起動して、確認する
- **別のポートに変えて起動しない。** `--server.port=8081` や `--port 5174` のような回避をしない。変えても、プロキシやDB接続の設定とずれて動かない。
- フロントエンドは、`vite.config.ts` の `strictPort: true` により、5173 が使えないとき、別ポートで黙って起動せず、エラーで止まる。この場合は、手順1に戻る。
- ただし、他のプロセスが全アドレス（`::` や `0.0.0.0`）で 5173 を握っていても、Vite は「localhost だけ空いている」として起動できてしまう（「Port 5173 is in use on a wildcard address」という警告が出る）。ブラウザが、そのもう一方のサーバーにつながることがあるので、**この警告が出たら、競合として扱い**、手順2に進む。`strictPort` だけに頼らず、起動前の手順1の確認を省かない。
- 起動後に、実際に待ち受けていることを確認する。
```powershell
Get-NetTCPConnection -State Listen -LocalPort 8080,5173 -ErrorAction SilentlyContinue
```

### 5. 解決できないとき
ユーザーが止めてよいと言わない、または止められない（権限がない等）場合は、無理に進めない。使っているものと理由を伝えて、ユーザーの判断を待つ。
