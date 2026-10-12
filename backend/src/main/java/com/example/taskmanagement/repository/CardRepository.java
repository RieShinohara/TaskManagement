package com.example.taskmanagement.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.taskmanagement.entity.Card;

public interface CardRepository extends JpaRepository<Card, Long> {

	// 列の順、列の中の並び順で取得する
	List<Card> findAllByOrderByColumnSortOrderAscPositionAsc();

	// その列で一番小さい position。カードがなければ null
	@Query("select min(c.position) from Card c where c.column.id = :columnId")
	Integer findMinPositionByColumnId(@Param("columnId") Long columnId);

}
