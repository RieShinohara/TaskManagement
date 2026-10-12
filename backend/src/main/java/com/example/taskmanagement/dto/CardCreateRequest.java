package com.example.taskmanagement.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// カード追加のお願いで、画面から受け取る内容（JSON）
public record CardCreateRequest(
		@NotBlank(message = "タイトルは必須です") @Size(max = 255, message = "タイトルは255文字までです") String title,
		@NotNull(message = "列のIDは必須です") Long columnId,
		@Pattern(regexp = "none|red|blue|green|yellow|gray", message = "色は none / red / blue / green / yellow / gray のどれかです") String color,
		LocalDate dueDate) {
}
