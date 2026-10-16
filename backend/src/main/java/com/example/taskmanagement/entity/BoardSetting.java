package com.example.taskmanagement.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// ボード全体の設定（いまは、選んだ背景だけ）。このクラスから board_setting テーブルができる。
// 設定は1件だけ持つので、id はいつも 1（自動採番にはしない）
@Entity
@Table(name = "board_setting")
public class BoardSetting {

	public static final long ID = 1L;

	// 選べる背景。plain：無地、sky：青空、sunset：夕焼け、night：星空、auto：自動（時間帯）
	public static final String BACKGROUND_PATTERN = "plain|sky|sunset|night|auto";

	// 初めて開いたときの背景
	public static final String DEFAULT_BACKGROUND = "sky";

	@Id
	private Long id;

	@Column(nullable = false)
	private String background;

	protected BoardSetting() {
		// JPAが使う
	}

	public BoardSetting(String background) {
		this.id = ID;
		this.background = background;
	}

	public Long getId() {
		return id;
	}

	public String getBackground() {
		return background;
	}

	public void setBackground(String background) {
		this.background = background;
	}

}
