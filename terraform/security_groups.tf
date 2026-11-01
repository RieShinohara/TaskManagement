# =============================================================
# セキュリティグループ（通信の許可リスト）
#   EC2 に出入りしてよい通信を決める。書いていない通信は、すべて拒否される。
#   - 入ってくる通信：SSH（22番）と、Web（80番）を、自分の IP からだけ許可
#   - 8080番（バックエンド）は、バックエンドを動かす段階で足す（今は開けない）
# =============================================================

resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-ec2-sg"
  description = "EC2: SSH and HTTP from my IP only"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.project_name}-ec2-sg" }
}

# 入ってくる通信：SSH を、自分の IP（/32 ＝ その1台だけ）から。
# 0.0.0.0/0（全世界）は、絶対に書かない
resource "aws_vpc_security_group_ingress_rule" "ssh_from_my_ip" {
  security_group_id = aws_security_group.ec2.id
  description       = "SSH from my IP"
  cidr_ipv4         = "${var.my_ip}/32"
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
}

# 入ってくる通信：Web（80番、HTTP）を、自分の IP だけから。
# ブラウザで http://サーバーのIP を開くと、nginx の画面が見える。他の人のブラウザからは、届かない
resource "aws_vpc_security_group_ingress_rule" "http_from_my_ip" {
  security_group_id = aws_security_group.ec2.id
  description       = "HTTP from my IP"
  cidr_ipv4         = "${var.my_ip}/32"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

# 出ていく通信：すべて許可（あとでソフトを入れるときに、インターネットから取ってくるため）
resource "aws_vpc_security_group_egress_rule" "all_outbound" {
  security_group_id = aws_security_group.ec2.id
  description       = "All outbound"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" # すべてのプロトコル
}

# -------------------------------------------------------------
# RDS（データベース）用のセキュリティグループ
#   入ってくる通信：PostgreSQL（5432番）を、「EC2 のセキュリティグループに属する物」からだけ許可。
#   IP アドレスではなく、グループで指定する（EC2 の IP が変わっても、そのまま使える）。
#   出ていく通信のルールは、書かない（RDS は、外へ出ていかないので、全部拒否でよい）
# -------------------------------------------------------------
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "RDS: PostgreSQL from the EC2 security group only"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.project_name}-rds-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "postgres_from_ec2" {
  security_group_id            = aws_security_group.rds.id
  description                  = "PostgreSQL from EC2"
  referenced_security_group_id = aws_security_group.ec2.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}
