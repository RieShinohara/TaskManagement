package com.example.taskmanagement.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.taskmanagement.dto.BackupFile;
import com.example.taskmanagement.service.BackupService;

import jakarta.validation.Valid;

// バックアップの窓口。書き出し（GET）と、読み込み（POST）
@RestController
@RequestMapping("/api/backup")
public class BackupController {

	private final BackupService backupService;

	public BackupController(BackupService backupService) {
		this.backupService = backupService;
	}

	// 全データを、バックアップファイルの形で返す
	@GetMapping
	public BackupFile export() {
		return backupService.export();
	}

	// バックアップファイルの内容で、今のデータを全部入れ替える。成功したら、中身のない 204 を返す
	@PostMapping("/restore")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void restore(@Valid @RequestBody BackupFile file) {
		backupService.restore(file);
	}

}
