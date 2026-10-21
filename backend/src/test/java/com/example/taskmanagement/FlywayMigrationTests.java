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
// 空のDB（テスト用の使い捨てPostgreSQL）から、V1、V2 の SQL を順に流してテーブルを作り、
// Entity とテーブルが合っているか（ddl-auto: validate）を、起動のときに確かめている
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class FlywayMigrationTests {

	@Autowired
	JdbcTemplate jdbcTemplate;

	@Autowired
	Environment environment;

	@Test
	void 空のDBから_V1_V2の順に流れ_全部のテーブルが作られ_履歴に残る() {
		List<Map<String, Object>> history = jdbcTemplate
				.queryForList("select version, success from flyway_schema_history where version is not null order by installed_rank");

		assertThat(history).hasSize(2);
		assertThat(history.get(0)).containsEntry("version", "1").containsEntry("success", true);
		assertThat(history.get(1)).containsEntry("version", "2").containsEntry("success", true);

		List<String> tables = jdbcTemplate.queryForList(
				"select table_name from information_schema.tables where table_schema = 'public' and table_name <> 'flyway_schema_history' order by table_name",
				String.class);
		assertThat(tables).containsExactly("board_column", "board_setting", "card", "user_background_image");
	}

	// V2：カードを「ある列の中で、並び順に」取り出す検索を速くする索引
	@Test
	void カードには_列と並び順をまとめた索引がある() {
		List<String> definitions = jdbcTemplate.queryForList(
				"select indexdef from pg_indexes where schemaname = 'public' and tablename = 'card' and indexname = 'idx_card_column_position'",
				String.class);

		assertThat(definitions).hasSize(1);
		assertThat(definitions.get(0)).contains("(column_id, \"position\")");
	}

	@Test
	void テーブルは_Hibernateに作らせず_Entityと合っているかだけ確かめる() {
		assertThat(environment.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
	}

}
