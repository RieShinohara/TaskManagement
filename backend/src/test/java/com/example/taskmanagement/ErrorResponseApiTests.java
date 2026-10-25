package com.example.taskmanagement;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.test.web.servlet.ResultActions;

import com.example.taskmanagement.service.BackgroundImageService;

// エラーの返事の「形」のテスト。どのエラーも、標準の ProblemDetail（RFC 9457）で、
// Content-Type は application/problem+json、本文に status / title / detail がある。
// 状態コード（404・400・405・413）そのものは、ほかのテストが確かめている。ここでは、本文の形を確かめる
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ErrorResponseApiTests {

	@Autowired
	MockMvc mockMvc;

	@Test
	void 見つからないカードは_404のProblemDetailで_理由が分かる() throws Exception {
		expectProblem(mockMvc.perform(get("/api/cards/999999")), 404, "Not Found")
				.andExpect(jsonPath("$.detail").value("カードが見つかりません: 999999"));
	}

	@Test
	void 見つからない列は_404のProblemDetail() throws Exception {
		expectProblem(mockMvc.perform(post("/api/columns/999999/sort-by-due")), 404, "Not Found")
				.andExpect(jsonPath("$.detail").value("列が見つかりません: 999999"));
	}

	@Test
	void 画像の割り当て先が違うなら_404のProblemDetail() throws Exception {
		expectProblem(mockMvc.perform(get("/api/background-images/nowhere")), 404, "Not Found")
				.andExpect(jsonPath("$.detail").value("割り当て先が見つかりません: nowhere"));
	}

	@Test
	void 入力の検査に失敗すると_400のProblemDetailで_項目ごとの理由がerrorsに入る() throws Exception {
		expectProblem(mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"  \",\"columnId\":1,\"color\":\"pink\"}")), 400, "Bad Request")
				.andExpect(jsonPath("$.errors.title").value("タイトルは必須です"))
				.andExpect(jsonPath("$.errors.color").value("色は none / red / blue / green / yellow / gray のどれかです"));
	}

	@Test
	void 壊れたJSONは_400のProblemDetail() throws Exception {
		expectProblem(mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON).content("{")), 400,
				"Bad Request");
	}

	@Test
	void 存在しないパスは_404のProblemDetail() throws Exception {
		expectProblem(mockMvc.perform(get("/api/nothing")), 404, "Not Found");
	}

	@Test
	void 許可されていない操作は_405のProblemDetail() throws Exception {
		expectProblem(mockMvc.perform(delete("/api/columns")), 405, "Method Not Allowed");
	}

	@Test
	void JPEGでない画像は_400のProblemDetail() throws Exception {
		expectProblem(mockMvc.perform(put("/api/background-images/sky").contentType(MediaType.IMAGE_JPEG)
				.content(new byte[] { 1, 2, 3, 4 })), 400, "Bad Request")
				.andExpect(jsonPath("$.detail").value("JPEGの画像ではありません"));
	}

	@Test
	void 大きすぎる画像は_413のProblemDetail() throws Exception {
		expectProblem(mockMvc.perform(put("/api/background-images/sky").contentType(MediaType.IMAGE_JPEG)
				.content(new byte[BackgroundImageService.MAX_BYTES + 1])), 413, "Content Too Large")
				.andExpect(jsonPath("$.detail").value("画像が大きすぎます（5MBまで）"));
	}

	// 状態コード・Content-Type・本文の status と title を確かめる（ProblemDetail の決まった項目）
	private static ResultActions expectProblem(ResultActions result, int status, String title) throws Exception {
		return result.andExpect(status().is(status))
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.status").value(status))
				.andExpect(jsonPath("$.title").value(title))
				.andExpect(jsonPath("$.detail").exists());
	}

}
