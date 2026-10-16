package com.example.taskmanagement;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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

// カードの削除（DELETE /api/cards/{id}）のテスト。
// DBは、他のテストと共有されるので、カードはテストごとに作り、自分のIDだけを調べる
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CardDeleteApiTests {

	@Autowired
	MockMvc mockMvc;

	@Test
	void 削除すると204が返り_その後は取得できない() throws Exception {
		long id = createCard("del-target");

		mockMvc.perform(delete("/api/cards/" + id))
				.andExpect(status().isNoContent())
				.andExpect(content().string(""));

		mockMvc.perform(get("/api/cards/" + id)).andExpect(status().isNotFound());
	}

	@Test
	void 削除したカードは_一覧に出てこない() throws Exception {
		long id = createCard("del-list");

		mockMvc.perform(delete("/api/cards/" + id)).andExpect(status().isNoContent());

		mockMvc.perform(get("/api/cards"))
				.andExpect(jsonPath("$[?(@.id == " + id + ")]").isEmpty());
	}

	@Test
	void 削除しても_ほかのカードは残る() throws Exception {
		long target = createCard("del-one");
		long other = createCard("del-other");

		mockMvc.perform(delete("/api/cards/" + target)).andExpect(status().isNoContent());

		mockMvc.perform(get("/api/cards/" + other))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("del-other"));
	}

	@Test
	void 存在しないカードは404() throws Exception {
		mockMvc.perform(delete("/api/cards/999999")).andExpect(status().isNotFound());
	}

	@Test
	void 同じカードを2回削除すると_2回目は404() throws Exception {
		long id = createCard("del-twice");

		mockMvc.perform(delete("/api/cards/" + id)).andExpect(status().isNoContent());
		mockMvc.perform(delete("/api/cards/" + id)).andExpect(status().isNotFound());
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
