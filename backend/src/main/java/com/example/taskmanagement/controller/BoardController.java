package com.example.taskmanagement.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.taskmanagement.dto.CardCreateRequest;
import com.example.taskmanagement.dto.CardResponse;
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

	@GetMapping("/cards")
	public List<CardResponse> getCards() {
		return boardService.findCards();
	}

	@PostMapping("/cards")
	@ResponseStatus(HttpStatus.CREATED)
	public CardResponse createCard(@Valid @RequestBody CardCreateRequest request) {
		return boardService.createCard(request);
	}

}
