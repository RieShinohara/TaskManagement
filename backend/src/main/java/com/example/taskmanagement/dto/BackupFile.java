package com.example.taskmanagement.dto;

import java.time.Instant;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// バックアップファイルの中身（JSON）。列を左から順に、列の中のカードを上から順に持つ。
// app と version は、「このアプリのバックアップか」を見分けるための目印
public record BackupFile(
		@NotNull(message = "app は必須です") @Pattern(regexp = BackupFile.APP_NAME, message = "このアプリのバックアップファイルではありません") String app,
		@NotNull(message = "version は必須です") @Min(value = 1, message = "対応していないバージョンです") @Max(value = 1, message = "対応していないバージョンです") Integer version,
		Instant exportedAt,
		@NotEmpty(message = "列は1つ以上必要です") @Size(max = 50, message = "列が多すぎます") List<@Valid @NotNull BackupColumn> columns) {

	public static final String APP_NAME = "taskboard";
	public static final int VERSION = 1;
}
