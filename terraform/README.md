# terraform/

AWS に作る物（ネットワーク、サーバー、データベース）を、コードで書いたもの。構成の説明と構成図は、[docs/infrastructure.md](../docs/infrastructure.md)。

## ファイルの役割
| ファイル | 内容 |
|---|---|
| `main.tf` | Terraform と AWS 部品（provider）の版、地域、全部に付ける共通のタグ |
| `variables.tf` | 外から渡せる設定値（自分の IP、サーバーと DB の型、DB の名前・ユーザー・パスワードなど）と、入力のチェック |
| `vpc.tf` | ネットワーク（VPC、サブネット、インターネットへの玄関、経路） |
| `security_groups.tf` | 通信の許可（EC2 用、RDS 用） |
| `ec2.tf` | サーバー（EC2）と、SSH の公開鍵の登録 |
| `user_data.sh` | サーバーの起動時に、1回だけ実行する命令（nginx、Java、Node.js、psql を入れる） |
| `rds.tf` | データベース（RDS の PostgreSQL）と、DB サブネットグループ |
| `outputs.tf` | 作ったあとに表示する値（IP、URL、DB の接続先、SSH のコマンド） |
| `terraform.tfvars` | **自分の値**（自分の IP、DB のパスワード）。**コミットしない** |
| `terraform.tfvars.example` | 上の見本（偽の値）。コピーして使う |
| `.terraform.lock.hcl` | 使う部品の版の記録（コミットする） |
| `.tflint.hcl` | tflint（書き方の点検）の設定。CI と手元で、同じものを使う |
| `.trivyignore` | trivy（セキュリティの点検）の指摘のうち、「意図した設定なので、対応しない」と決めた物の一覧（理由つき） |

`terraform.tfstate`（Terraform が、作った物を覚えておくファイル）、`terraform.tfvars`、`*.tfplan` は、コミットしない（`.gitignore` で除外済み）。`terraform.tfstate` は、消さない。消すと、作った物を忘れてしまう。

## 使う前の準備
- AWS CLI と Terraform を入れて、AWS の認証を済ませておく（[学習ノート 08](../notes/08-aws-terraform-guide.md)）
- `terraform.tfvars.example` を `terraform.tfvars` にコピーして、**自分の値に書き換える**：
  - `my_ip`：自分の PC のグローバル IP。IP が変わったら、ここを直して `apply` する
  - `db_password`：DB のパスワード。英数字と `_` `-` だけ、12〜64 文字
- SSH の鍵（`~/.ssh/id_ed25519` と `.pub`）を作っておく。AWS に渡すのは、公開鍵（`.pub`）だけ

## コマンド（`terraform/` で実行）
| やりたいこと | コマンド | 注意 |
|---|---|---|
| 準備（部品のダウンロード） | `terraform init` | 最初に1回 |
| 書式の整形／文法の検査 | `terraform fmt` ／ `terraform validate` | AWS には、何も作らない |
| 予告 | `terraform plan` | 何も作らない。何が作られるか、読んで確かめる |
| 作る | `terraform apply` | AWS に実際に作る。**費用がかかる物を含む** |
| 消す（予告） | `terraform plan -destroy` | 何が消えるかを確かめる |
| 消す | `terraform destroy` | 作った物を全部消す。**RDS のデータも消える** |
| 作ったあとの値 | `terraform output` | IP や接続先が出る。人に見せるときは、隠す |

- **`terraform fmt` は、`.tf` ファイルを指定して実行する**（例：`terraform fmt -check ec2.tf vpc.tf`）。引数なしだと、`terraform.tfvars`（自分の IP と DB のパスワード）も対象になり、`-diff` では、その中身が画面に出る。
- **使い終わったら、`destroy` で消す。** 消したあとは、`terraform state list` が空か、AWS CLI の読み取り（`aws ec2 describe-instances` など）で、残っていないかを確かめる。

## 自動の点検（CI）
PR を作ると、GitHub Actions の `terraform` ジョブが、次を自動で実行する（AWS には、つながない。認証も秘密も使わない。`plan`・`apply` は、実行しない）。

| 点検 | 内容 |
|---|---|
| `terraform fmt -check` | 書式がそろっているか。ずれたら、手元で `terraform fmt` を実行して直す |
| `terraform init -backend=false` ＋ `validate` | 文法と、部品の使い方 |
| tflint | 書き方の点検（`.tflint.hcl`） |
| trivy config | セキュリティの弱点。意図した設定は、`.trivyignore` に理由つきで書いてある。**新しい指摘が出たときは、`.trivyignore` に足す前に、本当に対応しなくてよいかを考える** |

手元で、tflint と trivy を、Docker で使い捨て実行する例（`terraform/` の中で。`terraform.tfvars` を渡さないように、`.tf` などだけを、一時フォルダにコピーして実行する）：
```
mkdir ../tmp-scan && cp *.tf user_data.sh .tflint.hcl .trivyignore ../tmp-scan/
docker run --rm -v "$PWD/../tmp-scan:/data" -w /data --entrypoint sh ghcr.io/terraform-linters/tflint:v0.65.0 -c "tflint --init && tflint"
docker run --rm -v "$PWD/../tmp-scan:/src:ro" aquasec/trivy:0.76.1 config --ignorefile /src/.trivyignore /src
rm -rf ../tmp-scan
```
詳しい点検の結果は、[docs/quality-review.md](../docs/quality-review.md) の 5章。`terraform` ジョブは、**必須のチェックには入れていない**（必須は `backend` と `frontend`。[CLAUDE.md](../CLAUDE.md) の 3.7）。

## その他
- アプリ本体の置き方は、[docs/infrastructure.md の 4](../docs/infrastructure.md)。作業の記録は、[学習ノート 08 の 10.5](../notes/08-aws-terraform-guide.md)。
- 秘密（アクセスキー、DB のパスワード、秘密鍵、アカウント ID）は、コミットしない・チャットに貼らない（[CLAUDE.md](../CLAUDE.md) の 4章）。
