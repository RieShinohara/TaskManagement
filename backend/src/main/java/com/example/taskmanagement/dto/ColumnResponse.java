package com.example.taskmanagement.dto;

import com.example.taskmanagement.entity.BoardColumn;

// APIが返す「列」の形（JSONになる）
public record ColumnResponse(Long id, String name, int sortOrder) {

	public static ColumnResponse from(BoardColumn column) {
		return new ColumnResponse(column.getId(), column.getName(), column.getSortOrder());
	}

}
