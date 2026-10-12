package com.example.taskmanagement.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// ボードの「列」（ToDo / 作業中 / 完了）。このクラスから board_column テーブルができる。
@Entity
@Table(name = "board_column")
public class BoardColumn {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String name;

	// 列の表示順（小さいほど左）
	@Column(name = "sort_order", nullable = false)
	private int sortOrder;

	protected BoardColumn() {
		// JPAが使う
	}

	public BoardColumn(String name, int sortOrder) {
		this.name = name;
		this.sortOrder = sortOrder;
	}

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public int getSortOrder() {
		return sortOrder;
	}

}
