package com.example.taskmanagement;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.empty;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

// カードの読み取り（1件取得・絞り込み検索）のテスト。
// DBは、他のテストと共有されるので、テストごとに、ほかと重ならない目印の文字をタイトルに入れる。
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CardReadApiTests {

	@Autowired
	MockMvc mockMvc;

	@Test
	void カードを1件取得できる() throws Exception {
		long id = createCard("single-A 1件取得", columnId(0), null);

		mockMvc.perform(get("/api/cards/" + id))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(id))
				.andExpect(jsonPath("$.title").value("single-A 1件取得"));
	}

	@Test
	void 存在しないカードは404() throws Exception {
		mockMvc.perform(get("/api/cards/999999")).andExpect(status().isNotFound());
	}

	@Test
	void キーワードで絞り込める_大文字小文字は区別しない() throws Exception {
		createCard("kw-Apple pie", columnId(0), null);
		createCard("kw-banana", columnId(0), null);

		mockMvc.perform(get("/api/cards").param("keyword", "KW-APPLE"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[*].title").value(contains("kw-Apple pie")));
	}

	@Test
	void キーワードに一致するカードがなければ空の一覧() throws Exception {
		mockMvc.perform(get("/api/cards").param("keyword", "zzz-no-such-card"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", empty()));
	}

	@Test
	void 列で絞り込める() throws Exception {
		createCard("col-one", columnId(0), null);
		createCard("col-two", columnId(1), null);

		mockMvc.perform(get("/api/cards").param("keyword", "col-").param("columnId", String.valueOf(columnId(1))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[*].title").value(contains("col-two")));
	}

	@Test
	void 期限日で絞り込める_指定日を含み_期限なしは含まない() throws Exception {
		createCard("due-old", columnId(0), "2026-10-10");
		createCard("due-edge", columnId(0), "2026-10-15");
		createCard("due-late", columnId(0), "2026-10-20");
		createCard("due-none", columnId(0), null);

		mockMvc.perform(get("/api/cards").param("keyword", "due-").param("dueBefore", "2026-10-15"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[*].title").value(containsInAnyOrder("due-old", "due-edge")));
	}

	@Test
	void 日付の形が不正なら400() throws Exception {
		mockMvc.perform(get("/api/cards").param("dueBefore", "abc")).andExpect(status().isBadRequest());
	}

	// 列のIDを、表示順の何番目か（0始まり）で取得する
	private long columnId(int index) throws Exception {
		String json = mockMvc.perform(get("/api/columns")).andReturn().getResponse().getContentAsString();
		return JsonPath.parse(json).read("$[" + index + "].id", Long.class);
	}

	private long createCard(String title, long columnId, String dueDate) throws Exception {
		String due = (dueDate == null) ? "" : ",\"dueDate\":\"" + dueDate + "\"";
		String json = mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"" + title + "\",\"columnId\":" + columnId + due + "}"))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		return JsonPath.parse(json).read("$.id", Long.class);
	}

}
