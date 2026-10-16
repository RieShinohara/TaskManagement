package com.example.taskmanagement.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.example.taskmanagement.dto.BackgroundImageResponse;
import com.example.taskmanagement.entity.UserBackgroundImage;

public interface UserBackgroundImageRepository extends JpaRepository<UserBackgroundImage, String> {

	// 登録済みの一覧。画像のデータは読まない（一覧には要らず、重いため）
	@Query("select new com.example.taskmanagement.dto.BackgroundImageResponse(i.slot, i.updatedAt) from UserBackgroundImage i order by i.slot")
	List<BackgroundImageResponse> findAllSummaries();

}
