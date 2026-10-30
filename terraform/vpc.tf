# =============================================================
# ネットワーク（VPC）
#   AWS の中に、自分専用のネットワークを作る。
#   - 公開サブネットは 1 つだけ（RDS を作る段階で、2 つ目を足す）
#   - NAT Gateway は作らない（置いておくだけで、毎月お金がかかる部品なので）
# =============================================================

# VPC：自分専用のネットワーク全体（専用のフロア）
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16" # このネットワークの中で使う住所の範囲
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.project_name}-vpc" }
}

# サブネット：VPC を区切った区画。EC2 は、この中に置く
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true # この中に作るサーバーに、インターネットから見える IP を付ける

  tags = { Name = "${var.project_name}-public-a" }
}

# インターネットゲートウェイ：VPC とインターネットをつなぐ玄関
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.project_name}-igw" }
}

# ルートテーブル：通信の道順の案内板。「外への通信は、玄関（IGW）から」と決める
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0" # 「すべての行き先」への通信（外へ出ていく方向）
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${var.project_name}-public-rt" }
}

# サブネットに、この案内板を結びつける
resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}
