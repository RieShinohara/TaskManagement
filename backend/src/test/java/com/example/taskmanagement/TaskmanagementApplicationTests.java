package com.example.taskmanagement;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

// テストのときだけ、使い捨てのPostgreSQLをDockerで起動して接続する。
// 開発用のDB（docker compose）には触れない。
@SpringBootTest
@Testcontainers
class TaskmanagementApplicationTests {

	@Container
	@ServiceConnection
	static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18");

	@Test
	void contextLoads() {
	}

}
