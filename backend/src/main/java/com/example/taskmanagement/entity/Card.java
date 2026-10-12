package com.example.taskmanagement.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

// カード。このクラスから card テーブルができる。
@Entity
@Table(name = "card")
public class Card {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String title;

	// none / red / blue / green / yellow / gray
	@Column(nullable = false)
	private String color;

	// 期限日。未設定は null
	@Column(name = "due_date")
	private LocalDate dueDate;

	// このカードが入っている列。card テーブルの column_id が、board_column の id を指す
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "column_id", nullable = false)
	private BoardColumn column;

	// 列の中の並び順（小さいほど上）
	@Column(nullable = false)
	private int position;

	protected Card() {
		// JPAが使う
	}

	public Card(String title, String color, LocalDate dueDate, BoardColumn column, int position) {
		this.title = title;
		this.color = color;
		this.dueDate = dueDate;
		this.column = column;
		this.position = position;
	}

	public Long getId() {
		return id;
	}

	public String getTitle() {
		return title;
	}

	public String getColor() {
		return color;
	}

	public LocalDate getDueDate() {
		return dueDate;
	}

	public BoardColumn getColumn() {
		return column;
	}

	public int getPosition() {
		return position;
	}

}
