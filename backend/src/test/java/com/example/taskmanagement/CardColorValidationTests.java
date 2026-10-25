package com.example.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.example.taskmanagement.dto.BackupCard;
import com.example.taskmanagement.dto.CardCreateRequest;
import com.example.taskmanagement.dto.CardUpdateRequest;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

// カードの色の検査のテスト。カード追加・カード更新・バックアップの3つで、同じ6色だけを受け付ける。
// Spring もDBも使わず、検査の部品（Validator）に、DTOを直接かけている
class CardColorValidationTests {

	private static ValidatorFactory factory;
	private static Validator validator;

	@BeforeAll
	static void setUp() {
		factory = Validation.buildDefaultValidatorFactory();
		validator = factory.getValidator();
	}

	@AfterAll
	static void tearDown() {
		factory.close();
	}

	@ParameterizedTest
	@ValueSource(strings = { "none", "red", "blue", "green", "yellow", "gray" })
	void 決められた6色は_3つとも受け付ける(String color) {
		assertThat(colorErrors(color)).isEmpty();
	}

	@ParameterizedTest
	@ValueSource(strings = { "purple", "RED", "red|blue", "redx", "xred", "", " " })
	void それ以外は_3つとも断り_エラー文に色の一覧を示す(String color) {
		List<String> messages = colorErrors(color);

		assertThat(messages).hasSize(3);
		assertThat(messages).allMatch(m -> m.equals("色は none / red / blue / green / yellow / gray のどれかです"));
	}

	// 追加（色は省略できる）・更新・バックアップの3つで、色の項目のエラー文を集める
	private static List<String> colorErrors(String color) {
		Stream<Set<? extends ConstraintViolation<?>>> results = Stream.of(
				validator.validate(new CardCreateRequest("t", 1L, color, null)),
				validator.validate(new CardUpdateRequest("t", null, color, null)),
				validator.validate(new BackupCard("t", null, color, null)));
		return results.flatMap(Set::stream)
				.filter(v -> v.getPropertyPath().toString().equals("color"))
				.map(ConstraintViolation::getMessage)
				.toList();
	}

}
