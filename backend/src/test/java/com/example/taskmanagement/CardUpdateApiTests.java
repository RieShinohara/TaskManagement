package com.example.taskmanagement;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;

// カードの更新（PUT /api/cards/{id}）のテスト。
// DBは、他のテストと共有されるので、カードはテストごとに作り、自分のIDだけを調べる
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CardUpdateApiTests {

	@Autowired
	MockMvc mockMvc;

	@Test
	void タイトル_説明文_色_期限日を更新できる() throws Exception {
		long id = createCard("upd-before");

		update(id, "{\"title\":\"  upd-after  \",\"description\":\"詳しい説明\",\"color\":\"red\",\"dueDate\":\"2026-11-01\"}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(id))
				.andExpect(jsonPath("$.title").value("upd-after"))
				.andExpect(jsonPath("$.description").value("詳しい説明"))
				.andExpect(jsonPath("$.color").value("red"))
				.andExpect(jsonPath("$.dueDate").value("2026-11-01"));

		// 保存されていること（取り直しても同じ）
		mockMvc.perform(get("/api/cards/" + id))
				.andExpect(jsonPath("$.title").value("upd-after"))
				.andExpect(jsonPath("$.description").value("詳しい説明"));
	}

	@Test
	void 説明文と期限日を空にして消せる() throws Exception {
		long id = createCard("upd-clear");
		update(id, "{\"title\":\"upd-clear\",\"description\":\"あとで消す\",\"color\":\"blue\",\"dueDate\":\"2026-11-01\"}")
				.andExpect(status().isOk());

		update(id, "{\"title\":\"upd-clear\",\"description\":null,\"color\":\"blue\",\"dueDate\":null}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.description").doesNotExist())
				.andExpect(jsonPath("$.dueDate").doesNotExist());
	}

	@Test
	void 空白だけの説明文は_なくなる() throws Exception {
		long id = createCard("upd-blank");

		update(id, "{\"title\":\"upd-blank\",\"description\":\"   \",\"color\":\"none\"}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.description").doesNotExist());
	}

	@Test
	void 更新しても_列と並び順は変わらない() throws Exception {
		long id = createCard("upd-keep");
		String before = mockMvc.perform(get("/api/cards/" + id)).andReturn().getResponse().getContentAsString();
		Long columnId = JsonPath.parse(before).read("$.columnId", Long.class);
		Integer position = JsonPath.parse(before).read("$.position", Integer.class);

		update(id, "{\"title\":\"upd-keep-2\",\"color\":\"green\"}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.columnId").value(columnId))
				.andExpect(jsonPath("$.position").value(position));
	}

	@Test
	void 説明文は2000文字まで() throws Exception {
		long id = createCard("upd-long");

		update(id, body("upd-long", "あ".repeat(2000))).andExpect(status().isOk());
		update(id, body("upd-long", "あ".repeat(2001))).andExpect(status().isBadRequest());
	}

	@Test
	void タイトルが空_または256文字以上なら400() throws Exception {
		long id = createCard("upd-title");

		update(id, "{\"title\":\"   \",\"color\":\"none\"}").andExpect(status().isBadRequest());
		update(id, "{\"color\":\"none\"}").andExpect(status().isBadRequest());
		update(id, "{\"title\":\"" + "a".repeat(256) + "\",\"color\":\"none\"}").andExpect(status().isBadRequest());
	}

	@Test
	void 色が不正_または無いなら400() throws Exception {
		long id = createCard("upd-color");

		update(id, "{\"title\":\"upd-color\",\"color\":\"purple\"}").andExpect(status().isBadRequest());
		update(id, "{\"title\":\"upd-color\"}").andExpect(status().isBadRequest());
	}

	@Test
	void 存在しないカードは404() throws Exception {
		update(999999, "{\"title\":\"x\",\"color\":\"none\"}").andExpect(status().isNotFound());
	}

	@Test
	void 検査に失敗したときは_内容は変わらない() throws Exception {
		long id = createCard("upd-nochange");

		update(id, "{\"title\":\"\",\"color\":\"red\"}").andExpect(status().isBadRequest());

		mockMvc.perform(get("/api/cards/" + id))
				.andExpect(jsonPath("$.title").value("upd-nochange"))
				.andExpect(jsonPath("$.color").value("none"));
	}

	private String body(String title, String description) {
		return "{\"title\":\"" + title + "\",\"description\":\"" + description + "\",\"color\":\"none\"}";
	}

	private ResultActions update(long id, String json) throws Exception {
		return mockMvc.perform(put("/api/cards/" + id).contentType(MediaType.APPLICATION_JSON).content(json));
	}

	private long createCard(String title) throws Exception {
		String columns = mockMvc.perform(get("/api/columns")).andReturn().getResponse().getContentAsString();
		long columnId = JsonPath.parse(columns).read("$[0].id", Long.class);
		String json = mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"" + title + "\",\"columnId\":" + columnId + "}"))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		return JsonPath.parse(json).read("$.id", Long.class);
	}

}
