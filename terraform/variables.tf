# =============================================================
# 変数（外から渡せる設定値）
#   値は terraform.tfvars に書く（コミットしない。見本は terraform.tfvars.example）
# =============================================================

variable "aws_region" {
  description = "AWS の地域。ap-northeast-1 は東京"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "名前とタグに使う、このプロジェクトの名前"
  type        = string
  default     = "taskmanagement"
}

variable "my_ip" {
  description = "SSH でつなぐ、自分の PC のグローバル IP アドレス（例：203.0.113.10）。/32 は、コード側で付ける"
  type        = string

  # 打ち間違いと、「全世界に開く」設定を防ぐ
  validation {
    condition     = can(cidrhost("${var.my_ip}/32", 0)) && var.my_ip != "0.0.0.0"
    error_message = "my_ip は、自分の IPv4 アドレス（例：203.0.113.10）にしてください。0.0.0.0 や、/32 付きの書き方は使えません。"
  }
}

variable "instance_type" {
  description = "EC2 の大きさ（型）。t3.micro は、このアカウントで無料の対象になっている型"
  type        = string
  default     = "t3.micro"
}

variable "public_key_path" {
  description = "SSH の公開鍵（.pub）の場所。秘密鍵（拡張子なし）は、AWS に渡さない"
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}
