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

- **使い終わったら、`destroy` で消す。** 消したあとは、`terraform state list` が空か、AWS CLI の読み取り（`aws ec2 describe-instances` など）で、残っていないかを確かめる。
- アプリ本体の置き方は、[docs/infrastructure.md の 4](../docs/infrastructure.md)。作業の記録は、[学習ノート 08 の 10.5](../notes/08-aws-terraform-guide.md)。
- 秘密（アクセスキー、DB のパスワード、秘密鍵、アカウント ID）は、コミットしない・チャットに貼らない（[CLAUDE.md](../CLAUDE.md) の 4章）。
