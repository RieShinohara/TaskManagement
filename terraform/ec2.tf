# =============================================================
# EC2（アプリを動かす予定のサーバー）
#   今は「空のサーバー」を作って、SSH でつながるところまで。
#   Java などのソフトは、まだ入れない（user_data は付けない）
# =============================================================

# SSH の鍵：公開鍵だけを AWS に登録する。秘密鍵は、自分の PC から出さない
resource "aws_key_pair" "deploy" {
  key_name   = "${var.project_name}-key"
  public_key = file(pathexpand(var.public_key_path))
}

# OS のイメージ（AMI）：Amazon Linux 2023 の、最新の x86_64 版を、AWS に問い合わせて探す。
# data は「読むだけ」で、何も作らない
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "main" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.deploy.key_name
  subnet_id              = aws_subnet.public_a.id
  vpc_security_group_ids = [aws_security_group.ec2.id]

  associate_public_ip_address = true

  # サーバー内の「メタデータ」（自分の情報を取る窓口）に、合言葉（トークン）を必須にする。
  # 外部から悪用されにくくなる、AWS の推奨設定（IMDSv2）
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  # ディスク：暗号化して、20GB（無料枠の範囲内）
  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = { Name = "${var.project_name}-server" }
}
