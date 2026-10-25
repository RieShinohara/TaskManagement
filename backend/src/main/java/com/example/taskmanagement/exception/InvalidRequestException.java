package com.example.taskmanagement.exception;

// お願いの内容がだめなとき（入力の検査では分からない、業務のルール違反）の例外。画面には 400 として返る
public class InvalidRequestException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public InvalidRequestException(String message) {
		super(message);
	}

}
