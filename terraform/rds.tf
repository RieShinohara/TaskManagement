# =============================================================
# RDS（AWS が管理してくれるデータベース。ここでは PostgreSQL）
#   - EC2 からだけ、つなげる（セキュリティグループで、EC2 の SG からの 5432 番だけ許可）
#   - インターネットには公開しない（publicly_accessible = false）
#   - 講義と同じ「開発環境向け」の設定：1台だけ（Multi-AZ は有料になるので使わない）、
#     バックアップは残さない、消すときの記録（スナップショット）も取らない
# =============================================================

# DB サブネットグループ：RDS を置いてよいサブネットの一覧。
# 2 つ以上の区画（AZ）のサブネットを、登録する決まり（DB が動くのは、そのうち 1 台だけ）
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnets"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_c.id]

  tags = { Name = "${var.project_name}-db-subnets" }
}

resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-db"

  engine         = "postgres"
  engine_version = "18.6" # アプリ（docker compose の postgres:18）と同じ 18 系
  instance_class = var.db_instance_class

  allocated_storage = 20    # GB。無料の範囲の容量
  storage_type      = "gp3" # SSD の種類
  storage_encrypted = true  # ディスクを暗号化する

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password # 値は terraform.tfvars から（sensitive なので、表示では隠れる）

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false # インターネットから見える IP を付けない

  # 開発環境向けの設定
  multi_az                = false # true にすると、DB が 2 台分になり、有料
  backup_retention_period = 0     # 自動バックアップを残さない
  skip_final_snapshot     = true  # 消すときに、最後の記録を取らない（取ると、残って、お金がかかる）
  deletion_protection     = false # すぐ destroy できるように

  tags = { Name = "${var.project_name}-db" }
}
