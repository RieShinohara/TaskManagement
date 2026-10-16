package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

// 期限順の並び替え（POST /api/columns/{id}/sort-by-due）のテスト。
// DBは、他のテストと共有されるので、カードはテストごとに作り、列全体が「期限順になっているか」を調べる
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CardSortApiTests {

	@Autowired
	MockMvc mockMvc;

	@Test
	void 期限の早い順に並び_期限なしは末尾になる() throws Exception {
		long col = columnId(0);
		createCard("srt-late", col, "2030-12-31");
		createCard("srt-none", col, null);
		createCard("srt-early", col, "2030-01-01");
		createCard("srt-mid", col, "2030-06-15");

		List<Map<String, Object>> sorted = sort(col);

		assertSortedByDue(sorted);
		// 自分の4枚の順番（期限の早い順、期限なしは最後）
		assertThat(titlesOf(sorted).stream().filter(t -> t.startsWith("srt-")).toList())
				.containsSubsequence("srt-early", "srt-mid", "srt-late", "srt-none");
	}

	@Test
	void 並び順は保存され_positionは連番になる() throws Exception {
		long col = columnId(0);
		createCard("srt-save-b", col, "2031-02-01");
		createCard("srt-save-a", col, "2031-01-01");

		List<Map<String, Object>> sorted = sort(col);

		List<Map<String, Object>> reloaded = cardsOf(col);
		assertThat(idsOf(reloaded)).isEqualTo(idsOf(sorted));
		assertSortedByDue(reloaded);
		for (int i = 0; i < reloaded.size(); i++) {
			assertThat(((Number) reloaded.get(i).get("position")).intValue()).as("%d 番目の position", i).isEqualTo(i);
		}
	}

	@Test
	void 同じ期限のカードは_今の順番のまま() throws Exception {
		long col = columnId(0);
		long first = createCard("srt-tie-1", col, "2032-03-03"); // 先に作ったカードは、あとから作ったカードの下になる
		long second = createCard("srt-tie-2", col, "2032-03-03");
		List<Long> before = idsOf(cardsOf(col));
		assertThat(before.indexOf(second)).isLessThan(before.indexOf(first));

		List<Long> after = idsOf(sort(col));

		assertThat(after.indexOf(second)).isLessThan(after.indexOf(first));
	}

	@Test
	void もう一度押しても_結果は変わらない() throws Exception {
		long col = columnId(0);
		createCard("srt-twice-b", col, "2033-05-05");
		createCard("srt-twice-a", col, "2033-04-04");

		List<Long> once = idsOf(sort(col));
		List<Long> twice = idsOf(sort(col));

		assertThat(twice).isEqualTo(once);
	}

	@Test
	void ほかの列は変わらない() throws Exception {
		long col = columnId(0);
		long other = columnId(1);
		createCard("srt-other-1", other, "2034-09-09");
		createCard("srt-other-2", other, "2034-01-01");
		List<Long> before = idsOf(cardsOf(other));

		sort(col);

		assertThat(idsOf(cardsOf(other))).isEqualTo(before);
	}

	@Test
	void 並び直したあとに追加したカードは_列の一番上に入る() throws Exception {
		long col = columnId(0);
		createCard("srt-top-old", col, "2035-01-01");
		sort(col);

		long added = createCard("srt-top-new", col, "2099-12-31");

		assertThat(idsOf(cardsOf(col)).get(0)).isEqualTo(added);
	}

	@Test
	void 存在しない列は404() throws Exception {
		mockMvc.perform(post("/api/columns/999999/sort-by-due")).andExpect(status().isNotFound());
	}

	// 期限の早い順で、期限なしは末尾になっていること
	private void assertSortedByDue(List<Map<String, Object>> cards) {
		String previous = null;
		boolean seenNone = false;
		for (Map<String, Object> card : cards) {
			String due = (String) card.get("dueDate");
			if (due == null) {
				seenNone = true;
				continue;
			}
			assertThat(seenNone).as("期限なしのカードより後ろに、期限ありのカードがある: %s", card.get("title")).isFalse();
			if (previous != null) {
				assertThat(due.compareTo(previous)).as("%s の前が %s", due, previous).isGreaterThanOrEqualTo(0);
			}
			previous = due;
		}
	}

	private List<Map<String, Object>> sort(long columnId) throws Exception {
		String json = mockMvc.perform(post("/api/columns/" + columnId + "/sort-by-due"))
				.andExpect(status().isOk())
				.andReturn().getResponse().getContentAsString();
		return JsonPath.parse(json).read("$");
	}

	private List<Map<String, Object>> cardsOf(long columnId) throws Exception {
		String json = mockMvc.perform(get("/api/cards").param("columnId", String.valueOf(columnId)))
				.andReturn().getResponse().getContentAsString();
		return JsonPath.parse(json).read("$");
	}

	private List<Long> idsOf(List<Map<String, Object>> cards) {
		return cards.stream().map(c -> ((Number) c.get("id")).longValue()).toList();
	}

	private List<String> titlesOf(List<Map<String, Object>> cards) {
		return cards.stream().map(c -> (String) c.get("title")).toList();
	}

	private long columnId(int index) throws Exception {
		String columns = mockMvc.perform(get("/api/columns")).andReturn().getResponse().getContentAsString();
		return JsonPath.parse(columns).read("$[" + index + "].id", Long.class);
	}

	private long createCard(String title, long columnId, String dueDate) throws Exception {
		String due = dueDate == null ? "" : ",\"dueDate\":\"" + dueDate + "\"";
		String json = mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"" + title + "\",\"columnId\":" + columnId + due + "}"))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		return JsonPath.parse(json).read("$.id", Long.class);
	}

}
