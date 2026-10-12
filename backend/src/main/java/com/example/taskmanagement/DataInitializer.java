package com.example.taskmanagement;

import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.example.taskmanagement.entity.BoardColumn;
import com.example.taskmanagement.repository.BoardColumnRepository;

// 起動したときに、列（ToDo / 作業中 / 完了）が1つもなければ、最初の3つを入れる
@Component
public class DataInitializer implements ApplicationRunner {

	private final BoardColumnRepository columnRepository;

	public DataInitializer(BoardColumnRepository columnRepository) {
		this.columnRepository = columnRepository;
	}

	@Override
	public void run(ApplicationArguments args) {
		if (columnRepository.count() == 0) {
			columnRepository.saveAll(List.of(
					new BoardColumn("ToDo", 1),
					new BoardColumn("作業中", 2),
					new BoardColumn("完了", 3)));
		}
	}

}
