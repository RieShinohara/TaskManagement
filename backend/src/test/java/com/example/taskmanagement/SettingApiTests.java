package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

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

import com.example.taskmanagement.repository.BoardSettingRepository;
import com.jayway.jsonpath.JsonPath;

// 設定（選んだ背景）のテスト（GET / PUT /api/settings）。
// 設定はDB全体で1つだけ。他のテストと共有なので、テストの前の値を覚えておき、終わったら戻す
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class SettingApiTests {

	@Autowired
	MockMvc mockMvc;

	@Autowired
	BoardSettingRepository settingRepository;

	private String original;

	@BeforeEach
	void rememberOriginal() throws Exception {
		original = JsonPath.parse(mockMvc.perform(get("/api/settings")).andReturn().getResponse().getContentAsString())
				.read("$.background", String.class);
	}

	@AfterEach
	void restoreOriginal() throws Exception {
		update("{\"background\":\"" + original + "\"}").andExpect(status().isOk());
	}

	// 取得（GET）は、読むだけ。設定の行が無いときは、初期値（青空）を返すが、DBには書き込まない。
	// 行を作るのは、起動時の DataInitializer と、変えたとき（PUT）だけ
	@Test
	void 設定がまだないときは_初期値の青空を返すが_取得では行を作らない() throws Exception {
		settingRepository.deleteAll(); // 初めて開いたときの状態にする（終わったら、元の値に戻す）

		mockMvc.perform(get("/api/settings"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.background").value("sky"));
		assertThat(settingRepository.count()).isZero();

		update("{\"background\":\"night\"}").andExpect(status().isOk());
		assertThat(settingRepository.count()).isEqualTo(1);
	}

	// 取得が書き込むと、同時に来たときに、両方が行を作ろうとして、片方が失敗するおそれがある。
	// 取得は書き込まないので、何本同時に来ても、全部成功する
	@Test
	void 設定がまだないときに_取得が同時に来ても_全部成功する() throws Exception {
		int threads = 8;
		ExecutorService pool = Executors.newFixedThreadPool(threads);
		try {
			for (int round = 0; round < 10; round++) {
				settingRepository.deleteAll();
				CountDownLatch ready = new CountDownLatch(threads);
				CountDownLatch go = new CountDownLatch(1);
				List<Future<Integer>> statuses = new ArrayList<>();
				for (int i = 0; i < threads; i++) {
					statuses.add(pool.submit(() -> {
						ready.countDown();
						go.await(); // 全員がそろってから、いっせいに取得する
						return mockMvc.perform(get("/api/settings")).andReturn().getResponse().getStatus();
					}));
				}
				ready.await();
				go.countDown();
				for (Future<Integer> status : statuses) {
					assertThat(status.get(30, TimeUnit.SECONDS)).isEqualTo(200);
				}
			}
		} finally {
			pool.shutdownNow();
		}
		assertThat(settingRepository.count()).isZero();
	}

	@Test
	void 全ての背景に更新でき_取り直しても残る() throws Exception {
		for (String background : new String[] { "plain", "sunset", "night", "auto", "sky" }) {
			update("{\"background\":\"" + background + "\"}")
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.background").value(background));

			mockMvc.perform(get("/api/settings")).andExpect(jsonPath("$.background").value(background));
		}
	}

	@Test
	void 不正な値_空_無しは400で_設定は変わらない() throws Exception {
		update("{\"background\":\"night\"}").andExpect(status().isOk());

		update("{\"background\":\"rainbow\"}").andExpect(status().isBadRequest());
		update("{\"background\":\"\"}").andExpect(status().isBadRequest());
		update("{\"background\":null}").andExpect(status().isBadRequest());
		update("{}").andExpect(status().isBadRequest());
		update("").andExpect(status().isBadRequest());

		mockMvc.perform(get("/api/settings")).andExpect(jsonPath("$.background").value("night"));
	}

	private ResultActions update(String json) throws Exception {
		return mockMvc.perform(put("/api/settings").contentType(MediaType.APPLICATION_JSON).content(json));
	}

}
