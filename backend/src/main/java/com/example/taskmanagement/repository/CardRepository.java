package com.example.taskmanagement.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.taskmanagement.entity.Card;

public interface CardRepository extends JpaRepository<Card, Long> {

	// 絞り込み検索。条件が null のものは、無視する（全部 null なら、全件）。
	// 並び順は、列の順、列の中の並び順。
	// cast(... as 型) は、値が null のとき、PostgreSQL が型を判断できずに失敗するのを防ぐための指定
	@Query("""
			select c from Card c
			where (cast(:columnId as long) is null or c.column.id = :columnId)
			  and (cast(:keyword as string) is null or locate(lower(cast(:keyword as string)), lower(c.title)) > 0)
			  and (cast(:dueBefore as localdate) is null or c.dueDate <= :dueBefore)
			order by c.column.sortOrder asc, c.position asc
			""")
	List<Card> search(@Param("columnId") Long columnId, @Param("keyword") String keyword,
			@Param("dueBefore") LocalDate dueBefore);

	// その列で一番小さい position。カードがなければ null
	@Query("select min(c.position) from Card c where c.column.id = :columnId")
	Integer findMinPositionByColumnId(@Param("columnId") Long columnId);

}
