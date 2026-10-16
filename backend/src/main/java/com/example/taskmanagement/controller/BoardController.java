package com.example.taskmanagement.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.taskmanagement.dto.CardCreateRequest;
import com.example.taskmanagement.dto.CardResponse;
import com.example.taskmanagement.dto.CardUpdateRequest;
import com.example.taskmanagement.dto.ColumnResponse;
import com.example.taskmanagement.service.BoardService;

import jakarta.validation.Valid;

// APIの窓口。画面からのお願いを受け取り、Serviceに渡して、結果をJSONで返す
@RestController
@RequestMapping("/api")
public class BoardController {

	private final BoardService boardService;

	public BoardController(BoardService boardService) {
		this.boardService = boardService;
	}

	@GetMapping("/columns")
	public List<ColumnResponse> getColumns() {
		return boardService.findColumns();
	}

	// 絞り込みは、どれも省略できる。例：/api/cards?columnId=1&keyword=買い&dueBefore=2026-10-20
	@GetMapping("/cards")
	public List<CardResponse> getCards(@RequestParam(required = false) Long columnId,
			@RequestParam(required = false) String keyword,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueBefore) {
		return boardService.findCards(columnId, keyword, dueBefore);
	}

	@GetMapping("/cards/{id}")
	public CardResponse getCard(@PathVariable Long id) {
		return boardService.findCard(id);
	}

	@PostMapping("/cards")
	@ResponseStatus(HttpStatus.CREATED)
	public CardResponse createCard(@Valid @RequestBody CardCreateRequest request) {
		return boardService.createCard(request);
	}

	// 編集できる4項目（タイトル・説明文・色・期限日）を、まとめて置き換える
	@PutMapping("/cards/{id}")
	public CardResponse updateCard(@PathVariable Long id, @Valid @RequestBody CardUpdateRequest request) {
		return boardService.updateCard(id, request);
	}

	// カードを削除する。成功したら、中身のない 204 No Content を返す
	@DeleteMapping("/cards/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteCard(@PathVariable Long id) {
		boardService.deleteCard(id);
	}

}
