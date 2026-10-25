package com.example.taskmanagement.dto;

import java.time.LocalDate;

import com.example.taskmanagement.entity.Card;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// バックアップファイルの中の「カード」。IDと position は入れない（並び順は、配列の順で表す）
public record BackupCard(
		@NotBlank(message = "タイトルは必須です") @Size(max = 255, message = "タイトルは255文字までです") String title,
		@Size(max = 2000, message = "説明文は2000文字までです") String description,
		@NotNull(message = "色は必須です") @Pattern(regexp = Card.COLOR_PATTERN, message = Card.COLOR_MESSAGE) String color,
		LocalDate dueDate) {
}
