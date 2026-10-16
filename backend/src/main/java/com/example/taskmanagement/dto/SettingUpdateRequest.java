package com.example.taskmanagement.dto;

import com.example.taskmanagement.entity.BoardSetting;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

// 設定更新のお願いで、画面から受け取る内容（JSON）
public record SettingUpdateRequest(
		@NotNull(message = "背景は必須です") @Pattern(regexp = BoardSetting.BACKGROUND_PATTERN, message = "背景は plain / sky / sunset / night / auto のどれかです") String background) {
}
