package com.example.taskmanagement.entity;

import java.time.Instant;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// 自分の背景画像。青空・夕焼け・星空の「割り当て先（slot）」ごとに、最大1枚。
// このクラスから user_background_image テーブルができる。画像は、バイト列のまま、DBに入れる
@Entity
@Table(name = "user_background_image")
public class UserBackgroundImage {

	// 画像を割り当てられる背景（無地と自動には、割り当てない）
	public static final List<String> SLOTS = List.of("sky", "sunset", "night");

	// 割り当て先。sky / sunset / night のどれか（1つの割り当て先に、1枚だけなので、これが主キー）
	@Id
	private String slot;

	// 画像のデータ（JPEG）。PostgreSQL の bytea 型になる
	@JdbcTypeCode(SqlTypes.VARBINARY)
	@Column(nullable = false)
	private byte[] image;

	// 登録（置き換え）した日時。画面が、画像を取り直すかどうかの目印にする
	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected UserBackgroundImage() {
		// JPAが使う
	}

	public UserBackgroundImage(String slot, byte[] image, Instant updatedAt) {
		this.slot = slot;
		this.image = image;
		this.updatedAt = updatedAt;
	}

	public String getSlot() {
		return slot;
	}

	public byte[] getImage() {
		return image;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

	// 画像を置き換える
	public void replace(byte[] image, Instant updatedAt) {
		this.image = image;
		this.updatedAt = updatedAt;
	}

}
