package com.example.taskmanagement.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.taskmanagement.entity.BoardSetting;

public interface BoardSettingRepository extends JpaRepository<BoardSetting, Long> {
}
