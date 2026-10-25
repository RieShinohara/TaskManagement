package com.example.taskmanagement;

import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.startsWith;
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

	// Spring 標準の例外の detail は、messages.properties の日本語（キーは「problemDetail.＋例外のクラス名」）。
	// title（Not Found など）は、番号の標準の名前なので、英語のまま
	@Test
	void 壊れたJSONの理由は日本語() throws Exception {
		expectProblem(mockMvc.perform(post("/api/cards").contentType(MediaType.APPLICATION_JSON).content("{")), 400,
				"Bad Request")
				.andExpect(jsonPath("$.detail").value("リクエストの本文を読み取れません。JSONの形や、値の型を確かめてください。"));
	}

	@Test
	void 存在しないパスの理由は日本語() throws Exception {
		expectProblem(mockMvc.perform(get("/api/nothing")), 404, "Not Found")
				.andExpect(jsonPath("$.detail").value("指定された住所は見つかりません: api/nothing"));
	}

	@Test
	void 許可されていない操作の理由は日本語() throws Exception {
		expectProblem(mockMvc.perform(delete("/api/columns")), 405, "Method Not Allowed")
				.andExpect(jsonPath("$.detail").value("この住所では、「DELETE」の操作は使えません。"));
	}

	@Test
	void 値の形が違う理由は日本語_どの項目の_どの値かが分かる() throws Exception {
		expectProblem(mockMvc.perform(get("/api/cards/abc")), 400, "Bad Request")
				.andExpect(jsonPath("$.detail").value("id の値「abc」は、正しい形ではありません。"));
		expectProblem(mockMvc.perform(get("/api/cards").param("dueBefore", "not-a-date")), 400, "Bad Request")
				.andExpect(jsonPath("$.detail").value("dueBefore の値「not-a-date」は、正しい形ではありません。"));
	}

	@Test
	void 受け付けないデータの形式の理由は日本語() throws Exception {
		expectProblem(mockMvc.perform(post("/api/cards").contentType(MediaType.TEXT_PLAIN).content(new byte[] { 120 })), 415,
				"Unsupported Media Type")
				// Spring は、文字コードを足した形（text/plain;charset=UTF-8）で値を渡す。実際の送信（curl）でも同じ。前半と後半だけを確かめる
				.andExpect(jsonPath("$.detail").value(startsWith("このデータの形式（text/plain")))
				.andExpect(jsonPath("$.detail").value(endsWith("）は受け付けていません。")));
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
