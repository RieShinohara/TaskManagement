package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;

// バックアップ（GET /api/backup、POST /api/backup/restore）のテスト。
// 読み込みは、DBの中身を全部入れ替える。DBは他のテストと共有なので、各テストの前に今の状態を書き出しておき、
// 終わったら読み込んで元に戻す（列は ToDo / 作業中 / 完了 の3つに戻る）
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class BackupApiTests {

	@Autowired
	MockMvc mockMvc;

	private String original;

	@BeforeEach
	void saveOriginal() throws Exception {
		original = exportJson();
	}

	@AfterEach
	void restoreOriginal() throws Exception {
		restore(original).andExpect(status().isNoContent());
	}

	@Test
	void 書き出すと_アプリの目印と日時と_列が左から順に入っている() throws Exception {
		mockMvc.perform(get("/api/backup"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.app").value("taskboard"))
				.andExpect(jsonPath("$.version").value(1))
				.andExpect(jsonPath("$.exportedAt").exists())
				.andExpect(jsonPath("$.columns[0].name").value("ToDo"))
				.andExpect(jsonPath("$.columns[1].name").value("作業中"))
				.andExpect(jsonPath("$.columns[2].name").value("完了"))
				// IDと position は、ファイルに入れない
				.andExpect(jsonPath("$.columns[0].id").doesNotExist())
				.andExpect(jsonPath("$.columns[0].cards[0].id").doesNotExist())
				.andExpect(jsonPath("$.columns[0].cards[0].position").doesNotExist());
	}

	@Test
	void 書き出して_読み込むと_同じ内容に戻る() throws Exception {
		long col0 = columnId(0);
		long col1 = columnId(1);
		createCard("bk-a", col0, "red", "2030-01-01");
		createCard("bk-b", col0, "none", null);
		long c = createCard("bk-c", col1, "blue", "2031-12-31");
		update(c, "{\"title\":\"bk-c\",\"description\":\"説明あり\",\"color\":\"blue\",\"dueDate\":\"2031-12-31\"}");
		String backupText = exportJson(); // 書き出したファイルの中身
		List<Object> before = columnsOf(backupText);

		// 壊す：カードを消し、別のカードを足す
		for (long id : cardIds()) {
			mockMvc.perform(delete("/api/cards/" + id)).andExpect(status().isNoContent());
		}
		createCard("bk-broken", columnId(2), "gray", null);
		assertThat(columnsOf(exportJson())).isNotEqualTo(before);

		restore(backupText).andExpect(status().isNoContent());

		assertThat(columnsOf(exportJson())).isEqualTo(before);
	}

	@Test
	void 読み込むと_今のカードは全部なくなり_ファイルの内容になる() throws Exception {
		createCard("bk-old", columnId(0), "none", null);

		restore(file("""
				[{"name":"ToDo","cards":[{"title":"bk-new","color":"none"}]},
				 {"name":"作業中","cards":[]},
				 {"name":"完了","cards":[]}]
				""")).andExpect(status().isNoContent());

		String json = exportJson();
		assertThat(titlesIn(json, 0)).containsExactly("bk-new");
		assertThat(titlesIn(json, 1)).isEmpty();
		assertThat(titlesIn(json, 2)).isEmpty();
	}

	@Test
	void 並び順は配列の順になり_positionは0からの連番_列の順は1からの連番になる() throws Exception {
		restore(file("""
				[{"name":"ToDo","cards":[{"title":"一番上","color":"none"},{"title":"二番目","color":"none"},{"title":"三番目","color":"none"}]},
				 {"name":"作業中","cards":[{"title":"作業1","color":"red"}]},
				 {"name":"完了","cards":[]}]
				""")).andExpect(status().isNoContent());

		assertThat(titlesIn(exportJson(), 0)).containsExactly("一番上", "二番目", "三番目");
		String cards = mockMvc.perform(get("/api/cards").param("columnId", String.valueOf(columnId(0))))
				.andReturn().getResponse().getContentAsString();
		List<Number> positions = JsonPath.parse(cards).read("$[*].position");
		assertThat(positions.stream().map(Number::intValue).toList()).containsExactly(0, 1, 2);
		String columns = mockMvc.perform(get("/api/columns")).andReturn().getResponse().getContentAsString();
		List<Number> sortOrders = JsonPath.parse(columns).read("$[*].sortOrder");
		assertThat(sortOrders.stream().map(Number::intValue).toList()).containsExactly(1, 2, 3);
	}

	@Test
	void 負のpositionが混じった状態から書き出して_読み込むと_連番に直る() throws Exception {
		long col = columnId(0);
		createCard("bk-neg-1", col, "none", null);
		createCard("bk-neg-2", col, "none", null);
		createCard("bk-neg-3", col, "none", null);
		restore(exportJson()).andExpect(status().isNoContent());

		String cards = mockMvc.perform(get("/api/cards").param("columnId", String.valueOf(columnId(0))))
				.andReturn().getResponse().getContentAsString();
		List<Number> positions = JsonPath.parse(cards).read("$[*].position");
		for (int i = 0; i < positions.size(); i++) {
			assertThat(positions.get(i).intValue()).isEqualTo(i);
		}
	}

	@Test
	void 説明文_色_期限日が戻り_空白だけの説明文はなくなる() throws Exception {
		restore(file("""
				[{"name":"ToDo","cards":[
				   {"title":"  bk-full  ","description":"長い説明","color":"yellow","dueDate":"2032-02-29"},
				   {"title":"bk-blank","description":"   ","color":"none"}]},
				 {"name":"作業中","cards":[]},{"name":"完了","cards":[]}]
				""")).andExpect(status().isNoContent());

		mockMvc.perform(get("/api/backup"))
				.andExpect(jsonPath("$.columns[0].cards[0].title").value("bk-full"))
				.andExpect(jsonPath("$.columns[0].cards[0].description").value("長い説明"))
				.andExpect(jsonPath("$.columns[0].cards[0].color").value("yellow"))
				.andExpect(jsonPath("$.columns[0].cards[0].dueDate").value("2032-02-29"))
				.andExpect(jsonPath("$.columns[0].cards[1].description").doesNotExist());
	}

	@Test
	void 知らない項目_たとえば背景の設定_が付いていても_読み込める() throws Exception {
		restore("""
				{"app":"taskboard","version":1,"settings":{"background":"sky"},
				 "columns":[{"name":"ToDo","note":"x","cards":[{"title":"bk-extra","color":"none","extra":1}]}]}
				""").andExpect(status().isNoContent());

		assertThat(titlesIn(exportJson(), 0)).containsExactly("bk-extra");
	}

	@Test
	void 不正なファイルは400になり_今のデータは変わらない() throws Exception {
		createCard("bk-keep", columnId(0), "none", null);
		List<Object> before = columnsOf(exportJson());

		List<String> bad = List.of(
				"{\"app\":\"other\",\"version\":1,\"columns\":[{\"name\":\"A\",\"cards\":[]}]}", // アプリが違う
				"{\"version\":1,\"columns\":[{\"name\":\"A\",\"cards\":[]}]}", // app がない
				"{\"app\":\"taskboard\",\"version\":2,\"columns\":[{\"name\":\"A\",\"cards\":[]}]}", // 知らないバージョン
				"{\"app\":\"taskboard\",\"columns\":[{\"name\":\"A\",\"cards\":[]}]}", // version がない
				"{\"app\":\"taskboard\",\"version\":1,\"columns\":[]}", // 列がない
				"{\"app\":\"taskboard\",\"version\":1}", // columns がない
				"{\"app\":\"taskboard\",\"version\":1,\"columns\":[{\"name\":\" \",\"cards\":[]}]}", // 列の名前が空
				"{\"app\":\"taskboard\",\"version\":1,\"columns\":[{\"name\":\"A\"}]}", // cards がない
				"{\"app\":\"taskboard\",\"version\":1,\"columns\":[{\"name\":\"A\",\"cards\":[{\"title\":\" \",\"color\":\"none\"}]}]}", // タイトルが空
				"{\"app\":\"taskboard\",\"version\":1,\"columns\":[{\"name\":\"A\",\"cards\":[{\"title\":\"" + "a".repeat(256) + "\",\"color\":\"none\"}]}]}", // タイトルが長い
				"{\"app\":\"taskboard\",\"version\":1,\"columns\":[{\"name\":\"A\",\"cards\":[{\"title\":\"x\",\"description\":\"" + "あ".repeat(2001) + "\",\"color\":\"none\"}]}]}", // 説明文が長い
				"{\"app\":\"taskboard\",\"version\":1,\"columns\":[{\"name\":\"A\",\"cards\":[{\"title\":\"x\",\"color\":\"purple\"}]}]}", // 色が不正
				"{\"app\":\"taskboard\",\"version\":1,\"columns\":[{\"name\":\"A\",\"cards\":[{\"title\":\"x\"}]}]}", // 色がない
				"{\"app\":\"taskboard\",\"version\":1,\"columns\":[{\"name\":\"A\",\"cards\":[{\"title\":\"x\",\"color\":\"none\",\"dueDate\":\"2026-13-40\"}]}]}", // 期限日が不正
				"{\"app\":\"taskboard\",\"version\":1,\"columns\":[null]}", // 列が null
				"{\"app\":\"taskboard\",\"version\":1,\"columns\":[{\"name\":\"A\",\"cards\":[null]}]}", // カードが null
				"これはバックアップファイルではありません", // JSON ではない
				"[]", // 形が違う
				"");

		for (String json : bad) {
			restore(json).andExpect(status().isBadRequest());
			assertThat(columnsOf(exportJson())).as("不正なファイルのあとも、データは変わらない: %s", json).isEqualTo(before);
		}
	}

	@Test
	void カードが1万枚を超えるファイルは400になり_今のデータは変わらない() throws Exception {
		createCard("bk-limit-keep", columnId(0), "none", null);
		List<Object> before = columnsOf(exportJson());
		String card = "{\"title\":\"x\",\"color\":\"none\"},";
		String tooMany = file("[{\"name\":\"ToDo\",\"cards\":[" + card.repeat(10000) + "{\"title\":\"y\",\"color\":\"none\"}]}]");

		restore(tooMany).andExpect(status().isBadRequest());

		assertThat(columnsOf(exportJson())).isEqualTo(before);
	}

	@Test
	void 書き出しには_背景の設定が入っている() throws Exception {
		setBackground("night");

		mockMvc.perform(get("/api/backup")).andExpect(jsonPath("$.settings.background").value("night"));
	}

	@Test
	void 書き出して_読み込むと_背景も元に戻る() throws Exception {
		setBackground("sunset");
		String backupText = exportJson();
		setBackground("plain");

		restore(backupText).andExpect(status().isNoContent());

		mockMvc.perform(get("/api/settings")).andExpect(jsonPath("$.background").value("sunset"));
	}

	@Test
	void 背景の設定がない古いファイルを読み込むと_青空になる() throws Exception {
		setBackground("night");

		restore(file("[{\"name\":\"ToDo\",\"cards\":[]}]")).andExpect(status().isNoContent());

		mockMvc.perform(get("/api/settings")).andExpect(jsonPath("$.background").value("sky"));
	}

	@Test
	void 背景の設定が不正なファイルは400になり_今のデータも背景も変わらない() throws Exception {
		setBackground("night");
		List<Object> before = columnsOf(exportJson());

		for (String settings : List.of("{\"background\":\"rainbow\"}", "{\"background\":null}", "{}", "\"night\"")) {
			restore("{\"app\":\"taskboard\",\"version\":1,\"settings\":" + settings
					+ ",\"columns\":[{\"name\":\"A\",\"cards\":[]}]}").andExpect(status().isBadRequest());
		}

		assertThat(columnsOf(exportJson())).isEqualTo(before);
		mockMvc.perform(get("/api/settings")).andExpect(jsonPath("$.background").value("night"));
	}

	// ---------- 道具 ----------

	private void setBackground(String background) throws Exception {
		mockMvc.perform(put("/api/settings").contentType(MediaType.APPLICATION_JSON)
				.content("{\"background\":\"" + background + "\"}")).andExpect(status().isOk());
	}


	private ResultActions restore(String json) throws Exception {
		return mockMvc.perform(post("/api/backup/restore").contentType(MediaType.APPLICATION_JSON).content(json));
	}

	private String exportJson() throws Exception {
		return mockMvc.perform(get("/api/backup")).andExpect(status().isOk()).andReturn().getResponse()
				.getContentAsString();
	}

	// ファイルの形にする：列の配列だけを書いて、あとの部分を付ける
	private String file(String columnsJson) {
		return "{\"app\":\"taskboard\",\"version\":1,\"columns\":" + columnsJson + "}";
	}

	private List<Object> columnsOf(String backupJson) {
		return JsonPath.parse(backupJson).read("$.columns");
	}

	private List<String> titlesIn(String backupJson, int columnIndex) {
		return JsonPath.parse(backupJson).read("$.columns[" + columnIndex + "].cards[*].title");
	}

	private List<Long> cardIds() throws Exception {
		String json = mockMvc.perform(get("/api/cards")).andReturn().getResponse().getContentAsString();
		List<Number> ids = JsonPath.parse(json).read("$[*].id");
		return ids.stream().map(Number::longValue).toList();
	}

	private long columnId(int index) throws Exception {
		String columns = mockMvc.perform(get("/api/columns")).andReturn().getResponse().getContentAsString();
		return JsonPath.parse(columns).read("$[" + index + "].id", Long.class);
	}

	private long createCard(String title, long columnId, String color, String dueDate) throws Exception {
		String due = dueDate == null ? "" : ",\"dueDate\":\"" + dueDate + "\"";
		String json = mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"" + title + "\",\"columnId\":" + columnId + ",\"color\":\"" + color + "\"" + due + "}"))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		return JsonPath.parse(json).read("$.id", Long.class);
	}

	private void update(long id, String json) throws Exception {
		mockMvc.perform(put("/api/cards/" + id).contentType(MediaType.APPLICATION_JSON).content(json))
				.andExpect(status().isOk());
	}

}
