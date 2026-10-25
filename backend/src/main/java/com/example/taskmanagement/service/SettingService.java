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

	// 設定は1件だけ。取得は、読むだけで、書き込まない。
	// 行は、起動時に DataInitializer が作る。もし無ければ（手で消したときなど）、初期値（青空）を返すだけで、行は作らない。
	// 取得が行を作ると、同時に来たときに、両方が作ろうとして、片方が失敗するおそれがある
	@Transactional(readOnly = true)
	public SettingResponse find() {
		return settingRepository.findById(BoardSetting.ID).map(SettingResponse::from)
				.orElseGet(() -> new SettingResponse(BoardSetting.DEFAULT_BACKGROUND));
	}

	// 背景を変える。行があれば更新、無ければ作る（save は、id が決まっているので、あれば更新・なければ挿入になる）
	@Transactional
	public SettingResponse update(String background) {
		return SettingResponse.from(settingRepository.save(new BoardSetting(background)));
	}

}
