package com.example.taskmanagement;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;

import org.junit.jupiter.api.Test;
import com.jayway.jsonpath.JsonPath;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class BoardApiTests {

	@Autowired
	MockMvc mockMvc;

	@Test
	void 列は最初から3つあり表示順に返る() throws Exception {
		mockMvc.perform(get("/api/columns"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(3)))
				.andExpect(jsonPath("$[0].name").value("ToDo"))
				.andExpect(jsonPath("$[1].name").value("作業中"))
				.andExpect(jsonPath("$[2].name").value("完了"));
	}

	@Test
	void カードを追加すると一覧に出て_新しいカードが列の一番上になる() throws Exception {
		long columnId = firstColumnId();

		String first = mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"買い物\",\"columnId\":" + columnId + ",\"dueDate\":\"2026-10-20\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.title").value("買い物"))
				.andExpect(jsonPath("$.color").value("none"))
				.andExpect(jsonPath("$.dueDate").value("2026-10-20"))
				.andExpect(jsonPath("$.columnId").value(columnId))
				.andReturn().getResponse().getContentAsString();

		String second = mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"資料作成\",\"columnId\":" + columnId + ",\"color\":\"red\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.color").value("red"))
				.andReturn().getResponse().getContentAsString();

		// 後から追加したカードのほうが、position が小さい（＝上）
		int firstPosition = JsonPath.parse(first).read("$.position", Integer.class);
		int secondPosition = JsonPath.parse(second).read("$.position", Integer.class);
		assertTrue(secondPosition < firstPosition);

		// 一覧にも、追加した2枚が出る
		mockMvc.perform(get("/api/cards"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.title=='資料作成')]").exists())
				.andExpect(jsonPath("$[?(@.title=='買い物')]").exists());
	}

	// 作ったカードの住所が、Location ヘッダで分かる（HTTP の標準）。その住所で、作ったカードが取れる
	@Test
	void カードを追加すると_Locationヘッダに_作ったカードの住所が付く() throws Exception {
		MvcResult created = mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"loc-card\",\"columnId\":" + firstColumnId() + "}"))
				.andExpect(status().isCreated())
				.andReturn();
		long id = JsonPath.parse(created.getResponse().getContentAsString()).read("$.id", Long.class);

		String location = created.getResponse().getHeader(HttpHeaders.LOCATION);
		assertNotNull(location);
		assertTrue(location.endsWith("/api/cards/" + id), "Location は /api/cards/" + id + " で終わる：" + location);

		mockMvc.perform(get(URI.create(location)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(id))
				.andExpect(jsonPath("$.title").value("loc-card"));
	}

	@Test
	void タイトルが空なら400() throws Exception {
		mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"  \",\"columnId\":" + firstColumnId() + "}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void 色が不正なら400() throws Exception {
		mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"a\",\"columnId\":" + firstColumnId() + ",\"color\":\"pink\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void 存在しない列なら404() throws Exception {
		mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"a\",\"columnId\":999999}"))
				.andExpect(status().isNotFound());
	}

	private long firstColumnId() throws Exception {
		String json = mockMvc.perform(get("/api/columns")).andReturn().getResponse().getContentAsString();
		return JsonPath.parse(json).read("$[0].id", Long.class);
	}

}
