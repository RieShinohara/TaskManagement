package com.example.taskmanagement.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import com.example.taskmanagement.exception.InvalidRequestException;
import com.example.taskmanagement.exception.NotFoundException;
import com.example.taskmanagement.exception.PayloadTooLargeException;

// エラーの返事を、1か所で決める。どのエラーも、標準の ProblemDetail（RFC 9457、application/problem+json）で返す。
// Service は、HTTP の番号を知らず、業務の例外（NotFoundException など）を投げるだけ。ここで番号に変える。
// ResponseEntityExceptionHandler を継ぐと、Spring 標準の例外（JSON が壊れている、許可されていない操作、
// 存在しないパスなど）も、まとめて ProblemDetail になる
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

	private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);

	@ExceptionHandler(NotFoundException.class)
	ProblemDetail handleNotFound(NotFoundException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
	}

	@ExceptionHandler(InvalidRequestException.class)
	ProblemDetail handleInvalidRequest(InvalidRequestException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
	}

	@ExceptionHandler(PayloadTooLargeException.class)
	ProblemDetail handlePayloadTooLarge(PayloadTooLargeException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.CONTENT_TOO_LARGE, e.getMessage());
	}

	// 想定外の例外（プログラムの不具合、DBの故障など）。原因はログに残し、本文には、内部の情報（例外のメッセージなど）を出さない
	@ExceptionHandler(Exception.class)
	ProblemDetail handleUnexpected(Exception e) {
		LOGGER.error("想定外のエラー", e);
		return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
				"サーバーでエラーが起きました。しばらくしてから、もう一度試してください。");
	}

	// 入力の検査（@Valid）に失敗したとき。どの項目が、なぜだめかを、errors（項目名 → 理由）に入れる
	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException e,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		Map<String, String> errors = new LinkedHashMap<>();
		e.getBindingResult().getFieldErrors().forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
		ProblemDetail problem = e.getBody();
		problem.setDetail("入力内容に誤りがあります。");
		problem.setProperty("errors", errors);
		return handleExceptionInternal(e, problem, headers, status, request);
	}

}
