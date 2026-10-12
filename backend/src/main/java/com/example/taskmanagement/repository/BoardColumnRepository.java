package com.example.taskmanagement.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.taskmanagement.entity.BoardColumn;

// 中身を書かなくても、JpaRepositoryを継承するだけで、保存・検索などが使える
public interface BoardColumnRepository extends JpaRepository<BoardColumn, Long> {

	List<BoardColumn> findAllByOrderBySortOrderAsc();

}
