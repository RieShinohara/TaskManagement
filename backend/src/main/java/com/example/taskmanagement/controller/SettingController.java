package com.example.taskmanagement.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.taskmanagement.dto.SettingResponse;
import com.example.taskmanagement.dto.SettingUpdateRequest;
import com.example.taskmanagement.service.SettingService;

import jakarta.validation.Valid;

// 設定（選んだ背景）の窓口
@RestController
@RequestMapping("/api/settings")
public class SettingController {

	private final SettingService settingService;

	public SettingController(SettingService settingService) {
		this.settingService = settingService;
	}

	@GetMapping
	public SettingResponse getSettings() {
		return settingService.find();
	}

	@PutMapping
	public SettingResponse updateSettings(@Valid @RequestBody SettingUpdateRequest request) {
		return settingService.update(request.background());
	}

}
