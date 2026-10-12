package com.example.taskmanagement.dto;

import java.time.LocalDate;

import com.example.taskmanagement.entity.Card;

// APIが返す「カード」の形（JSONになる）
public record CardResponse(Long id, String title, String color, LocalDate dueDate, Long columnId, int position) {

	public static CardResponse from(Card card) {
		return new CardResponse(card.getId(), card.getTitle(), card.getColor(), card.getDueDate(),
				card.getColumn().getId(), card.getPosition());
	}

}
