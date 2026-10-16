package com.example.taskmanagement;

import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.example.taskmanagement.entity.BoardColumn;
import com.example.taskmanagement.entity.BoardSetting;
import com.example.taskmanagement.repository.BoardColumnRepository;
import com.example.taskmanagement.repository.BoardSettingRepository;

// 起動したときに、最初のデータを用意する：
// 列（ToDo / 作業中 / 完了）が1つもなければ最初の3つを、設定がなければ初期値（青空）を入れる
@Component
public class DataInitializer implements ApplicationRunner {

	private final BoardColumnRepository columnRepository;
	private final BoardSettingRepository settingRepository;

	public DataInitializer(BoardColumnRepository columnRepository, BoardSettingRepository settingRepository) {
		this.columnRepository = columnRepository;
		this.settingRepository = settingRepository;
	}

	@Override
	public void run(ApplicationArguments args) {
		if (columnRepository.count() == 0) {
			columnRepository.saveAll(List.of(
					new BoardColumn("ToDo", 1),
					new BoardColumn("作業中", 2),
					new BoardColumn("完了", 3)));
		}
		if (!settingRepository.existsById(BoardSetting.ID)) {
			settingRepository.save(new BoardSetting(BoardSetting.DEFAULT_BACKGROUND));
		}
	}

}
