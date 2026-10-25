package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

// カードの移動・追加・並べ替えが、「同時に」来たときのテスト。
// 画面は、移動の保存中でも次のドラッグを止めないので、素早く2回ドラッグすると、2つの移動が同時にサーバーに届く。
// 同時に並べ直すと、変わった行だけを更新する仕組み（変更検知）のせいで、position が重複したり、
// 行の更新順が逆になってデッドロックしたりするおそれがある。
// サーバーが、並び順を変える操作を「1つずつ順番に」処理すれば、何本同時に来ても、全部成功し、並びは壊れない
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CardMoveConcurrencyTests {

	private static final int THREADS = 8;
	private static final int ROUNDS = 10;

	@Autowired
	MockMvc mockMvc;

	@Test
	void 別々のカードを同じ列の先頭へ同時に動かしても_全部成功し_並びは壊れない() throws Exception {
		long column = columnId(0);
		List<Long> mine = createCards("b7-same", column, THREADS);

		for (int round = 0; round < ROUNDS; round++) {
			List<Callable<Integer>> tasks = new ArrayList<>();
			for (long id : mine) {
				tasks.add(() -> move(id, column, 0));
			}
			assertThat(runConcurrently(tasks)).as("ラウンド %d の返事", round).containsOnly(200);

			assertConsecutive(column, round);
			assertNoMissingOrDuplicate(column, mine, round);
		}
	}

	@Test
	void 別々のカードを2つの列へ同時に動かしても_どちらの列も壊れない() throws Exception {
		long left = columnId(0);
		long right = columnId(1);
		List<Long> mine = createCards("b7-cross", left, THREADS);

		for (int round = 0; round < ROUNDS; round++) {
			List<Callable<Integer>> tasks = new ArrayList<>();
			for (int i = 0; i < mine.size(); i++) {
				long id = mine.get(i);
				long target = ((i + round) % 2 == 0) ? left : right; // 行き先を、ラウンドごとに入れ替える
				tasks.add(() -> move(id, target, 0));
			}
			assertThat(runConcurrently(tasks)).as("ラウンド %d の返事", round).containsOnly(200);

			assertConsecutive(left, round);
			assertConsecutive(right, round);
			List<Long> both = new ArrayList<>(ids(left));
			both.addAll(ids(right));
			assertThat(both).as("ラウンド %d：2つの列を合わせて、重複も欠けもない", round).doesNotHaveDuplicates()
					.containsAll(mine);
		}
	}

	@Test
	void 期限順の並べ替えと移動が同時に来ても_全部成功し_並びは壊れない() throws Exception {
		long column = columnId(0);
		List<Long> mine = createCards("b7-sort", column, THREADS);

		for (int round = 0; round < ROUNDS; round++) {
			List<Callable<Integer>> tasks = new ArrayList<>();
			for (int i = 0; i < mine.size(); i++) {
				long id = mine.get(i);
				if (i % 4 == 3) {
					tasks.add(() -> sortByDue(column));
				} else {
					tasks.add(() -> move(id, column, 0));
				}
			}
			assertThat(runConcurrently(tasks)).as("ラウンド %d の返事", round).containsOnly(200);

			assertConsecutive(column, round);
			assertNoMissingOrDuplicate(column, mine, round);
		}
	}

	// 追加は、「その列で一番小さい position − 1」を読んでから入れる。同時に読むと、同じ position になるおそれがある
	@Test
	void 同じ列へ同時にカードを追加しても_全部成功し_positionは重複しない() throws Exception {
		long column = columnId(0);

		for (int round = 0; round < ROUNDS; round++) {
			List<Callable<Integer>> tasks = new ArrayList<>();
			List<Integer> positions = java.util.Collections.synchronizedList(new ArrayList<>());
			for (int i = 0; i < THREADS; i++) {
				tasks.add(() -> {
					var response = mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
							.content("{\"title\":\"b7-add\",\"columnId\":" + column + "}")).andReturn().getResponse();
					if (response.getStatus() == 201) {
						positions.add(JsonPath.parse(response.getContentAsString()).read("$.position", Integer.class));
					}
					return response.getStatus();
				});
			}
			assertThat(runConcurrently(tasks)).as("ラウンド %d の返事", round).containsOnly(201);

			Set<Integer> distinct = new HashSet<>(positions);
			assertThat(distinct).as("ラウンド %d：追加したカードの position（%s）に重複がない", round, positions)
					.hasSize(THREADS);
		}
	}

	// すべてのタスクを、スレッドを用意して、「よーい、どん」でいっせいに始め、返事の番号を集める
	private List<Integer> runConcurrently(List<Callable<Integer>> tasks) throws Exception {
		ExecutorService pool = Executors.newFixedThreadPool(tasks.size());
		try {
			CountDownLatch ready = new CountDownLatch(tasks.size());
			CountDownLatch go = new CountDownLatch(1);
			List<Future<Integer>> futures = new ArrayList<>();
			for (Callable<Integer> task : tasks) {
				futures.add(pool.submit(() -> {
					ready.countDown();
					go.await();
					return task.call();
				}));
			}
			ready.await();
			go.countDown();
			List<Integer> statuses = new ArrayList<>();
			for (Future<Integer> future : futures) {
				statuses.add(future.get(60, TimeUnit.SECONDS));
			}
			return statuses;
		} finally {
			pool.shutdownNow();
		}
	}

	private int move(long id, long columnId, int index) throws Exception {
		return mockMvc.perform(put("/api/cards/" + id + "/move").contentType(MediaType.APPLICATION_JSON)
				.content("{\"columnId\":" + columnId + ",\"index\":" + index + "}")).andReturn().getResponse().getStatus();
	}

	private int sortByDue(long columnId) throws Exception {
		return mockMvc.perform(post("/api/columns/" + columnId + "/sort-by-due")).andReturn().getResponse().getStatus();
	}

	private List<Long> createCards(String title, long columnId, int count) throws Exception {
		List<Long> created = new ArrayList<>();
		for (int i = 0; i < count; i++) {
			String json = mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
					.content("{\"title\":\"" + title + "-" + i + "\",\"columnId\":" + columnId + "}"))
					.andReturn().getResponse().getContentAsString();
			created.add(JsonPath.parse(json).read("$.id", Long.class));
		}
		return created;
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
		return raw.stream().map(Number::longValue).toList();
	}

	// 列の position が、0,1,2,… の連番になっていること（並べ直した直後は、そうなる決まり）
	private void assertConsecutive(long columnId, int round) throws Exception {
		String json = mockMvc.perform(get("/api/cards").param("columnId", String.valueOf(columnId)))
				.andReturn().getResponse().getContentAsString();
		List<Number> positions = JsonPath.parse(json).read("$[*].position");
		List<Integer> actual = positions.stream().map(Number::intValue).toList();
		List<Integer> expected = new ArrayList<>();
		for (int i = 0; i < actual.size(); i++) {
			expected.add(i);
		}
		assertThat(actual).as("ラウンド %d：列 %d の position が 0,1,2,… の連番", round, columnId).isEqualTo(expected);
	}

	private void assertNoMissingOrDuplicate(long columnId, List<Long> mine, int round) throws Exception {
		assertThat(ids(columnId)).as("ラウンド %d：列 %d のカードに、重複も欠けもない", round, columnId).doesNotHaveDuplicates()
				.containsAll(mine);
	}

}
