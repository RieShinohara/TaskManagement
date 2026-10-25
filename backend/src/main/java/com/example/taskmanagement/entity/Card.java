package com.example.taskmanagement.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

// カード。card テーブルに対応する（テーブルは Flyway の SQL で作る。db/migration）。
// 索引は、V2 の SQL で作る。ここに書くのは、「こういう索引がある」という説明で、Hibernate は、作らない・確かめない
@Entity
@Table(name = "card", indexes = @Index(name = "idx_card_column_position", columnList = "column_id, position"))
public class Card {

	// 選べる色。色を足すときは、ここだけ直す（検査は、この定数を使う）
	public static final String COLOR_PATTERN = "none|red|blue|green|yellow|gray";

	public static final String COLOR_MESSAGE = "色は none / red / blue / green / yellow / gray のどれかです";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String title;

	// 説明文。未設定は null（2000文字まで）
	@Column(length = 2000)
	private String description;

	// COLOR_PATTERN のどれか
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

	public String getDescription() {
		return description;
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

	// 編集できる4項目を、まとめて置き換える。列と並び順は、ここでは変えない
	public void update(String title, String description, String color, LocalDate dueDate) {
		this.title = title;
		this.description = description;
		this.color = color;
		this.dueDate = dueDate;
	}

	// 入っている列と、列の中の並び順を変える（カードの移動・並び替え）。中身の項目は、変えない
	public void moveTo(BoardColumn column, int position) {
		this.column = column;
		this.position = position;
	}

}
