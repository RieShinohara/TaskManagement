#!/bin/bash
# =============================================================
# サーバーの起動時に、1回だけ、自動で実行される命令（user_data）。root の権限で動く。
# 実行の様子は、サーバーの中の /var/log/cloud-init-output.log に残る。
#
# 段階2：アプリを動かすための道具を入れる（アプリ自体は、まだ置かない）。
#   ① nginx（Web サーバー）
#   ③ Java 25 と Node.js 24（SSH で、標準の部品置き場にあることを確かめた）
# =============================================================

# -e：失敗したら、そこで止める　-u：未定義の変数を使ったら止める　-x：実行した命令を、ログに出す
# -o pipefail：パイプ（|）でつないだ命令の途中の失敗も、見逃さない
set -euxo pipefail

# nginx を入れる（Amazon Linux 2023 の標準の部品置き場にある）
dnf install -y nginx

# 今すぐ起動する。サーバーを再起動しても、自動で起動するようにも設定する
systemctl enable --now nginx

# Java 25（Amazon Corretto）。-devel は、動かすだけでなく、ビルドの道具（javac）も入る版。
# バックエンドを Gradle でビルドするために必要
dnf install -y java-25-amazon-corretto-devel

# Node.js 24 と npm。番号なしの nodejs は古い 18 なので、nodejs24 と、番号を付けて指定する。
# npm は、別の部品（nodejs24-npm）
dnf install -y nodejs24 nodejs24-npm
