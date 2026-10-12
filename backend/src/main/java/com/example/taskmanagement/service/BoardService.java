package com.example.taskmanagement.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.taskmanagement.dto.CardCreateRequest;
import com.example.taskmanagement.dto.CardResponse;
import com.example.taskmanagement.dto.ColumnResponse;
import com.example.taskmanagement.entity.BoardColumn;
import com.example.taskmanagement.entity.Card;
import com.example.taskmanagement.repository.BoardColumnRepository;
import com.example.taskmanagement.repository.CardRepository;

// 業務の処理を行う層。Controllerからお願いされ、Repositoryを使ってDBを読み書きする
@Service
public class BoardService {

	private final BoardColumnRepository columnRepository;
	private final CardRepository cardRepository;

	public BoardService(BoardColumnRepository columnRepository, CardRepository cardRepository) {
		this.columnRepository = columnRepository;
		this.cardRepository = cardRepository;
	}

	@Transactional(readOnly = true)
	public List<ColumnResponse> findColumns() {
		return columnRepository.findAllByOrderBySortOrderAsc().stream().map(ColumnResponse::from).toList();
	}

	@Transactional(readOnly = true)
	public List<CardResponse> findCards() {
		return cardRepository.findAllByOrderByColumnSortOrderAscPositionAsc().stream().map(CardResponse::from)
				.toList();
	}

	@Transactional
	public CardResponse createCard(CardCreateRequest request) {
		BoardColumn column = columnRepository.findById(request.columnId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
						"列が見つかりません: " + request.columnId()));

		// 新しいカードは、その列の一番上に入る（position が最も小さくなる）
		Integer minPosition = cardRepository.findMinPositionByColumnId(column.getId());
		int position = (minPosition == null) ? 0 : minPosition - 1;

		String color = (request.color() == null) ? "none" : request.color();
		Card card = cardRepository.save(new Card(request.title().strip(), color, request.dueDate(), column, position));
		return CardResponse.from(card);
	}

}
