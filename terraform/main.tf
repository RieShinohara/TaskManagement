# =============================================================
# Terraform と AWS の基本設定
#   - どの版の Terraform・AWS 部品（provider）を使うか
#   - どの地域（リージョン）で作るか
# =============================================================

terraform {
  # この版以上の Terraform でだけ動かす（古い版での事故を防ぐ）
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      # 6.x の範囲で使う（7.0 になったら、自分で確かめてから上げる）
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # このコードで作る物すべてに、同じ「タグ（名札）」を付ける。
  # あとで AWS の画面で「これは何のために作った物か」が分かる。費用の確認にも使える
  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}
