package com.example.taskmanagement;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

// 動作確認（Actuator の /actuator/health）のテスト
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class HealthApiTests {

	@Autowired
	MockMvc mockMvc;

	// DBにつながっているときは UP。DBが落ちているときは、503 と DOWN になる（Actuator が確かめる）
	@Test
	void 動いていて_DBにつながっていれば_UPを返す() throws Exception {
		mockMvc.perform(get("/actuator/health"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("UP"));
	}

	// 公開するのは health だけ。環境変数や設定の値などが見える窓口は、開けない
	@Test
	void health以外の窓口は_公開しない() throws Exception {
		mockMvc.perform(get("/actuator/env")).andExpect(status().isNotFound());
		mockMvc.perform(get("/actuator/beans")).andExpect(status().isNotFound());
	}

	@Test
	void 自作の_api_healthは_なくなった() throws Exception {
		mockMvc.perform(get("/api/health")).andExpect(status().isNotFound());
	}

}
