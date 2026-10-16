package com.example.taskmanagement.dto;

import java.time.Instant;

// APIが返す「登録済みの画像」の形（画像のデータそのものは入れない）
public record BackgroundImageResponse(String slot, Instant updatedAt) {
}
