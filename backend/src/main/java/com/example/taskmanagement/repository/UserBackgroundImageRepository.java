package com.example.taskmanagement.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.taskmanagement.entity.UserBackgroundImage;

public interface UserBackgroundImageRepository extends JpaRepository<UserBackgroundImage, String> {

	// 登録済みの一覧。画像のデータは読まない（一覧には要らず、重いため）。
	// 戻り値を、slot と updatedAt だけの型（射影）にすると、Spring Data が、その2列だけを取り出す
	List<Summary> findAllByOrderBySlot();

	// 一覧に使う、画像のデータを含まない読み取り用の型
	interface Summary {

		String getSlot();

		Instant getUpdatedAt();

	}

}
