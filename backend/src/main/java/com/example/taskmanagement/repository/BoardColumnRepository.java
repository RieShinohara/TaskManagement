package com.example.taskmanagement.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import com.example.taskmanagement.entity.BoardColumn;

import jakarta.persistence.LockModeType;

// 中身を書かなくても、JpaRepositoryを継承するだけで、保存・検索などが使える
public interface BoardColumnRepository extends JpaRepository<BoardColumn, Long> {

	List<BoardColumn> findAllByOrderBySortOrderAsc();

	// 全部の列を、id の順にロックして取る（SQL の FOR UPDATE）。ロックは、トランザクションが終わるまで続く。
	// 他の処理が同じロックを持っているときは、終わるまで待つ。
	// いつも同じ順（id の昇順）でロックするので、2つの処理が、お互いを待ち合う（デッドロック）ことはない
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select c from BoardColumn c order by c.id")
	List<BoardColumn> findAllForUpdate();

}
