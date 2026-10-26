package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.example.taskmanagement.service.BackupService;
import com.jayway.jsonpath.JsonPath;

// バックアップの復元の、本文の大きさの上限（20MB）のテスト。
// 本文は、JSON として有効なまま、後ろに空白（JSON では意味がない）を足して、大きさだけ調整する
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class BackupBodyLimitApiTests {

	private static final int LIMIT = BackupService.MAX_BYTES;
	private static final String BODY = "{\"app\":\"taskboard\",\"version\":1,\"columns\":[{\"name\":\"ToDo\",\"cards\":[]}]}";

	@Autowired
	MockMvc mockMvc;

	@LocalServerPort
	int port;

	private static byte[] bodyOfSize(int size) {
		byte[] bytes = new byte[size];
		Arrays.fill(bytes, (byte) ' ');
		byte[] json = BODY.getBytes(StandardCharsets.UTF_8);
		System.arraycopy(json, 0, bytes, 0, json.length);
		return bytes;
	}

	@Test
	void 上限を超える本文は_413で断られ_今のデータは変わらない() throws Exception {
		String before = mockMvc.perform(get("/api/backup")).andReturn().getResponse().getContentAsString();

		mockMvc.perform(post("/api/backup/restore").contentType(MediaType.APPLICATION_JSON).content(bodyOfSize(LIMIT + 1)))
				.andExpect(status().isContentTooLarge())
				.andExpect(jsonPath("$.detail").value("ファイルが大きすぎます（20MBまで）"));

		String after = mockMvc.perform(get("/api/backup")).andReturn().getResponse().getContentAsString();
		assertThat(columnsOf(after)).isEqualTo(columnsOf(before));
	}

	@Test
	void 上限ちょうどの本文は_読み込める() throws Exception {
		String original = mockMvc.perform(get("/api/backup")).andReturn().getResponse().getContentAsString();
		try {
			mockMvc.perform(post("/api/backup/restore").contentType(MediaType.APPLICATION_JSON).content(bodyOfSize(LIMIT)))
					.andExpect(status().isNoContent());
		} finally {
			mockMvc.perform(post("/api/backup/restore").contentType(MediaType.APPLICATION_JSON).content(original))
					.andExpect(status().isNoContent());
		}
	}

	// 本物のサーバー（Tomcat）に、大きさを申告しない送り方（分割送信）で、上限を超える本文を送る。
	// 読みすぎる前に止めた結果が、JSON を読む部品に包まれて 400 などにならず、413 で返ることを確かめる
	@Test
	void 大きさを申告しない送り方でも_上限を超えたら413() throws Exception {
		byte[] body = bodyOfSize(LIMIT + 1);
		HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/backup/restore"))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofInputStream(() -> (InputStream) new ByteArrayInputStream(body)))
				.build();

		HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());

		assertThat(response.statusCode()).isEqualTo(413);
		assertThat(response.body()).contains("ファイルが大きすぎます");
	}

	private static Object columnsOf(String backupJson) {
		return JsonPath.read(backupJson, "$.columns");
	}
}
