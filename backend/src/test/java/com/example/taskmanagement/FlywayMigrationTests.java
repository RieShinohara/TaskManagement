package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;

// テーブルの管理（Flyway）のテスト。
// 空のDB（テスト用の使い捨てPostgreSQL）から、V1 の SQL でテーブルを作り、
// Entity とテーブルが合っているか（ddl-auto: validate）を、起動のときに確かめている
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class FlywayMigrationTests {

	@Autowired
	JdbcTemplate jdbcTemplate;

	@Autowired
	Environment environment;

	@Test
	void 空のDBから_V1で全部のテーブルが作られ_履歴に残る() {
		List<Map<String, Object>> history = jdbcTemplate
				.queryForList("select version, success from flyway_schema_history where version is not null order by installed_rank");

		assertThat(history).hasSize(1);
		assertThat(history.get(0)).containsEntry("version", "1").containsEntry("success", true);

		List<String> tables = jdbcTemplate.queryForList(
				"select table_name from information_schema.tables where table_schema = 'public' and table_name <> 'flyway_schema_history' order by table_name",
				String.class);
		assertThat(tables).containsExactly("board_column", "board_setting", "card", "user_background_image");
	}

	@Test
	void テーブルは_Hibernateに作らせず_Entityと合っているかだけ確かめる() {
		assertThat(environment.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
	}

}
