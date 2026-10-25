package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;
import org.springframework.web.context.WebApplicationContext;

// DBの使い方の設定のテスト
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class JpaSettingsTests {

	@Autowired
	Environment environment;

	@Autowired
	WebApplicationContext context;

	// open-in-view が true だと、画面への返事を作り終えるまで、DBの接続を持ち続ける。
	// Service の外（Controller など）でDBを使う作りではないので、false にして、接続を早く返す
	@Test
	void 画面への返事を作り終えるまで_DBの接続を持ち続けない() {
		assertThat(environment.getProperty("spring.jpa.open-in-view", Boolean.class)).isFalse();
		assertThat(context.containsBean("openEntityManagerInViewInterceptor")).isFalse();
	}

}
