package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;

// カードの移動（PUT /api/cards/{id}/move）のテスト。
// DBは、他のテストと共有されるので、カードはテストごとに作り、自分のカードの位置と、列の連番だけを調べる
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CardMoveApiTests {

	@Autowired
	MockMvc mockMvc;

	@Test
	void 別の列の先頭へ移動できる() throws Exception {
		long from = columnId(0);
		long to = columnId(1);
		long id = createCard("mv-cross", from);

		move(id, to, 0).andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(id))
				.andExpect(jsonPath("$.columnId").value(to))
				.andExpect(jsonPath("$.position").value(0));

		assertThat(ids(to).get(0)).isEqualTo(id);
		assertThat(ids(from)).doesNotContain(id);
		assertConsecutive(to);
		assertConsecutive(from);
	}

	@Test
	void 別の列の末尾へ移動できる_範囲外の位置は末尾になる() throws Exception {
		long from = columnId(0);
		long to = columnId(2);
		long id = createCard("mv-end", from);

		move(id, to, 9999).andExpect(status().isOk()).andExpect(jsonPath("$.columnId").value(to));

		List<Long> ids = ids(to);
		assertThat(ids.get(ids.size() - 1)).isEqualTo(id);
		assertConsecutive(to);
	}

	@Test
	void 別の列の途中へ移動できる() throws Exception {
		long from = columnId(0);
		long to = columnId(1);
		long a = createCard("mv-mid-a", to);
		long b = createCard("mv-mid-b", to);
		long id = createCard("mv-mid", from);
		int before = ids(to).size();

		move(id, to, 1).andExpect(status().isOk());

		List<Long> ids = ids(to);
		assertThat(ids).hasSize(before + 1);
		assertThat(ids.get(1)).isEqualTo(id);
		assertThat(ids).contains(a, b);
		assertConsecutive(to);
	}

	@Test
	void 同じ列の中で_下へ動かせる() throws Exception {
		long col = columnId(0);
		long id = createCard("mv-down", col);
		int size = ids(col).size();

		// 新しいカードは先頭にいる。2番目へ動かす
		assertThat(ids(col).get(0)).isEqualTo(id);
		move(id, col, 1).andExpect(status().isOk()).andExpect(jsonPath("$.position").value(1));

		List<Long> ids = ids(col);
		assertThat(ids).hasSize(size);
		assertThat(ids.get(1)).isEqualTo(id);
		assertConsecutive(col);
	}

	@Test
	void 同じ列の中で_上へ動かせる() throws Exception {
		long col = columnId(0);
		long id = createCard("mv-up", col);
		move(id, col, 9999).andExpect(status().isOk());
		assertThat(last(ids(col))).isEqualTo(id);

		move(id, col, 0).andExpect(status().isOk()).andExpect(jsonPath("$.position").value(0));

		assertThat(ids(col).get(0)).isEqualTo(id);
		assertConsecutive(col);
	}

	@Test
	void 動かしても_列の中のほかのカードの順番は変わらない() throws Exception {
		long col = columnId(0);
		long to = columnId(2);
		long id = createCard("mv-order", col);
		List<Long> others = ids(col);
		others.remove(id);

		move(id, to, 0).andExpect(status().isOk());

		assertThat(ids(col)).isEqualTo(others);
	}

	@Test
	void 動かしても_タイトルや色などは変わらない() throws Exception {
		long col = columnId(0);
		String json = mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"mv-keep\",\"columnId\":" + col + ",\"color\":\"red\",\"dueDate\":\"2026-11-01\"}"))
				.andReturn().getResponse().getContentAsString();
		long id = JsonPath.parse(json).read("$.id", Long.class);
		update(id, "{\"title\":\"mv-keep\",\"description\":\"説明\",\"color\":\"red\",\"dueDate\":\"2026-11-01\"}");

		move(id, columnId(1), 0).andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("mv-keep"))
				.andExpect(jsonPath("$.description").value("説明"))
				.andExpect(jsonPath("$.color").value("red"))
				.andExpect(jsonPath("$.dueDate").value("2026-11-01"));
	}

	@Test
	void 移動した結果は_取り直しても同じ() throws Exception {
		long to = columnId(1);
		long id = createCard("mv-saved", columnId(0));

		move(id, to, 0).andExpect(status().isOk());

		mockMvc.perform(get("/api/cards/" + id))
				.andExpect(jsonPath("$.columnId").value(to))
				.andExpect(jsonPath("$.position").value(0));
	}

	@Test
	void 負の並び順が混じっていても_連番に直る() throws Exception {
		// 新しいカードは「最小値−1」で入るので、列の先頭に、負の position が溜まる
		long col = columnId(0);
		createCard("mv-neg-1", col);
		createCard("mv-neg-2", col);
		long id = createCard("mv-neg-3", col);

		move(id, col, 1).andExpect(status().isOk());

		assertConsecutive(col);
	}

	@Test
	void 存在しないカードは404() throws Exception {
		move(999999, columnId(0), 0).andExpect(status().isNotFound());
	}

	@Test
	void 存在しない列は404_カードは動かない() throws Exception {
		long col = columnId(0);
		long id = createCard("mv-nocol", col);

		move(id, 999999, 0).andExpect(status().isNotFound());

		mockMvc.perform(get("/api/cards/" + id)).andExpect(jsonPath("$.columnId").value(col));
	}

	@Test
	void 位置が負_または列IDや位置が無いなら400() throws Exception {
		long col = columnId(0);
		long id = createCard("mv-bad", col);

		send(id, "{\"columnId\":" + col + ",\"index\":-1}").andExpect(status().isBadRequest());
		send(id, "{\"index\":0}").andExpect(status().isBadRequest());
		send(id, "{\"columnId\":" + col + "}").andExpect(status().isBadRequest());
	}

	private ResultActions move(long id, long columnId, int index) throws Exception {
		return send(id, "{\"columnId\":" + columnId + ",\"index\":" + index + "}");
	}

	private ResultActions send(long id, String json) throws Exception {
		return mockMvc.perform(put("/api/cards/" + id + "/move").contentType(MediaType.APPLICATION_JSON).content(json));
	}

	private void update(long id, String json) throws Exception {
		mockMvc.perform(put("/api/cards/" + id).contentType(MediaType.APPLICATION_JSON).content(json))
				.andExpect(status().isOk());
	}

	private long columnId(int index) throws Exception {
		String columns = mockMvc.perform(get("/api/columns")).andReturn().getResponse().getContentAsString();
		return JsonPath.parse(columns).read("$[" + index + "].id", Long.class);
	}

	// 列のカードのIDを、上から順に返す
	private List<Long> ids(long columnId) throws Exception {
		String json = mockMvc.perform(get("/api/cards").param("columnId", String.valueOf(columnId)))
				.andReturn().getResponse().getContentAsString();
		List<Number> raw = JsonPath.parse(json).read("$[*].id");
		return raw.stream().map(Number::longValue).collect(Collectors.toCollection(ArrayList::new));
	}

	private long last(List<Long> list) {
		return list.get(list.size() - 1);
	}

	// 列の position が、0,1,2,… の連番になっていること
	private void assertConsecutive(long columnId) throws Exception {
		String json = mockMvc.perform(get("/api/cards").param("columnId", String.valueOf(columnId)))
				.andReturn().getResponse().getContentAsString();
		List<Number> positions = JsonPath.parse(json).read("$[*].position");
		for (int i = 0; i < positions.size(); i++) {
			assertThat(positions.get(i).intValue()).as("列 %d の %d 番目の position", columnId, i).isEqualTo(i);
		}
	}

	private long createCard(String title, long columnId) throws Exception {
		String json = mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"" + title + "\",\"columnId\":" + columnId + "}"))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		return JsonPath.parse(json).read("$.id", Long.class);
	}

}
