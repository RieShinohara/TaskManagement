package com.example.taskmanagement.exception;

// 送られてきたものが大きすぎるときの例外。画面には 413 として返る
public class PayloadTooLargeException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public PayloadTooLargeException(String message) {
		super(message);
	}

}
