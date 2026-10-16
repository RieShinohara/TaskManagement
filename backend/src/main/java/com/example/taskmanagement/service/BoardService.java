package com.example.taskmanagement.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.taskmanagement.dto.CardCreateRequest;
import com.example.taskmanagement.dto.CardResponse;
import com.example.taskmanagement.dto.CardUpdateRequest;
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

	// 絞り込みの条件は、どれも省略できる（null）。省略したものは、無視する
	@Transactional(readOnly = true)
	public List<CardResponse> findCards(Long columnId, String keyword, LocalDate dueBefore) {
		String normalizedKeyword = (keyword == null || keyword.isBlank()) ? null : keyword.strip();
		return cardRepository.search(columnId, normalizedKeyword, dueBefore).stream().map(CardResponse::from)
				.toList();
	}

	@Transactional(readOnly = true)
	public CardResponse findCard(Long id) {
		Card card = cardRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "カードが見つかりません: " + id));
		return CardResponse.from(card);
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

	// 編集できる4項目を置き換える。列と並び順は変えない。説明文が空（空白だけ）なら、なくす
	@Transactional
	public CardResponse updateCard(Long id, CardUpdateRequest request) {
		Card card = cardRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "カードが見つかりません: " + id));
		String description = (request.description() == null || request.description().isBlank()) ? null
				: request.description();
		card.update(request.title().strip(), description, request.color(), request.dueDate());
		return CardResponse.from(card);
	}

	// カードを削除する。削除したカードは戻せない
	@Transactional
	public void deleteCard(Long id) {
		Card card = cardRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "カードが見つかりません: " + id));
		cardRepository.delete(card);
	}

}
