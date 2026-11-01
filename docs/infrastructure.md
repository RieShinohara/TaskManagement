# AWS の構成（インフラ構成）

このアプリを、AWS に置いて動かすときの構成を説明する。コードは [terraform/](../terraform/)（AWS に作る物）と [deploy/](../deploy/)（サーバーの中の設定）にある。

> **位置づけ**：このアプリは、本来は利用者の PC の中だけで動かす（[非機能要件](non-functional-requirements.md)）。AWS への配置は、**学習と動作確認のためのもの**で、使い終わったら `terraform destroy` で全部消す。AWS 上には、普段は何も置いていない。
>
> **細かい設定値**（IP の範囲、型、容量、バージョンなど）は、変わりやすいので、ここには書かない。値は [terraform/variables.tf](../terraform/variables.tf) と、各 `.tf` ファイルを見る。

## 1. 全体の構成図

```mermaid
flowchart LR
    user["利用者のブラウザ<br/>（自分の IP だけ許可）"]

    subgraph aws["AWS（東京リージョン）"]
        subgraph vpc["VPC（自分専用のネットワーク）"]
            subgraph pub["公開サブネット"]
                subgraph ec2["EC2（サーバー 1 台）"]
                    nginx["nginx<br/>80番"]
                    app["バックエンド（Spring Boot）<br/>8080番・サーバーの中だけ"]
                    files["画面のファイル<br/>（React のビルド結果）"]
                end
            end
            subgraph priv["内向きサブネット（2 つの区画）"]
                rds[("RDS<br/>PostgreSQL")]
            end
        end
    end

    user -- "HTTP 80番" --> nginx
    nginx -- "画面のファイルを返す" --> files
    nginx -- "/api を中継" --> app
    app -- "5432番<br/>EC2 のグループからだけ" --> rds
    admin["自分の PC<br/>（管理用）"] -. "SSH 22番<br/>自分の IP だけ" .-> ec2
```

- ブラウザが話す相手は、**80番の nginx だけ**。バックエンドは、サーバーの中の `127.0.0.1:8080` だけで待ち受け、外には出ない。
- nginx は、画面のファイルを返し、`/api` で始まるお願いを、バックエンドへ中継する。ブラウザからは「同じ場所との通信」に見えるので、CORS（別の場所との通信を止める、ブラウザの安全機能）の設定は要らない。
- RDS には、インターネットへの道がない。EC2 からしか、つながらない。

## 2. 作る物の一覧と役割

| まとまり | 作る物 | 役割 | コード |
|---|---|---|---|
| ネットワーク | VPC、公開サブネット 1、内向きサブネット 2、インターネットゲートウェイ、経路表 | 自分専用のネットワーク。EC2 を置く区画（外とつながる）と、RDS を置く区画（外とつながらない）に分ける | [vpc.tf](../terraform/vpc.tf) |
| 通信の許可 | セキュリティグループ 2 つ（EC2 用、RDS 用）と、その入口・出口のルール | 書いていない通信は、すべて拒否。入口は下の表のとおり | [security_groups.tf](../terraform/security_groups.tf) |
| サーバー | SSH 用の公開鍵の登録、EC2 | アプリを動かすサーバー。起動時に、nginx・Java・Node.js・psql を自動で入れる | [ec2.tf](../terraform/ec2.tf)、[user_data.sh](../terraform/user_data.sh) |
| データベース | DB サブネットグループ、RDS（PostgreSQL） | アプリのデータの保存先。AWS が管理する | [rds.tf](../terraform/rds.tf) |
| 設定と出力 | Terraform と AWS の版、地域、共通のタグ、変数、作成後に表示する値 | 全体の共通設定 | [main.tf](../terraform/main.tf)、[variables.tf](../terraform/variables.tf)、[outputs.tf](../terraform/outputs.tf) |

### 通信の許可（入口）

| 入口 | 送信元 | 目的 |
|---|---|---|
| EC2：22番（SSH） | 自分の IP の 1 台だけ | サーバーの操作・ファイルの転送 |
| EC2：80番（HTTP） | 自分の IP の 1 台だけ | ブラウザでアプリを開く |
| RDS：5432番（PostgreSQL） | EC2 のセキュリティグループに属する物だけ | バックエンドが、DB につなぐ |

- 8080番（バックエンド）は、開けていない。
- `0.0.0.0/0`（全世界）を、入口に書かない（変数の検証でも、弾いている）。
- 出口は、EC2 は全部許可（ソフトの導入のため）。RDS は、出口のルールなし。

