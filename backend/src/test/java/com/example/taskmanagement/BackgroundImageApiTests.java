package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import javax.imageio.ImageIO;

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

import com.example.taskmanagement.repository.UserBackgroundImageRepository;
import com.jayway.jsonpath.JsonPath;

// 自分の背景画像（/api/background-images）のテスト。
// 画像は、DB全体で3枚（sky / sunset / night）まで。他のテストと共有なので、前後で全部消しておく。
// 本物のJPEGは、テストの中で作る（個人の画像は使わない）
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class BackgroundImageApiTests {

	@Autowired
	MockMvc mockMvc;

	@Autowired
	UserBackgroundImageRepository imageRepository;

	@BeforeEach
	@AfterEach
	void clear() {
		imageRepository.deleteAll();
	}

	@Test
	void 登録すると_一覧に出て_同じ画像を取得できる() throws Exception {
		byte[] jpeg = jpeg(Color.BLUE);

		register("sky", jpeg).andExpect(status().isOk())
				.andExpect(jsonPath("$.slot").value("sky"))
				.andExpect(jsonPath("$.updatedAt").exists());

		mockMvc.perform(get("/api/background-images"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].slot").value("sky"))
				.andExpect(jsonPath("$[0].image").doesNotExist()); // 一覧には、画像のデータを入れない
		byte[] got = mockMvc.perform(get("/api/background-images/sky"))
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.IMAGE_JPEG))
				.andExpect(header().exists("ETag"))
				.andReturn().getResponse().getContentAsByteArray();
		assertThat(got).isEqualTo(jpeg);
	}

	@Test
	void 登録したときに返る日時は_一覧の日時と同じ() throws Exception {
		String saved = mockMvc.perform(put("/api/background-images/sky").contentType(MediaType.IMAGE_JPEG)
				.content(jpeg(Color.BLUE))).andReturn().getResponse().getContentAsString();

		mockMvc.perform(get("/api/background-images"))
				.andExpect(jsonPath("$[0].updatedAt").value(JsonPath.parse(saved).read("$.updatedAt", String.class)));
	}

	@Test
	void 変わっていなければ_ETagで304が返り_置き換えると200で新しい画像が返る() throws Exception {
		register("night", jpeg(Color.BLACK)).andExpect(status().isOk());
		String etag = mockMvc.perform(get("/api/background-images/night")).andReturn().getResponse().getHeader("ETag");

		mockMvc.perform(get("/api/background-images/night").header("If-None-Match", etag))
				.andExpect(status().isNotModified());

		Thread.sleep(5); // 登録日時（ミリ秒）が変わるように、少し待つ
		byte[] replaced = jpeg(Color.RED);
		register("night", replaced).andExpect(status().isOk());
		byte[] got = mockMvc.perform(get("/api/background-images/night").header("If-None-Match", etag))
				.andExpect(status().isOk())
				.andReturn().getResponse().getContentAsByteArray();
		assertThat(got).isEqualTo(replaced);
	}

	@Test
	void 同じ割り当て先に登録し直すと_置き換わり_1枚のまま() throws Exception {
		register("sunset", jpeg(Color.ORANGE)).andExpect(status().isOk());
		byte[] second = jpeg(Color.MAGENTA);

		register("sunset", second).andExpect(status().isOk());

		mockMvc.perform(get("/api/background-images")).andExpect(jsonPath("$.length()").value(1));
		assertThat(mockMvc.perform(get("/api/background-images/sunset")).andReturn().getResponse()
				.getContentAsByteArray()).isEqualTo(second);
	}

	@Test
	void 割り当て先ごとに_別々の画像を持てる() throws Exception {
		byte[] sky = jpeg(Color.CYAN);
		byte[] sunset = jpeg(Color.ORANGE);
		byte[] night = jpeg(Color.DARK_GRAY);
		register("sky", sky).andExpect(status().isOk());
		register("sunset", sunset).andExpect(status().isOk());
		register("night", night).andExpect(status().isOk());

		String list = mockMvc.perform(get("/api/background-images")).andReturn().getResponse().getContentAsString();
		List<Map<String, Object>> items = JsonPath.parse(list).read("$");
		assertThat(items.stream().map(i -> i.get("slot"))).containsExactly("night", "sky", "sunset"); // 名前の順
		assertThat(bytes("sky")).isEqualTo(sky);
		assertThat(bytes("sunset")).isEqualTo(sunset);
		assertThat(bytes("night")).isEqualTo(night);
	}

	@Test
	void 削除すると_標準の画像に戻る_取得は404_一覧から消える() throws Exception {
		register("sky", jpeg(Color.BLUE)).andExpect(status().isOk());
		register("night", jpeg(Color.BLACK)).andExpect(status().isOk());

		mockMvc.perform(delete("/api/background-images/sky")).andExpect(status().isNoContent());

		mockMvc.perform(get("/api/background-images/sky")).andExpect(status().isNotFound());
		mockMvc.perform(get("/api/background-images"))
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].slot").value("night")); // ほかの割り当て先は、残る
	}

	@Test
	void 登録がないものの取得と削除は404() throws Exception {
		mockMvc.perform(get("/api/background-images/sky")).andExpect(status().isNotFound());
		mockMvc.perform(delete("/api/background-images/sky")).andExpect(status().isNotFound());
	}

	@Test
	void 割り当て先が違えば404_画像も登録されない() throws Exception {
		for (String slot : List.of("plain", "auto", "other", "SKY")) {
			register(slot, jpeg(Color.BLUE)).andExpect(status().isNotFound());
			mockMvc.perform(get("/api/background-images/" + slot)).andExpect(status().isNotFound());
			mockMvc.perform(delete("/api/background-images/" + slot)).andExpect(status().isNotFound());
		}
		assertThat(imageRepository.count()).isZero();
	}

	@Test
	void JPEGでないもの_空_短すぎるものは400で_登録されない() throws Exception {
		register("sky", png()).andExpect(status().isBadRequest()); // PNG
		register("sky", "これは画像ではありません".getBytes()).andExpect(status().isBadRequest()); // 文字
		register("sky", new byte[] { (byte) 0xFF, (byte) 0xD8 }).andExpect(status().isBadRequest()); // 目印の途中まで
		mockMvc.perform(put("/api/background-images/sky").contentType(MediaType.IMAGE_JPEG).content(new byte[0]))
				.andExpect(status().isBadRequest()); // 空
		mockMvc.perform(put("/api/background-images/sky").contentType(MediaType.IMAGE_JPEG))
				.andExpect(status().isBadRequest()); // 本文なし

		assertThat(imageRepository.count()).isZero();
	}

	@Test
	void 失敗した登録では_すでにある画像は変わらない() throws Exception {
		byte[] original = jpeg(Color.GREEN);
		register("sky", original).andExpect(status().isOk());

		register("sky", png()).andExpect(status().isBadRequest());

		assertThat(bytes("sky")).isEqualTo(original);
	}

	@Test
	void 大きさは_5MBちょうどまで登録でき_1バイトでも超えると400() throws Exception {
		int limit = 5 * 1024 * 1024;

		register("sky", withJpegMark(limit)).andExpect(status().isOk());
		assertThat(bytes("sky")).hasSize(limit);

		register("night", withJpegMark(limit + 1)).andExpect(status().isBadRequest());
		assertThat(imageRepository.existsById("night")).isFalse();
	}

	@Test
	void バックアップの書き出しには画像が入らず_読み込んでも登録した画像は残る() throws Exception {
		byte[] jpeg = jpeg(Color.PINK);
		register("sunset", jpeg).andExpect(status().isOk());

		String backup = mockMvc.perform(get("/api/backup")).andExpect(status().isOk()).andReturn().getResponse()
				.getContentAsString();
		assertThat(backup).doesNotContain("sunset").doesNotContain("image");

		mockMvc.perform(post("/api/backup/restore").contentType(MediaType.APPLICATION_JSON).content(backup))
				.andExpect(status().isNoContent());

		assertThat(bytes("sunset")).isEqualTo(jpeg);
	}

	// ---------- 道具 ----------

	private ResultActions register(String slot, byte[] body) throws Exception {
		return mockMvc.perform(put("/api/background-images/" + slot).contentType(MediaType.IMAGE_JPEG).content(body));
	}

	private byte[] bytes(String slot) throws Exception {
		return mockMvc.perform(get("/api/background-images/" + slot)).andExpect(status().isOk()).andReturn()
				.getResponse().getContentAsByteArray();
	}

	// 本物のJPEG（小さな単色の画像）
	private static byte[] jpeg(Color color) throws IOException {
		return encode(color, "jpg");
	}

	private static byte[] png() throws IOException {
		return encode(Color.BLUE, "png");
	}

	private static byte[] encode(Color color, String format) throws IOException {
		BufferedImage image = new BufferedImage(16, 9, BufferedImage.TYPE_INT_RGB);
		var g = image.createGraphics();
		g.setColor(color);
		g.fillRect(0, 0, 16, 9);
		g.dispose();
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		ImageIO.write(image, format, out);
		return out.toByteArray();
	}

	// 先頭がJPEGの目印で、指定の大きさのデータ（大きさの境目のテスト用。画像として開けなくてよい）
	private static byte[] withJpegMark(int size) {
		byte[] data = new byte[size];
		Arrays.fill(data, (byte) 0x11);
		data[0] = (byte) 0xFF;
		data[1] = (byte) 0xD8;
		data[2] = (byte) 0xFF;
		return data;
	}

}
