package com.example.taskmanagement.dto;

import com.example.taskmanagement.entity.BoardSetting;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

// バックアップファイルの中の「設定」。選んだ背景だけ（自分の画像は含めない）
public record BackupSettings(
		@NotNull(message = "背景は必須です") @Pattern(regexp = BoardSetting.BACKGROUND_PATTERN, message = "背景は plain / sky / sunset / night / auto のどれかです") String background) {
}
