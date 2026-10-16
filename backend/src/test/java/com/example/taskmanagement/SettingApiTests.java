package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

	@Test
	void 設定がまだないときは_初期値の青空で作られる() throws Exception {
		settingRepository.deleteAll(); // 初めて開いたときの状態にする（終わったら、元の値に戻す）

		mockMvc.perform(get("/api/settings")).andExpect(jsonPath("$.background").value("sky"));
		assertThat(settingRepository.count()).isEqualTo(1);
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
