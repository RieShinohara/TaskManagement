package com.example.taskmanagement.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.taskmanagement.dto.SettingResponse;
import com.example.taskmanagement.entity.BoardSetting;
import com.example.taskmanagement.repository.BoardSettingRepository;

// 設定（選んだ背景）の処理を行う層
@Service
public class SettingService {

	private final BoardSettingRepository settingRepository;

	public SettingService(BoardSettingRepository settingRepository) {
		this.settingRepository = settingRepository;
	}

	// 設定は1件だけ。まだなければ、初期値（青空）で作る
	@Transactional
	public SettingResponse find() {
		return SettingResponse.from(load());
	}

	@Transactional
	public SettingResponse update(String background) {
		BoardSetting setting = load();
		setting.setBackground(background);
		return SettingResponse.from(setting);
	}

	private BoardSetting load() {
		return settingRepository.findById(BoardSetting.ID)
				.orElseGet(() -> settingRepository.save(new BoardSetting(BoardSetting.DEFAULT_BACKGROUND)));
	}

}
