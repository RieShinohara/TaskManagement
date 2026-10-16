package com.example.taskmanagement.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// カード更新のお願いで、画面から受け取る内容（JSON）。編集できる4項目を、いつもまとめて送る。
// description と dueDate が空（null）のときは、「なくす」という意味になる
public record CardUpdateRequest(
		@NotBlank(message = "タイトルは必須です") @Size(max = 255, message = "タイトルは255文字までです") String title,
		@Size(max = 2000, message = "説明文は2000文字までです") String description,
		@NotNull(message = "色は必須です") @Pattern(regexp = "none|red|blue|green|yellow|gray", message = "色は none / red / blue / green / yellow / gray のどれかです") String color,
		LocalDate dueDate) {
}
