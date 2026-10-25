package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;

// サーバーの待ち受けの設定のテスト
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ServerSettingsTests {

	@Autowired
	Environment environment;

	// このアプリは、ログインがなく、この PC の中だけで使う前提（docs/non-functional-requirements.md）。
	// 指定がないと、全部の入口で待ち受けて、同じネットワークの他の PC からも、全データの書き出しや入れ替え
	// （/api/backup、/api/backup/restore）ができてしまう。127.0.0.1 にして、この PC からだけつなげる。
	// （テストは、実際のポートを開かないので、設定の値だけを確かめる。実際の待ち受けは、起動して確かめた）
	@Test
	void バックエンドは_この_PC_127_0_0_1_だけで待ち受ける() {
		assertThat(environment.getProperty("server.address")).isEqualTo("127.0.0.1");
	}

}
