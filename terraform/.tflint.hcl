# tflint（Terraform の書き方を点検する道具）の設定。CI（.github/workflows/ci.yml）と、手元で、同じものを使う。
# 点検のルールは、プラグインで足す。版は固定している（勝手に変わって、CI が突然失敗しないように）

# Terraform 自体の書き方のルール（使っていない変数、古い書き方など）
plugin "terraform" {
  enabled = true
  preset  = "recommended"
}

# AWS 用のルール（存在しない型の名前、間違った値など）
plugin "aws" {
  enabled = true
  version = "0.40.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}
