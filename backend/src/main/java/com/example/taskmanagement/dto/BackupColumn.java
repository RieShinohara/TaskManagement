package com.example.taskmanagement.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// バックアップファイルの中の「列」。カードを、上から順に持つ
public record BackupColumn(
		@NotBlank(message = "列の名前は必須です") @Size(max = 255, message = "列の名前は255文字までです") String name,
		@NotNull(message = "cards は必須です") List<@Valid @NotNull BackupCard> cards) {
}
