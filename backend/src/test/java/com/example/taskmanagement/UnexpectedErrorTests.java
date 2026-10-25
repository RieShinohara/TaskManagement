package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.taskmanagement.controller.ApiExceptionHandler;

// 想定外のエラー（500）のテスト。わざと壊れる窓口（テストの中だけにある）を使って、
// 本文が ProblemDetail になること、内部の情報が本文に出ないこと、ログには原因が残ることを確かめる。
// Spring もDBも起動しない、軽いテスト
@ExtendWith(OutputCaptureExtension.class)
class UnexpectedErrorTests {

	private final MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new BrokenController())
			.setControllerAdvice(new ApiExceptionHandler()).build();

	@Test
	void 想定外の例外は_500のProblemDetailで_内部の情報を本文に出さない() throws Exception {
		mockMvc.perform(get("/broken"))
				.andExpect(status().isInternalServerError())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.status").value(500))
				.andExpect(jsonPath("$.title").value("Internal Server Error"))
				.andExpect(jsonPath("$.detail").value("サーバーでエラーが起きました。しばらくしてから、もう一度試してください。"))
				.andExpect(content().string(not(containsString("secret-internal"))));
	}

	@Test
	void 想定外の例外は_ログに原因が残る(CapturedOutput output) throws Exception {
		mockMvc.perform(get("/broken"));

		assertThat(output.getAll()).contains("想定外のエラー").contains("secret-internal");
	}

	@RestController
	static class BrokenController {

		@GetMapping("/broken")
		String broken() {
			throw new IllegalStateException("secret-internal: DBのパスワードのような内部の情報");
		}

	}

}