## 3. 設計の方針

| 方針 | 理由 |
|---|---|
| 画面とバックエンドを、同じ EC2 に載せる | 講義の方針。構成が単純で、無料の範囲に収まる |
| 入口は、自分の IP だけ | このアプリには、ログインがない。`/api/backup` で全データを出し入れできるため、不特定多数には見せない |
| RDS は、公開しない。EC2 のグループからだけ許可 | 外から直接つなげない。EC2 の IP が変わっても、そのまま使える |
| RDS は開発環境向け（1 台だけ、自動バックアップなし、消すときの記録も残さない） | 無料の範囲と、すぐ消せることを優先。Multi-AZ（有料）は使わない |
| NAT Gateway は作らない | 置いておくだけで、毎月お金がかかるため |
| ディスクと RDS は暗号化。EC2 のメタデータは、合言葉つき（IMDSv2）にする | AWS の推奨設定 |
| 作る物すべてに、同じタグ（`Project`、`ManagedBy`）を付ける | AWS の画面で、何のための物かが分かる。費用の確認にも使える |
| 秘密（DB のパスワード、IP）は、コードに書かず、`terraform.tfvars`（コミットしない）に書く | 公開リポジトリのため |
| 使い終わったら、`terraform destroy` で消す | 費用が、かからないようにする |

## 4. アプリの置き方（EC2 の中）

手元で作った成果物を、EC2 に送って置く。EC2 はメモリが少ないので、ビルドは、手元で行う。

| 置く物 | EC2 の中の場所 | もとになる物 |
|---|---|---|
| バックエンドの jar | `/opt/taskboard/` | `backend/` を `.\gradlew.bat bootJar` でビルド |
| 画面のファイル | nginx の公開フォルダ | `frontend/` を `npm run build` でビルド（`dist`） |
| バックエンドの常駐の設定（systemd） | `/etc/systemd/system/` | [deploy/taskboard.service](../deploy/taskboard.service) |
| nginx の設定（中継、画面の配信、本文の上限） | `/etc/nginx/default.d/` | [deploy/nginx-taskboard.conf](../deploy/nginx-taskboard.conf) |
| DB の接続情報（環境変数） | `/etc/taskboard.env`（管理者だけが読める） | リポジトリには置かない。RDS の接続先とパスワードが入る |

- DB の接続先は、**環境変数で RDS に向ける**。アプリのコードは、変えていない。
- テーブルは、バックエンドの起動時に、Flyway が RDS に作る。

実際に作業した手順と、つまずいた所は、[学習ノート 08 の 10.5](../notes/08-aws-terraform-guide.md) に記録している。

## 5. ディレクトリ構成（AWS に関わる部分）

```
TaskManagement/
├─ terraform/                  AWS に作る物のコード（Terraform）
│  ├─ main.tf                  Terraform と AWS の版、地域、共通のタグ
│  ├─ variables.tf             外から渡せる設定値（IP、型、DB の名前など）
│  ├─ vpc.tf                   ネットワーク
│  ├─ security_groups.tf       通信の許可
│  ├─ ec2.tf                   サーバー
│  ├─ user_data.sh             サーバーの起動時に、1回だけ実行する命令（道具の導入）
│  ├─ rds.tf                   データベース
│  ├─ outputs.tf               作成後に表示する値（IP、接続先など）
│  └─ terraform.tfvars         自分の値（コミットしない。見本は terraform.tfvars.example）
├─ deploy/                     サーバーの中に置く設定ファイル
│  ├─ taskboard.service        systemd：バックエンドの常駐
│  └─ nginx-taskboard.conf     nginx：中継と画面の配信
├─ docs/infrastructure.md      この文書
└─ notes/08-aws-terraform-guide.md   学習ノート（解説と、作業の記録）
```

使い方（コマンド）は、[terraform/README.md](../terraform/README.md)。

## 6. 公開するときの課題（今回はやっていない）
- **ログインがない**ので、他の人に見せるなら、先に、認証などの対策が要る。
- 今は `http://`（暗号化なし）。公開するなら、ドメイン名を取って、HTTPS にする。
- 費用がかからない構成のため、冗長化（複数台、Multi-AZ）や、自動バックアップはしていない。
- GitHub Actions からの自動デプロイ（OIDC）は、必要になったときに考える（[学習ノート 08 の 5.7](../notes/08-aws-terraform-guide.md)）。

構成の選択肢を比べた文書は、[deploy-options.md](deploy-options.md)。技術の決定は、[tech-stack.md](tech-stack.md)。
