# =============================================================
# 出力：作り終わったあとに表示する値
# =============================================================

output "public_ip" {
  description = "EC2 の、インターネットから見える IP アドレス"
  value       = aws_instance.main.public_ip
}

output "ssh_command" {
  description = "EC2 に SSH でつなぐコマンド（秘密鍵は、公開鍵から .pub を除いた名前）"
  value       = "ssh -i ${trimsuffix(var.public_key_path, ".pub")} ec2-user@${aws_instance.main.public_ip}"
}
