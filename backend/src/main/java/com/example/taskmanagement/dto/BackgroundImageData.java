package com.example.taskmanagement.dto;

import java.time.Instant;

// Service が Controller に渡す、「登録済みの画像そのもの」（JPEGのバイト列と、登録の日時）。
// Controller が Entity を直接見ないための型。JSON としては返さない
public record BackgroundImageData(byte[] image, Instant updatedAt) {
}
