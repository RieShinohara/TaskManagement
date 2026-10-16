package com.example.taskmanagement.dto;

import com.example.taskmanagement.entity.BoardSetting;

// APIが返す「設定」の形（JSONになる）
public record SettingResponse(String background) {

	public static SettingResponse from(BoardSetting setting) {
		return new SettingResponse(setting.getBackground());
	}

}
