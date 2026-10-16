package com.example.taskmanagement.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

// カード移動のお願いで、画面から受け取る内容（JSON）。
// 動かした先の列と、その列の中での位置（0が一番上）を送る。並び順の数値は、サーバーが決める
public record CardMoveRequest(
		@NotNull(message = "列IDは必須です") Long columnId,
		@NotNull(message = "位置は必須です") @Min(value = 0, message = "位置は0以上です") Integer index) {
}
